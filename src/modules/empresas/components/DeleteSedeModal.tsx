import { useState } from "react";

interface DeleteSedeModalProps {
  isOpen: boolean;
  sedeName: string;
  isActive: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isProcessing: boolean;
}

const DeleteSedeModal = ({
  isOpen,
  sedeName,
  isActive,
  onClose,
  onConfirm,
  isProcessing,
}: DeleteSedeModalProps) => {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  // El componente se desmonta cuando `isOpen` es false, por lo que
  // reiniciar `motivo` y `error` en un efecto no es necesario.

  const handleConfirm = () => {
    if (!motivo.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }
    onConfirm(motivo);
  };

  if (!isOpen) return null;

  const title = isActive ? "Desactivar Sede" : "Reactivar Sede";
  const actionLabel = isActive ? "Desactivar" : "Reactivar";
  const bgColor = isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700";
  const disabledBg = isActive ? "disabled:bg-red-400" : "disabled:bg-emerald-400";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            {isActive
              ? `¿Deseas desactivar la sede "${sedeName}"? Podrás reactivarla más adelante.`
              : `¿Deseas reactivar la sede "${sedeName}"? Se habilitará nuevamente en la operación.`}
          </p>
          <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">Motivo</label>
          <textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            rows={3}
            placeholder="Ej: Cierre temporal por mantenimiento."
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
          <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={isProcessing || !motivo.trim()} className={`px-4 py-2 rounded-lg text-white ${bgColor} disabled:opacity-50 ${disabledBg}`}>
            {isProcessing ? "Procesando..." : `${actionLabel} sede`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteSedeModal;