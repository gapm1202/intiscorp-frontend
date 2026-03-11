import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') {
        // allow Enter to confirm when modal is focused
        (confirmRef.current as HTMLButtonElement | null)?.click();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const modalRoot = document.getElementById('modal-root') || document.body;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="fixed inset-0 bg-blue-900/50 backdrop-blur-sm" onClick={onCancel} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative max-w-lg w-full mx-auto transform transition-all duration-200 ease-out scale-100"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-blue-100">
          <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-600 to-sky-400">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              </svg>
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-lg font-bold text-white">{title ?? 'Confirmación'}</h3>
              <p className="text-sm text-white/90 mt-1">{message}</p>
            </div>
          </div>

          <div className="p-6 bg-white">
            <p className="text-sm text-slate-600 mb-4">{/* additional help text could go here */}</p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-100 font-medium hover:bg-sky-100 transition"
              >
                No
              </button>

              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/></svg>
                    Iniciando...
                  </>
                ) : (
                  'Sí, iniciar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRoot);
}
