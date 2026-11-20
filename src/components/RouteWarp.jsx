import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSpectacle } from '../store/useSpectacleStore'

// A short "warp" between pages: a ring of the theme's light opens from the centre and fades
// (≈0.4 s). Overlay only — the page itself is never transformed, so nothing jumps, and it
// never takes a click (pointer-events: none). Off at Eco, with reduced motion, in โหมด
// ทำงานล้วน and in print.
export default function RouteWarp() {
  const { pathname } = useLocation()
  const { atLeast, reduced } = useSpectacle()
  const [n, setN] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setN((x) => x + 1)
  }, [pathname])
  if (!n || reduced || !atLeast('balanced')) return null
  return (
    <div key={n} className="route-warp" aria-hidden="true">
      <span />
    </div>
  )
}
