import React, { useEffect, useState } from "react";
import { createArea, updateArea } from "../services/areasService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId?: string;
  sedeId?: string;
  areaId?: string;
  initialName?: string;
  initialResponsable?: string;
  mode?: "create" | "edit";
  onSuccess?: (areaName: string) => void;
}

const AddAreaModal = ({
  isOpen,
  onClose,
  empresaId,
  sedeId,
  areaId,
  initialName,
  initialResponsable,
  mode = "create",
  onSuccess,
}: Props) => {
  const [name, setName] = useState("");
  const [responsable, setResponsable] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName ?? "");
    setResponsable(initialResponsable ?? "");
    setError(null);
    setLoading(false);
    setCreatedAt(null);
    setCreatedName(null);
  }, [isOpen, initialName, initialResponsable]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del área es requerido");
      return;
    }
    if (!empresaId) {
      setError("ID de empresa no disponible");
      return;
    }

    if (isEditMode && !areaId) {
      setError("ID de área no disponible");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isEditMode) {
        await updateArea(empresaId, areaId!, name.trim(), responsable.trim());
        onSuccess?.(name.trim());
        onClose();
        return;
      }

      const res = await createArea(empresaId, name.trim(), sedeId, responsable.trim());
      const now = new Date();
      setCreatedAt(now.toLocaleString());
      const created = res as Record<string, unknown>;
      setCreatedName(String(created?.name ?? name));
      setLoading(false);
    } catch (err: unknown) {
      const maybe = err as { body?: string; message?: string };
      const errorMsg = maybe?.body || maybe?.message || (isEditMode ? "Error al actualizar área" : "Error al crear área");
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{isEditMode ? "Editar Área" : "Agregar Área"}</h3>
          <button onClick={onClose} className="text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700">Nombre del área</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full mt-2 p-2 border rounded"
                placeholder="Ej: Contabilidad"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Responsable de área</label>
              <input
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                className="w-full mt-2 p-2 border rounded"
                placeholder="Ej: Juan Pérez"
                disabled={loading}
              />
            </div>
          </div>
          {error && <div className="mt-2 p-2 bg-red-100 border border-red-400 rounded text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded" disabled={loading}>Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
              {loading ? (isEditMode ? "Guardando..." : "Creando...") : (isEditMode ? "Guardar cambios" : "Crear área")}
            </button>
          </div>
        </form>
        {/* Preview popup after create */}
        {!isEditMode && createdName && createdAt && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg w-full max-w-sm p-6 border">
              <h4 className="text-lg font-semibold mb-2">Área creada</h4>
              <p className="text-sm text-gray-700 mb-2">Nombre: <strong>{createdName}</strong></p>
              <p className="text-sm text-gray-700 mb-4">Fecha / Hora: <strong>{createdAt}</strong></p>
              <div className="flex justify-end gap-2">
                <button onClick={() => {
                  // finalize: call onSuccess and reset
                  onSuccess?.(createdName);
                  setName("");
                  setResponsable("");
                  setCreatedName(null);
                  setCreatedAt(null);
                  setLoading(false);
                  onClose();
                }} className="px-4 py-2 bg-green-600 text-white rounded">Aceptar</button>
                <button onClick={() => {
                  // dismiss preview but keep modal open for edits
                  setCreatedName(null);
                  setCreatedAt(null);
                  setLoading(false);
                }} className="px-4 py-2 border rounded">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddAreaModal;
