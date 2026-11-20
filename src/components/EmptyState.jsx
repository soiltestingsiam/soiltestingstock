import PetSprite from '../pet/PetSprite'
import { usePetStore } from '../store/usePetStore'
import { useThemeStore } from '../store/useThemeStore'
import { usePureWork } from '../store/useSpectacleStore'
import { pickCoat, resolveOutfit } from '../pet/petData'

// "Nothing here" — the user's own pet peeks out of an empty box (just the box when the
// user has hidden their pet). Used for empty lists / no search results. Not used inside
// anything that is exported to PDF.

function Box({ children }) {
  return (
    <div className="empty-pet relative mx-auto h-[100px] w-[112px]" aria-hidden="true">
      {/* open flaps, behind the pet */}
      <svg className="absolute left-0 top-[44px] h-[24px] w-[112px]" viewBox="0 0 112 24">
        <path d="M10 17 L0 3 L34 1 L40 17 Z" fill="#c4874c" />
        <path d="M102 17 L112 3 L78 1 L72 17 Z" fill="#c4874c" />
      </svg>
      {children}
    </div>
  )
}

function BoxFront() {
  return (
    <svg className="absolute left-[8px] top-[59px] z-[2] h-[41px] w-[96px]" viewBox="0 0 96 41">
      <path d="M3 4 H93 L89 39 H7 Z" fill="#dba468" stroke="#a8743f" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="0" y="1" width="96" height="6" rx="2.5" fill="#c98f55" />
      <rect x="40" y="7" width="16" height="13" fill="#f3dcae" opacity=".75" />
      <path d="M22 28 h18 M22 32 h11" stroke="#a8743f" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

export function PetInBox() {
  const ready = usePetStore((s) => s.ready)
  const pet = usePetStore((s) => s.pet)
  const owner = usePetStore((s) => s.owner)
  const skin = useThemeStore((s) => s.skin)
  const pureWork = usePureWork()

  // hidden pet, or "โหมดทำงานล้วน": just the box
  if (!ready || pet.hidden || pureWork) {
    return (
      <Box>
        <span className="empty-q absolute left-1/2 top-[18px] -translate-x-1/2 text-2xl font-black text-[var(--text-accent)]">?</span>
        <BoxFront />
      </Box>
    )
  }
  const coat = pickCoat(pet.species, owner)
  const outfit = resolveOutfit('none', pet.wardrobe || pet.equipped, skin)
  const sprite = { position: 'absolute', left: 20, top: -2, width: 72, height: 83, '--gx': -0.25, '--gy': 0.45 }
  return (
    <Box>
      <div className="empty-pet-head z-[1]" style={sprite}>
        <PetSprite species={pet.species} coat={coat} outfit={outfit} pose="peek" layer="back" />
      </div>
      <BoxFront />
      <div className="z-[3]" style={sprite}>
        <PetSprite species={pet.species} coat={coat} outfit={outfit} pose="peek" layer="front" />
      </div>
      <span className="empty-q absolute right-[6px] top-[2px] text-lg font-black text-[var(--text-accent)]">?</span>
    </Box>
  )
}

export default function EmptyState({ title, hint, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-1 py-4 text-center ${className}`}>
      <PetInBox />
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      {hint && <p className="max-w-sm text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  )
}
