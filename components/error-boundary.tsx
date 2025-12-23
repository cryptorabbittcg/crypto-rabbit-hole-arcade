"use client"

import React, { Component, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import HoloPanel from "@/components/holo-panel"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error("ErrorBoundary caught an error:", error, errorInfo)
    }
    // In production, you could log to an error reporting service here
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <HoloPanel accent="pink" className="max-w-2xl">
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-semibold text-white">
                Something went wrong
              </h2>
              <p className="text-muted-foreground">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                  <summary className="cursor-pointer text-sm font-mono text-red-300">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs text-red-200">
                    {this.state.error.toString()}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <div className="flex gap-3 pt-4">
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} variant="default">
                  Refresh Page
                </Button>
              </div>
            </div>
          </HoloPanel>
        </div>
      )
    }

    return this.props.children
  }
}




