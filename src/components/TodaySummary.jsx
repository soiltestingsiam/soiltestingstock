import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { buildStockRows, lowStockRows, todaysMovements, LOW_STOCK_THRESHOLD } from '../utils/stockStatus'
import { formatNumber } from '../utils/format'

// "วันนี้" at a glance on the home page: a greeting, today's receipts / issues (by the
// document date, same as the reports) and how many products are running low. Read-only —
// built from the data already loaded, with the same rules as the Stock page.

function greeting(h) {
  if (h < 5) return 'สวัสดีค่ำคืนนี้'
  if (h < 12) return 'สวัสดีตอนเช้า'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}

function Tile({ to, icon, tone, label, value, hint }) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-3 text-center shadow-card transition hover:-translate-y-0.5 hover:border-[var(--text-accent)] sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
    >
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${tone}`}>{icon}</span>
      <span className="w-full min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-[var(--text-secondary)]">{label}</span>
        <span className="block truncate text-base font-extrabold leading-tight text-[var(--text-primary)] sm:text-lg">{value}</span>
        <span className="hidden truncate text-[11px] text-[var(--text-secondary)] sm:block">{hint}</span>
      </span>
      <ChevronRight size={16} className="hidden flex-shrink-0 text-[var(--text-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--text-accent)] sm:block" />
    </Link>
  )
}

export default function TodaySummary() {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)
  const username = useAuthStore((s) => s.profile?.username)

  const today = useMemo(() => todaysMovements(stockIns, stockOuts), [stockIns, stockOuts])
  const low = useMemo(() => lowStockRows(buildStockRows(products, stockIns, stockOuts)), [products, stockIns, stockOuts])
  const out = low.filter((r) => r.qty <= 0).length

  const now = new Date()
  const dateText = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <section aria-labelledby="today-title" className="anim-fade-up mx-auto mb-7 max-w-5xl sm:mb-9">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
        <h2 id="today-title" className="text-sm font-bold text-[var(--text-primary)]">
          {greeting(now.getHours())}
          {username ? `, ${username}` : ''} 👋
        </h2>
        <span className="text-xs text-[var(--text-muted)]">{dateText}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile
          to="/stock-in"
          tone="bg-emerald-500/15 text-emerald-500"
          icon={<ArrowDownToLine size={20} />}
          label="รับเข้าวันนี้"
          value={`${formatNumber(today.inCount)} รายการ`}
          hint={today.inCount ? `${formatNumber(today.inProducts)} สินค้า` : 'ยังไม่มีรายการรับเข้า'}
        />
        <Tile
          to="/stock-out"
          tone="bg-orange-500/15 text-orange-500"
          icon={<ArrowUpFromLine size={20} />}
          label="จ่ายออกวันนี้"
          value={`${formatNumber(today.outCount)} รายการ`}
          hint={today.outCount ? `${formatNumber(today.outProducts)} สินค้า` : 'ยังไม่มีรายการจ่ายออก'}
        />
        {low.length > 0 ? (
          <Tile
            to="/stock"
            tone="bg-red-500/15 text-red-500"
            icon={<AlertTriangle size={20} />}
            label="สินค้าเหลือน้อย"
            value={`${formatNumber(low.length)} รายการ`}
            hint={out ? `หมดสต๊อก ${formatNumber(out)} · ดูที่สินค้าคงเหลือ` : `เหลือ ≤ ${LOW_STOCK_THRESHOLD} หน่วย · ดูที่สินค้าคงเหลือ`}
          />
        ) : (
          <Tile
            to="/stock"
            tone="bg-sky-500/15 text-sky-500"
            icon={<CheckCircle2 size={20} />}
            label="สินค้าเหลือน้อย"
            value="ไม่มี ✓"
            hint="สต๊อกทุกรายการยังเพียงพอ"
          />
        )}
      </div>
      <p className="mt-2 px-1 text-[11px] text-[var(--text-muted)]">นับตามวันที่ในเอกสาร (เหมือนในรายงาน) · ไม่รวมยอดยกมา</p>
    </section>
  )
}
