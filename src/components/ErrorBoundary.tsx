import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  reset = () => {
    try {
      localStorage.removeItem('apt-dashboard-data-v1');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="not-found" role="alert">
        <h1>Oops</h1>
        <p style={{ margin: '8px 0 20px', color: 'var(--gray-500)' }}>
          Something went wrong while rendering this page.
        </p>
        <button className="btn btn-primary" onClick={this.reset}>
          Reset demo data and reload
        </button>
      </div>
    );
  }
}
