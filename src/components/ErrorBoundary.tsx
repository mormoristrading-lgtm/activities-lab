import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Catches render errors so a single bad query can't blank the whole app. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl p-6" style={{ color: 'var(--text)' }}>
          <h1 className="text-2xl">Something went wrong</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--dim)' }}>
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-4 rounded-card-sm px-4 py-2 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
