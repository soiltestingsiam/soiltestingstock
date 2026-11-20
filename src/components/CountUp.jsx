import { useEffect, useRef, useState } from 'react'
import { atLeast, motionReduced } from '../store/useSpectacleStore'

// Numbers that count up to their value (ease-out, ~0.8 s). Screen readers only ever get
// the final value; with reduced motion or the Lite level the value shows straight away.
export function useCountUp(value, { duration = 800 } = {}) {
  const target = Number(value) || 0
  const animate = !motionReduced() && atLeast('balanced')
  const [shown, setShown] = useState(animate ? 0 : target)
  const from = useRef(animate ? 0 : target)

  useEffect(() => {
    if (!animate) {
      from.current = target
      setShown(target)
      return undefined
    }
    const a = from.current
    if (a === target) {
      setShown(target)
      return undefined
    }
    const start = performance.now()
    let raf = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const e = 1 - (1 - t) ** 3
      if (t < 1) {
        setShown(a + (target - a) * e)
        raf = requestAnimationFrame(tick)
      } else {
        from.current = target
        setShown(target)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = target
    }
  }, [target, animate, duration])

  return shown
}

export default function CountUp({ value, format = (n) => Math.round(n).toLocaleString('th-TH'), className = '' }) {
  const shown = useCountUp(value)
  return (
    <span className={`tabular-nums ${className}`}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(Number(value) || 0)}</span>
    </span>
  )
}
