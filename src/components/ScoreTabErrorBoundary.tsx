import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors inside the Scores tab so a single bad workout/score
 * row never produces a fully blank screen during a live competition.
 */
export class ScoreTabErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface in console for debugging — the previous behaviour was a silent
    // blank screen with no signal at all.
    console.error("[ScoreTab] render error:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="bg-card border border-destructive/30 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Scoring view failed to load
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Something went wrong while rendering the score capture screen.
                Your saved scores are safe.
              </p>
              <pre className="mt-3 text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                {this.state.error.message || String(this.state.error)}
              </pre>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={this.reset} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
