import logoUrl from '../assets/sts-logo.png'

// The STS company seal, treated as an animated medal.
//  - animated: breathing glow aura + gentle float + a sheen that sweeps across it + hover tilt
//  - ring: a rotating gradient halo + two counter-rotating dashed orbit rings (login hero)
//  - coin: a glossy white disc behind the seal so the blue artwork reads crisply on any theme
export default function SealLogo({ size = 56, animated = true, ring = false, coin = false }) {
  return (
    <div
      className={`sts-logo relative shrink-0 ${animated ? 'logo-aura' : ''}`}
      style={{ width: size, height: size }}
    >
      {ring && <span className="sts-halo" aria-hidden="true" />}
      {coin && <span className="sts-coin" aria-hidden="true" />}

      {ring && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 z-[1]"
          aria-hidden="true"
        >
          <circle
            className="spin-slow"
            cx="50"
            cy="50"
            r={48}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.2"
            strokeDasharray="6 7"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle
            className="spin-slow-rev"
            cx="50"
            cy="50"
            r={40}
            fill="none"
            stroke="#d4af37"
            strokeWidth="1"
            strokeDasharray="2 9"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      )}

      <img
        src={logoUrl}
        alt="โลโก้ บริษัท ซอยล์เทสติ้งสยาม จำกัด"
        width={size}
        height={size}
        draggable={false}
        className={`relative z-[2] h-full w-full select-none object-contain ${animated ? 'float' : ''}`}
        style={{ filter: 'drop-shadow(0 4px 12px rgba(29, 78, 216, 0.3))' }}
      />

      {animated && <span className="sts-logo-sheen" aria-hidden="true" />}
    </div>
  )
}
