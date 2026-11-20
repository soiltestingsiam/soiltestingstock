import { Component } from 'react'

// Every decorative layer (festival scenes, cursor & particles, the pet, the Supply Drop,
// ranking widgets…) is wrapped in this. If one of them throws — or its lazy chunk fails to
// load after a deploy — it quietly disappears and the stock system keeps working.
export default class FxBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    if (import.meta.env?.DEV) console.warn(`[decor:${this.props.name || 'layer'}] hidden after an error:`, error)
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null
    return this.props.children
  }
}
