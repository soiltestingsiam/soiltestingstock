import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import FxBoundary from '../components/FxBoundary'
import { usePureWork } from '../store/useSpectacleStore'
import { usePetStore, dayKey } from '../store/usePetStore'
import { levelInfo, SUPPLY_DAILY_CAP } from '../pet/petData'
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

// team tile (glass bento): level · coins · today's Supply Drops → the ranking page.
// Not shown in โหมดทำงานล้วน.
function TeamTile() {
  const ready = usePetStore((s) => s.ready)
  const pet = usePetStore((s) => s.pet)
  if (!ready) return null
  const lv = levelInfo(pet.xp).level
  const drops = pet.supplyDay === dayKey() ? pet.supplyCount || 0 : 0
  return (
    <Link to="/ranking" className="team-tile glass-tile anim-fade-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl px-5 py-4" data-tilt>
      <span className="text-2xl" aria-hidden="true">🏆</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--text-primary)]">อันดับทีม & สัตว์เลี้ยงเพื่อนร่วมทีม</span>
        <span className="block text-xs text-[var(--text-secondary)]">ดูโพเดียม ส่งกำลังใจ แต่งโปรไฟล์และตู้เสื้อผ้า 4 ช่อง</span>
      </span>
      <span className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-primary)]">
        <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1">Lv.{lv}</span>
        <span className="rounded-full border border-amber-400/50 px-2.5 py-1">🪙 {formatNumber(pet.coins || 0)}</span>
        <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1">📦 วันนี้ {drops}/{SUPPLY_DAILY_CAP}</span>
      </span>
    </Link>
  )
}

export default function Dashboard() {
  const pulse = useTodayPulse()
  const pureWork = usePureWork()
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
          {!pureWork && (
            <FxBoundary name="team-tile">
              <TeamTile />
            </FxBoundary>
          )}
        </div>
      </div>
    </div>
  )
}
