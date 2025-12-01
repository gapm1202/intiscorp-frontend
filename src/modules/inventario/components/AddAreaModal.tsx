import React, { useState } from "react";
import { createArea } from "../services/areasService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId?: string;
  sedeId?: string;
  onSuccess?: (areaName: string) => void;
}

const AddAreaModal = ({ isOpen, onClose, empresaId, sedeId, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [responsable, setResponsable] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

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

    setLoading(true);
    setError(null);
    try {
    const res = await createArea(empresaId, name, sedeId, responsable);
    // Show preview popup with timestamp
    const now = new Date();
    setCreatedAt(now.toLocaleString());
    const created = res as Record<string, unknown>;
    setCreatedName(String(created?.name ?? name));
      // keep modal open to show preview; stop loading
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al crear área";
      setError(errorMsg);
      setLoading(false);
    } finally {
      // leave loading false so preview can be interacted with
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Agregar Área</h3>
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
                placeholder="Ej: Recursos Humanos, IT, Almacén"
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
              {loading ? "Creando..." : "Crear área"}
            </button>
          </div>
        </form>
        {/* Preview popup after create */}
        {createdName && createdAt && (
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
