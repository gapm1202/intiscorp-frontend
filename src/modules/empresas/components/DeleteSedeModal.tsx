import { useState } from "react";

interface DeleteSedeModalProps {
  isOpen: boolean;
  sedeName: string;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isDeleting: boolean;
}

const DeleteSedeModal = ({
  isOpen,
  sedeName,
  onClose,
  onConfirm,
  isDeleting,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Confirmar Eliminación</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            ¿Estás seguro de que deseas eliminar la sede "<strong>{sedeName}</strong>"? Esta acción no se puede deshacer.
          </p>
          <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">Motivo de la eliminación</label>
          <textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            rows={3}
            placeholder="Ej: Cierre de la sucursal por reestructuración."
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
          <button onClick={onClose} disabled={isDeleting} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={isDeleting || !motivo.trim()} className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:bg-red-400">
            {isDeleting ? "Eliminando..." : "Eliminar Sede"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteSedeModal;