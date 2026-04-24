import { Component } from 'react'

/**
 * Catches model/network errors from the 3D canvas subtree so the whole page does not go blank.
 */
export class ViewerErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch() {
    this.props.onError?.(this.state.error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-rose-200">
          <div>
            <p className="font-semibold">Could not load 3D model</p>
            <p className="mt-1 text-xs text-rose-100/80">
              Check CORS, the URL, or try another product. ({this.state.error?.message || 'Error'})
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
