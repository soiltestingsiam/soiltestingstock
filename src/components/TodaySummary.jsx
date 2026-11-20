import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { buildStockRows, lowStockRows, LOW_STOCK_THRESHOLD } from '../utils/stockStatus'
import { todaysActivity } from '../utils/todayActivity'
import { formatNumber } from '../utils/format'
import CountUp from './CountUp'

// "วันนี้" at a glance on the home page: a greeting, today's receipts / issues (keyed in
// today — whatever the document's own date — or dated today; see utils/todayActivity.js)
// and how many products are running low. Read-only — built from the data already loaded,
// with the same rules as the Stock page.

// The warehouse "pulse" for today — also drives the dashboard's light:
//   activity: calm (nothing yet) · busy (1–9 lines today) · hot (10+); alert = low stock
export function useTodayPulse() {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)
  return useMemo(() => {
    const today = todaysActivity(stockIns, stockOuts)
    const low = lowStockRows(buildStockRows(products, stockIns, stockOuts))
    const moves = today.inCount + today.outCount
    return {
      today,
      low,
      out: low.filter((r) => r.qty <= 0).length,
      activity: moves === 0 ? 'calm' : moves < 10 ? 'busy' : 'hot',
      alert: low.length > 0,
    }
  }, [products, stockIns, stockOuts])
}

const PULSE_TEXT = {
  calm: 'คลังยังเงียบ — ยังไม่มีรายการวันนี้',
  busy: 'วันนี้มีความเคลื่อนไหว',
  hot: 'วันนี้คลังคึกคักมาก 🔥',
}

function greeting(h) {
  if (h < 5) return 'สวัสดีค่ำคืนนี้'
  if (h < 12) return 'สวัสดีตอนเช้า'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}

// glow: '' | 'glow-busy' (something happened today) | 'glow-alert' (needs attention)
function Tile({ to, icon, tone, label, value, hint, glow = '' }) {
  return (
    <Link
      to={to}
      className={`rim-card today-tile ${glow} group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-3 text-center shadow-card transition hover:-translate-y-0.5 hover:border-[var(--text-accent)] sm:flex-row sm:gap-3 sm:px-4 sm:text-left`}
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

export default function TodaySummary({ pulse: given }) {
  const own = useTodayPulse()
  const pulse = given ?? own
  const username = useAuthStore((s) => s.profile?.username)
  const { today, low, out } = pulse

  const now = new Date()
  const dateText = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const count = (n) => (
    <>
      <CountUp value={n} /> รายการ
    </>
  )

  return (
    <section
      aria-labelledby="today-title"
      className="today-summary anim-fade-up mx-auto mb-7 max-w-5xl sm:mb-9"
      data-activity={pulse.activity}
      data-alert={pulse.alert ? 'low' : undefined}
    >
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
        <h2 id="today-title" className="text-sm font-bold text-[var(--text-primary)]">
          {greeting(now.getHours())}
          {username ? `, ${username}` : ''} 👋
        </h2>
        <span className="text-xs text-[var(--text-secondary)]">{dateText}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile
          to="/stock-in"
          tone="bg-emerald-500/15 text-emerald-500"
          icon={<ArrowDownToLine size={20} />}
          label="รับเข้าวันนี้"
          value={count(today.inCount)}
          hint={today.inCount ? `${formatNumber(today.inProducts)} สินค้า${today.inBackdated ? ` · เอกสารย้อนหลัง ${formatNumber(today.inBackdated)}` : ''}` : 'ยังไม่มีรายการรับเข้า'}
          glow={today.inCount ? 'glow-busy' : ''}
        />
        <Tile
          to="/stock-out"
          tone="bg-orange-500/15 text-orange-500"
          icon={<ArrowUpFromLine size={20} />}
          label="จ่ายออกวันนี้"
          value={count(today.outCount)}
          hint={today.outCount ? `${formatNumber(today.outProducts)} สินค้า${today.outBackdated ? ` · เอกสารย้อนหลัง ${formatNumber(today.outBackdated)}` : ''}` : 'ยังไม่มีรายการจ่ายออก'}
          glow={today.outCount ? 'glow-busy' : ''}
        />
        {low.length > 0 ? (
          <Tile
            to="/stock"
            tone="bg-red-500/15 text-red-500"
            icon={<AlertTriangle size={20} />}
            label="สินค้าเหลือน้อย"
            value={count(low.length)}
            hint={out ? `หมดสต๊อก ${formatNumber(out)} · ดูที่สินค้าคงเหลือ` : `เหลือ ≤ ${LOW_STOCK_THRESHOLD} หน่วย · ดูที่สินค้าคงเหลือ`}
            glow="glow-alert"
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
          <span className={`pulse-dot ${pulse.activity} ${pulse.alert ? 'alert' : ''}`} aria-hidden="true" />
          {PULSE_TEXT[pulse.activity]}
          {pulse.alert ? ' · มีสินค้าใกล้หมด' : ''}
        </p>
        <p className="text-[11px] text-[var(--text-secondary)]">นับรายการที่บันทึกวันนี้ (รวมเอกสารลงวันที่ย้อนหลัง) และเอกสารลงวันที่วันนี้ · ไม่รวมยอดยกมา</p>
      </div>
    </section>
  )
}
