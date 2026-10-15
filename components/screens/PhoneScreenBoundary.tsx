"use client";

import { Component, type ReactNode } from "react";

type BoundaryProps = {
  children: ReactNode;
  resetKey: string;
  onReturnHome: () => void;
};

type BoundaryState = { hasError: boolean };

export class PhoneScreenBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: BoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-[var(--phone-text)]">
        <h1 className="text-xl font-semibold">This mini app couldn’t open</h1>
        <p className="text-sm text-[var(--phone-text-secondary)]">
          Return to the Home screen and try another app.
        </p>
        <button
          type="button"
          className="rounded-full bg-[var(--phone-accent)] px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={this.props.onReturnHome}
        >
          Go to Home
        </button>
      </main>
    );
  }
}
