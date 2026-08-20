import { Component, type ReactNode } from "react";
import { isChunkLoadError, handleChunkError, clearChunkRetry } from "@/lib/chunkError";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  isChunkError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      const reloading = handleChunkError();
      if (!reloading) clearChunkRetry();
      return;
    }
    console.error("Erro não capturado:", error);
  }

  render() {
    if (this.state.error) {
      const chunkError = this.state.isChunkError;
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center">
            <h1 className="text-lg font-bold mb-2">
              {chunkError ? "A aplicação foi atualizada" : "Ocorreu um erro"}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {chunkError
                ? "Uma nova versão do Bornaal foi publicada enquanto usavas a aplicação. Recarrega para continuar."
                : "Pedimos desculpa. Algo correu mal ao mostrar esta página."}
            </p>
            {!chunkError && (
              <pre className="text-xs text-left bg-muted rounded-md p-3 mb-4 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ error: null });
                clearChunkRetry();
                window.location.reload();
              }}
              className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;