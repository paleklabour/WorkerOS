#!/bin/sh
# Build สำหรับ Cloudflare Pages (owner 2026-10-28) — Build command: sh build.sh, Build output directory: dist
# คัดเฉพาะไฟล์ที่หน้าเว็บใช้ลง dist/ (ไม่เอา .md / supabase/ / legacy/ ขึ้นเว็บ)
# แล้วย่อ app.js / supabase-client.js: ลบคอมเมนต์ + ย่อชื่อตัวแปรภายในฟังก์ชัน
# (ไม่ย่อชื่อฟังก์ชันระดับบน — onclick="..." ใน HTML เรียกชื่อพวกนั้นตรง ๆ)
set -e
rm -rf dist
mkdir -p dist
cp index.html invoice.html privacy.html share.html share-customer.html share-job.html styles.css boot.js dist/
cp -r assets dist/
npx --yes terser@5.31.0 app.js --compress --mangle --comments false --output dist/app.js
npx --yes terser@5.31.0 supabase-client.js --compress --mangle --comments false --output dist/supabase-client.js
npx --yes terser@5.31.0 boot.js --compress --mangle --comments false --output dist/boot.js
echo "build done"
