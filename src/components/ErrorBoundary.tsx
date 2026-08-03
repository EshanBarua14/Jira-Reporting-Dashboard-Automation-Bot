import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

export interface ErrorBoundaryProps {
  children?: ReactNode;
  name?: string;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary - ${this.props.name || "Widget"}] Render error:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-rose-200 space-y-3 shadow-xl backdrop-blur-md relative overflow-hidden my-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                  {this.props.name ? `${this.props.name} Crash Prevented` : "Component Error Prevented"}
                </h4>
                <p className="text-[10px] text-rose-300/80 font-medium">
                  An isolated rendering error occurred in this widget. Other components remain unaffected.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={this.handleReset}
              className="text-[10px] font-black uppercase bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl border border-rose-400/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Widget
            </button>
          </div>

          <div className="pt-2 border-t border-rose-900/30 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="text-[9px] font-bold text-rose-400/90 hover:text-rose-200 flex items-center gap-1 self-start cursor-pointer uppercase tracking-wider"
            >
              {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {this.state.showDetails ? "Hide Error Stack" : "View Diagnostics"}
            </button>

            {this.state.showDetails && (
              <div className="bg-slate-950 p-3 rounded-xl border border-rose-900/50 font-mono text-[9.5px] text-rose-300/90 space-y-1.5 overflow-x-auto max-h-40">
                <p className="font-bold text-rose-400">{this.state.error?.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[8.5px] text-slate-400 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
