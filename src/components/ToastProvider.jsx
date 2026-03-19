import { useCallback, useMemo, useState } from "react";

import { ToastContext } from "./toastContext";

const TOAST_DURATION_MS = 3200;

const toneClassName = (type) => {
  switch (type) {
    case "success":
      return "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]";
    case "error":
      return "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]";
    default:
      return "border-[#dbe3f4] bg-white text-[#1f2937]";
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, options = {}) => {
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = options.type || "info";
    setToasts((prev) => [...prev, { id, message: normalizedMessage, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, options.duration ?? TOAST_DURATION_MS);
  }, []);

  const contextValue = useMemo(() => ({
    showToast,
    dismissToast,
  }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed right-4 top-[4.75rem] z-[300] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-[16px] border px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)] ${toneClassName(toast.type)}`}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1 text-[13px] font-medium leading-[1.6]">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-[8px] border border-current/15 px-2 py-1 text-[11px] font-semibold opacity-70"
              >
                닫기
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
