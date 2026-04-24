import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
          <div className="max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-rose-400" />
            <h2 className="text-lg font-semibold text-rose-200">Something went wrong</h2>
            <p className="mt-2 text-sm text-rose-100/80">
              {this.state.error?.message || 'An unexpected error occurred. Please refresh the page.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
