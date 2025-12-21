import { useEffect, useMemo, useState } from "react";
import { CategoryForm } from "../components/CategoryForm";
import { SubcategoryForm } from "../components/SubcategoryForm";
import { CategoryTable, SubcategoryTable } from "../components/CatalogoTables";
import type { CatalogCategory, CatalogFilters, CatalogSubcategory } from "../types";
import {
  createCatalogCategory,
  createCatalogSubcategory,
  getCatalogCategories,
  getCatalogSubcategories,
  toggleCatalogCategory,
  toggleCatalogSubcategory,
  updateCatalogCategory,
  updateCatalogSubcategory,
} from "../services/catalogoService";

const heroGradient = "bg-linear-to-br from-indigo-600 via-purple-600 to-blue-500";

const CatalogoCategoriasPage = () => {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CatalogSubcategory[]>([]);
  const [customTicketTypes, setCustomTicketTypes] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<CatalogSubcategory | null>(null);
  const [filters, setFilters] = useState<CatalogFilters>({ estado: "todos", tipo: "todos", categoriaId: "todas" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [cats, subs] = await Promise.all([getCatalogCategories(), getCatalogSubcategories()]);
      setCategories(cats);
      setSubcategories(subs);
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveCategory = async (
    payload: Omit<CatalogCategory, "id" | "createdAt">,
    id?: string,
  ) => {
    if (id) {
      const updated = await updateCatalogCategory(id, payload);
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      setEditingCategory(null);
    } else {
      const created = await createCatalogCategory(payload);
      setCategories((prev) => [...prev, created]);
    }
  };

  const handleSaveSubcategory = async (
    payload: Omit<CatalogSubcategory, "id" | "createdAt">,
    id?: string,
  ) => {
    if (id) {
      const updated = await updateCatalogSubcategory(id, payload);
      setSubcategories((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      setEditingSubcategory(null);
    } else {
      const created = await createCatalogSubcategory(payload);
      setSubcategories((prev) => [...prev, created]);
    }
  };

  const filteredSubcategories = useMemo(() => {
    return subcategories.filter((s) => {
      const byEstado =
        filters.estado === "todos" ? true : filters.estado === "activos" ? s.activo : !s.activo;
      const byTipo = filters.tipo === "todos" ? true : s.tipoTicket === filters.tipo;
      const byCategoria = filters.categoriaId === "todas" ? true : s.categoriaId === filters.categoriaId;
      return byEstado && byTipo && byCategoria;
    });
  }, [subcategories, filters]);

  const activeCategories = categories.filter((c) => c.activo).length;
  const activeSubcategories = subcategories.filter((s) => s.activo).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className={`rounded-2xl shadow-lg text-white p-6 ${heroGradient}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Nuevo módulo</p>
            <h1 className="text-3xl font-extrabold">Catálogo de Categorías</h1>
            <p className="text-white/80 max-w-2xl">
              Centraliza categorías y subcategorías para Tickets. Solo se desactivan, nunca se eliminan. Las
              categorías activas y visibles son las que se ofrecen al crear tickets.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur border border-white/20">
              <p className="text-sm text-white/80">Categorías activas</p>
              <p className="text-2xl font-bold">{activeCategories}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur border border-white/20">
              <p className="text-sm text-white/80">Subcategorías activas</p>
              <p className="text-2xl font-bold">{activeSubcategories}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formularios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">1️⃣ Formulario</p>
              <h2 className="text-xl font-bold text-slate-900">Categoría</h2>
            </div>
            {editingCategory && (
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                Editando {editingCategory.codigo}
              </span>
            )}
          </div>
          <CategoryForm
            initial={editingCategory}
            onSubmit={handleSaveCategory}
            customTypes={customTicketTypes}
            onAddCustomType={(t) =>
              setCustomTicketTypes((prev) => (prev.includes(t) ? prev : [...prev, t]))
            }
            onClear={() => setEditingCategory(null)}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">2️⃣ Formulario</p>
              <h2 className="text-xl font-bold text-slate-900">Subcategoría</h2>
            </div>
            {editingSubcategory && (
              <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-semibold">
                Editando {editingSubcategory.codigo}
              </span>
            )}
          </div>
          <SubcategoryForm
            categories={categories}
            initial={editingSubcategory}
            customTypes={customTicketTypes}
            onSubmit={handleSaveSubcategory}
            onClear={() => setEditingSubcategory(null)}
          />
        </div>
      </div>

      {/* Listados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryTable
          items={categories}
          onEdit={(c) => setEditingCategory(c)}
          onToggle={async (c) => {
            const updated = await toggleCatalogCategory(c.id, !c.activo);
            setCategories((prev) => prev.map((cat) => (cat.id === c.id ? { ...cat, ...updated } : cat)));
          }}
        />

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-slate-600">Estado</label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value as CatalogFilters["estado"] }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-slate-600">Tipo</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value as CatalogFilters["tipo"] }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="todos">Todos</option>
                <option value="incidente">Incidente</option>
                <option value="solicitud">Solicitud</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-slate-600">Categoría</label>
              <select
                value={filters.categoriaId}
                onChange={(e) => setFilters((f) => ({ ...f, categoriaId: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="todas">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SubcategoryTable
            items={filteredSubcategories}
            categories={categories}
            onEdit={(s) => setEditingSubcategory(s)}
            onToggle={async (s) => {
              const updated = await toggleCatalogSubcategory(s.id, !s.activo);
              setSubcategories((prev) => prev.map((sub) => (sub.id === s.id ? { ...sub, ...updated } : sub)));
            }}
          />
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white shadow-lg rounded-lg px-6 py-4 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
            <div>
              <p className="font-semibold text-slate-800">Cargando catálogo</p>
              <p className="text-sm text-slate-500">Conectando con el backend...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogoCategoriasPage;
