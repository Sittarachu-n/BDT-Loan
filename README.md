# ระบบคำนวณสิทธิและค่างวดเงินกู้สวัสดิการ

Static web app สำหรับประเมินสิทธิการกู้เงิน ค่างวดรายเดือน และสร้างรายงานสรุปสำหรับพิมพ์หรือบันทึกเป็น PDF

## Deploy บน Vercel

โปรเจกต์นี้เป็น static site สามารถ import จาก GitHub เข้า Vercel ได้โดยใช้ค่าเริ่มต้น:

- Framework Preset: Other
- Build Command: เว้นว่าง
- Output Directory: เว้นว่าง หรือ `.`

## ตรวจสอบก่อนนำขึ้นใช้งาน

เปิดใช้งานในเครื่องได้โดยเปิดไฟล์ `index.html` ผ่านเบราว์เซอร์โดยตรง หรือใช้คำสั่ง:

```powershell
python -m http.server 8000
```

ตรวจสอบ syntax และสูตรหลักด้วยคำสั่ง:

```powershell
node --check app.js
node tests/formulas.test.js
```
