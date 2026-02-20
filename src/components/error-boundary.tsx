"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="flex flex-col items-center gap-4 rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] p-8 shadow-[var(--card-shadow)]">
          <p className="text-sm text-[var(--muted)]">문제가 발생했습니다.</p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
          >
            다시 시도
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}
