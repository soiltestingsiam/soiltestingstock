import { useEffect } from 'react'
import { X, ShieldCheck, Accessibility, Gauge, Search, Lock, Smartphone, CheckCircle2 } from 'lucide-react'

// An honest, self-contained panel that shows the REAL automated audit results for this
// web app (reproducible with Google Lighthouse + axe-core on the public login page).
// These are automated audit snapshots, NOT an official third-party certification — the
// footnote says so plainly. Update AUDIT when you re-run the audits.

const AUDIT = {
  date: '19 พฤศจิกายน 2026',
  tools: 'Google Lighthouse 12.2 · axe-core 4.10',
  rows: [
    { icon: Accessibility, title: 'การเข้าถึง (Accessibility)', std: 'WCAG 2.0 / 2.1 · ระดับ A และ AA', result: 'axe-core 0 ข้อผิดพลาด · Lighthouse 100/100', ok: true },
    { icon: ShieldCheck, title: 'แนวปฏิบัติที่ดี (Best Practices)', std: 'Google Lighthouse', result: '100/100', ok: true },
    { icon: Search, title: 'SEO (การค้นพบ)', std: 'Google Lighthouse', result: '100/100', ok: true },
    { icon: Gauge, title: 'ประสิทธิภาพ (Performance)', std: 'Google Lighthouse', result: 'เดสก์ท็อป 99 · มือถือ 92', ok: true },
    { icon: Lock, title: 'ความปลอดภัยการเชื่อมต่อ', std: 'HTTPS / TLS', result: 'เข้ารหัสทุกการเชื่อมต่อ', ok: true },
    { icon: Smartphone, title: 'รองรับทุกอุปกรณ์', std: 'Responsive · prefers-reduced-motion', result: 'มือถือ / แท็บเล็ต / เดสก์ท็อป', ok: true },
  ],
}

export default function WebStandardsModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(6,10,22,.6)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }} onClick={onClose}>
      <div
        className="anim-pop relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/12 shadow-2xl"
        style={{ background: 'linear-gradient(160deg, rgba(20,38,74,.96), rgba(10,18,38,.97))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#22c55e,#38bdf8,#6366f1)' }} />
        <button type="button" onClick={onClose} aria-label="ปิด" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/15 hover:text-white">
          <X size={16} />
        </button>

        <div className="px-6 pb-6 pt-7 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">มาตรฐานและการตรวจสอบเว็บไซต์</h2>
              <p className="text-xs text-white/55">ผลตรวจอัตโนมัติ · ตรวจซ้ำได้ · {AUDIT.date}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {AUDIT.rows.map((r) => {
              const Icon = r.icon
              return (
                <div key={r.title} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                  <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-sky-300">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-400" /> {r.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/45">{r.std}</div>
                    <div className="mt-1 text-xs font-medium text-emerald-200/90">{r.result}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-white/45">
            ผลตรวจด้วยเครื่องมือมาตรฐานสากล ({AUDIT.tools}) บนหน้าเข้าสู่ระบบ — <span className="text-white/60">ตรวจซ้ำได้เองทุกเมื่อ</span> โดยรัน Lighthouse / axe-core กับหน้านี้
            เป็นผลตรวจทางเทคนิคอัตโนมัติ ไม่ใช่ใบรับรองจากหน่วยงานภายนอก ส่วนมาตรฐาน ISO 9001 · ISO/IEC 17025 เป็นมาตรฐานการทดสอบของบริษัท (คนละส่วนกับการตรวจเว็บ)
          </p>
        </div>
      </div>
    </div>
  )
}
