/**
 * ระบบบริหารจัดการคนงานต่างด้าว (Cloud API Backend using Google Apps Script)
 * ทำงานร่วมกับ Google Sheets (เป็นฐานข้อมูล) และ Google Drive (สำหรับจัดเก็บเอกสาร)
 * รองรับการคัดกรองข้อมูลรายลูกค้า (Multi-tenancy) และแจ้งเตือนผ่าน Line OA Group
 */

// ==================== CONFIGURATION ====================
var SPREADSHEET_ID = ""; // ใส่ Spreadsheet ID ที่นี่ (หากเว้นว่างไว้ จะใช้ Active Spreadsheet อัตโนมัติเมื่อผูกคอนเทนเนอร์)
var MAIN_DRIVE_FOLDER_ID = ""; // ใส่ Folder ID ของ Google Drive ที่ใช้เก็บไฟล์เอกสารคนงาน
var LINE_CHANNEL_ACCESS_TOKEN = ""; // ใส่ Channel Access Token ของ Line OA ที่นี่
var GEMINI_API_KEY = "AQ.Ab8RN6J8pFWHbCAA6katrh9TEOwoCadtIJjhvrlXLqrz8ZQFHQ"; // คีย์ Gemini API Key จาก Google AI Studio สำหรับงาน AI OCR สูงเพื่อใช้งาน AI OCR ความแม่นยำสูง

// ชื่อหน้าชีตต่างๆ
var SHEETS = {
  USERS: "Users",
  CUSTOMERS: "Customers",
  WORKERS: "Workers",
  JOBS: "Jobs",
  BANKS: "Banks",
  LINE_GROUPS: "Line_Groups",
  LINE_LOGS: "Line_Logs"
};

// ==================== HTTP ENDPOINTS (doGet & doPost) ====================

/**
 * จัดการคำขอแบบ GET (รวมหน้าที่บริการหน้าเว็บและการเรียก API แบบ GET)
 */
function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;
    
    if (action === "test") {
      return jsonResponse({ status: "success", message: "Google Apps Script API is online!" });
    }
    
    if (action === "getBanks") {
      var banks = readSheetData(SHEETS.BANKS);
      return jsonResponse({ status: "success", data: banks });
    }

    // บริการหน้าจอหลักสำหรับเว็บแอป (HTML frontend)
    var template = HtmlService.createTemplateFromFile('index');
    try {
      template.webAppUrl = ScriptApp.getService().getUrl();
    } catch(err) {
      template.webAppUrl = "";
    }
    return template.evaluate()
        .setTitle('WorkerOS - ระบบจัดการแรงงานต่างด้าว')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() }, 500);
  }
}

/**
 * จัดการคำขอแบบ POST (สำหรับงานเขียนข้อมูล, ล็อกอิน, อัปโหลดไฟล์)
 */
function doPost(e) {
  try {
    var postData;
    var corsHeader = ContentService.MimeType.JSON;
    
    // ตรวจสอบ JSON payload
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else {
      // สำหรับกรณีทดสอบหรือส่งข้อมูลแบบ Form
      postData = e.parameter;
    }
    
    // 1. ตรวจสอบว่าเป็น Webhook จาก LINE หรือไม่
    if (postData.events && Array.isArray(postData.events)) {
      handleLineWebhook(postData.events);
      return jsonResponse({ status: "success", message: "Line Webhook event processed." });
    }
    
    var action = postData.action;
    
    // 2. แผนกตรวจสอบการเข้าสู่ระบบ (Authentication)
    if (action === "login") {
      return handleLogin(postData.email, postData.password);
    }
    
    // 3. ตรวจสอบสิทธิ์ผู้ใช้สำหรับฟังก์ชันอื่นๆ (ต้องมี Auth Token/Email)
    var currentUser = verifyUser(postData.authEmail, postData.authPassword);
    if (!currentUser) {
      return jsonResponse({ status: "error", message: "Unauthorized: Invalid email or password." }, 401);
    }
    
    // 4. แยกการทำงานตาม Action ที่ร้องขอ
    switch (action) {
      case "getData": // ดึงข้อมูลหลักทั้งหมด (คัดกรองตามสิทธิ์อัตโนมัติ)
        return handleGetData(currentUser);
        
      case "saveCustomer": // บันทึก/แก้ไขข้อมูลลูกค้า (เฉพาะ admin/manager)
        if (currentUser.role === "staff" || currentUser.role === "client") {
          return jsonResponse({ status: "error", message: "Forbidden: Insufficient permissions." }, 403);
        }
        return handleSaveCustomer(postData.customerData);
        
      case "saveWorker": // บันทึก/แก้ไขข้อมูลคนงาน
        if (currentUser.role === "staff") {
          return jsonResponse({ status: "error", message: "Forbidden: Staff read-only." }, 403);
        }
        // ลูกค้าบันทึกได้เฉพาะคนงานของตนเอง
        if (currentUser.role === "client" && postData.workerData.employerId !== currentUser.customer_id) {
          return jsonResponse({ status: "error", message: "Forbidden: Cannot manage other employer's workers." }, 403);
        }
        return handleSaveWorker(postData.workerData);
        
      case "saveJob": // บันทึกใบสั่งงาน
        if (currentUser.role === "staff") {
          return jsonResponse({ status: "error", message: "Forbidden: Staff read-only." }, 403);
        }
        if (currentUser.role === "client" && postData.jobData.customerId !== currentUser.customer_id) {
          return jsonResponse({ status: "error", message: "Forbidden: Cannot create job for another client." }, 403);
        }
        return handleSaveJob(postData.jobData);
        
      case "uploadFile": // อัปโหลดพาสปอร์ต/วีซ่าขึ้น Google Drive
        if (currentUser.role === "staff") {
          return jsonResponse({ status: "error", message: "Forbidden: Staff read-only." }, 403);
        }
        return handleFileUpload(postData.fileData, postData.fileName, postData.customerId, postData.workerId, postData.docType);
        
      case "saveLineGroup": // บันทึก/แก้ไขกลุ่มไลน์
        if (currentUser.role === "staff") {
          return jsonResponse({ status: "error", message: "Forbidden: Staff read-only." }, 403);
        }
        return handleSaveLineGroup(postData.groupData);
        
      case "deleteRecord": // ลบข้อมูล (เฉพาะ Admin เท่านั้น)
        if (currentUser.role !== "admin") {
          return jsonResponse({ status: "error", message: "Forbidden: Admins only." }, 403);
        }
        return handleDeleteRecord(postData.sheetName, postData.id);
        
      default:
        return jsonResponse({ status: "error", message: "Action '" + action + "' not found." }, 404);
    }
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() }, 500);
  }
}

// ==================== AUTHENTICATION LOGIC ====================

/**
 * ยืนยันตัวตนผู้ใช้
 */
function verifyUser(email, password) {
  if (!email || !password) return null;
  var users = readSheetData(SHEETS.USERS);
  var matched = users.find(function(u) {
    return u.email === email && u.password === password;
  });
  return matched ? matched : null;
}

/**
 * ล็อกอินและส่งคืนข้อมูลสิทธิ์ของผู้ใช้งาน
 */
function handleLogin(email, password) {
  var user = verifyUser(email, password);
  if (user) {
    return jsonResponse({
      status: "success",
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        customer_id: user.customer_id
      }
    });
  } else {
    return jsonResponse({ status: "error", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401);
  }
}

// ==================== DATA READS WITH ROLE-BASED FILTERING ====================

/**
 * ดึงข้อมูลรวม (Customers, Workers, Jobs) และคัดกรองตามสิทธิ์
 */
function handleGetData(user) {
  var allCustomers = readSheetData(SHEETS.CUSTOMERS);
  var allWorkers = readSheetData(SHEETS.WORKERS);
  var allJobs = readSheetData(SHEETS.JOBS);
  var allBanks = readSheetData(SHEETS.BANKS);
  var allLineGroups = [];
  
  if (user.role !== "client") {
    try {
      allLineGroups = readSheetData(SHEETS.LINE_GROUPS);
    } catch(err) {}
  }
  
  var filteredCustomers = [];
  var filteredWorkers = [];
  var filteredJobs = [];
  
  if (user.role === "admin" || user.role === "manager" || user.role === "staff") {
    // แอดมินและพนักงานเห็นทั้งหมด
    filteredCustomers = allCustomers;
    filteredWorkers = allWorkers;
    filteredJobs = allJobs;
  } else if (user.role === "client") {
    // ลูกค้าผู้ว่าจ้างเห็นเฉพาะของตัวเอง
    var custId = user.customer_id;
    filteredCustomers = allCustomers.filter(function(c) { return c.id === custId; });
    filteredWorkers = allWorkers.filter(function(w) { return w.employerId === custId; });
    filteredJobs = allJobs.filter(function(j) { return j.customerId === custId; });
  }
  
  // แปลงค่า JSON string กลับเป็น Object เพื่อความสะดวกของหน้า Frontend
  filteredCustomers.forEach(function(c) {
    if (c.branches_json) {
      try { c.branches = JSON.parse(c.branches_json); } catch(err) { c.branches = []; }
    } else {
      c.branches = [];
    }
  });
  
  filteredWorkers.forEach(function(w) {
    if (w.attachments_json) {
      try { w.attachments = JSON.parse(w.attachments_json); } catch(err) { w.attachments = {}; }
    } else {
      w.attachments = {};
    }
  });
  
  return jsonResponse({
    status: "success",
    customers: filteredCustomers,
    workers: filteredWorkers,
    jobs: filteredJobs,
    banks: allBanks,
    lineGroups: allLineGroups
  });
}

// ==================== DATA WRITES (CRUD) ====================

/**
 * บันทึกหรือแก้ไขข้อมูลลูกค้า
 */
function handleSaveCustomer(customerData) {
  var sheet = getSheet(SHEETS.CUSTOMERS);
  var data = readSheetRawData(SHEETS.CUSTOMERS);
  
  // ซีเรียลไลซ์สาขาเป็น JSON String
  var branchesJson = "";
  if (customerData.branches) {
    branchesJson = JSON.stringify(customerData.branches);
  }
  
  var rowData = [
    customerData.id,
    customerData.taxId,
    customerData.companyName,
    customerData.businessType,
    customerData.coordinator,
    customerData.phone,
    customerData.createdAt || new Date().toISOString().split('T')[0],
    branchesJson,
    customerData.drive_folder_id || ""
  ];
  
  var rowIndex = findRowIndexById(data, customerData.id);
  if (rowIndex > -1) {
    // แก้ไขข้อมูลแถวเดิม (บวก 2 เพราะมีหัวตาราง และ 1-indexed)
    sheet.getRange(rowIndex + 2, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // เพิ่มข้อมูลแถวใหม่
    sheet.appendRow(rowData);
    // สร้างโฟลเดอร์สำหรับลูกค้ารายนี้บน Google Drive ทันที
    try {
      var folderId = createDriveFolderForCustomer(customerData.companyName);
      if (folderId) {
        // อัปเดต Drive Folder ID ลงในแถวที่เพิ่งเขียนไปล่าสุด
        var lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 9).setValue(folderId);
        customerData.drive_folder_id = folderId;
      }
    } catch (e) {
      Logger.log("ไม่สามารถสร้างโฟลเดอร์ใน Drive ได้: " + e.toString());
    }
  }
  
  return jsonResponse({ status: "success", data: customerData });
}

/**
 * บันทึกหรือแก้ไขข้อมูลคนงานต่างด้าว
 */
function handleSaveWorker(workerData) {
  var sheet = getSheet(SHEETS.WORKERS);
  var data = readSheetRawData(SHEETS.WORKERS);
  
  var attachmentsJson = "";
  if (workerData.attachments) {
    attachmentsJson = JSON.stringify(workerData.attachments);
  }
  
  var rowData = [
    workerData.id,
    workerData.employerId,
    workerData.title,
    workerData.nationality,
    workerData.workerUid,
    workerData.permitNo,
    workerData.permitExpiry,
    workerData.firstName,
    workerData.lastName,
    workerData.dob,
    workerData.passportNo,
    workerData.passportPob,
    workerData.passportAuth,
    workerData.passportIssue,
    workerData.passportExpiry,
    workerData.status,
    workerData.createdAt || new Date().toISOString().split('T')[0],
    attachmentsJson,
    workerData.gender || "",
    workerData.position || "",
    workerData.workplace || "",
    workerData.refNo || ""
  ];
  
  var rowIndex = findRowIndexById(data, workerData.id);
  if (rowIndex > -1) {
    sheet.getRange(rowIndex + 2, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return jsonResponse({ status: "success", data: workerData });
}

/**
 * บันทึกหรือแก้ไขใบสั่งงาน
 */
function handleSaveJob(jobData) {
  var sheet = getSheet(SHEETS.JOBS);
  var data = readSheetRawData(SHEETS.JOBS);
  
  var rowData = [
    jobData.id,
    jobData.customerId,
    jobData.workerId,
    jobData.jobType,
    jobData.fee,
    jobData.status,
    jobData.notes,
    new Date().toISOString().split('T')[0]
  ];
  
  var rowIndex = findRowIndexById(data, jobData.id);
  if (rowIndex > -1) {
    sheet.getRange(rowIndex + 2, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return jsonResponse({ status: "success", data: jobData });
}

/**
 * ลบเรคคอร์ดข้อมูลตามชีตและไอดี (เฉพาะแอดมิน)
 */
function handleDeleteRecord(sheetName, id) {
  var sheet = getSheet(sheetName);
  var data = readSheetRawData(sheetName);
  var rowIndex = findRowIndexById(data, id);
  
  if (rowIndex > -1) {
    if (sheetName === SHEETS.CUSTOMERS || sheetName === SHEETS.WORKERS) {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var statusColIndex = headers.indexOf("status");
      if (statusColIndex === -1) {
        var lastCol = sheet.getLastColumn();
        sheet.getRange(1, lastCol + 1).setValue("status");
        statusColIndex = lastCol;
      }
      sheet.getRange(rowIndex + 2, statusColIndex + 1).setValue("deleted");
      return jsonResponse({ status: "success", message: "ย้ายข้อมูลไปถังขยะเรียบร้อยแล้ว" });
    }
    
    sheet.deleteRow(rowIndex + 2); // บวก 2 เพื่อชดเชย 1-indexed และ row หัวตาราง
    return jsonResponse({ status: "success", message: "ลบข้อมูลสำเร็จ" });
  } else {
    return jsonResponse({ status: "error", message: "ไม่พบข้อมูลที่ต้องการลบ" }, 404);
  }
}

// ==================== GOOGLE DRIVE FILE UPLOAD LOGIC ====================

/**
 * จัดการสร้างโฟลเดอร์สำหรับลูกค้ารายใหม่ใน Drive
 */
function createDriveFolderForCustomer(companyName) {
  if (!MAIN_DRIVE_FOLDER_ID) return "";
  var parentFolder = DriveApp.getFolderById(MAIN_DRIVE_FOLDER_ID);
  var subFolder = parentFolder.createFolder(companyName);
  return subFolder.getId();
}

/**
 * อัปโหลดไฟล์จาก Frontend (Base64) ไปยัง Google Drive ของลูกค้าแต่ละราย
 */
function handleFileUpload(fileData, fileName, customerId, workerId, docType) {
  // 1. ค้นหาโฟลเดอร์ Drive ของลูกค้าก่อน
  var customers = readSheetData(SHEETS.CUSTOMERS);
  var customer = customers.find(function(c) { return c.id === customerId; });
  
  var targetFolderId = MAIN_DRIVE_FOLDER_ID; // ค่าเริ่มต้น
  
  if (customer && customer.drive_folder_id) {
    targetFolderId = customer.drive_folder_id;
  } else if (customer) {
    // ถ้ายังไม่มีโฟลเดอร์ ให้สร้างใหม่ทันที
    try {
      targetFolderId = createDriveFolderForCustomer(customer.companyName);
      // เซฟ Folder ID ลงในชีต
      var sheet = getSheet(SHEETS.CUSTOMERS);
      var rawCusts = readSheetRawData(SHEETS.CUSTOMERS);
      var rowIndex = findRowIndexById(rawCusts, customerId);
      if (rowIndex > -1) {
        sheet.getRange(rowIndex + 2, 9).setValue(targetFolderId);
      }
    } catch(err) {}
  }
  
  if (!targetFolderId) {
    return jsonResponse({ status: "error", message: "ไม่ได้ระบุ Folder ID ในระบบ Google Drive" }, 500);
  }
  
  // 2. แปลง Base64 เป็น Blob และสร้างไฟล์
  var folder = DriveApp.getFolderById(targetFolderId);
  var parts = fileData.split(",");
  var base64Data = parts.length > 1 ? parts[1] : parts[0];
  var contentType = parts.length > 1 ? parts[0].split(";")[0].split(":")[1] : "application/pdf";
  
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, contentType, fileName);
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  var fileUrl = file.getUrl();
  var fileId = file.getId();
  
  // 3. เรียกใช้งานระบบ AI OCR จาก Gemini หากได้รับการกำหนด API Key
  var parsedData = null;
  if (docType && GEMINI_API_KEY && (docType === "worker-passport" || docType === "worker-wp-doc" || docType === "worker-visa")) {
    try {
      parsedData = extractDataWithGemini(base64Data, contentType, docType);
    } catch (e) {
      Logger.log("ไม่สามารถแสกนด้วย AI Gemini ได้: " + e.toString());
    }
  }
  
  return jsonResponse({
    status: "success",
    fileUrl: fileUrl,
    fileId: fileId,
    parsedData: parsedData
  });
}

// ==================== LINE OA WEBHOOK & MESSAGE SENDER ====================

/**
 * ดักจับ Event จาก Line Webhook เพื่อบันทึกกลุ่ม ID เมื่อบอทถูกเชิญเข้าห้องกลุ่ม
 */
function handleLineWebhook(events) {
  try {
    var sheetLogs = getSheet(SHEETS.LINE_LOGS);
    var sheetGroups = getSheet(SHEETS.LINE_GROUPS);
    
    events.forEach(function(event) {
      var timestamp = new Date().toISOString();
      var eventType = event.type;
      var groupId = "";
      var userId = event.source.userId || "";
      
      if (event.source.type === "group") {
        groupId = event.source.groupId;
      } else if (event.source.type === "room") {
        groupId = event.source.roomId;
      }
      
      // บันทึก Log ทุกเหตุการณ์
      sheetLogs.appendRow([timestamp, eventType, groupId, userId, JSON.stringify(event)]);
      
      // กรณีบอทถูกดึงเข้ากลุ่ม หรือมีการพิมพ์ในกลุ่มใหม่ บันทึกรายชื่อกลุ่มอัตโนมัติ
      if (groupId && (eventType === "join" || eventType === "memberJoined" || eventType === "message")) {
        var rawGroups = readSheetRawData(SHEETS.LINE_GROUPS);
        var existingIndex = -1;
        for (var i = 0; i < rawGroups.length; i++) {
          if (rawGroups[i][0] === groupId) {
            existingIndex = i;
            break;
          }
        }
        
        if (existingIndex === -1) {
          sheetGroups.appendRow([groupId, "กลุ่มตรวจคนงาน - ตรวจพบเมื่อ " + new Date().toLocaleDateString('th-TH'), timestamp]);
        }
      }
    });
  } catch(e) {
    Logger.log("Line Webhook Error: " + e.toString());
  }
}

/**
 * ฟังก์ชันกลางสำหรับยิง Push Message ไปที่กลุ่ม LINE
 */
function sendLineNotification(toGroupId, messageText) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !toGroupId) {
    Logger.log("ไม่สามารถส่งแจ้งเตือน: ไม่ได้ระบุ LINE Token หรือ Group ID");
    return false;
  }
  
  var url = "https://api.line.me/v2/bot/message/push";
  var payload = {
    to: toGroupId,
    messages: [
      {
        type: "text",
        text: messageText
      }
    ]
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  Logger.log("Line API ส่งข้อความเสร็จสิ้น: Status Code " + responseCode + " - Response: " + response.getContentText());
  return responseCode === 200;
}

// ==================== DAILY EXPIRATION SCANNER (CRON JOB) ====================

/**
 * รันระบบแสกนพาสปอร์ต วีซ่า ใบอนุญาต ที่ใกล้หมดอายุรายวันและยิงเตือนเข้าไลน์
 * ให้ตั้งค่า Trigger รันฟังก์ชันนี้ทุกวัน (เช่น 08:00 - 09:00 น.)
 */
function dailyExpirationAlertJob() {
  try {
    var workers = readSheetData(SHEETS.WORKERS);
    var customers = readSheetData(SHEETS.CUSTOMERS);
    var lineGroups = readSheetData(SHEETS.LINE_GROUPS);
    
    if (lineGroups.length === 0) {
      Logger.log("ไม่มีรายชื่อกลุ่มที่จะส่งข้อความแจ้งเตือน");
      return;
    }
    
    var today = new Date();
    today.setHours(0,0,0,0);
    
    var expiringWorkers = [];
    
    workers.forEach(function(w) {
      var emp = customers.find(function(c) { return c.id === w.employerId; });
      var empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";
      
      var isWarning = false;
      var detailMsgs = [];
      
      // ตรวจพาสปอร์ต / CI (เตือนล่วงหน้า 180 วัน)
      if (w.passportExpiry) {
        var expPassDate = new Date(w.passportExpiry);
        var passDiff = Math.ceil((expPassDate - today) / (1000 * 60 * 60 * 24));
        if (passDiff < 0) {
          isWarning = true;
          detailMsgs.push("🔴 Passport/CI หมดอายุแล้วเมื่อ " + expPassDate.toLocaleDateString('th-TH'));
        } else if (passDiff <= 180) {
          isWarning = true;
          detailMsgs.push("🟡 Passport/CI ใกล้หมดอายุ เหลือ " + passDiff + " วัน (หมดอายุ " + expPassDate.toLocaleDateString('th-TH') + ")");
        }
      }
      
      if (isWarning) {
        expiringWorkers.push({
          name: w.firstName + " " + w.lastName + " (" + w.nationality + ")",
          empName: empName,
          details: detailMsgs.join("\n"),
          permitExpiry: w.permitExpiry // ส่งค่าไปเช็กกลุ่มไลน์ตามรุ่นสัญญา
        });
      }
    });
    
    if (expiringWorkers.length === 0) {
      Logger.log("ไม่มีแรงงานใกล้หมดอายุในวันนี้");
      return;
    }
    
    // ส่งข้อความแยกกลุ่ม
    lineGroups.forEach(function(g) {
      var isDateSpecific = isDateGroup(g.groupName);
      var targetWorkers = [];
      
      if (isDateSpecific) {
        // หากเป็นกลุ่มระบุวันที่ ให้ส่งเฉพาะต่างด้าวที่มีวันหมดอายุใบอนุญาตตรงกัน
        targetWorkers = expiringWorkers.filter(function(item) {
          return matchExpiryToGroupName(item.permitExpiry, g.groupName);
        });
      } else {
        // หากเป็นกลุ่มทั่วไป (แอดมิน) ให้รับแจ้งเตือนของทุกคน
        targetWorkers = expiringWorkers;
      }
      
      if (targetWorkers.length > 0) {
        // จัดกลุ่มตามนายจ้าง
        var grouped = {};
        targetWorkers.forEach(function(item) {
          if (!grouped[item.empName]) grouped[item.empName] = [];
          grouped[item.empName].push(item.name + "\n" + item.details);
        });
        
        var alertText = "📢 [ระบบแจ้งเตือนเอกสารต่างด้าว]\n" +
                        "👥 กลุ่ม: " + g.groupName + "\n" +
                        "ประจำวันที่: " + new Date().toLocaleDateString('th-TH') + "\n" +
                        "พบรายงานเอกสารใกล้หมดอายุดังนี้:\n\n";
                        
        for (var company in grouped) {
          alertText += "🏢 นายจ้าง: " + company + "\n";
          alertText += "-------------------------\n";
          alertText += grouped[company].join("\n\n") + "\n";
          alertText += "=========================\n\n";
        }
        
        alertText += "⚠️ โปรดประสานงานทำบัตรหรือต่อวีซ่าให้แรงงานด้วยค่ะ";
        
        sendLineNotification(g.groupId, alertText);
      }
    });
    
  } catch(e) {
    Logger.log("Error in daily expiration alert job: " + e.toString());
  }
}

/**
 * ตรวจสอบว่าเป็นกลุ่มไลน์ระบุวันที่ใบอนุญาตหมดอายุหรือไม่
 */
function isDateGroup(groupName) {
  if (!groupName) return false;
  var years = ["2568", "2569", "2570", "2571", "2572", "2573", "2574", "2575"];
  var months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
                "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  
  var nameLower = groupName.toLowerCase();
  
  for (var i = 0; i < years.length; i++) {
    if (nameLower.indexOf(years[i]) > -1) return true;
  }
  for (var j = 0; j < months.length; j++) {
    if (nameLower.indexOf(months[j].toLowerCase()) > -1) return true;
  }
  return false;
}

/**
 * ตรวจจับความเชื่อมโยงระหว่างวันหมดอายุใบอนุญาตทำงานกับชื่อกลุ่มไลน์
 */
function matchExpiryToGroupName(permitExpiry, groupName) {
  if (!permitExpiry || !groupName) return false;
  
  var date = new Date(permitExpiry);
  if (isNaN(date.getTime())) return false;
  
  var day = date.getDate();
  var month = date.getMonth(); 
  var yearEng = date.getFullYear();
  var yearThai = yearEng + 543;
  
  var thaiShortMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  var thaiLongMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  
  var shortMonth = thaiShortMonths[month];
  var longMonth = thaiLongMonths[month];
  var monthNum2 = (month + 1).toString().padStart(2, '0');
  var monthNum1 = (month + 1).toString();
  
  var patterns = [
    day + " " + shortMonth + " " + yearThai,
    day + " " + longMonth + " " + yearThai,
    day + "/" + monthNum2 + "/" + yearThai,
    day + "/" + monthNum1 + "/" + yearThai,
    day + "-" + monthNum2 + "-" + yearThai,
    day + " " + shortMonth + " " + yearThai.toString().substring(2)
  ];
  
  var nameLower = groupName.toLowerCase();
  for (var i = 0; i < patterns.length; i++) {
    if (nameLower.indexOf(patterns[i].toLowerCase()) > -1) {
      return true;
    }
  }
  return false;
}

// ==================== HELPER DATABASE UTILS ====================

function getSheet(sheetName) {
  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // ถ้าไม่มีให้สร้างชีตอัตโนมัติ
    sheet = ss.insertSheet(sheetName);
    // สร้างหัวตารางเริ่มต้นตามชนิดชีต
    var headers = [];
    if (sheetName === SHEETS.USERS) {
      headers = ["user_id", "email", "password", "name", "role", "customer_id"];
      sheet.appendRow(headers);
      sheet.appendRow(["usr-admin", "admin@system.com", "adminWorkerOS#2026", "นาย ศรุต คุณารักษ์", "admin", "-"]);
      sheet.appendRow(["usr-manager", "manager@system.com", "managerWorkerOS#2026", "ผู้จัดการทั่วไป", "manager", "-"]);
      sheet.appendRow(["usr-staff", "staff@system.com", "staffWorkerOS#2026", "พนักงานลงข้อมูล", "staff", "-"]);
    }
    else if (sheetName === SHEETS.CUSTOMERS) headers = ["id", "taxId", "companyName", "businessType", "coordinator", "phone", "createdAt", "branches_json", "drive_folder_id"];
    else if (sheetName === SHEETS.WORKERS) headers = ["id", "employerId", "title", "nationality", "workerUid", "permitNo", "permitExpiry", "firstName", "lastName", "dob", "passportNo", "passportPob", "passportAuth", "passportIssue", "passportExpiry", "status", "createdAt", "attachments_json", "gender", "position", "workplace", "refNo"];
    else if (sheetName === SHEETS.JOBS) headers = ["id", "customerId", "workerId", "jobType", "fee", "status", "notes", "updatedAt"];
    else if (sheetName === SHEETS.BANKS) {
      headers = ["id", "bankName", "accountName", "accountNumber", "promptPayId"];
      sheet.appendRow(headers);
      // Auto seed default bank accounts!
      sheet.appendRow(["bank-1", "ธนาคารกสิกรไทย", "นาย ศรุต คุณารักษ์", "026-1-82736-2", "0815559081"]);
      sheet.appendRow(["bank-2", "ธนาคารไทยพาณิชย์", "นาย ศรุต คุณารักษ์", "408-2-99812-7", "1102988776655"]);
    }
    else if (sheetName === SHEETS.LINE_GROUPS) headers = ["groupId", "groupName", "createdAt"];
    else if (sheetName === SHEETS.LINE_LOGS) headers = ["timestamp", "event_type", "groupId", "userId", "raw_event"];
    
    if (sheetName !== SHEETS.USERS && sheetName !== SHEETS.BANKS && headers.length > 0) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}

function readSheetRawData(sheetName) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // ไม่มีข้อมูล (เหลือแต่ Header)
  var lastCol = sheet.getLastColumn();
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function readSheetData(sheetName) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    if (sheetName === SHEETS.USERS) {
      sheet.appendRow(["usr-admin", "admin@system.com", "adminWorkerOS#2026", "นาย ศรุต คุณารักษ์", "admin", "-"]);
      sheet.appendRow(["usr-manager", "manager@system.com", "managerWorkerOS#2026", "ผู้จัดการทั่วไป", "manager", "-"]);
      sheet.appendRow(["usr-staff", "staff@system.com", "staffWorkerOS#2026", "พนักงานลงข้อมูล", "staff", "-"]);
      SpreadsheetApp.flush(); // 🔥 บังคับบันทึกข้อมูลและอัปเดตสเปรดชีตทันทีก่อนจะทำการดึงค่า
      lastRow = sheet.getLastRow();
    } else {
      return [];
    }
  }
  
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  var result = [];
  for (var i = 0; i < rawData.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = rawData[i][j];
    }
    result.push(rowObj);
  }
  return result;
}

function findRowIndexById(rawData, id) {
  for (var i = 0; i < rawData.length; i++) {
    if (rawData[i][0] === id) {
      return i; // ส่งคืน index (0-indexed ของข้อมูลแถวที่ไม่รวมหัวตาราง)
    }
  }
  return -1;
}

function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(data));
  return output;
}

/**
 * วิเคราะห์เอกสาร (รูปภาพ/PDF) ด้วย Gemini API เพื่อดึงข้อมูลแรงงาน
 */
function extractDataWithGemini(base64Data, mimeType, docType) {
  if (!GEMINI_API_KEY) return null;

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;
  
  var prompt = "You are a professional assistant. Parse this migrant worker document (" + docType + ") and extract the relevant fields. " +
               "Convert all dates to DD/MM/YYYY format. " +
               "Output ONLY a valid JSON object matching this schema, without markdown wrapping, json declaration, or backticks:\n" +
               "{\n" +
               "  \"firstName\": \"English first name or Thai name\",\n" +
               "  \"lastName\": \"English last name or Thai name\",\n" +
               "  \"uid\": \"13-digit worker ID (เลขประจำตัวคนต่างด้าว 13 หลัก) if found\",\n" +
               "  \"passportNo\": \"Passport number if passport\",\n" +
               "  \"passportExpiry\": \"DD/MM/YYYY format if passport\",\n" +
               "  \"permitNo\": \"Work permit number or Receipt number (เลขรับที่) if work permit\",\n" +
               "  \"permitExpiry\": \"DD/MM/YYYY format if work permit\",\n" +
               "  \"dob\": \"Date of birth in DD/MM/YYYY\",\n" +
               "  \"nationality\": \"Myanmar, Cambodia, or Laos\",\n" +
               "  \"gender\": \"Male or Female or ชาย or หญิง\",\n" +
               "  \"position\": \"Job position (ตำแหน่งงาน) e.g., กรรมกร\",\n" +
               "  \"workplace\": \"Workplace address (สถานที่ทำงาน) if found\",\n" +
               "  \"refNo\": \"17-digit reference number (รหัสอ้างอิงคนต่างด้าว) starting with RA if found\"\n" +
               "}";

  var payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  
  if (responseCode === 200) {
    var resText = response.getContentText();
    var json = JSON.parse(resText);
    if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0]) {
      var textResponse = json.candidates[0].content.parts[0].text;
      
      // Clean markdown code blocks if Gemini returns them despite instructions
      var cleanedText = textResponse.trim();
      if (cleanedText.indexOf("```") === 0) {
        cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      
      return JSON.parse(cleanedText);
    }
  } else {
    Logger.log("Gemini API Error: Status " + responseCode + " - Response: " + response.getContentText());
  }
  return null;
}

/**
 * บันทึกหรือแก้ไขข้อมูลกลุ่มไลน์
 */
function handleSaveLineGroup(groupData) {
  var sheet = getSheet(SHEETS.LINE_GROUPS);
  var rawGroups = readSheetRawData(SHEETS.LINE_GROUPS);
  
  var rowIndex = findRowIndexById(rawGroups, groupData.groupId);
  var timestamp = new Date().toISOString();
  
  if (rowIndex > -1) {
    // แก้ไขข้อมูลแถวเดิม (อัปเดตชื่อกลุ่ม)
    sheet.getRange(rowIndex + 2, 2).setValue(groupData.groupName);
  } else {
    // เพิ่มแถวใหม่
    sheet.appendRow([groupData.groupId, groupData.groupName, timestamp]);
  }
  
  return jsonResponse({ status: "success", message: "บันทึกกลุ่มไลน์สำเร็จ" });
}

// ฟังก์ชันดึงเนื้อหาจากไฟล์ HTML ย่อยมารวมกัน
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ฟังก์ชันสำหรับล้างข้อมูลจำลองทั้งหมดใน Google Sheets (ยกเว้นหัวตารางและบัญชีผู้ใช้งาน)
 * เพื่อเริ่มต้นใช้งานจริง
 */
function clearAllMockData() {
  var sheetsToClear = [SHEETS.CUSTOMERS, SHEETS.WORKERS, SHEETS.JOBS, SHEETS.LINE_GROUPS, SHEETS.LINE_LOGS];
  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  
  sheetsToClear.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // ลบตั้งแต่แถวที่ 2 ลงไปจนถึงแถวสุดท้าย
        sheet.deleteRows(2, lastRow - 1);
      }
    }
  });
}

