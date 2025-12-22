import { useEffect, useMemo, useState } from "react";
import { CategoryForm } from "../components/CategoryForm";
import { SubcategoryForm } from "../components/SubcategoryForm";
import { CategoryTable, SubcategoryTable } from "../components/CatalogoTables";
import type { CatalogCategory, CatalogFilters, CatalogSubcategory } from "../types";
import axios from "axios";
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
  getCatalogTypes,
  createCatalogType,
  deleteCatalogType,
  ticketTypeLabel,
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);
  const [isDeletingType, setIsDeletingType] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<
    | { type: "category"; item: CatalogCategory }
    | { type: "subcategory"; item: CatalogSubcategory }
    | null
  >(null);
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);

  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<
    | { type: "category"; item: CatalogCategory }
    | { type: "subcategory"; item: CatalogSubcategory }
    | null
  >(null);
  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);

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

  useEffect(() => {
    const loadTypes = async () => {
      const types = await getCatalogTypes();
      setCustomTicketTypes(types);
    };
    loadTypes();
  }, []);

  const mergedTypes = useMemo(() => Array.from(new Set(customTicketTypes.map((ct) => String(ct).trim().toLowerCase()))), [customTicketTypes]);

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

  const handleAddType = async (t: string) => {
    const created = await createCatalogType(t);
    setCustomTicketTypes((prev) => (prev.includes(created) ? prev : [...prev, created]));
  };


  const handleSaveSubcategory = async (
    payload: Omit<CatalogSubcategory, "id" | "createdAt">,
    id?: string,
  ) => {
    // Asegurar que el tipo de ticket exista en el backend/localStorage antes de crear/actualizar
    const tipo = String(payload.tipoTicket).trim().toLowerCase();
    const builtins = ["incidente", "solicitud"];
    if (!builtins.includes(tipo) && !mergedTypes.includes(tipo)) {
      // Crear el tipo en backend/localStorage y actualizar el listado local
      await handleAddType(tipo);
    }

    if (id) {
      const updated = await updateCatalogSubcategory(id, payload);
      setSubcategories((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      setEditingSubcategory(null);

      // Detectar discrepancia entre tipo solicitado y tipo devuelto
      if (String(updated.tipoTicket).trim().toLowerCase() !== tipo) {
        console.warn("[catalogo] tipo guardado distinto al solicitado (update)", { requested: tipo, returned: updated.tipoTicket, payload, returnedObj: updated });
        alert(`Atención: el servidor guardó tipo "${ticketTypeLabel(updated.tipoTicket)}" en lugar de "${ticketTypeLabel(tipo)}". Es probable que el backend no acepte tipos personalizados.`);
      }
    } else {
      const created = await createCatalogSubcategory(payload);
      setSubcategories((prev) => [...prev, created]);

      // Detectar discrepancia entre tipo solicitado y tipo devuelto
      if (String(created.tipoTicket).trim().toLowerCase() !== tipo) {
        console.warn("[catalogo] tipo guardado distinto al solicitado (create)", { requested: tipo, returned: created.tipoTicket, payload, returnedObj: created });
        alert(`Atención: el servidor guardó tipo "${ticketTypeLabel(created.tipoTicket)}" en lugar de "${ticketTypeLabel(tipo)}". Es probable que el backend no acepte tipos personalizados.`);
      }
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
            customTypes={mergedTypes}
            onAddCustomType={handleAddType}
            onClear={() => setEditingCategory(null)}
            onRequestDeactivate={(id) => {
              const item = categories.find((c) => c.id === id);
              if (!item) return;
              setDeactivateTarget({ type: "category", item });
              setDeactivateModalOpen(true);
            }}
          />

          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-600">Tipos disponibles</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(() => {
                const builtins = ["incidente", "solicitud"];
                const normalizedCustom = Array.from(new Set(customTicketTypes.map((ct) => String(ct).trim().toLowerCase())));
                const extras = normalizedCustom.filter((t) => !builtins.includes(t));
                const merged = [...builtins, ...extras];
                return merged.map((t) => {
                  const referenced = categories.some((c) => c.tipoTicket === t) || subcategories.some((s) => s.tipoTicket === t);
                  return (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-sm flex items-center gap-2"
                    >
                      <span className="capitalize">{ticketTypeLabel(t)}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (referenced) {
                            alert("No se puede eliminar: el tipo está en uso en categorías o subcategorías.");
                            return;
                          }
                          setModalType(t);
                          setModalOpen(true);
                        }}
                        className={`text-red-500 hover:text-red-700 text-xs ${referenced ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={referenced}
                      >
                        Eliminar
                      </button>
                    </span>
                  );
                });
              })()}
            </div>
          </div>
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
          isOpen={modalOpen}
          title={`¿Eliminar tipo "${ticketTypeLabel(modalType ?? "")}"?`}
          message={`Esta acción no se puede deshacer. Se eliminará el tipo "${ticketTypeLabel(modalType ?? "")}" de la lista de opciones.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onCancel={() => {
            setModalOpen(false);
            setModalType(null);
          }}
          onConfirm={async () => {
            if (!modalType) return;
            setIsDeletingType(true);
            try {
              await deleteCatalogType(modalType);
              const types = await getCatalogTypes();
              setCustomTicketTypes(types);
              setModalOpen(false);
              setModalType(null);
            } catch (err) {
              if (axios.isAxiosError(err) && err.response?.status === 400) {
                alert(err.response?.data?.error ?? "No se puede eliminar el tipo porque está en uso.");
              } else {
                console.warn("deleteCatalogType error", err);
                alert("No se pudo eliminar el tipo. Intenta nuevamente.");
              }
            } finally {
              setIsDeletingType(false);
            }
          }}
          isConfirming={isDeletingType}
        />

        <SimpleConfirmModal
          isOpen={editModalOpen}
          title={`¿Estás seguro de editar?`}
          message={`Vas a editar ${editTarget?.type === "category" ? "la categoría" : "la subcategoría"} "${editTarget ? (editTarget.type === "category" ? editTarget.item.nombre : editTarget.item.nombre) : ""}"`}
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
              else setEditingSubcategory(editTarget.item);
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
          message={`Se ${deactivateTarget?.item?.activo ? "desactivará" : "activará"} ${(deactivateTarget?.type === "category" ? "la categoría" : "la subcategoría")} "${deactivateTarget ? deactivateTarget.item.nombre : ""}"`}
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
              } else {
                const updated = await toggleCatalogSubcategory(deactivateTarget.item.id, !deactivateTarget.item.activo);
                setSubcategories((prev) => prev.map((sub) => (sub.id === deactivateTarget.item.id ? { ...sub, ...updated } : sub)));
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
