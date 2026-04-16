import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorCount: 0, showDetails: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Log to audit_logs for observability (fire-and-forget)
    this.logErrorToBackend(error, errorInfo);
  }

  private async logErrorToBackend(error: Error, errorInfo: ErrorInfo) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        action: 'client_error',
        entity_type: 'error_boundary',
        entity_id: crypto.randomUUID(),
        entity_name: error.message?.substring(0, 200) || 'Unknown Error',
        metadata: {
          error_name: error.name,
          error_message: error.message,
          stack: error.stack?.substring(0, 2000),
          component_stack: errorInfo.componentStack?.substring(0, 2000),
          url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Silently fail — don't crash the error boundary
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const text = [
      `Erro: ${error?.name}: ${error?.message}`,
      `URL: ${window.location.href}`,
      `Data: ${new Date().toISOString()}`,
      '',
      'Stack:',
      error?.stack || 'N/A',
      '',
      'Component Stack:',
      errorInfo?.componentStack || 'N/A',
    ].join('\n');

    await navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, errorInfo, errorCount, showDetails, copied } = this.state;

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Algo deu errado</h2>
          <p className="text-muted-foreground mb-2 max-w-md">
            Ocorreu um erro inesperado. O incidente foi registrado automaticamente.
          </p>
          {errorCount > 2 && (
            <p className="text-xs text-destructive mb-4">
              Este erro ocorreu {errorCount} vezes. Recomendamos recarregar a página.
            </p>
          )}
          <div className="flex gap-3 mb-4">
            <Button onClick={this.handleReset} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" /> Início
            </Button>
            <Button onClick={() => window.location.reload()} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Recarregar
            </Button>
          </div>

          {/* Error details toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => this.setState({ showDetails: !showDetails })}
          >
            <Bug className="w-3 h-3 mr-1" />
            {showDetails ? 'Ocultar detalhes' : 'Ver detalhes técnicos'}
          </Button>

          {showDetails && (
            <div className="mt-3 max-w-lg w-full text-left">
              <div className="bg-muted rounded-lg p-4 text-xs font-mono overflow-auto max-h-48">
                <p className="text-destructive font-bold">{error?.name}: {error?.message}</p>
                {error?.stack && (
                  <pre className="mt-2 text-muted-foreground whitespace-pre-wrap text-[10px]">
                    {error.stack.split('\n').slice(0, 8).join('\n')}
                  </pre>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={this.handleCopyError}
              >
                {copied ? <CheckCheck className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copied ? 'Copiado!' : 'Copiar erro'}
              </Button>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
