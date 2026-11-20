import { useState } from 'react'
import { Lock, Check } from 'lucide-react'
import { usePetStore } from '../store/usePetStore'
import { WARDROBE, WARDROBE_SLOTS, WARDROBE_SLOT_IDS, levelInfo, wardrobeStatus, wardrobeHint } from './petData'

// ตู้เสื้อผ้า — 4 slots, mix & match (Headgear · Outfit · Hand Prop · Aura/Trail).
// "อัตโนมัติ" lets the user's theme + the festival dress that slot; anything picked wins it.
// Coin items take two taps (แลก? → แลกเลย) so nobody spends 🪙 by accident.
export default function Wardrobe({ festival = 'none' }) {
  const pet = usePetStore((s) => s.pet)
  const [tab, setTab] = useState('headgear')
  const [confirmId, setConfirmId] = useState(null)
  const level = levelInfo(pet.xp).level
  const ctx = { level, owned: pet.owned || [], festival }
  const current = pet.wardrobe?.[tab] || null
  const items = WARDROBE.filter((w) => w.slot === tab)
  const { wear, buy } = usePetStore.getState()

  const tile = (on, extra = '') =>
    `relative flex flex-col items-center rounded-lg border px-1 py-1.5 text-center transition ${
      on ? 'border-[var(--text-accent)] bg-[var(--bg-card-alt)]' : 'border-[var(--border-color)] hover:bg-[var(--bg-card-alt)]'
    } ${extra}`

  return (
    <div className="wardrobe">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">👗 ตู้เสื้อผ้า · ผสมได้ 4 ช่อง</span>
        <span className="wardrobe-coins rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-[var(--text-primary)]" title="เหรียญแฟชั่น — ได้จาก Supply Drop">
          🪙 {pet.coins || 0}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1" role="tablist" aria-label="ช่องแต่งตัว">
        {WARDROBE_SLOT_IDS.map((id) => {
          const s = WARDROBE_SLOTS[id]
          const on = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setTab(id)
                setConfirmId(null)
              }}
              className={`rounded-lg px-1 py-1 text-[10.5px] font-semibold transition ${on ? 'bg-blue-600 text-white' : 'bg-[var(--bg-card-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <span aria-hidden="true">{s.emoji}</span> {s.label}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5" role="tabpanel" aria-label={WARDROBE_SLOTS[tab].label}>
        <button type="button" onClick={() => wear(tab, null, festival)} className={tile(!current)} title="ให้ธีมและเทศกาลแต่งให้อัตโนมัติ">
          <span className="text-lg leading-none">🪄</span>
          <span className="mt-1 w-full truncate text-[10.5px] leading-tight text-[var(--text-secondary)]">อัตโนมัติ</span>
          {!current && <Check size={10} className="absolute right-1 top-1 text-[var(--text-accent)]" />}
        </button>
        {items.map((item) => {
          const st = wardrobeStatus(item, ctx)
          const on = current === item.id
          const canBuy = !st.ok && st.cost && (pet.coins || 0) >= st.cost
          const confirming = confirmId === item.id
          const label = st.ok ? item.name : confirming ? 'แลกเลย?' : st.reason
          return (
            <button
              key={item.id}
              type="button"
              data-item={item.id}
              disabled={!st.ok && !canBuy}
              onClick={() => {
                if (st.ok) {
                  wear(tab, on ? null : item.id, festival)
                  return
                }
                if (!canBuy) return
                if (!confirming) {
                  setConfirmId(item.id)
                  return
                }
                setConfirmId(null)
                if (buy(item.id)) wear(tab, item.id, festival)
              }}
              title={`${item.name} — ${st.ok ? (st.reason || 'สวมได้') : wardrobeHint(item)}`}
              className={tile(on, `${!st.ok && !canBuy ? 'cursor-not-allowed opacity-45' : ''} ${confirming ? 'ring-2 ring-amber-400' : ''}`)}
            >
              <span className="text-lg leading-none">{item.emoji}</span>
              <span className="mt-1 w-full truncate text-[10.5px] leading-tight text-[var(--text-secondary)]">{label}</span>
              {!st.ok && !canBuy && <Lock size={10} className="absolute right-1 top-1 text-[var(--text-muted)]" />}
              {on && <Check size={10} className="absolute right-1 top-1 text-[var(--text-accent)]" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
