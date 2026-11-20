// The custom cursor shapes (SVG), shared by the live cursor (InteractionLayer) and the
// previews in Settings. Every glyph is drawn so its HOTSPOT (the point that clicks) is the
// top-left corner of a 32×32 box — except the centred ones (reticle, ring), whose hotspot
// is the middle; `HOTSPOT` says which.

export const HOTSPOT = { paw: [4, 3], sakura: [3, 3], wand: [3, 3], reticle: [16, 16], ring: [16, 16] }

export function CursorGlyph({ shape, size = 32, className = '' }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', className, 'aria-hidden': true }
  switch (shape) {
    case 'paw':
      return (
        <svg {...common}>
          <g transform="rotate(-28 16 16)">
            <ellipse cx="16" cy="20" rx="6.4" ry="5.4" fill="#fff6f9" stroke="#3b2f3a" strokeWidth="1.6" />
            {[
              [8.6, 13.4, -18],
              [13.2, 9.2, -6],
              [18.8, 9.2, 6],
              [23.4, 13.4, 18],
            ].map(([cx, cy, r]) => (
              <ellipse key={cx} cx={cx} cy={cy} rx="2.7" ry="3.3" fill="#ff9ab6" stroke="#3b2f3a" strokeWidth="1.4" transform={`rotate(${r} ${cx} ${cy})`} />
            ))}
          </g>
          <circle cx="4" cy="3" r="2" fill="#ff5c8a" />
        </svg>
      )
    case 'sakura':
      // an ink brush with a sakura blossom at its tip
      return (
        <svg {...common}>
          <path d="M5 5 L26 26" stroke="#2b1d16" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 20 L27 27" stroke="#8b5a2b" strokeWidth="5" strokeLinecap="round" />
          <path d="M3 3 Q6 4 7.5 7.5 Q4 6 3 3 Z" fill="#111" />
          <g transform="translate(9 9)">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-3.6" rx="2.3" ry="3.4" fill="#ffc1d9" stroke="#e05583" strokeWidth=".7" transform={`rotate(${a})`} />
            ))}
            <circle r="1.3" fill="#e05583" />
          </g>
        </svg>
      )
    case 'reticle':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="10" fill="none" stroke="#22d3ee" strokeWidth="1.8" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="#d946ef" strokeWidth="1" strokeDasharray="4 6" className="cur-spin" />
          <path d="M16 2 V9 M16 23 V30 M2 16 H9 M23 16 H30" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="16" r="1.8" fill="#f0abfc" />
        </svg>
      )
    case 'wand':
      return (
        <svg {...common}>
          <path d="M8 8 L27 27" stroke="#3b2f1a" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M8 8 L27 27" stroke="#c99a3a" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 0.5 L6.6 4.4 L10.6 4.6 L7.5 7.1 L8.6 11 L5 8.8 L1.4 11 L2.5 7.1 L-0.6 4.6 L3.4 4.4 Z" transform="translate(1 0)" fill="#ffd54a" stroke="#8a5a00" strokeWidth=".8" />
        </svg>
      )
    case 'ring':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="11" fill="none" stroke="#d4af37" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="2.4" fill="#d4af37" />
        </svg>
      )
    default:
      // the system arrow (preview only)
      return (
        <svg {...common}>
          <path d="M6 3 L6 26 L12 20 L16 29 L20 27 L16 18.5 L24 18.5 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
  }
}
