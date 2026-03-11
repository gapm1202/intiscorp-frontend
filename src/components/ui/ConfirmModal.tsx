import React from 'react';
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
  if (!open) return null;

  if (typeof document === 'undefined') return null;

  const modalRoot = document.getElementById('modal-root') || document.body;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-blue-900/50" onClick={onCancel} />

      <div className="relative max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl border border-blue-200 overflow-hidden">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-blue-800">{title ?? 'Confirmación'}</h3>
            <p className="mt-3 text-sm text-gray-700">{message}</p>
          </div>

          <div className="px-5 pb-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md bg-sky-100 text-blue-700 font-medium hover:bg-sky-200 transition"
            >
              No
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading ? 'Iniciando...' : 'Sí, iniciar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRoot);
}
