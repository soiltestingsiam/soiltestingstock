import TopBar from '../components/TopBar'
import NavCard from '../components/NavCard'
import TodaySummary, { useTodayPulse } from '../components/TodaySummary'
import { formatNumber } from '../utils/format'
import {
  WarehouseIllustration,
  TruckIllustration,
  ShelfIllustration,
  ReportIllustration,
} from '../components/DashboardIllustrations'

// the dashboard's light follows the warehouse: calm blue; green when there is activity
// today; a warm amber glow when something is running low (soft — numbers stay readable)
const AURA = {
  calm: ['#3b82f6', '#6366f1'],
  busy: ['#10b981', '#3b82f6'],
  hot: ['#10b981', '#f59e0b'],
}

export default function Dashboard() {
  const pulse = useTodayPulse()
  const [c1, c2] = AURA[pulse.activity]
  return (
    <div className="dash-root relative min-h-screen overflow-hidden" data-activity={pulse.activity} data-alert={pulse.alert ? 'low' : undefined}>
      {/* fades out toward the bottom so it blends into the festival ground scene below */}
      <div className="aurora" aria-hidden="true" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}>
        <span style={{ width: 520, height: 520, top: '-16%', left: '-6%', background: `radial-gradient(circle, ${c1}, transparent 60%)`, opacity: 0.3, transition: 'background 1.2s ease' }} />
        <span style={{ width: 460, height: 460, bottom: '-18%', right: '-8%', background: `radial-gradient(circle, ${pulse.alert ? '#f59e0b' : c2}, transparent 60%)`, animationDelay: '-9s', opacity: pulse.alert ? 0.24 : 0.3 }} />
      </div>
      {/* spotlight beams behind the welcome title (Showstopper level only, see CSS) */}
      <div className="dash-beams" aria-hidden="true">
        <span />
        <span />
      </div>

      <div className="relative z-10">
        <TopBar />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-10">
          <div className="mb-7 text-center anim-fade-up sm:mb-9">
            <h1 className="text-3xl font-extrabold tracking-wide text-shine sm:text-4xl">ยินดีต้อนรับสู่ระบบจัดการสต็อก</h1>
            {/* gold flourish divider */}
            <div className="mx-auto mt-3 flex items-center justify-center gap-2">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4af37]" />
              <span className="h-1.5 w-1.5 rotate-45 bg-[#d4af37] [animation:sts-twinkle_2.4s_ease-in-out_infinite]" />
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4af37]" />
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">STS · SOIL TESTING SIAM — เลือกเมนูด้านล่างเพื่อเริ่มต้นใช้งาน</p>
          </div>
          <TodaySummary pulse={pulse} />
          <div className="stagger grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          <NavCard
            to="/stock-in"
            icon={<WarehouseIllustration />}
            title="Stock In"
            subtitle="Incoming Goods"
            description="Record and track incoming goods"
            badge={pulse.today.inCount ? `วันนี้ ${formatNumber(pulse.today.inCount)} รายการ` : null}
            glow="rgba(16,185,129,0.22)"
            floatDelay="0s"
          />
          <NavCard
            to="/stock-out"
            icon={<TruckIllustration />}
            title="Stock Out"
            subtitle="Outgoing Goods"
            description="Record outgoing goods and issues"
            badge={pulse.today.outCount ? `วันนี้ ${formatNumber(pulse.today.outCount)} รายการ` : null}
            glow="rgba(180,83,9,0.24)"
            floatDelay="-1.2s"
          />
          <NavCard
            to="/stock"
            icon={<ShelfIllustration />}
            title="Stock"
            subtitle="Stock Management"
            description="Check stock balances and status"
            badge={pulse.alert ? `⚠ ใกล้หมด ${formatNumber(pulse.low.length)}` : null}
            badgeTone={pulse.alert ? 'alert' : ''}
            glow="rgba(37,99,235,0.24)"
            floatDelay="-2.4s"
          />
          <NavCard
            to="/reports"
            icon={<ReportIllustration />}
            title="Reports"
            subtitle="Reports"
            description="Summary reports and analytics"
            glow="rgba(147,51,234,0.24)"
            floatDelay="-3.6s"
          />
          </div>
        </div>
      </div>
    </div>
  )
}
