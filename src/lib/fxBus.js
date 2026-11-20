// A tiny in-app event bus for "moments" — the pet, the sounds and the atmosphere react to
// them. Only ever emitted AFTER the real work succeeded (a save, an export…); listeners
// are decorative and can never affect stock data.
//
// Events: stock-in · stock-out · product-add · report-open · report-export · low-stock ·
//         festival-curtain · egg · combo
const listeners = new Set()

export function emitFx(type, detail = {}) {
  for (const fn of [...listeners]) {
    try {
      fn({ type, detail, at: Date.now() })
    } catch {
      /* a decorative listener must never break the caller */
    }
  }
}

export function onFx(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
