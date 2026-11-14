'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ToastContextValue = {
  notify: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue>({
  notify: () => undefined,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');

  const notify = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage(''), 3200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? <div className="toast">{message}</div> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
