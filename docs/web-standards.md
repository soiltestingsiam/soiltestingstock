# มาตรฐานและการตรวจสอบเว็บไซต์ (Web Standards Audit)

เอกสารนี้บันทึก **ผลตรวจมาตรฐานเว็บจริง** ของระบบ STS Stock Management พร้อมวิธี
ตรวจซ้ำ เพื่อให้ทุกคนตรวจสอบเองได้ (reproducible).

> ผลเหล่านี้เป็น **ผลตรวจอัตโนมัติด้วยเครื่องมือมาตรฐานสากล** ไม่ใช่ใบรับรองจาก
> หน่วยงานภายนอก. มาตรฐาน ISO 9001 / ISO/IEC 17025 ที่แสดงในแอปเป็นมาตรฐานการ
> ทดสอบของบริษัท ซอยล์เทสติ้งสยาม — คนละส่วนกับการตรวจเว็บนี้.

## วันที่ตรวจ
19 พฤศจิกายน 2026

## เครื่องมือ
- **Google Lighthouse 12.2** (Chromium headless) — Performance, Accessibility, Best Practices, SEO
- **axe-core 4.10** (Deque) — กฎการเข้าถึง WCAG 2.0 / 2.1 ระดับ A และ AA

ตรวจบน **หน้าเข้าสู่ระบบ (หน้าสาธารณะ)** ซึ่งไม่ต้องใช้บัญชี จึงตรวจซ้ำได้โดยไม่ต้องมี
รหัสผ่าน.

## ผลตรวจ

### Google Lighthouse

| หมวด | เดสก์ท็อป | มือถือ |
|------|:---------:|:------:|
| Performance (ประสิทธิภาพ) | **99** | **92** |
| Accessibility (การเข้าถึง) | **100** | **100** |
| Best Practices (แนวปฏิบัติที่ดี) | **100** | **100** |
| SEO | **100** | **100** |

### axe-core (WCAG 2.0 / 2.1 · A + AA)
- **ข้อผิดพลาด (violations): 0**
- ผ่าน (passes): 17
- แท็กที่ตรวจ: `wcag2a, wcag2aa, wcag21a, wcag21aa`

### อื่น ๆ
- HTTPS / TLS — เข้ารหัสทุกการเชื่อมต่อ (โฮสต์บน Vercel)
- Responsive — รองรับมือถือ / แท็บเล็ต / เดสก์ท็อป
- `prefers-reduced-motion` — ลดแอนิเมชันให้ผู้ที่ตั้งค่าไว้
- `lang="th"`, meta description, theme-color, `robots.txt` ถูกต้อง

## วิธีตรวจซ้ำเอง (reproduce)

```bash
# 1) build + เปิดเว็บในเครื่อง
npm ci
npm run build
npm run preview -- --port 4193   # เปิด http://localhost:4193

# 2) Lighthouse (ต้องมี Chrome/Chromium)
npx lighthouse http://localhost:4193/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output-path=./lighthouse-desktop --preset=desktop
npx lighthouse http://localhost:4193/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output-path=./lighthouse-mobile
```

axe-core: เปิดหน้าเข้าสู่ระบบแล้วรัน `axe.run()` ด้วยแท็ก
`wcag2a, wcag2aa, wcag21a, wcag21aa` (เช่น ผ่านส่วนขยาย axe DevTools หรือ
`@axe-core/playwright`).

> คะแนน Performance อาจต่างเล็กน้อยตามเครื่อง/เครือข่ายที่ใช้รัน — หมวด Accessibility,
> Best Practices, SEO และผล axe-core จะคงที่.

## สรุปการปรับปรุงที่ทำเพื่อให้ผ่านมาตรฐาน
- เพิ่ม `<meta name="description">`, `theme-color`, ปรับ `<title>` และเพิ่ม `robots.txt` → SEO 100
- ขยายขนาดพื้นที่กดของปุ่ม (ปุ่มแสดงรหัสผ่าน + จุดบอกบท) ให้ได้มาตรฐาน target size → Accessibility 100
- แยกโค้ดตามหน้า (code-splitting ด้วย `React.lazy`) ไม่ให้หน้าเข้าสู่ระบบโหลดไลบรารีหนัก
  (xlsx / jspdf / html2canvas / QR) → ลดขนาด JS เริ่มต้นจาก ~1.5MB เหลือ ~230KB
- ย่อโลโก้เป็น WebP (199KB → 12KB) → LCP เร็วขึ้น, Performance ขึ้นเป็นเขียว
