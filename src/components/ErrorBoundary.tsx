import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** Evita que un error de render deje la app en blanco (p. ej. en quirófano). */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Alert variant="danger" title="Ocurrió un error inesperado" role="alert">
          No se pudo mostrar esta pantalla. Los datos no se enviaron a ningún lugar. Vuelva al inicio e ingrese la evaluación
          nuevamente.
        </Alert>
        <Button onClick={() => window.location.assign('/')}>Volver al inicio</Button>
      </div>
    );
  }
}
