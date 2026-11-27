'use client';

import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { Button } from './button';

export interface DbErrorState {
  message: string;
  code?: string;
  hint?: string;
}

interface DatabaseErrorBannerProps {
  error: DbErrorState | null;
  onRetry?: () => void;
  loading?: boolean;
}

export function DatabaseErrorBanner({
  error,
  onRetry,
  loading = false,
}: DatabaseErrorBannerProps) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50/90 p-4 sm:p-5 text-red-950 space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-sm sm:text-base font-bold text-red-900 flex items-center gap-1.5">
                <Database className="h-4 w-4 shrink-0" />
                Problema de Conexão com o Banco de Dados
              </h3>
              {error.code && (
                <span className="font-mono text-[11px] font-semibold rounded-md bg-red-100 border border-red-200 px-2 py-0.5 text-red-800">
                  {error.code}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium text-red-900 leading-relaxed break-words">
              {error.message}
            </p>
            {error.hint && (
              <p className="text-xs text-red-800/90 leading-relaxed break-words">
                <strong>Como resolver:</strong> {error.hint}
              </p>
            )}
          </div>
        </div>

        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={onRetry}
            className="border-red-300 bg-white text-red-800 hover:bg-red-50 shrink-0 w-full sm:w-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
}

