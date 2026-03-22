import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
                    <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl max-w-md">
                        <h1 className="text-2xl font-bold text-rose-500 mb-4">Algo deu errado</h1>
                        <p className="text-slate-400 mb-6 text-sm">
                            Ocorreu um erro ao carregar esta parte da interface.
                        </p>
                        <div className="bg-slate-950 p-4 rounded-lg text-left overflow-auto max-h-40 mb-6">
                            <code className="text-xs text-rose-300">
                                {this.state.error?.message || "Erro desconhecido"}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-rose-600 hover:bg-rose-700 rounded-xl font-bold transition-colors"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
