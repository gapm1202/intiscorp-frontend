// React import removed (not needed with new JSX transform)

interface SimpleConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

const SimpleConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onCancel,
  onConfirm,
  isConfirming,
}: SimpleConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-600">{message}</p>
        </div>
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
          <button onClick={onCancel} disabled={isConfirming} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={isConfirming} className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
            {isConfirming ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleConfirmModal;