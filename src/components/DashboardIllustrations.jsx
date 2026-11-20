// Hand-drawn SVG illustrations for the dashboard nav cards, styled to match
// the warehouse / truck / shelf / report reference artwork.

export function WarehouseIllustration() {
  return (
    <svg
      viewBox="0 0 140 120"
      className="h-28 w-32 drop-shadow-lg transition-transform duration-200 sm:h-32 sm:w-36 lg:h-40 lg:w-44"
    >
      <path d="M18 52 L70 22 L122 52 L122 100 L18 100 Z" fill="#F0D2A8" />
      <path d="M14 54 L70 20 L126 54 L118 58 L70 30 L22 58 Z" fill="#E0B076" />
      <rect x="30" y="64" width="22" height="20" rx="2" fill="#B9824A" opacity="0.6" />
      <rect x="88" y="64" width="22" height="20" rx="2" fill="#B9824A" opacity="0.6" />
      <path className="ill-door" d="M52 100 L52 66 Q52 60 58 60 L82 60 Q88 60 88 66 L88 100 Z" fill="#8A5A34" />
      <rect x="16" y="98" width="108" height="6" rx="2" fill="#C99A5F" />
      <g className="ill-pop">
        <circle cx="98" cy="86" r="22" fill="white" />
        <rect x="88" y="83" width="20" height="6" rx="2" fill="#94A3B8" />
        <rect x="95" y="76" width="6" height="20" rx="2" fill="#94A3B8" />
      </g>
    </svg>
  )
}

export function TruckIllustration() {
  return (
    <svg
      viewBox="0 0 140 120"
      className="h-28 w-32 drop-shadow-lg transition-transform duration-200 sm:h-32 sm:w-36 lg:h-40 lg:w-44"
    >
      <rect x="10" y="58" width="24" height="26" rx="3" fill="#E0AA63" />
      <rect x="14" y="44" width="20" height="18" rx="3" fill="#F0C589" />
      <g className="ill-bounce">
        <rect x="40" y="52" width="54" height="36" rx="4" fill="#2F84FB" />
        <path d="M94 62 L114 62 Q120 62 120 68 L120 88 L94 88 Z" fill="#5AA2FF" />
        <rect x="100" y="66" width="14" height="11" rx="2" fill="#DCEBFF" />
      </g>
      <g className="ill-wheel">
        <circle cx="56" cy="94" r="10" fill="#334155" />
        <circle cx="56" cy="94" r="4.5" fill="#CBD5E1" />
        <rect x="55" y="86" width="2" height="5" fill="#CBD5E1" />
      </g>
      <g className="ill-wheel">
        <circle cx="106" cy="94" r="10" fill="#334155" />
        <circle cx="106" cy="94" r="4.5" fill="#CBD5E1" />
        <rect x="105" y="86" width="2" height="5" fill="#CBD5E1" />
      </g>
      <circle cx="104" cy="34" r="17" fill="white" />
      <path
        d="M94 34 L114 34 M114 34 L109 29 M114 34 L109 39 M94 34 L99 29 M94 34 L99 39"
        stroke="#2F84FB"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ShelfIllustration() {
  return (
    <svg
      viewBox="0 0 140 120"
      className="h-28 w-32 drop-shadow-lg transition-transform duration-200 sm:h-32 sm:w-36 lg:h-40 lg:w-44"
    >
      <rect x="24" y="18" width="6" height="88" rx="2" fill="#94A3B8" />
      <rect x="110" y="18" width="6" height="88" rx="2" fill="#94A3B8" />
      <rect x="24" y="34" width="92" height="5" rx="2" fill="#64748B" />
      <rect x="24" y="66" width="92" height="5" rx="2" fill="#64748B" />
      <rect x="24" y="98" width="92" height="5" rx="2" fill="#64748B" />

      <rect className="ill-box" style={{ animationDelay: '0.00s' }} x="32" y="14" width="20" height="18" rx="2" fill="#E0AA63" />
      <rect className="ill-box" style={{ animationDelay: '0.08s' }} x="56" y="10" width="22" height="22" rx="2" fill="#F0C589" />
      <rect className="ill-box" style={{ animationDelay: '0.16s' }} x="82" y="16" width="20" height="16" rx="2" fill="#E0AA63" />

      <rect x="30" y="44" width="18" height="20" rx="2" fill="#34D399" />
      <rect className="ill-box" style={{ animationDelay: '0.24s' }} x="52" y="40" width="20" height="24" rx="2" fill="#22C55E" />

      <rect className="ill-box" style={{ animationDelay: '0.32s' }} x="60" y="72" width="22" height="24" rx="2" fill="#F87171" />
      <rect x="86" y="76" width="18" height="20" rx="2" fill="#FB923C" />
      <rect x="36" y="76" width="18" height="20" rx="2" fill="#A78BFA" />
    </svg>
  )
}

export function ReportIllustration() {
  return (
    <svg
      viewBox="0 0 140 120"
      className="h-28 w-32 drop-shadow-lg transition-transform duration-200 sm:h-32 sm:w-36 lg:h-40 lg:w-44"
    >
      <rect x="34" y="14" width="60" height="92" rx="8" fill="white" />
      <rect x="52" y="8" width="24" height="12" rx="3" fill="#EF4444" />
      <rect x="42" y="26" width="44" height="8" rx="2" fill="#334155" />
      <circle cx="48" cy="46" r="5" fill="#EF4444" />
      <path d="M42 58 Q48 50 54 58" stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="42" y="66" width="26" height="3" rx="1.5" fill="#CBD5E1" />
      <rect x="42" y="73" width="20" height="3" rx="1.5" fill="#CBD5E1" />
      <rect x="70" y="60" width="7" height="14" rx="1.5" fill="#FDBA74" />
      <rect x="79" y="52" width="7" height="22" rx="1.5" fill="#FB923C" />
      <path d="M68 48 L76 40 L82 46 L90 34" stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 34 L90 34 L90 40" stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(78 78) rotate(45)">
        <g className="ill-pencil">
          <rect x="0" y="0" width="10" height="34" rx="3" fill="#FB923C" />
          <path d="M0 0 L10 0 L5 -8 Z" fill="#FDE68A" />
        </g>
      </g>
    </svg>
  )
}
