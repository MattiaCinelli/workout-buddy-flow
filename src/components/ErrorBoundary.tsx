import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

// A render error anywhere below this used to white-screen the whole app.
// Now it shows a recoverable fallback — all data lives in IndexedDB, so a
// reload is safe and loses nothing.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The screen hit an unexpected error. Your workouts and history are stored on this
            device and are safe — reloading usually clears it.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Reload app</Button>
            <Button variant="outline" onClick={() => { this.setState({ error: null }); }}>Try again</Button>
          </div>
          <details className="rounded-md border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">Error details</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{this.state.error.message}</pre>
          </details>
        </div>
      </div>
    );
  }
}
