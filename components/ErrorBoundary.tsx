'use client'

import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full">
            <div className="card text-center">
              <div className="text-5xl mb-4" role="img" aria-label="Error">⚠️</div>
              <h1 className="heading-1 mb-2">Something went wrong</h1>
              <p className="text-text-secondary mb-6">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary w-full"
              >
                Refresh Page
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-sm text-text-tertiary cursor-pointer">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Network Error Component
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="card text-center p-6">
      <div className="text-4xl mb-3" role="img" aria-label="No connection">📡</div>
      <h2 className="heading-2 mb-2">Connection Error</h2>
      <p className="text-text-secondary mb-4">
        Unable to connect to the server. Please check your internet connection and try again.
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
    </div>
  )
}

// Not Found Component
export function NotFound({ message = "Page not found" }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="text-6xl mb-4" role="img" aria-label="Not found">🔍</div>
          <h1 className="heading-1 mb-2">404</h1>
          <p className="text-text-secondary mb-6">{message}</p>
          <a href="/" className="btn-primary inline-block">
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}

// API Error Component  
export function ApiError({ 
  message = "Something went wrong",
  onRetry 
}: { 
  message?: string
  onRetry?: () => void 
}) {
  return (
    <div className="card border-error bg-error-50 p-6">
      <div className="flex items-start gap-3">
        <span className="text-error text-2xl flex-shrink-0" aria-hidden="true">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-error-700 mb-1">Error</h3>
          <p className="text-sm text-error-600 mb-3">{message}</p>
          {onRetry && (
            <button onClick={onRetry} className="btn-sm btn-secondary">
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
