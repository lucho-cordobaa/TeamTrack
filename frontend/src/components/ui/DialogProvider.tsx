import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

interface NotifyOptions {
  title: string;
  message: string;
  variant?: 'success' | 'error';
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (options: NotifyOptions) => Promise<void>;
}

type ActiveDialog =
  | ({ kind: 'confirm' } & ConfirmOptions)
  | ({ kind: 'notify' } & NotifyOptions);

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const open = useCallback(
    (next: ActiveDialog) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setDialog(next);
      }),
    [],
  );

  const close = useCallback((confirmed: boolean) => {
    setDialog(null);
    resolver.current?.(confirmed);
    resolver.current = null;
  }, []);

  const value = useMemo<DialogContextValue>(
    () => ({
      confirm: (options) => open({ kind: 'confirm', ...options }),
      notify: async (options) => {
        await open({ kind: 'notify', ...options });
      },
    }),
    [open],
  );

  useEffect(() => {
    if (!dialog) return;
    // Se captura antes que el Modal de abajo para que Escape cierre solo este cartel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [dialog, close]);

  const isConfirm = dialog?.kind === 'confirm';
  const isError = dialog?.kind === 'notify' && dialog.variant === 'error';

  return (
    <DialogContext.Provider value={value}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => close(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-message"
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  isConfirm
                    ? 'bg-rose-500/10 text-rose-400'
                    : isError
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {isConfirm ? <AlertTriangle size={20} /> : isError ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="min-w-0">
                <h3 id="dialog-title" className="text-base font-bold text-white tracking-tight">
                  {dialog.title}
                </h3>
                <p id="dialog-message" className="text-sm text-slate-400 mt-1 leading-relaxed">
                  {dialog.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              {dialog.kind === 'confirm' ? (
                <>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => close(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => close(true)}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                  >
                    {dialog.confirmLabel || 'Eliminar'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  autoFocus
                  onClick={() => close(true)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  Aceptar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog debe usarse dentro de un DialogProvider');
  }
  return context;
};
