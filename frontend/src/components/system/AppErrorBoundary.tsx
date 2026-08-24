import { ArrowClockwise, House } from "@phosphor-icons/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("UI error boundary", error, errorInfo);
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-error-boundary" role="alert">
        <section className="app-error-boundary__card">
          <span className="app-error-boundary__eyebrow">
            Ekran yüklenemedi
          </span>
          <h1>Burada beklenmeyen bir sorun oluştu.</h1>
          <p>
            Seçimleriniz kaybolmadan önce ekranı yeniden yüklemeyi deneyin.
            Sorun sürerse ana rezervasyon sayfasına dönebilirsiniz.
          </p>
          <div className="app-error-boundary__actions">
            <button type="button" onClick={() => window.location.reload()}>
              <ArrowClockwise weight="bold" aria-hidden="true" />
              Yeniden dene
            </button>
            <a href="/">
              <House weight="bold" aria-hidden="true" />
              Rezervasyona dön
            </a>
          </div>
        </section>
      </main>
    );
  }
}
