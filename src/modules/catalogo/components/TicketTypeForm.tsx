import { useState, useEffect, type FormEvent } from "react";

export interface TicketType {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt?: string;
}

interface Props {
  initial?: TicketType | null;
  onSubmit: (payload: Omit<TicketType, "id" | "createdAt">, id?: string) => void;
  onClear: () => void;
  onRequestDeactivate?: (id: string) => void;
}

const typeDefaults: Omit<TicketType, "id"> = {
  nombre: "",
  descripcion: "",
  activo: true,
  createdAt: new Date().toISOString(),
};

export const TicketTypeForm = ({ initial, onSubmit, onClear, onRequestDeactivate }: Props) => {
  const [form, setForm] = useState(() =>
    initial
      ? {
          nombre: initial.nombre,
          descripcion: initial.descripcion ?? "",
          activo: initial.activo,
          createdAt: initial.createdAt ?? new Date().toISOString(),
        }
      : typeDefaults,
  );

  useEffect(() => {
    setForm(
      initial
        ? {
            nombre: initial.nombre,
            descripcion: initial.descripcion ?? "",
            activo: initial.activo,
            createdAt: initial.createdAt ?? new Date().toISOString(),
          }
        : typeDefaults,
    );
  }, [initial]);

  const handleChange = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    onSubmit(form, initial?.id);
  };

  const handleCancel = () => {
    setForm(typeDefaults);
    onClear();
  };

  const handleDeactivate = () => {
    if (!initial?.id) return;
    onRequestDeactivate?.(initial.id);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-indigo-200 shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl">🏷️</span>
        <h3 className="text-lg font-bold text-slate-800">
          {initial ? "Editar Tipo de Ticket" : "Nuevo Tipo de Ticket"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Nombre del Tipo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
            placeholder="Ej: Incidente, Solicitud, Problema..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Descripción (opcional)
          </label>
          <textarea
            value={form.descripcion}
            onChange={(e) => handleChange("descripcion", e.target.value)}
            rows={2}
            placeholder="Describe el tipo de ticket..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="ticketTypeActivo"
            checked={form.activo}
            onChange={(e) => handleChange("activo", e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="ticketTypeActivo" className="text-sm font-medium text-slate-700">
            Tipo activo (visible para creación de tickets)
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
          >
            {initial ? "💾 Actualizar" : "➕ Crear Tipo"}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-300 transition-colors"
          >
            🚫 Cancelar
          </button>

          {initial && (
            <button
              type="button"
              onClick={handleDeactivate}
              className="bg-red-100 text-red-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-red-200 transition-colors"
            >
              ❌ {initial.activo ? "Desactivar" : "Activar"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
