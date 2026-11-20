import { Volume2, VolumeX } from 'lucide-react'
import { useSpectacleStore } from '../store/useSpectacleStore'
import { play } from '../lib/sfx'

// Quick mute / unmute for the effect sounds (off by default). One click, always visible.
export default function SoundToggle({ className = '', size = 16 }) {
  const sound = useSpectacleStore((s) => s.sound)
  const pureWork = useSpectacleStore((s) => !!s.pureWork)
  // โหมดทำงานล้วน: sounds are off, so the quick toggle goes away too
  if (pureWork) return null
  return (
    <button
      data-print-hide
      type="button"
      onClick={() => {
        useSpectacleStore.getState().toggleSound()
        if (!sound) setTimeout(() => play('click'), 20)
      }}
      aria-pressed={sound}
      aria-label={sound ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
      title={sound ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
      className={className}
    >
      {sound ? <Volume2 size={size} /> : <VolumeX size={size} />}
    </button>
  )
}
