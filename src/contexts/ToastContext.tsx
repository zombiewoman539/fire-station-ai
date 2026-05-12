import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface ToastItem {
  id: string;
  type: 'error' | 'info' | 'success';
  message: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showSuccess: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((type: ToastItem['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-2), { id, type, message }]);
    const ttl = type === 'error' ? 7000 : 4000;
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttl);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = useMemo(() => ({
    toasts,
    showError: (m: string) => add('error', m),
    showInfo:  (m: string) => add('info', m),
    showSuccess: (m: string) => add('success', m),
    dismiss,
  }), [toasts, add, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
