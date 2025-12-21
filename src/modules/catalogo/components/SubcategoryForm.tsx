import { useState, type FormEvent } from "react";
import type { CatalogCategory, CatalogSubcategory, TicketType } from "../types";

interface Props {
  categories: CatalogCategory[];
  initial?: CatalogSubcategory | null;
  onSubmit: (payload: Omit<CatalogSubcategory, "id" | "createdAt">, id?: string) => void;
  onClear: () => void;
  customTypes: string[];
}

const subDefaults: Omit<CatalogSubcategory, "id"> = {
  categoriaId: "",
  codigo: "",
  nombre: "",
  descripcion: "",
  tipoTicket: "incidente",
  requiereValidacion: false,
  activo: true,
  heredaTipo: true,
  createdAt: new Date().toISOString(),
};

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)[0] ?? "";

const buildSubCode = (categoriaNombre: string, subNombre: string) => {
  const catToken = normalizeToken(categoriaNombre).slice(0, 3);
  const subToken = normalizeToken(subNombre).slice(0, 3);
  if (!catToken && !subToken) return "";
  if (catToken && subToken) return `SUB-${catToken}-${subToken}`;
  return `SUB-${catToken || subToken}`;
};

export const SubcategoryForm = ({ categories, initial, onSubmit, onClear, customTypes }: Props) => {
  const [form, setForm] = useState(() =>
    initial
      ? {
          categoriaId: initial.categoriaId,
          codigo: initial.codigo,
          nombre: initial.nombre,
          descripcion: initial.descripcion ?? "",
          tipoTicket: initial.tipoTicket,
          requiereValidacion: initial.requiereValidacion,
          activo: initial.activo,
          heredaTipo: Boolean(initial.heredaTipo),
          createdAt: initial.createdAt ?? new Date().toISOString(),
        }
      : subDefaults,
  );

  const handleChange = (key: keyof typeof form, value: string | boolean) => {
    if (key === "nombre" || key === "categoriaId") {
      setForm((prev) => {
        const next = { ...prev, [key]: value } as typeof form;
        const catName = categories.find((c) => c.id === next.categoriaId)?.nombre ?? "";
        next.codigo = buildSubCode(catName, key === "nombre" ? String(value) : next.nombre);
        return next;
      });
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.categoriaId || !form.codigo.trim() || !form.nombre.trim()) return;
    onSubmit(form, initial?.id);
    setForm(subDefaults);
    onClear();
  };

  const canSubmit = Boolean(form.categoriaId && form.codigo.trim() && form.nombre.trim());

  const selectedCategory = categories.find((c) => c.id === form.categoriaId);
  const effectiveTicket = form.heredaTipo && selectedCategory ? selectedCategory.tipoTicket : form.tipoTicket;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1">Categoría padre *</label>
          <select
            value={form.categoriaId}
            onChange={(e) => handleChange("categoriaId", e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            required
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1">Código *</label>
          <input
            value={form.codigo}
            readOnly
            placeholder="SUB-EMAIL-01"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed"
            aria-readonly
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1">Nombre de subcategoría *</label>
        <input
          value={form.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          placeholder="No envía correos"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => handleChange("descripcion", e.target.value)}
          placeholder="Detalle del problema"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition min-h-[88px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1">Tipo de ticket *</label>
          <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={form.heredaTipo}
                onChange={(e) => handleChange("heredaTipo", e.target.checked)}
                className="w-5 h-5 text-purple-600 border-slate-300 rounded"
              />
              <span>Heredar de la categoría ({selectedCategory?.tipoTicket ?? "--"})</span>
            </label>
            {!form.heredaTipo && (
              <select
                value={form.tipoTicket}
                onChange={(e) => handleChange("tipoTicket", e.target.value as TicketType)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              >
                <option value="incidente">Incidente</option>
                <option value="solicitud">Solicitud</option>
                {customTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-slate-500">Autocompleta tipo de ticket en Tickets</p>
            <p className="text-xs text-slate-500">Tipo efectivo: {effectiveTicket === "incidente" ? "Incidente" : effectiveTicket === "solicitud" ? "Solicitud" : effectiveTicket}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4">
          <input
            id="sub-activa"
            type="checkbox"
            checked={form.activo}
            onChange={(e) => handleChange("activo", e.target.checked)}
            className="w-5 h-5 text-purple-600 border-slate-300 rounded"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">Estado</p>
            <p className="text-xs text-slate-500">Activo / Inactivo</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4">
          <input
            id="requiere-validacion"
            type="checkbox"
            checked={form.requiereValidacion}
            onChange={(e) => handleChange("requiereValidacion", e.target.checked)}
            className="w-5 h-5 text-purple-600 border-slate-300 rounded"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">Requiere validación</p>
            <p className="text-xs text-slate-500">Aprobación previa</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-md transition font-semibold ${
            canSubmit
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
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

export default SubcategoryForm;
