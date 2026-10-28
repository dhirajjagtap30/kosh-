import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <pre style={{ whiteSpace: "pre-wrap", padding: 24, color: "#b91c1c", font: "14px monospace" }}>
        {"Something went wrong:\n\n" + String(this.state.error?.stack || this.state.error)}
      </pre>
    );
  }
}
