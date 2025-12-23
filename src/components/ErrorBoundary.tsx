'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Application crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorDump = [
        `Error: ${this.state.error?.message || 'Unknown error'}`,
        '',
        'Stack Trace:',
        this.state.error?.stack || 'No stack trace available',
        '',
        'Component Stack:',
        this.state.errorInfo?.componentStack || 'No component stack available',
        '',
        `Timestamp: ${new Date().toISOString()}`,
        `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      ].join('\n');

      return (
        <div 
          className="fixed inset-0 bg-black flex flex-col items-center justify-center font-mono p-8"
          style={{ zIndex: 99999 }}
        >
          <div className="flex flex-col items-center gap-8 w-full max-w-[800px]">
            {/* Title - matching loading screen style */}
            <div className="text-white text-2xl tracking-[0.3em] font-light">
              BULLHORN AEROSYSTEMS HAS CRASHED
            </div>

            {/* Error dump */}
            <textarea
              readOnly
              value={errorDump}
              className="w-full h-[280px] bg-[#0a0a0a] border border-[#222] text-[#555] text-[9px] p-4 font-mono resize-none focus:outline-none"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />

            {/* Reload button - bordered */}
            <button
              onClick={this.handleReload}
              className="text-[10px] text-white tracking-[0.2em] border border-[#333] px-6 py-3 hover:bg-white/5 hover:border-[#555] transition-all"
            >
              RELOAD APPLICATION
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

