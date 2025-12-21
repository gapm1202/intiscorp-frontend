import type { CatalogCategory, CatalogSubcategory } from "../types";
import { ticketTypeLabel } from "../services/catalogoService";

interface CategoryTableProps {
  items: CatalogCategory[];
  onEdit: (item: CatalogCategory) => void;
  onToggle: (item: CatalogCategory) => void;
}

interface SubcategoryTableProps {
  items: CatalogSubcategory[];
  categories: CatalogCategory[];
  onEdit: (item: CatalogSubcategory) => void;
  onToggle: (item: CatalogSubcategory) => void;
}

export const CategoryTable = ({ items, onEdit, onToggle }: CategoryTableProps) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm text-slate-500">📚 Tabla de Categorías</p>
          <h3 className="text-lg font-semibold text-slate-900">{items.length} categorías</h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Código</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Categoría</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Tipo</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Estado</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Visible</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{cat.codigo}</td>
                <td className="px-4 py-3 text-slate-800">{cat.nombre}</td>
                <td className="px-4 py-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {ticketTypeLabel(cat.tipoTicket)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      cat.activo
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {cat.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{cat.visibleEnTickets ? "Sí" : "No"}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => onEdit(cat)}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-sm"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => onToggle(cat)}
                    className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 font-semibold text-sm"
                  >
                    ❌ {cat.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SubcategoryTable = ({ items, categories, onEdit, onToggle }: SubcategoryTableProps) => {
  const catName = (id: string) => categories.find((c) => c.id === id)?.nombre ?? "—";
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm text-slate-500">📊 Tabla de Subcategorías</p>
          <h3 className="text-lg font-semibold text-slate-900">{items.length} subcategorías</h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Código</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Subcategoría</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Categoría</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Tipo</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Estado</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{sub.codigo}</td>
                <td className="px-4 py-3 text-slate-800">{sub.nombre}</td>
                <td className="px-4 py-3 text-slate-700">{catName(sub.categoriaId)}</td>
                <td className="px-4 py-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                    {ticketTypeLabel(sub.tipoTicket)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      sub.activo
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {sub.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => onEdit(sub)}
                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold text-sm"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => onToggle(sub)}
                    className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 font-semibold text-sm"
                  >
                    ❌ {sub.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
