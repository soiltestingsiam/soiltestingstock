import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useActiveFestival } from '../store/useFestivalStore'

// The active festival's decorations (sky · ambient · ground scene — see FestivalDecor.jsx).
// Pure eye-candy, so the drawing code is a separate chunk that loads just AFTER the page
// has loaded and gone idle (the festival colours themselves apply instantly via CSS).
// Only the spacer that reserves room for the ground scene is rendered from the first
// paint, so nothing jumps when the scene fades in.
const FestivalDecor = lazy(() => import('./FestivalDecor'))

function useAfterLoad() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let idle
    let timer
    const go = () => {
      const ric = window.requestIdleCallback
      if (ric) idle = ric(() => setReady(true), { timeout: 1500 })
      else timer = setTimeout(() => setReady(true), 300)
    }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      window.removeEventListener('load', go)
      if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle)
      clearTimeout(timer)
    }
  }, [])
  return ready
}

// Real-time light: <html data-daypart> = dawn (05–08) · day (08–16) · dusk (16–19) ·
// night (19–05), re-checked every 5 minutes. The festival scenes tint themselves by it
// (CSS); text and cards are never touched.
export function daypartOf(hour) {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 16) return 'day'
  if (hour >= 16 && hour < 19) return 'dusk'
  return 'night'
}
function useDaypart() {
  useEffect(() => {
    const apply = () => document.documentElement.setAttribute('data-daypart', daypartOf(new Date().getHours()))
    apply()
    const t = setInterval(apply, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])
}

export default function FestivalLayer() {
  const festival = useActiveFestival()
  const { pathname } = useLocation()
  const ready = useAfterLoad()
  useDaypart()
  if (!festival || festival === 'none') return null
  const login = pathname === '/login'
  return (
    <>
      {!login && <div className="fes-ground-spacer" aria-hidden="true" />}
      {ready && (
        <Suspense fallback={null}>
          <FestivalDecor festival={festival} login={login} />
        </Suspense>
      )}
    </>
  )
}
