import { useEffect, useMemo, useState } from "react";
import { CategoryForm } from "../components/CategoryForm";
import { SubcategoryForm } from "../components/SubcategoryForm";
import { TicketTypeForm, type TicketType } from "../components/TicketTypeForm";
import { CategoryTable, SubcategoryTable, TicketTypeTable } from "../components/CatalogoTables";
import type { CatalogCategory, CatalogFilters, CatalogSubcategory } from "../types";
import SimpleConfirmModal from "@/modules/empresas/components/SimpleConfirmModal";
import {
  createCatalogCategory,
  createCatalogSubcategory,
  getCatalogCategories,
  getCatalogSubcategories,
  toggleCatalogCategory,
  toggleCatalogSubcategory,
  updateCatalogCategory,
  updateCatalogSubcategory,
  getTicketTypes,
  createTicketType,
  updateTicketType,
  toggleTicketType,
} from "../services/catalogoService";

const heroGradient = "bg-linear-to-br from-indigo-600 via-purple-600 to-blue-500";

const CatalogoCategoriasPage = () => {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CatalogSubcategory[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<CatalogSubcategory | null>(null);
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);
  const [filters, setFilters] = useState<CatalogFilters>({ estado: "todos", categoriaId: "todas" });
  const [loading, setLoading] = useState(true);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<
    | { type: "category"; item: CatalogCategory }
    | { type: "subcategory"; item: CatalogSubcategory }
    | { type: "ticketType"; item: TicketType }
    | null
  >(null);
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);

  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<
    | { type: "category"; item: CatalogCategory }
    | { type: "subcategory"; item: CatalogSubcategory }
    | { type: "ticketType"; item: TicketType }
    | null
  >(null);
  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [cats, subs, types] = await Promise.all([
        getCatalogCategories(),
        getCatalogSubcategories(),
        getTicketTypes(),
      ]);
      setCategories(cats);
      setSubcategories(subs);
      setTicketTypes(types);
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

  const handleSaveTicketType = async (
    payload: Omit<TicketType, "id" | "createdAt">,
    id?: string,
  ) => {
    if (id) {
      const updated = await updateTicketType(id, payload);
      setTicketTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      setEditingTicketType(null);
    } else {
      const created = await createTicketType(payload);
      setTicketTypes((prev) => [...prev, created]);
    }
  };

  const filteredSubcategories = useMemo(() => {
    return subcategories.filter((s) => {
      const byEstado =
        filters.estado === "todos" ? true : filters.estado === "activos" ? s.activo : !s.activo;
      const byCategoria = filters.categoriaId === "todas" ? true : s.categoriaId === filters.categoriaId;
      return byEstado && byCategoria;
    });
  }, [subcategories, filters]);

  const activeCategories = categories.filter((c) => c.activo).length;
  const activeSubcategories = subcategories.filter((s) => s.activo).length;
  const activeTicketTypes = ticketTypes.filter((t) => t.activo).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className={`rounded-2xl shadow-lg text-white p-6 ${heroGradient}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
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
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur border border-white/20 col-span-2">
              <p className="text-sm text-white/80">Tipos de Ticket activos</p>
              <p className="text-2xl font-bold">{activeTicketTypes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección NUEVA: Tipos de Ticket */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-500">🏷️ Gestión de Tipos</p>
            <h2 className="text-xl font-bold text-slate-900">Tipos de Ticket</h2>
          </div>
          {editingTicketType && (
            <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
              Editando {editingTicketType.nombre}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TicketTypeForm
              initial={editingTicketType}
              onSubmit={handleSaveTicketType}
              onClear={() => setEditingTicketType(null)}
              onRequestDeactivate={(id) => {
                const item = ticketTypes.find((t) => t.id === id);
                if (!item) return;
                setDeactivateTarget({ type: "ticketType", item });
                setDeactivateModalOpen(true);
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <TicketTypeTable
              items={ticketTypes}
              onEdit={(t) => {
                setEditTarget({ type: "ticketType", item: t });
                setEditModalOpen(true);
              }}
              onToggle={(t) => {
                setDeactivateTarget({ type: "ticketType", item: t });
                setDeactivateModalOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/*   <h1 className="text-3xl font-extrabold">Catálogo de Categorías</h1>
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
            onClear={() => setEditingCategory(null)}
            onRequestDeactivate={(id) => {
              const item = categories.find((c) => c.id === id);
              if (!item) return;
              setDeactivateTarget({ type: "category", item });
              setDeactivateModalOpen(true);
            }}
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
            onSubmit={handleSaveSubcategory}
            onClear={() => setEditingSubcategory(null)}
            onRequestDeactivate={(id) => {
              const item = subcategories.find((s) => s.id === id);
              if (!item) return;
              setDeactivateTarget({ type: "subcategory", item });
              setDeactivateModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* Listados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryTable
          items={categories}
          onEdit={(c) => {
            setEditTarget({ type: "category", item: c });
            setEditModalOpen(true);
          }}
          onToggle={(c) => {
            setDeactivateTarget({ type: "category", item: c });
            setDeactivateModalOpen(true);
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
            onEdit={(s) => {
              setEditTarget({ type: "subcategory", item: s });
              setEditModalOpen(true);
            }}
            onToggle={(s) => {
              setDeactivateTarget({ type: "subcategory", item: s });
              setDeactivateModalOpen(true);
            }}
          />
        </div>
      </div>

      <>
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

        <SimpleConfirmModal
          isOpen={editModalOpen}
          title={`¿Estás seguro de editar?`}
          message={`Vas a editar ${
            editTarget?.type === "category"
              ? "la categoría"
              : editTarget?.type === "subcategory"
                ? "la subcategoría"
                : "el tipo de ticket"
          } "${editTarget ? editTarget.item.nombre : ""}"`}
          confirmLabel="Editar"
          cancelLabel="Cancelar"
          onCancel={() => {
            setEditModalOpen(false);
            setEditTarget(null);
          }}
          onConfirm={async () => {
            if (!editTarget) return;
            setIsConfirmingEdit(true);
            try {
              if (editTarget.type === "category") setEditingCategory(editTarget.item);
              else if (editTarget.type === "subcategory") setEditingSubcategory(editTarget.item);
              else setEditingTicketType(editTarget.item);
              setEditModalOpen(false);
              setEditTarget(null);
            } finally {
              setIsConfirmingEdit(false);
            }
          }}
          isConfirming={isConfirmingEdit}
        />

        <SimpleConfirmModal
          isOpen={deactivateModalOpen}
          title={`¿Estás seguro?`}
          message={`Se ${deactivateTarget?.item?.activo ? "desactivará" : "activará"} ${
            deactivateTarget?.type === "category"
              ? "la categoría"
              : deactivateTarget?.type === "subcategory"
                ? "la subcategoría"
                : "el tipo de ticket"
          } "${deactivateTarget ? deactivateTarget.item.nombre : ""}"`}
          confirmLabel={deactivateTarget?.item?.activo ? "Desactivar" : "Activar"}
          cancelLabel="Cancelar"
          onCancel={() => {
            setDeactivateModalOpen(false);
            setDeactivateTarget(null);
          }}
          onConfirm={async () => {
            if (!deactivateTarget) return;
            setIsConfirmingDeactivate(true);
            try {
              if (deactivateTarget.type === "category") {
                const updated = await toggleCatalogCategory(deactivateTarget.item.id, !deactivateTarget.item.activo);
                setCategories((prev) => prev.map((cat) => (cat.id === deactivateTarget.item.id ? { ...cat, ...updated } : cat)));
              } else if (deactivateTarget.type === "subcategory") {
                const updated = await toggleCatalogSubcategory(deactivateTarget.item.id, !deactivateTarget.item.activo);
                setSubcategories((prev) => prev.map((sub) => (sub.id === deactivateTarget.item.id ? { ...sub, ...updated } : sub)));
              } else {
                const updated = await toggleTicketType(deactivateTarget.item.id);
                setTicketTypes((prev) => prev.map((type) => (type.id === deactivateTarget.item.id ? { ...type, ...updated } : type)));
              }
              setDeactivateModalOpen(false);
              setDeactivateTarget(null);
            } catch (err) {
              console.warn("toggle error", err);
              alert("No se pudo completar la acción. Intenta nuevamente.");
            } finally {
              setIsConfirmingDeactivate(false);
            }
          }}
          isConfirming={isConfirmingDeactivate}
        />
      </>
    </div>
  );
};

export default CatalogoCategoriasPage;
