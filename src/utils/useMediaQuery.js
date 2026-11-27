import { useEffect, useState } from 'react'

// true while the media query matches — used to render ONE layout at a time (cards on a
// phone, the table on wider screens) instead of hiding a duplicate with CSS.
export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange)
    return () => (mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange))
  }, [query])
  return matches
}

export const PHONE_QUERY = '(max-width: 767px)'
