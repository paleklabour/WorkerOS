# WorkerOS - System Architecture & Development Guide

เอกสารนี้ระบุรายละเอียดทางสถาปัตยกรรมโครงสร้างระบบ (System Architecture) ตารางฐานข้อมูล (Database Schema) และแนวทางการพัฒนา (Development Guidelines) ของระบบ **WorkerOS** เพื่อให้การแก้ไข ปรับปรุง และพัฒนาระบบหลังจากนี้เป็นไปอย่างเป็นระบบ ระเบียบ และมีมาตรฐานเดียวกันสำหรับนักพัฒนาทุกคน

---

## 1. แผนผังโครงสร้างการทำงาน (System Architecture Overview)

ระบบใช้สถาปัตยกรรมแบบ **Hybrid Single-Page Application (SPA) with Serverless Backend** โดยข้อมูลหน้าบ้านจะรันแบบออฟไลน์ผ่านเบราว์เซอร์ก่อนจะทำการเชื่อมต่อเพื่อซิงโครไนซ์ข้อมูลแบบเรียลไทม์กับ Google Sheets ในลักษณะ API:

```mermaid
graph TD
    %% Frontend
    subgraph Client [Frontend - Browser]
        UI[index.html / styles.css]
        State[State Management - app.js memory]
        Local[Offline Cache - localStorage]
        ImgProc[Image background remover - HTML5 Canvas]
        UI --> State
        State --> Local
    end

    %% API Layer
    State <--> |HTTPS POST / JSON| GAS[Google Apps Script API - Code.gs]

    %% Backend Cloud
    subgraph Cloud [Backend - Google Cloud Services]
        GAS <--> Sheets[(Google Sheets - Master DB)]
        GAS <--> Drive[(Google Drive - Storage)]
        GAS <--> Gemini[Gemini 1.5 Flash API - AI OCR]
    end

    %% External
    State --> |Generate dynamic QR| PP[promptpay.io API]
```

---

## 2. โครงสร้างฐานข้อมูล (Database Schema - Google Sheets Tabs)

ข้อมูลทั้งหมดจะถูกจัดเก็บในตารางหลักบน Google Sheets โดยแยกเป็น **5 แผ่นงาน (Tabs)** ที่มีจุดเชื่อมโยงความสัมพันธ์ของข้อมูล (Foreign Keys) ดังต่อไปนี้:

```mermaid
erDiagram
    CUSTOMERS ||--o{ WORKERS : "employerId"
    CUSTOMERS ||--o{ JOBS : "customerId"
    WORKERS ||--o{ JOBS : "workerId"

    CUSTOMERS {
        string id PK "รหัสประจำตัวนายจ้าง (เช่น cust-...)"
        string companyName "ชื่อบริษัท/นายจ้าง"
        string taxId "เลขประจำตัวผู้เสียภาษี"
        string coordinator "ชื่อผู้ติดต่อประสานงาน"
        string phone "เบอร์โทรศัพท์ติดต่อ"
        string email "อีเมลติดต่อ"
        string branches "JSON String - สาขาและที่ตั้ง [สำนักงานใหญ่/สาขาย่อย]"
    }

    WORKERS {
        string id PK "รหัสคนงาน (เช่น worker-...)"
        string employerId FK "อ้างอิง CUSTOMERS.id"
        string nationality "สัญชาติ (Myanmar/Laos/Cambodia)"
        string status "สถานะคนงาน (ปกติ/ระงับ)"
        string uid "เลขประจำตัวคนงาน 13 หลัก"
        string permitNo "เลขที่ใบอนุญาตทำงาน"
        string title "คำนำหน้านาม (นาย/นาง/นางสาว)"
        string firstName "ชื่อคนงานภาษาอังกฤษ/ไทย"
        string lastName "นามสกุลภาษาอังกฤษ/ไทย"
        string dob "วันเกิด (DD/MM/YYYY)"
        string permitExpiry "วันหมดอายุใบอนุญาตทำงาน"
        string passportNo "เลขเล่มพาสปอร์ต / CI"
        string passportPob "สถานที่เกิด"
        string passportAuth "สถานที่ออกเล่มพาสปอร์ต"
        string passportIssue "วันออกเล่มพาสปอร์ต"
        string passportExpiry "วันหมดอายุพาสปอร์ต"
        string fatherName "ชื่อบิดา"
        string motherName "ชื่อมารดา"
        string photo "ลิงก์รูปถ่ายคนงาน / Base64"
        string attachments "JSON String - ลิงก์ไฟล์เอกสารแนบใน Google Drive"
        string attachmentNames "JSON String - ชื่อไฟล์จริงที่อัปโหลด"
        string createdAt "วันที่ลงทะเบียนคนงาน"
    }

    JOBS {
        string id PK "รหัสใบสั่งงาน (เช่น job-...)"
        string customerId FK "อ้างอิง CUSTOMERS.id"
        string workerId FK "อ้างอิง WORKERS.id"
        string jobType "ประเภทงานและราคา เช่น แจ้งเข้า (2000)"
        float fee "ค่าบริการรวมของใบงาน"
        string status "สถานะการดำเนินงาน/การชำระเงิน เช่น ชำระเงินแล้ว (เงินสด)"
        string notes "บันทึกความเห็นเพิ่มเติม"
        string updatedAt "วันที่อัปเดตสถานะล่าสุด"
    }

    BANKS {
        string id PK "รหัสบัญชี (เช่น bank-...)"
        string bankName "ชื่อธนาคาร"
        string accountName "ชื่อบัญชี"
        string accountNumber "เลขที่บัญชี"
        string promptPayId "หมายเลขพร้อมเพย์สำหรับ QR"
        string qrImage "Base64 รูปคิวอาร์โค้ด"
    }

    SETTINGS {
        string key PK "คีย์ตั้งค่า"
        string value "ค่าตั้งค่า"
    }
```

---

## 3. สรุปโมดูลการประมวลผลหลัก (Core Modules & Flow)

### 3.1 การจัดเก็บและซิงค์ข้อมูล (Data Sync Flow)
* **การบันทึก (Save/Edit)**: หน้าเว็บจะเขียนข้อมูลลงในสถานะของหน่วยความจำเครื่อง และเขียนบันทึกแคชลง `localStorage` ก่อนส่ง HTTP POST Request ไปที่ Google Apps Script เพื่อบันทึกลงในแถวตารางสเปรดชีต
* **สิทธิ์การใช้งาน (Permissions)**: มีระบบแบ่งแยกสิทธิ์ตามบทบาทผู้ใช้ (Role-based) ได้แก่:
  * `admin`: สิทธิ์เต็มรูปแบบ
  * `manager`: สิทธิ์เขียน/แก้ไขข้อมูลหลักและข้อมูลการเงิน
  * `staff`: สิทธิ์เข้าดูข้อมูลได้อย่างเดียว (Read-only) ไม่สามารถแก้ไข คลี่ หรือย้ายใบงานการเงินได้
  * `client`: สิทธิ์เฉพาะกลุ่ม ดูรายละเอียดคนงานและใบงานของตัวเอง

### 3.2 โมดูลตัดแต่งภาพพื้นหลังคนงาน (Photo Background Removal)
* โปรแกรมควบคุมการแก้ไขภาพผ่าน HTML5 Canvas โดยจะสแกนพิกเซลขอบรอบนอกของพอร์ตเทรต เพื่อหาเฉดสีพื้นหลังหลัก และใช้ค่าความต่างระยะห่างเฉดสี (Color Euclidean Distance) ในการกรองและล้างสีฉากหลังออก แปลงเป็นสีขาวล้วน `#FFFFFF` แบบอัตโนมัติ

### 3.3 โมดูลป้อนข้อมูลอัตโนมัติด้วย AI OCR (AI OCR Document Processing)
* เมื่อแนบไฟล์ PDF หรือรูปภาพ หน้าแอปจะประมวลผลส่งไฟล์ไปวิเคราะห์ผ่าน **Gemini 1.5 Flash API** ในคลาวด์ของ Apps Script 
* AI จะแปลงคำตอบกลับมาเป็นโครงสร้างข้อมูลมาตรฐาน (JSON) ซึ่งมีฟิลด์ `uid`, `firstName`, `passportNo`, `permitNo`, `permitExpiry` ฯลฯ และระบบจะป้อนค่าเข้าสู่ช่องรับข้อมูลของคนงานต่างด้าวโดยอัตโนมัติ

### 3.4 เครื่องคำนวณและยุบรวมบิล (Billing & Aggregation Engine)
* เมื่อกดยืนยันรวมบิลชุด (Combine Invoice) ระบบจะสแกนใบงานที่เลือก ค้นหารายการประเภทงานบริการที่ซ้ำกัน และทำการยุบรวมประเภทงานบริการเดียวกันมาแสดงในตารางใบเสร็จแถวเดียวกัน โดยตั้งยอดจำนวนคูณตามจำนวนคนงาน และใส่ลิสต์รายชื่อคนงานเรียงเลข 1, 2... ในตารางคำอธิบายอย่างสวยงาม

---

## 4. แนวทางการพัฒนาและควบคุมเวอร์ชัน (Development Guidelines)

เพื่อให้ระบบคงทน บำรุงรักษาได้ง่าย และพร้อมสำหรับการพัฒนาต่อยอด นักพัฒนาต้องปฏิบัติตามกฎดังนี้:

### 4.1 โครงสร้างไฟล์โค้ด (File Separation)
* `index.html`: ควบคุมเฉพาะส่วนโครงสร้างหน้าจอหลัก (HTML5 Semantic Elements) และโครงสร้าง Modals
* `styles.css`: ควบคุมสไตล์การแสดงผลทั้งหมดผ่านตัวแปรหลัก (Theme CSS Variables) ห้ามเขียนสไตล์แบบ Inline ในหน้า HTML โดยไม่จำเป็น
* `app.js`: ควบคุมการเก็บตัวแปร ฟังก์ชันคำนวณ ตรรกะประมวลผล และการเชื่อมต่อ API ทั้งหมด
* `Code.gs`: ควบคุมการทำงานฝั่งเซิร์ฟเวอร์ Google Sheets (การจัดแถว เขียนอ่านข้อมูล และการประมวลผลส่งไฟล์ขึ้น Google Drive / Gemini API)

### 4.2 มาตรฐานความปลอดภัย (Security Rules)
* **หลีกเลี่ยงการเปิดเผย API Key**: ห้ามใส่ Gemini API Key หรือความลับทางระบบลงในไฟล์ `app.js` หรือหน้าเว็บฝั่งหน้าบ้าน ให้ผูกเป็นตัวแปรแอบซ่อนในไฟล์ `Code.gs` ฝั่งหลังบ้านออนไลน์บน Google Apps Script เท่านั้น

### 4.3 แผนงานการใช้ Git (Git Workflow)
ทุกครั้งที่มีการอัปเดตระบบ ให้ควบคุมเวอร์ชันผ่านคำสั่ง Git ดังต่อไปนี้เสมอ:
1. ก่อนเริ่มเขียนโค้ดใหม่ ให้ตรวจสอบสถานะการอัปเดต: `git pull`
2. หลังการอัปเดตฟีเจอร์เสร็จสิ้น ให้บันทึกไฟล์:
   ```powershell
   git add .
   git commit -m "อัปเดต: [ระบุหัวข้อสิ่งที่คุณแก้ไขหรือเพิ่มเติม เช่น แก้ไขฟอนต์ใบเสร็จ]"
   ```
3. ส่งโค้ดขึ้นสู่ GitHub คลาวด์ออนไลน์: `git push`
