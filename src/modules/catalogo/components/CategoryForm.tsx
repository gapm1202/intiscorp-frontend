import { useState, type FormEvent } from "react";
import type { CatalogCategory } from "../types";

interface Props {
  initial?: CatalogCategory | null;
  onSubmit: (payload: Omit<CatalogCategory, "id" | "createdAt">, id?: string) => void;
  onClear: () => void;
  customTypes: string[];
  onAddCustomType: (type: string) => void;
}

const categoryDefaults: Omit<CatalogCategory, "id"> = {
  codigo: "",
  nombre: "",
  descripcion: "",
  tipoTicket: "incidente",
  activo: true,
  visibleEnTickets: true,
  createdAt: new Date().toISOString(),
};

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)[0] ?? "";

const buildCategoryCode = (name: string) => {
  const token = normalizeToken(name);
  return token ? `CAT-${token}` : "";
};

export const CategoryForm = ({ initial, onSubmit, onClear, customTypes, onAddCustomType }: Props) => {
  const [form, setForm] = useState(() =>
    initial
      ? {
          codigo: initial.codigo,
          nombre: initial.nombre,
          descripcion: initial.descripcion ?? "",
          tipoTicket: initial.tipoTicket,
          activo: initial.activo,
          visibleEnTickets: initial.visibleEnTickets,
          createdAt: initial.createdAt ?? new Date().toISOString(),
        }
      : categoryDefaults,
  );
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleChange = (key: keyof typeof form, value: string | boolean) => {
    if (key === "nombre") {
      const nombre = String(value);
      setForm((prev) => ({
        ...prev,
        nombre,
        codigo: buildCategoryCode(nombre),
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.codigo.trim() || !form.nombre.trim()) return;
    onSubmit(form, initial?.id);
    setForm(categoryDefaults);
    setShowCustomInput(false);
    setCustomValue("");
    onClear();
  };

  const handleSelectChange = (value: string) => {
    if (value === "otro") {
      setShowCustomInput(true);
      return;
    }
    handleChange("tipoTicket", value);
    setShowCustomInput(false);
    setCustomValue("");
  };

  const handleAddCustom = () => {
    const clean = customValue.trim();
    if (!clean) return;
    const normalized = clean.toLowerCase();
    handleChange("tipoTicket", normalized);
    setShowCustomInput(false);
    setCustomValue("");
    onAddCustomType(normalized);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1">Código *</label>
          <input
            value={form.codigo}
            readOnly
            placeholder="CAT-EMAIL"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed"
            aria-readonly
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1">Nombre de categoría *</label>
          <input
            value={form.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
            placeholder="Email / Correos"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => handleChange("descripcion", e.target.value)}
          placeholder="Alcance general de la categoría"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition min-h-[88px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1">Tipo de ticket por defecto *</label>
          <select
            value={form.tipoTicket}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            required
          >
            <option value="incidente">Incidente</option>
            <option value="solicitud">Solicitud</option>
            {customTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
            <option value="otro">Otro…</option>
          </select>
          {showCustomInput && (
            <div className="mt-2 flex gap-2">
              <input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Define el tipo (ej. mejora)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow hover:bg-indigo-700"
              >
                Añadir
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4">
          <input
            id="categoria-activa"
            type="checkbox"
            checked={form.activo}
            onChange={(e) => handleChange("activo", e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-slate-300 rounded"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">Estado</p>
            <p className="text-xs text-slate-500">Activo / Inactivo</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4">
          <input
            id="visible-tickets"
            type="checkbox"
            checked={form.visibleEnTickets}
            onChange={(e) => handleChange("visibleEnTickets", e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-slate-300 rounded"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">Visible para tickets</p>
            <p className="text-xs text-slate-500">Permite uso en tickets</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md transition"
        >
          <span className="text-lg">💾</span>
          {initial ? "Guardar cambios" : "Guardar"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={() => onSubmit({ ...form, activo: false }, initial.id)}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <span className="text-lg">❌</span>
            Desactivar
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 text-slate-600 font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-100 transition"
        >
          <span className="text-lg">↩️</span>
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
