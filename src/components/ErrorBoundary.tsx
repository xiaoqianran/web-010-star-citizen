import { Component, type ErrorInfo, type ReactNode } from "react";
import { zh } from "@/i18n/zh";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <p className="load-hint">{zh.intro.crash}</p>;
    }
    return this.props.children;
  }
}
