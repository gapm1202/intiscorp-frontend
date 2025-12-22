import { useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: (motivo: string) => void;
}

const ConfirmModal = ({
  isOpen,
  title = 'Confirmar acción',
  message = 'Indica el motivo para continuar',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onCancel,
  onConfirm,
}: ConfirmModalProps) => {
  const [motivo, setMotivo] = useState('');

  // El componente se desmonta cuando `isOpen` es false, por lo que
  // reiniciar `motivo` en un efecto no es necesario y puede causar
  // advertencias de render en cascada. Eliminamos el efecto.

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">{message}</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Escribe el motivo"
            />
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={() => onCancel()}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            disabled={!motivo.trim()}
            className={`px-4 py-2 rounded text-white ${motivo.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
