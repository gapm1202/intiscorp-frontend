import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInventarioByEmpresa, getInventarioBySede } from "@/modules/inventario/services/inventarioService";
import { getEmpresaById } from "@/modules/empresas/services/empresasService";
import { getSedesByEmpresa } from "@/modules/empresas/services/sedesService";
import { getAreasByEmpresa } from "@/modules/inventario/services/areasService";
import { getCategorias, createCategoria, updateCategoria } from "@/modules/inventario/services/categoriasService";
import type { Category, CategoryField } from "@/modules/inventario/services/categoriasService";
import RegisterAssetModal from "../components/RegisterAssetModal";
import AddAreaModal from "../components/AddAreaModal";
import TrasladarAssetModal from "../components/TrasladarAssetModal";
import InitialSupportReportModal from "../components/InitialSupportReportModal";
import { getWarrantyInfo } from '@/modules/inventario/utils/warranty';
import { formatAssetCode } from "@/utils/helpers";

interface AreaItem {
  id?: number;
  _id?: string;
  name?: string;
  nombre?: string;
  responsable?: string;
  [key: string]: unknown;
}

interface InventarioItem {
  id?: number;
  _id?: string;
  nombre?: string;
  descripcion?: string;
  cantidad?: number;
  precio?: number;
  [key: string]: unknown;
}

interface Empresa {
  id?: number;
  _id?: string;
  nombre?: string;
  [key: string]: unknown;
}

interface Sede {
  id?: number;
  _id?: string;
  nombre?: string;
  activo?: boolean;
  motivo?: string;
  [key: string]: unknown;
}

interface UsuarioItem {
  nombre?: string;
  correo?: string;
  cargo?: string;
}

interface FotoItem {
  url?: string;
  name?: string;
  description?: string;
}


const InventarioPage = () => {
  // Initial Support Report modal removed temporarily to restore UI
  const { empresaId, sedeId } = useParams<{ empresaId: string; sedeId?: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [viewItem, setViewItem] = useState<InventarioItem | null>(null);
  // removed unused local modal state (view handled via `currentView` + `viewItem`)
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [sedeName, setSedeName] = useState<string | null>(null);
  const [sedeActivo, setSedeActivo] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [noInventory, setNoInventory] = useState<{ status: number; message: string } | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryPreview, setCategoryPreview] = useState<{ nombre: string; subcategorias: string[]; campos: CategoryField[]; createdAt: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'areas' | 'categories' | 'viewAsset' | 'historialAsset' | 'generalView'>('main');
  const [newCategoryFields, setNewCategoryFields] = useState<CategoryField[]>([]);
  const [editingAsset, setEditingAsset] = useState<InventarioItem | null>(null);
  const [showTrasladarModal, setShowTrasladarModal] = useState(false);
  const [assetToTransfer, setAssetToTransfer] = useState<InventarioItem | null>(null);
  const [showSupportReportModal, setShowSupportReportModal] = useState(false);
  const [historialData, setHistorialData] = useState<Array<{
    id: number;
    fecha: string;
    motivo: string;
    campo_modificado: string;
    valor_anterior: string;
    valor_nuevo: string;
    asset_id: string;
  }>>([]);

  const isInactiveView = Boolean(sedeId && sedeActivo === false);

  useEffect(() => {
    if (!empresaId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch empresa and sedes first
        const [empresaData, sedesData] = await Promise.all([getEmpresaById(empresaId), getSedesByEmpresa(empresaId, true)]);
        setEmpresa(empresaData);
        const sedesList = Array.isArray(sedesData) ? sedesData : sedesData?.data ?? [];
        setSedes(sedesList);

        // Fetch areas for the empresa
        try {
          const areasData = await getAreasByEmpresa(empresaId);
          const areasList = Array.isArray(areasData) ? areasData : ((areasData as Record<string, unknown>)['data'] as unknown[]) ?? [];
          setAreas(areasList as AreaItem[]);
        } catch (areaErr) {
          console.warn("Error fetching areas:", areaErr);
          setAreas([]);
        }

        // Fetch categories
        try {
          const cats = await getCategorias();
          if (cats.length > 0) {
          }
          setCategories(Array.isArray(cats) ? cats : []);
        } catch (catErr) {
          console.error('Error fetching categories:', catErr);
          setCategories([]);
        }

        // If a sedeId is provided, fetch its inventory; otherwise, fetch company inventory only if there are no sedes
        if (sedeId) {
          const inventarioData = await getInventarioBySede(empresaId, sedeId);
          const itemList = Array.isArray(inventarioData) ? inventarioData : inventarioData?.data ?? [];
          if (itemList[0]) {
          }
          setItems(itemList);
          const found = sedesList.find((s: Sede) => String(s._id ?? s.id) === String(sedeId));
          if (found) {
            setSedeName(found.nombre ?? "");
            setSedeActivo(found.activo ?? null);
          }
        } else {
          if (!sedesList || sedesList.length === 0) {
            const inventarioData = await getInventarioByEmpresa(empresaId);
            const itemList = Array.isArray(inventarioData) ? inventarioData : inventarioData?.data ?? [];
            setItems(itemList);
          } else {
            // If there are sedes and no sedeId, we show the sedes dashboard; clear items
            setItems([]);
          }
        }
      } catch (err) {
        console.error(err);
        const maybe = err as unknown as { status?: number; body?: string };
        const status = maybe?.status;
        const text = maybe?.body ?? (err instanceof Error ? err.message : "Error al cargar datos");
        if (status === 404) {
          setNoInventory({ status: status!, message: String(text).slice(0, 200) });
          setError(null);
        } else {
          const errorMsg = err instanceof Error ? err.message : "Error al cargar datos";
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [empresaId, sedeId]);

  return (
    <div className="p-6 app-compact">
      <div className="max-w-6xl mx-auto">
        {/* Header Profesional - Solo visible en vista main */}
        {(currentView === 'main' || !currentView) && (
          <div className="card mb-6">
          <div className="p-5 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between">
              {/* Lado Izquierdo: Navegación y Título */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    // Si estás en una sede específica, volver al dashboard de sedes
                    // Si estás en el dashboard de sedes, volver a empresas
                    if (sedeId) {
                      navigate(`/admin/empresas/${empresaId}/inventario`);
                    } else {
                      navigate("/admin/empresas");
                    }
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border-2 border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Gestión de Inventario</h2>
                    <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                      <span>{empresa?.nombre || "Cargando..."}{sedeName ? ` • ${sedeName}` : ""}</span>
                      {isInactiveView && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 border border-gray-300">
                          Sede inactiva
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lado Derecho: Botones de Acción */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentView('areas')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-indigo-200 rounded-lg text-indigo-700 font-semibold hover:bg-indigo-50 hover:border-indigo-600 transition-all duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                  </svg>
                  <span>Áreas</span>
                  <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">
                    {areas.length}
                  </span>
                </button>
                <button 
                  onClick={() => setCurrentView('categories')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-purple-200 rounded-lg text-purple-700 font-semibold hover:bg-purple-50 hover:border-purple-600 transition-all duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Categorías</span>
                  <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                    {Array.isArray(categories) ? categories.length : 0}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Vista de Áreas - Interfaz Completa */}
        {currentView === 'areas' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-l-4 border-indigo-600 bg-linear-to-r from-slate-50 to-gray-50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentView('main')}
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border-2 border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-linear-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Gestión de Áreas</h3>
                        <p className="text-sm text-gray-600">{areas.length} {areas.length === 1 ? 'área registrada' : 'áreas registradas'}</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAddAreaModal(true)} 
                    className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Área
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {areas.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Sin Áreas Registradas</h4>
                  <p className="text-gray-500 text-sm">No hay áreas configuradas para esta sede</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">Nombre del Área</th>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">Responsable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {areas.map((a, i) => (
                        <tr key={a._id ?? a.id ?? i} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-900">{String(a.name ?? a.nombre ?? '—')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{String(a.responsable ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vista de Categorías - Interfaz Completa */}
        {currentView === 'categories' && (
          <div className="space-y-4">
            {/* Header */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-l-4 border-purple-600 bg-linear-to-r from-slate-50 to-gray-50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentView('main')}
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border-2 border-gray-200 hover:border-purple-600 hover:bg-purple-50 transition-all duration-200"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Gestión de Categorías</h3>
                        <p className="text-sm text-gray-600">{Array.isArray(categories) ? categories.length : 0} {categories.length === 1 ? 'categoría registrada' : 'categorías registradas'}</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowCategoryModal(true)} 
                    className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir Categoría
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {!Array.isArray(categories) || categories.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Sin Categorías Registradas</h4>
                  <p className="text-gray-500 text-sm">No hay categorías configuradas en el sistema</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">Nombre</th>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">Subcategorías</th>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">Campos Personalizados</th>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(Array.isArray(categories) ? categories : []).map((c, i) => (
                      <tr key={c.id ?? i} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-900">{c.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {(c.subcategorias || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(c.subcategorias || []).map((sub, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Sin subcategorías</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {c.campos && c.campos.length > 0 ? (
                            <div className="space-y-1">
                              {c.campos.map((campo, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="font-medium text-gray-700">{campo.nombre}</span>
                                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{campo.tipo}</span>
                                  {campo.requerido && <span className="text-red-500 font-bold">*</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Sin campos</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              // Guardar ID de categoría en edición
                              setEditingCategoryId(c.id || null);
                              setNewCategoryFields(c.campos || []);
                              setShowCategoryModal(true);
                              // Usar setTimeout para que el modal se abra primero
                              setTimeout(() => {
                                setCategoryPreview({
                                  nombre: c.nombre,
                                  subcategorias: c.subcategorias || [],
                                  campos: c.campos || [],
                                  createdAt: new Date().toISOString()
                                });
                              }, 0);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 font-medium rounded-lg border border-amber-200 hover:border-amber-300 transition-all duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        )}

        {/* Vista Principal de Inventario - Solo cuando currentView === 'main' */}
        {currentView === 'main' && (
          <>
            {loading ? (
              <div className="p-6 text-center text-gray-600">Cargando inventario...</div>
            ) : noInventory ? (
              <div className="p-8 bg-white rounded-lg shadow text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay inventario</h3>
                <p className="text-gray-600 mb-4">No se encontró inventario para esta selección.</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
                  >
                    + Registrar activo
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-4">Código: {noInventory.status} — {noInventory.message}</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600">{error}</div>
            ) : !sedeId && sedes.length > 0 ? (
          // Sedes dashboard: Professional cards layout
          <div className="space-y-6">
            {/* Header Section */}
            <div className="card rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Sedes de {empresa?.nombre || 'la Empresa'}</h3>
                  <p className="text-blue-100 text-sm">Selecciona una sede para gestionar su inventario</p>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-semibold">{sedes.length} {sedes.length === 1 ? 'Sede' : 'Sedes'}</span>
                </div>
              </div>
            </div>

            {/* Sedes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sedes.map((s, idx) => {
                const isSedeInactive = s.activo === false;

                return (
                <div 
                  key={s._id ?? s.id ?? idx} 
                  className={`group rounded-xl shadow-md transition-all duration-300 overflow-hidden border ${
                    isSedeInactive
                      ? 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-xl'
                  }`}
                >
                  {/* Card Header with Gradient */}
                  <div className={`p-4 border-b border-gray-200 ${isSedeInactive ? 'bg-gray-100' : 'bg-subtle'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-lg font-bold transition-colors ${
                              isSedeInactive ? 'text-gray-700' : 'text-gray-900 group-hover:text-blue-600'
                            }`}>
                              {s.nombre ?? "Sin nombre"}
                            </h4>
                            <p className="text-xs text-gray-500">Sede #{idx + 1}</p>
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        isSedeInactive ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-green-100 text-green-800 border-green-200'
                      }`}>
                        {isSedeInactive ? 'Inactiva' : 'Activa'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="font-medium">ID:</span>
                      <span className="text-gray-500 font-mono text-xs">{String(s._id ?? s.id ?? "-").slice(0, 8)}...</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/admin/empresas/${empresaId}/sedes/${s._id ?? s.id}/inventario`)}
                        className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ${
                          isSedeInactive
                            ? 'bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:shadow-md'
                            : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        Ver Inventario
                      </button>
                      <button
                        onClick={() => navigate(`/admin/empresas/${empresaId}/sedes/${s._id ?? s.id}/etiquetas`)}
                        className={`flex-none inline-flex items-center gap-2 px-4 py-3 font-medium rounded-lg shadow-sm transition-all text-sm ${
                          isSedeInactive ? 'bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        📇 Generar Etiquetas
                      </button>
                    </div>
                  </div>

                  {/* Card Footer with Stats */}
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Gestionar activos
                      </span>
                      <svg className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            {/* Company-level inventory button */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">Vista General de la Empresa</h4>
                    <p className="text-sm text-gray-600">Visualiza el inventario consolidado de todas las sedes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const inventarioData = await getInventarioByEmpresa(empresaId!);
                      const itemList = Array.isArray(inventarioData) ? inventarioData : inventarioData?.data ?? [];
                      setItems(itemList);
                      setCurrentView('generalView');
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : "Error al cargar inventario";
                      setError(errorMsg);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex items-center gap-2 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Ver Vista General
                </button>
                <button
                  onClick={() => navigate(`/admin/empresas/${empresaId}/etiquetas`)}
                  className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all text-sm"
                >
                  📇 Generar Etiquetas
                </button>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'main' && items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border-2 border-dashed border-gray-300">
            <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No hay activos registrados</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">Comienza agregando tu primer activo al inventario de esta ubicación.</p>
            <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-2 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar primer activo
            </button>
            <button
              onClick={() => navigate(`/admin/empresas/${empresaId}/etiquetas`)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-all text-sm"
            >
              📇 Generar Etiquetas
            </button>
            </div>
          </div>
        ) : currentView === 'main' ? (
          <div className={`rounded-xl shadow-md overflow-hidden border ${isInactiveView ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
            <div className={`flex justify-between items-center p-6 border-b border-gray-200 ${
              isInactiveView ? 'bg-gray-100' : 'bg-linear-to-r from-slate-50 to-gray-50'
            }`}>
              <div>
                <h3 className={`text-xl font-bold ${isInactiveView ? 'text-gray-800' : 'text-gray-900'}`}>Activos Registrados</h3>
                <p className={`text-sm mt-1 ${isInactiveView ? 'text-gray-600' : 'text-gray-600'}`}>{items.length} {items.length === 1 ? 'activo encontrado' : 'activos encontrados'}</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(true)}
                className={`flex items-center gap-2 font-medium py-2.5 px-5 rounded-lg shadow-md transition-all duration-200 ${
                  isInactiveView
                    ? 'bg-gray-300 text-gray-700 border border-gray-400 hover:bg-gray-300'
                    : 'bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white hover:shadow-lg transform hover:scale-105'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar Activo
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-linear-to-r from-slate-100 to-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Código</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Usuario Asignado</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Área</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, idx) => {
                    // ✅ ACTIVADO: Detección de activos trasladados
                    // Un activo se muestra BLOQUEADO si:
                    // 1. Está trasladado (sede_id != sede_original_id)
                    // 2. Y NO está en la sede actual (sede_id != sedeId)
                    const itemSedeId = String(item.sedeId || item.sede_id);
                    const currentSedeId = String(sedeId);
                    const isTrasladado = item.trasladado === true && itemSedeId !== currentSedeId;
                    
                    return (
                    <tr 
                      key={item.id ?? item._id ?? idx} 
                      className={`transition-colors duration-150 ${
                        isTrasladado
                          ? 'bg-gray-100 opacity-60'
                          : isInactiveView
                            ? 'bg-gray-50'
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`px-6 py-4 text-sm font-semibold ${
                        isTrasladado ? 'text-gray-400' : isInactiveView ? 'text-gray-800' : 'text-gray-900'
                      }`}>
                        {formatAssetCode(String(item.assetId ?? item.codigo ?? item._id ?? item.id ?? ""))}
                        {isTrasladado && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                            Trasladado
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isTrasladado ? 'text-gray-400' : isInactiveView ? 'text-gray-700' : 'text-gray-700'
                      }`}>
                      {(() => {
                        const usuarios = item.usuariosAsignados || item.usuario_asignado;
                        const usuariosArray = Array.isArray(usuarios) ? usuarios : 
                                             typeof usuarios === 'string' ? JSON.parse(usuarios || '[]') : [];
                        
                        if (usuariosArray.length === 0) {
                          return <span className="text-gray-400 italic">Sin asignar</span>;
                        }
                        
                        if (usuariosArray.length === 1) {
                          return <span>{usuariosArray[0].nombre || '-'}</span>;
                        }
                        
                        return (
                          <div className="flex items-center gap-2">
                            <span>{usuariosArray[0].nombre || '-'}</span>
                            <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full shadow-sm ${
                              isTrasladado ? 'bg-gray-400' : 'bg-linear-to-br from-blue-500 to-blue-600'
                            }`}>
                              +{usuariosArray.length - 1}
                            </span>
                          </div>
                        );
                      })()}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isTrasladado ? 'text-gray-400' : isInactiveView ? 'text-gray-700' : 'text-gray-700'
                      }`}>
                        {String(item.categoria ?? '-')}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isTrasladado ? 'text-gray-400' : isInactiveView ? 'text-gray-700' : 'text-gray-700'
                      }`}>
                        {String(item.area ?? '-')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                          isTrasladado
                            ? 'bg-gray-200 text-gray-500 border border-gray-300'
                            : isInactiveView
                              ? 'bg-gray-200 text-gray-700 border border-gray-300'
                              : item.estadoActivo === 'activo' 
                                ? 'bg-linear-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
                                : (item.estadoActivo === 'inactivo' || item.estadoActivo === 'mantenimiento')
                                  ? 'bg-linear-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200'
                                  : 'bg-linear-to-r from-red-100 to-rose-100 text-red-800 border border-red-200'
                        }`}>
                          {String(item.estadoActivo ?? '-').replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isTrasladado ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 font-medium rounded-lg border border-gray-200 cursor-not-allowed">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Bloqueado
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { 
                                setViewItem(item); 
                                setCurrentView('viewAsset'); 
                              }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg border transition-all duration-200 ${
                                  isInactiveView
                                    ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:text-gray-800'
                                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-blue-200 hover:border-blue-300'
                                }`}
                              title="Ver detalles"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver
                            </button>
                            <button
                              onClick={() => {
                                setAssetToTransfer(item);
                                setShowTrasladarModal(true);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg border transition-all duration-200 ${
                                isInactiveView
                                  ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:text-gray-800'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border-indigo-200 hover:border-indigo-300'
                              }`}
                              title="Trasladar activo"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Trasladar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
          </>
        )}
      </div>
      {/* Register Asset Modal (full component) */}
      <RegisterAssetModal
        key={editingAsset?.id || 'new-asset'}
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          setEditingAsset(null);
        }}
        empresaId={empresaId}
        sedeId={sedeId}
        empresaNombre={empresa?.nombre}
        sedeNombre={sedeName ?? undefined}
        empresa={empresa}
        sedes={sedes}
        areas={areas}
        categories={categories}
        editingAsset={editingAsset}
        onSuccess={(item: unknown) => {
          if (editingAsset) {
            // Actualizar en la lista
            setItems(prev => prev.map(i => (i.id === editingAsset.id ? item as InventarioItem : i)));
          } else {
            // Agregar nuevo
            setItems(prev => [item as InventarioItem, ...prev]);
          }
          setNoInventory(null);
          setEditingAsset(null);
          setShowRegisterModal(false); // Cerrar el modal después de éxito
        }}
      />

      {/* Initial Support Report Modal */}
      {showSupportReportModal && viewItem && (
        <InitialSupportReportModal
          isOpen={showSupportReportModal}
          onClose={() => setShowSupportReportModal(false)}
          asset={viewItem}
          empresaNombre={String(empresa?.nombre ?? viewItem.empresaNombre ?? viewItem.empresa ?? '')}
          sedeNombre={String((() => {
            const sid = String(viewItem.sedeId ?? viewItem.sede_id ?? viewItem.sede ?? '');
            return sedes.find(s => String(s._id ?? s.id) === sid)?.nombre ?? viewItem.sedeNombre ?? viewItem.sede ?? sedeName ?? '';
          })())}
        />
      )}

      {/* View Asset - Full Page Interface */}
      {currentView === 'viewAsset' && viewItem && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-linear-to-r from-slate-800 via-slate-700 to-slate-600 text-white p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentView('main')}
                  className="bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div className="flex items-center gap-4">
                  <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-4 rounded-xl shadow-lg">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-3xl font-bold">{formatAssetCode(String(viewItem.assetId ?? viewItem._id ?? viewItem.id ?? ""))}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        viewItem.estadoActivo === 'activo' ? 'bg-green-500/20 text-green-200 border border-green-400/30' : 
                        (viewItem.estadoActivo === 'inactivo' || viewItem.estadoActivo === 'mantenimiento') ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/30' : 
                        'bg-red-500/20 text-red-200 border border-red-400/30'
                      }`}>
                        {String(viewItem.estadoActivo ?? '-').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {String(viewItem.categoria ?? 'Activo')}
                      {String(viewItem.area ?? '') !== '' && (
                        <>
                          <span className="text-slate-400">•</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                          </svg>
                          {String(viewItem.area)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setEditingAsset(viewItem);
                    setShowRegisterModal(true);
                    setCurrentView('main');
                  }}
                  className="bg-amber-500 hover:bg-amber-600 px-5 py-2.5 rounded-lg transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const activoId = viewItem.id || viewItem._id;
                      
                      const token = localStorage.getItem('token');
                      const response = await fetch(`http://localhost:4000/api/activos/${activoId}/historial`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (!response.ok) {
                        const errorText = await response.text();
                        console.error('❌ Error del servidor:', errorText);
                        alert(`Error ${response.status}: ${errorText}`);
                        return;
                      }
                      
                      const data = await response.json();
                      
                      const historial = data.data || data;
                      
                      setHistorialData(Array.isArray(historial) ? historial : []);
                      setCurrentView('historialAsset');
                    } catch (error) {
                      console.error('❌ Error cargando historial:', error);
                      alert('Error al cargar el historial: ' + (error as Error).message);
                    }
                  }}
                  className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-lg transition-all duration-200 font-semibold flex items-center gap-2 backdrop-blur-sm border border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial
                </button>
                {/* Informe button moved below the Fotos gallery */}
              </div>
            </div>
          </div>

            <div className="p-8 space-y-6 bg-linear-to-br from-gray-50 to-slate-50">
              {/* Información Básica */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-xl text-gray-900">Información Básica</h4>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Código</p>
                      <p className="font-bold text-lg text-gray-900">{formatAssetCode(String(viewItem.assetId ?? viewItem.codigo ?? ""))}</p>
                    </div>
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoría</p>
                      <p className="font-bold text-lg text-gray-900">{String(viewItem.categoria ?? '-')}</p>
                    </div>
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Área</p>
                      <p className="font-bold text-lg text-gray-900">{String(viewItem.area ?? '-')}</p>
                    </div>
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fabricante</p>
                      <p className="font-bold text-lg text-gray-900">{String(viewItem.fabricante ?? '-')}</p>
                    </div>
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Modelo</p>
                      <p className="font-bold text-lg text-gray-900">{String(viewItem.modelo ?? '-')}</p>
                    </div>
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Serie</p>
                      <p className="font-bold text-lg text-gray-900">{String(viewItem.serie ?? '-')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estados */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-linear-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-xl text-gray-900">Estados del Activo</h4>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-5 rounded-lg border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estado Activo</p>
                      <span className={`inline-flex items-center px-4 py-2 rounded-lg text-base font-bold shadow-sm ${
                        viewItem.estadoActivo === 'activo' ? 'bg-linear-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-300' : 
                        (viewItem.estadoActivo === 'inactivo' || viewItem.estadoActivo === 'mantenimiento') ? 'bg-linear-to-r from-yellow-100 to-amber-100 text-yellow-800 border-2 border-yellow-300' : 
                        'bg-linear-to-r from-red-100 to-rose-100 text-red-800 border-2 border-red-300'
                      }`}>
                        {String(viewItem.estadoActivo ?? '-').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-5 rounded-lg border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estado Operativo</p>
                      <span className={`inline-flex items-center px-4 py-2 rounded-lg text-base font-bold shadow-sm ${
                        viewItem.estadoOperativo === 'operativo' ? 'bg-linear-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-300' : 
                        viewItem.estadoOperativo === 'mantenimiento' ? 'bg-linear-to-r from-yellow-100 to-amber-100 text-yellow-800 border-2 border-yellow-300' : 
                        'bg-linear-to-r from-red-100 to-rose-100 text-red-800 border-2 border-red-300'
                      }`}>
                        {String(viewItem.estadoOperativo ?? '-').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usuarios Asignados */}
              {(() => {
                const usuarios = viewItem.usuariosAsignados || viewItem.usuario_asignado;
                const usuariosArray = Array.isArray(usuarios) ? usuarios : 
                                     typeof usuarios === 'string' ? JSON.parse(usuarios || '[]') : [];
                return usuariosArray.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="bg-linear-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-purple-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Usuarios Asignados <span className="text-purple-600">({usuariosArray.length})</span></h4>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {usuariosArray.map((usuario: UsuarioItem, idx: number) => (
                          <div key={idx} className="bg-linear-to-br from-purple-50 to-pink-50 p-5 rounded-lg border-2 border-purple-200 hover:shadow-md transition-shadow">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre</p>
                                <p className="font-bold text-gray-900">{usuario.nombre || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Correo</p>
                                <p className="font-semibold text-gray-900 text-sm">{usuario.correo || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cargo</p>
                                <p className="font-bold text-gray-900">{usuario.cargo || '-'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Información Adicional */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-linear-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-xl text-gray-900">Información Adicional</h4>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {String(viewItem.proveedor ?? '') !== '' && (
                      <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Proveedor</p>
                        <p className="font-bold text-gray-900">{String(viewItem.proveedor)}</p>
                      </div>
                    )}
                    {String(viewItem.tipoDocumentoCompra ?? viewItem.tipo_documento_compra ?? '') !== '' && (
                      <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo de documento</p>
                        <p className="font-bold text-gray-900">{String(viewItem.tipoDocumentoCompra ?? viewItem.tipo_documento_compra)}</p>
                      </div>
                    )}
                    {String(viewItem.numeroDocumentoCompra ?? viewItem.numero_documento_compra ?? viewItem.numero_documento ?? '') !== '' && (
                      <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Número de documento</p>
                        <p className="font-bold text-gray-900">{String(viewItem.numeroDocumentoCompra ?? viewItem.numero_documento_compra ?? viewItem.numero_documento)}</p>
                      </div>
                    )}
                    {String(viewItem.fechaCompra ?? '') !== '' && (
                      <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fecha de Compra</p>
                        <p className="font-bold text-gray-900">
                          {new Date(String(viewItem.fechaCompra)).toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                      {String(viewItem.fechaCompra ?? viewItem.fecha_compra ?? '') === '' && (String(viewItem.fechaCompraAprox ?? viewItem.fecha_compra_aprox ?? viewItem.fechaCompraAproxYear ?? viewItem.fecha_compra_aprox_year ?? viewItem.feha_compra_aprox_year ?? '') !== '') && (
                        <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Año de compra (aprox.)</p>
                          <p className="font-bold text-gray-900">{String(viewItem.fechaCompraAprox ?? viewItem.fecha_compra_aprox ?? viewItem.fechaCompraAproxYear ?? viewItem.fecha_compra_aprox_year ?? viewItem.feha_compra_aprox_year)}</p>
                        </div>
                      )}

                      {/* Documento de compra */}
                      {String(viewItem.purchaseDocumentUrl ?? viewItem.purchase_document_url ?? viewItem.purchaseDocument ?? viewItem.purchase_document ?? '') !== '' && (
                        <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documento de compra</p>
                          <p className="font-bold text-gray-900">{String(viewItem.purchaseDocumentName ?? viewItem.purchase_document_name ?? viewItem.purchaseDocument ?? viewItem.purchase_document ?? '').split('/').pop()}</p>
                          <div className="mt-2">
                            <a href={String(viewItem.purchaseDocumentUrl ?? viewItem.purchase_document_url ?? viewItem.purchaseDocument ?? viewItem.purchase_document)} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Ver documento</a>
                            {String(viewItem.purchaseDocumentDescription ?? viewItem.purchase_document_description ?? viewItem.purchase_document_desc ?? '') !== '' && (
                              <p className="text-xs text-gray-600 mt-2">{String(viewItem.purchaseDocumentDescription ?? viewItem.purchase_document_description ?? viewItem.purchase_document_desc)}</p>
                            )}
                          </div>
                        </div>
                      )}
                    {String(viewItem.garantiaDuracion ?? viewItem.garantia_duracion ?? viewItem.garantia ?? '') !== '' && (
                            <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Garantía</p>
                              <p className="font-bold text-gray-900">{String(viewItem.garantiaDuracion ?? viewItem.garantia_duracion ?? viewItem.garantia)}</p>
                              {String(viewItem.garantiaFechaInicio ?? viewItem.garantia_fecha_inicio ?? '') !== '' && (
                                <p className="text-xs text-gray-600 mt-1">Inicio: {new Date(String(viewItem.garantiaFechaInicio ?? viewItem.garantia_fecha_inicio)).toLocaleDateString('es-ES')}</p>
                              )}
                              {/* Computed warranty status */}
                              {(() => {
                                try {
                                  const w = getWarrantyInfo({
                                    estado_garantia: viewItem.estado_garantia ?? viewItem.estadoGarantia,
                                    warranty_expires_at: viewItem.warranty_expires_at ?? viewItem.warrantyExpiresAt,
                                    fechaFinGarantia: viewItem.fechaFinGarantia ?? viewItem.fecha_fin_garantia,
                                    garantiaDuracion: viewItem.garantia ?? viewItem.garantiaDuracion ?? viewItem.garantia_duracion,
                                    garantia: viewItem.garantia,
                                    fechaCompra: viewItem.fechaCompra ?? viewItem.fecha_compra ?? viewItem.fechaCompraAprox ?? viewItem.fechaCompraAproxYear ?? viewItem.fecha_compra_aprox
                                  });
                                  if (w && w.estado) {
                                    return (
                                      <div className="mt-2 text-sm">
                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${w.estado === 'Vigente' ? 'bg-green-100 text-green-800' : w.estado === 'No vigente' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{w.estado}</span>
                                        {w.expiresAt && <span className="ml-3 text-xs text-slate-500">{w.estado === 'No vigente' ? 'Venció:' : 'Vence:'} {new Date(w.expiresAt).toLocaleDateString('es-ES')}</span>}
                                      </div>
                                    );
                                  }
                                } catch {
                                  // noop
                                }
                                return null;
                              })()}
                            </div>
                    )}

                    {String(viewItem.warrantyDocumentUrl ?? viewItem.warranty_document_url ?? viewItem.warrantyDocument ?? viewItem.warranty_document ?? '') !== '' && (
                      <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documento de garantía</p>
                        <p className="font-bold text-gray-900">{String(viewItem.warrantyDocumentName ?? viewItem.warranty_document_name ?? viewItem.warrantyDocument ?? viewItem.warranty_document ?? '').split('/').pop()}</p>
                        <div className="mt-2">
                          <a href={String(viewItem.warrantyDocumentUrl ?? viewItem.warranty_document_url ?? viewItem.warrantyDocument ?? viewItem.warranty_document)} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Ver documento</a>
                          {String(viewItem.warrantyDocumentDescription ?? viewItem.warranty_document_description ?? viewItem.warranty_document_desc ?? '') !== '' && (
                            <p className="text-xs text-gray-600 mt-2">{String(viewItem.warrantyDocumentDescription ?? viewItem.warranty_document_description ?? viewItem.warranty_document_desc)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {
                      (() => {
                        // Prefer explicit condicion fields; DO NOT fallback to estadoActivo (that's a different concept)
                        let condicion: unknown = viewItem.condicionFisica ?? viewItem.condicion_fisica ?? viewItem.estadoFisico ?? viewItem.estado_fisico ?? '';
                          // Si no hay valor directo, buscarlo en campos personalizados (por si el backend lo guardó ahí)
                          if (!condicion || String(condicion).trim() === '') {
                            try {
                              const cpRaw = viewItem.camposPersonalizados ?? viewItem.campos_personalizados;
                              const cp = typeof cpRaw === 'string' ? (cpRaw ? JSON.parse(cpRaw) : {}) : (cpRaw || {});
                              for (const [k, v] of Object.entries(cp || {})) {
                                const key = String(k).toLowerCase();
                                if (key.includes('condici') || key.includes('condición') || key.includes('condicion') || key.includes('condición física') || key.includes('condicion fisica')) {
                                  if (v !== null && v !== undefined && String(v).trim() !== '') {
                                    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                                      condicion = v;
                                      break;
                                    }
                                    // Si es objeto/array, intentar extraer un valor representativo
                                    if (Array.isArray(v) && v.length > 0) {
                                      const first = v[0];
                                      if (typeof first === 'string' || typeof first === 'number') {
                                        condicion = first;
                                        break;
                                      } else if (typeof first === 'object') {
                                        const vals = Object.values(first).filter(x => x !== null && x !== undefined).map(String);
                                        if (vals.length > 0) { condicion = vals.join(' - '); break; }
                                      }
                                    } else if (typeof v === 'object') {
                                      const vals = Object.values(v).filter(x => x !== null && x !== undefined).map(String);
                                      if (vals.length > 0) { condicion = vals.join(' - '); break; }
                                    }
                                  }
                                }
                              }
                            } catch {
                              // ignore parse errors
                            }
                          }

                          if (String(condicion ?? '') !== '') {
                            return (
                              <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Condición física</p>
                                <p className="font-bold text-gray-900">{String(condicion)}</p>
                              </div>
                            );
                          }
                        return null;
                      })()
                    }

                    {
                      (() => {
                        // Try several possible fields returned by backend
                        const raw = viewItem.antiguedadCalculada ?? viewItem.antiguedad_text ?? viewItem.antiguedad ?? viewItem.antiguedad_anios ?? null;
                        if (raw !== null && String(raw ?? '') !== '') {
                          return (
                            <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Antigüedad</p>
                              <p className="font-bold text-gray-900">{String(raw)}</p>
                            </div>
                          );
                        }

                        // If backend didn't provide, try to compute from fechaCompra
                        const fechaRaw = viewItem.fechaCompra ?? viewItem.fecha_compra ?? null;
                        if (fechaRaw) {
                          try {
                            const d = new Date(String(fechaRaw));
                            if (!isNaN(d.getTime())) {
                              const now = new Date();
                              let years = now.getFullYear() - d.getFullYear();
                              let months = now.getMonth() - d.getMonth();
                              if (months < 0) { years -= 1; months += 12; }
                              const parts = [] as string[];
                              if (years > 0) parts.push(`${years} año${years > 1 ? 's' : ''}`);
                              if (months > 0) parts.push(`${months} mes${months > 1 ? 'es' : ''}`);
                              const txt = parts.length > 0 ? parts.join(' y ') : 'Menos de 1 mes';
                              return (
                                <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Antigüedad</p>
                                  <p className="font-bold text-gray-900">{txt}</p>
                                </div>
                              );
                            }
                          } catch {
                            // fallthrough
                          }
                        }

                        // Try approximate year fields
                        const yearApprox = viewItem.fechaCompraAprox ?? viewItem.fecha_compra_aprox ?? viewItem.fechaCompraAproxYear ?? viewItem.fecha_compra_aprox_year ?? viewItem.feha_compra_aprox_year ?? null;
                        if (yearApprox && String(yearApprox ?? '') !== '') {
                          const yearStr = String(yearApprox).slice(0,4);
                          const yearNum = parseInt(yearStr, 10);
                          if (!isNaN(yearNum)) {
                            const now = new Date();
                            const years = now.getFullYear() - yearNum;
                            const txt = `${years} año${years !== 1 ? 's' : ''} (aprox.)`;
                            return (
                              <div className="bg-linear-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Antigüedad</p>
                                <p className="font-bold text-gray-900">{txt}</p>
                              </div>
                            );
                          }
                        }

                        return null;
                      })()
                    }
                    {/* Duración de Garantía: eliminado porque ya existe el campo 'Garantía' */}
                    {String(viewItem.ip ?? '') !== '' && (
                      <div className="bg-linear-to-br from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-200 hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-2">Dirección IP</p>
                        <p className="font-bold text-gray-900 font-mono text-lg">{String(viewItem.ip)}</p>
                      </div>
                    )}
                    {String(viewItem.mac ?? '') !== '' && (
                      <div className="bg-linear-to-br from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200 hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">MAC Address</p>
                        <p className="font-bold text-gray-900 font-mono text-lg">{String(viewItem.mac)}</p>
                      </div>
                    )}
                    {String(viewItem.codigoAccesoRemoto ?? '') !== '' && (
                      <div className="bg-linear-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200 hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Código Acceso Remoto</p>
                        <p className="font-bold text-gray-900 font-mono text-lg">{String(viewItem.codigoAccesoRemoto)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Campos Personalizados */}
              {(() => {
                const camposPersonalizados = viewItem.camposPersonalizados || viewItem.campos_personalizados;
                const parsed: Record<string, unknown> = typeof camposPersonalizados === 'string' ? JSON.parse(camposPersonalizados || '{}') as Record<string, unknown> : (camposPersonalizados || {}) as Record<string, unknown>;

                // Separar campos simples (primitivos) de los complejos (arrays/objetos)
                // Excluir claves que ya estén presentes en Componentes Múltiples
                const simpleCampos: Record<string, string | number | boolean> = {};
                try {
                  // Obtener claves declaradas en componentes múltiples (si vienen como string u objeto)
                  const componentesRaw = viewItem.camposPersonalizadosArray || viewItem.campos_personalizados_array;
                  const parsedComponentes: Record<string, unknown> = typeof componentesRaw === 'string' ? JSON.parse(componentesRaw || '{}') as Record<string, unknown> : (componentesRaw || {}) as Record<string, unknown>;
                  const componentKeys = new Set(Object.keys(parsedComponentes || {}).map(k => String(k).toLowerCase()));

                  Object.entries(parsed || {}).forEach(([k, v]) => {
                    if (v === null || v === undefined) return;
                    const keyLower = String(k).toLowerCase();
                    const t = typeof v;
                    // Si la clave aparece en los componentes, la omitimos aquí para evitar duplicados
                    if (componentKeys.has(keyLower)) return;
                    if (t === 'string' || t === 'number' || t === 'boolean') {
                      simpleCampos[k] = v as string | number | boolean;
                    }
                  });
                } catch {
                  console.warn('Error parsing campos personalizados (simple):');
                }

                return Object.keys(simpleCampos).length > 0 ? (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="bg-linear-to-r from-yellow-50 to-amber-50 px-6 py-4 border-b border-yellow-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Campos Personalizados</h4>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(simpleCampos).map(([key, value]) => (
                          <div key={key} className="bg-linear-to-br from-yellow-50 to-amber-50 p-4 rounded-lg border-2 border-yellow-200 hover:shadow-md transition-shadow">
                            <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">{key}</p>
                            <p className="font-bold text-gray-900">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Campos con Arrays (subcampos) - Componentes Múltiples
                  Ahora también intentamos extraer posibles componentes desde
                  `camposPersonalizados` cuando éstos contienen arrays, objetos
                  o claves que indican un componente (ej.: 'Tarjeta de Video'). */}
              {(() => {
                const camposArrayRaw = viewItem.camposPersonalizadosArray || viewItem.campos_personalizados_array;
                // Parseamos si viene como string
                const campos: Record<string, unknown> = typeof camposArrayRaw === 'string' ? JSON.parse(camposArrayRaw || '{}') as Record<string, unknown> : (camposArrayRaw || {}) as Record<string, unknown>;

                // También consideramos campos personalizados sueltos
                const camposPersonalizadosRaw = viewItem.camposPersonalizados || viewItem.campos_personalizados;
                const parsedCamposPersonalizados: Record<string, unknown> = typeof camposPersonalizadosRaw === 'string' ? JSON.parse(camposPersonalizadosRaw || '{}') as Record<string, unknown> : (camposPersonalizadosRaw || {}) as Record<string, unknown>;

                // Fusion defensiva: si hay entradas en campos personalizados que sean arrays u objetos
                // o que su clave indique claramente un componente (p.ej. 'tarjeta de video'), las incluimos
                try {
                  Object.entries(parsedCamposPersonalizados || {}).forEach(([k, v]) => {
                    if (v === null || v === undefined) return;

                    if (Array.isArray(v)) {
                      if (!campos[k]) campos[k] = v;
                    } else if (typeof v === 'object') {
                      // Si es un objeto, lo convertimos en array de un elemento para mantener formato
                      if (!campos[k]) campos[k] = [v];
                    } else {
                      // Valor primitivo: si la clave parece corresponder a un componente (heurística), la convertimos
                      const keyLower = String(k).toLowerCase();
                      if (/tarjeta\s*de\s*video|tarjeta.*video|gpu|tarjeta\s*video|vga/i.test(keyLower)) {
                        if (!campos[k]) campos[k] = [{ Valor: v }];
                      }
                    }
                  });
                } catch {
                  // Si el parse falla por cualquier razón, continuamos sin bloquear la vista
                  console.warn('Error parsing campos personalizados para componentes:');
                }

                // Finalmente, renderizamos si hay al menos una entrada
                return campos && Object.keys(campos).length > 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-linear-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-xl text-gray-900">Componentes Múltiples</h4>
                    </div>
                  </div>
                  <div className="p-6">
                    {Object.entries(campos).map(([key, items]) => (
                      <div key={key} className="mb-6 last:mb-0">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <p className="text-base font-bold text-blue-900">{key}</p>
                        </div>
                        <div className="space-y-3">
                          {(items as Array<Record<string, string>>).map((item, idx) => (
                            <div key={idx} className="bg-linear-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border-2 border-blue-200 hover:shadow-md transition-shadow">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(item).map(([subKey, subValue]) => (
                                  <div key={subKey}>
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">{subKey}</p>
                                    <p className="font-bold text-gray-900">{String(subValue)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                ) : null;
              })()}

              {/* Observaciones */}
              {String(viewItem.observaciones ?? '') !== '' && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-linear-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-gray-600 to-slate-700 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-xl text-gray-900">Observaciones</h4>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 p-5 rounded-lg border-2 border-gray-200">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{String(viewItem.observaciones)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fotos */}
              {(() => {
                const fotos = viewItem.fotos;
                let fotosArray = Array.isArray(fotos) ? fotos : 
                                  typeof fotos === 'string' ? JSON.parse(fotos || '[]') : [];
                
                // Normalizar URLs de fotos del backend y estandarizar campos (description/name)
                fotosArray = fotosArray.map((foto: FotoItem) => {
                  const f = foto as Record<string, unknown>;
                  let url = String(f['url'] ?? '');
                  const description = String(f['description'] ?? f['descripcion'] ?? f['desc'] ?? '');
                  const name = String(f['name'] ?? f['nombre'] ?? '');

                  if (!url) return { ...foto, url: '', description, name };

                  // Si ya es una URL completa con http, normalizarla
                  if (url.startsWith('http')) {
                    const match = url.match(/\/uploads\/(.+)$/);
                    if (match) {
                      const filename = match[1];
                      const decodedFilename = decodeURIComponent(filename);
                      const encodedFilename = encodeURIComponent(decodedFilename);
                      url = `http://localhost:4000/uploads/${encodedFilename}`;
                    }
                  } else {
                    const decodedFilename = decodeURIComponent(url);
                    const encodedFilename = encodeURIComponent(decodedFilename);
                    url = `http://localhost:4000/uploads/${encodedFilename}`;
                  }

                  return {
                    ...foto,
                    url,
                    description,
                    name
                  };
                });
                
                return fotosArray.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="bg-linear-to-r from-pink-50 to-rose-50 px-6 py-4 border-b border-pink-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Galería de Fotos <span className="text-pink-600">({fotosArray.length})</span></h4>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {fotosArray.map((foto: FotoItem, idx: number) => (
                        <div key={idx} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300">
                          {/* Preview de la imagen */}
                          {foto.url && (
                            <div className="relative h-48 bg-linear-to-br from-gray-100 to-slate-200 overflow-hidden">
                              <img 
                                src={foto.url} 
                                alt={foto.description || foto.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('❌ Error cargando imagen:', foto.url);
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23ddd" width="200" height="200"/><text x="50%" y="50%" font-size="14" text-anchor="middle" dy=".3em" fill="%23999">Sin imagen</text></svg>';
                                }}
                              />
                              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                                <span className="text-xs font-bold text-gray-700">#{idx + 1}</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="p-4 bg-linear-to-br from-gray-50 to-slate-50">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-pink-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs font-bold text-gray-900 truncate">{foto.name}</p>
                            </div>
                            {foto.description && (
                              <p className="text-xs text-gray-600 leading-relaxed">{foto.description}</p>
                            )}
                            <a 
                              href={foto.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-linear-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Ver imagen
                            </a>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null;
                })()}

              {/* Botón para generar informe de soporte inicial (debajo de la galería de fotos) */}
              <div className="mt-6">
                <button
                  onClick={() => setShowSupportReportModal(true)}
                  className="w-full text-left flex items-center justify-center gap-3 px-4 py-3 bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 0v4m0-4h4m-4 0H8" />
                  </svg>
                  Generar informe de soporte inicial
                </button>
              </div>
            </div>

        </div>
      )}

      {/* Historial Asset View */}
      {currentView === 'historialAsset' && viewItem && (
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="bg-linear-to-r from-purple-600 to-purple-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('viewAsset')}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div className="bg-white/20 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Historial de Cambios</h3>
                  <p className="text-purple-100 text-sm">{formatAssetCode(String(viewItem.assetId ?? viewItem.codigo ?? ""))} - {String(viewItem.categoria ?? 'Activo')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de historial */}
          <div className="p-6">
            {historialData.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No hay cambios registrados para este activo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-purple-50 border-b-2 border-purple-200">
                      <th className="text-left py-3 px-4 font-semibold text-purple-900">Fecha y Hora</th>
                      <th className="text-left py-3 px-4 font-semibold text-purple-900">Código</th>
                      <th className="text-left py-3 px-4 font-semibold text-purple-900">Campo Modificado</th>
                      <th className="text-left py-3 px-4 font-semibold text-purple-900">Valor Nuevo</th>
                      <th className="text-left py-3 px-4 font-semibold text-purple-900">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialData.map((registro, idx) => {
                      // Función para formatear nombres de campos
                      const formatearCampo = (campo: string) => {
                        const mapeo: Record<string, string> = {
                          'fabricante': 'Fabricante',
                          'modelo': 'Modelo',
                          'serie': 'Serie',
                          'area': 'Área',
                          'traslado': 'Traslado',
                          'estadoActivo': 'Estado del Activo',
                          'estadoOperativo': 'Estado Operativo',
                          'fechaCompra': 'Fecha de Compra',
                          'fechaFinGarantia': 'Fecha Fin de Garantía',
                          'proveedor': 'Proveedor',
                          'ip': 'Dirección IP',
                          'mac': 'Dirección MAC',
                          'observaciones': 'Observaciones',
                          'usuariosAsignados': 'Usuarios Asignados',
                          'categoria': 'Categoría',
                          'lapCpu': 'CPU Laptop',
                          'lapRams': 'RAM Laptop',
                          'lapStorages': 'Almacenamiento Laptop',
                          'pcCpu': 'CPU PC',
                          'pcRams': 'RAM PC',
                          'pcStorages': 'Almacenamiento PC',
                          'srvCpu': 'CPU Servidor',
                          'srvRams': 'RAM Servidor',
                          'srvStorages': 'Almacenamiento Servidor',
                          'camposPersonalizadosArray': 'Componentes Múltiples',
                        };
                        return mapeo[campo] || campo.charAt(0).toUpperCase() + campo.slice(1).replace(/_/g, ' ');
                      };

                      // Función para formatear valores (limpiar JSON, arrays, etc)
                      const formatearValor = (valor: string, campo?: string) => {
                        if (!valor || valor === 'null' || valor === 'undefined') return '-';
                        
                        // Función auxiliar para convertir cualquier valor a string legible
                        const convertirAString = (val: unknown): string => {
                          if (val === null || val === undefined || val === '') return '';
                          if (typeof val === 'string') return val;
                          if (typeof val === 'number' || typeof val === 'boolean') return String(val);
                          
                          // Si es objeto o array, extraer valores recursivamente
                          if (typeof val === 'object') {
                            if (Array.isArray(val)) {
                              return val.map(v => convertirAString(v)).filter(s => s).join(', ');
                            } else {
                              return Object.values(val).map(v => convertirAString(v)).filter(s => s).join(' - ');
                            }
                          }
                          
                          return String(val);
                        };
                        
                        try {
                          // Intentar parsear JSON
                          const parsed = JSON.parse(valor);
                          
                          // Caso especial para traslados: mostrar sede y área destino
                          if (campo === 'traslado' && typeof parsed === 'object' && parsed !== null) {
                            const sedeDestino = parsed.sede_destino || parsed.sedeDestino || 'Sede no especificada';
                            const areaDestino = parsed.area_destino || parsed.areaDestino || 'Sin área';
                            return `${sedeDestino} → ${areaDestino}`;
                          }
                          
                          // Caso especial para fotos: solo mostrar descripciones
                          if (campo === 'fotos' && Array.isArray(parsed)) {
                            if (parsed.length === 0) return 'Sin fotos';
                            return parsed
                              .map((foto) => {
                                // Buscar descripción en todos los posibles nombres de campo
                                const desc = foto.description || foto.descripcion || foto.desc;
                                return desc || 'Foto sin descripción';
                              })
                              .join(' | ');
                          }
                          
                          // Si es array
                          if (Array.isArray(parsed)) {
                            if (parsed.length === 0) return 'Sin datos';
                            
                            // Array de objetos (usuarios, RAM, storage)
                            if (typeof parsed[0] === 'object' && parsed[0] !== null) {
                              return parsed.map((item) => {
                                return Object.values(item)
                                  .map(v => convertirAString(v))
                                  .filter(s => s)
                                  .join(' - ');
                              }).filter(str => str.length > 0).join(' | ');
                            }
                            
                            // Array simple
                            return parsed.map(v => convertirAString(v)).filter(s => s).join(', ');
                          }
                          
                          // Si es objeto
                          if (typeof parsed === 'object' && parsed !== null) {
                            const values = Object.values(parsed)
                              .map(v => convertirAString(v))
                              .filter(s => s);
                            if (values.length === 0) return 'Sin datos';
                            return values.join(' - ');
                          }
                          
                          return convertirAString(parsed);
                        } catch {
                          // No es JSON, devolver como está
                          return valor;
                        }
                      };
                      
                      // Función para formatear el motivo (simplificar traslados)
                      const formatearMotivo = (motivo: string) => {
                        if (!motivo) return '-';
                        
                        // Si el motivo empieza con "TRASLADO:", extraer solo el mensaje del usuario
                        const trasladoMatch = motivo.match(/^TRASLADO:\s*(.+?)\.\s*Responsable/);
                        if (trasladoMatch) {
                          return `TRASLADO: ${trasladoMatch[1]}`;
                        }
                        
                        return motivo;
                      };

                      return (
                        <tr key={registro.id || idx} className="border-b hover:bg-purple-50 transition-colors">
                          <td className="py-4 px-4 text-sm">
                            <div className="font-medium text-gray-900">
                              {new Date(String(registro.fecha)).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(String(registro.fecha)).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-md text-sm font-semibold">
                              {registro.asset_id}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <span className="font-semibold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-md inline-block">
                              {formatearCampo(registro.campo_modificado)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-green-800 max-w-md">
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="wrap-break-word">{formatearValor(registro.valor_nuevo, registro.campo_modificado)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <span className="text-gray-700 italic">{formatearMotivo(registro.motivo)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vista General de toda la Empresa */}
      {currentView === 'generalView' && (
        <div className="space-y-4">
          {/* Header Section - Diseño Corporativo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-l-4 border-purple-600 bg-linear-to-r from-slate-50 to-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentView('main')}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border-2 border-gray-200 hover:border-purple-600 hover:bg-purple-50 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Inventario Consolidado</h3>
                      <p className="text-sm text-gray-600">{empresa?.nombre || 'Empresa'} • Vista Global de Activos</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{items.length}</p>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{items.length === 1 ? 'Activo Total' : 'Activos Totales'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-pink-600">{sedes.length}</p>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{sedes.length === 1 ? 'Sede' : 'Sedes'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla Profesional */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {items.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Sin Activos Registrados</h4>
                <p className="text-gray-500 text-sm">No hay activos registrados en ninguna sede de la empresa</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Fabricante
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Modelo
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        N° Serie
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => {
                      const itemSedeId = String(item.sedeId || item.sede_id);
                      const sedeNombre = sedes.find(s => String(s._id ?? s.id) === itemSedeId)?.nombre || 'Sin sede';
                      
                      return (
                        <tr key={item.id ?? item._id ?? idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                              </div>
                              <span className="text-sm font-bold text-gray-900">{formatAssetCode(String(item.assetId ?? item._id ?? item.id ?? ""))}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700">
                            {String(item.categoria ?? '-')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {String(item.fabricante ?? '-')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {String(item.modelo ?? '-')}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-500">
                            {String(item.serie ?? '-')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-semibold text-gray-900">{sedeNombre}</span>
                              </div>
                              <div className="flex items-center gap-2 pl-4">
                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                                </svg>
                                <span className="text-xs text-gray-500">{String(item.area ?? 'Sin área')}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              // Prefer mostrar condicion fisica si está presente
                              const condicionVal = (item.condicionFisica ?? item.condicion_fisica) ? String(item.condicionFisica ?? item.condicion_fisica) : '';
                              if (condicionVal !== '') {
                                // Mapear colores según condición física
                                const lower = condicionVal.toLowerCase();
                                const bg = lower.includes('excel') ? 'bg-green-100 text-green-800' :
                                           lower.includes('bueno') ? 'bg-green-100 text-green-800' :
                                           lower.includes('regular') ? 'bg-yellow-100 text-yellow-800' :
                                           lower.includes('malo') ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
                                const dot = lower.includes('excel') || lower.includes('bueno') ? 'bg-green-500' :
                                            lower.includes('regular') ? 'bg-yellow-500' :
                                            lower.includes('malo') ? 'bg-red-500' : 'bg-gray-500';
                                return (
                                  <span className={`${bg} inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${dot}`}></span>
                                    {condicionVal.toUpperCase()}
                                  </span>
                                );
                              }

                              // Fallback: mostrar estadoActivo como antes
                              return (
                                <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${
                                  item.estadoActivo === 'activo' 
                                    ? 'bg-green-100 text-green-800'
                                    : (item.estadoActivo === 'inactivo' || item.estadoActivo === 'mantenimiento')
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                    item.estadoActivo === 'activo' ? 'bg-green-500' :
                                    (item.estadoActivo === 'inactivo' || item.estadoActivo === 'mantenimiento') ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></span>
                                  {String(item.estadoActivo ?? '-').replace(/_/g, ' ').toUpperCase()}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                setViewItem(item);
                                setCurrentView('viewAsset');
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-600 hover:text-purple-700 transition-all duration-200 group-hover:shadow-sm"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver Detalles
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Area Modal (component) */}
      <AddAreaModal
        isOpen={showAddAreaModal}
        onClose={() => setShowAddAreaModal(false)}
        empresaId={empresaId}
        sedeId={sedeId}
        onSuccess={async (areaName) => {
          // Refetch areas list after creating a new area
          alert(`Área creada: ${areaName}`);
          if (empresaId) {
            try {
              const areasData = await getAreasByEmpresa(empresaId);
              const areasList = Array.isArray(areasData) ? areasData : ((areasData as Record<string, unknown>)['data'] as unknown[]) ?? [];
              setAreas(areasList as AreaItem[]);
            } catch (err) {
              console.warn("Error refetching areas:", err);
            }
          }
          setShowAddAreaModal(false);
        }}
      />

      {/* Trasladar Asset Modal */}
      <TrasladarAssetModal
        isOpen={showTrasladarModal}
        onClose={() => {
          setShowTrasladarModal(false);
          setAssetToTransfer(null);
        }}
        asset={assetToTransfer}
        empresaId={empresaId}
        empresaNombre={empresa?.nombre}
        sedeOrigenId={sedeId}
        sedeOrigenNombre={sedeName ?? undefined}
        sedes={sedes}
        onSuccess={async () => {
          // Refrescar inventario después del traslado
          setLoading(true);
          try {
            if (sedeId) {
              const inventarioData = await getInventarioBySede(empresaId!, sedeId);
              const itemList = Array.isArray(inventarioData) ? inventarioData : inventarioData?.data ?? [];
              setItems(itemList);
            } else if (empresaId) {
              const inventarioData = await getInventarioByEmpresa(empresaId);
              const itemList = Array.isArray(inventarioData) ? inventarioData : inventarioData?.data ?? [];
              setItems(itemList);
            }
          } catch (err) {
            console.error('Error refrescando inventario:', err);
          } finally {
            setLoading(false);
          }
        }}
      />

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Añadir categoría</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const fd = new FormData(form);
              const cat = String(fd.get('categoria') || '');
              const subs = String(fd.get('subcategorias') || '').split(',').map(s => s.trim()).filter(Boolean);
              // Normalize fields for preview (trim names and options) but allow spaces inside names
              const cleanedCampos = (newCategoryFields || []).map((f) => ({
                ...f,
                nombre: String(f.nombre || '').trim(),
                opciones: (f.opciones || []).map(s => String(s || '').trim()).filter(Boolean),
                subcampos: (f.subcampos || []).map((sf) => ({
                  ...sf,
                  nombre: String(sf.nombre || '').trim(),
                  opciones: (sf.opciones || []).map(s => String(s || '').trim()).filter(Boolean)
                }))
              }));
              // show preview with timestamp
              setCategoryPreview({ nombre: String(cat).trim(), subcategorias: subs, campos: cleanedCampos, createdAt: new Date().toLocaleString() });
              setShowPreview(true);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de categoría *</label>
                  <input 
                    name="categoria" 
                    className="w-full p-2 border rounded" 
                    placeholder="ej: Laptop, Monitor, etc." 
                    defaultValue={categoryPreview?.nombre || ''}
                    readOnly={!!categoryPreview}
                    style={categoryPreview ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                    required 
                  />
                  {categoryPreview && <p className="text-xs text-gray-500 mt-1">⚠️ No se puede editar el nombre de la categoría</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategorías (separadas por coma)</label>
                  <input name="subcategorias" className="w-full p-2 border rounded" placeholder="ej: Laptops, Monitores" />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Campos personalizados para el formulario</label>
                    <button 
                      type="button"
                      onClick={() => setNewCategoryFields([...newCategoryFields, { nombre: '', tipo: 'text', requerido: false }])}
                      className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded hover:bg-green-100"
                    >
                      + Agregar campo
                    </button>
                  </div>
                  
                  {newCategoryFields.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No hay campos personalizados. Agrega campos que aparecerán en el formulario de registro.</p>
                  ) : (
                    <div className="space-y-3">
                      {newCategoryFields.map((field, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Nombre del campo (ej: Procesador)"
                              value={field.nombre}
                              onChange={(e) => {
                                const updated = [...newCategoryFields];
                                // Allow spaces while typing; will trim on submit/confirm
                                updated[idx].nombre = e.target.value;
                                setNewCategoryFields(updated);
                              }}
                              className="flex-1 p-2 border rounded text-sm"
                            />
                            <select
                              value={field.tipo}
                              onChange={(e) => {
                                const updated = [...newCategoryFields];
                                updated[idx].tipo = e.target.value as CategoryField['tipo'];
                                setNewCategoryFields(updated);
                              }}
                              className="p-2 border rounded text-sm"
                            >
                              <option value="text">Texto</option>
                              <option value="number">Número</option>
                              <option value="textarea">Texto largo</option>
                              <option value="select">Selección</option>
                            </select>
                            <label className="flex items-center gap-1 text-sm">
                              <input
                                type="checkbox"
                                checked={field.requerido}
                                onChange={(e) => {
                                  const updated = [...newCategoryFields];
                                  updated[idx].requerido = e.target.checked;
                                  setNewCategoryFields(updated);
                                }}
                              />
                              Requerido
                            </label>
                            <button
                              type="button"
                              onClick={() => setNewCategoryFields(newCategoryFields.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-800 px-2"
                            >
                              ✕
                            </button>
                          </div>
                          {field.tipo === 'select' && (
                            <textarea
                              placeholder="Opciones separadas por coma&#10;Ejemplo: Intel, AMD, Apple"
                              value={field.opciones?.join(', ') || ''}
                              onChange={(e) => {
                                const updated = [...newCategoryFields];
                                // Keep raw split so the user can type commas; normalize later on confirm
                                updated[idx].opciones = e.target.value.split(',');
                                setNewCategoryFields(updated);
                              }}
                              className="w-full p-2 border rounded text-sm"
                              rows={2}
                            />
                          )}
                          
                          {/* Subcampos */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-gray-600">Subcampos (opcional)</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...newCategoryFields];
                                  if (!updated[idx].subcampos) updated[idx].subcampos = [];
                                  updated[idx].subcampos!.push({ nombre: '', tipo: 'text', opciones: [] });
                                  setNewCategoryFields(updated);
                                }}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                              >
                                + Agregar subcampo
                              </button>
                            </div>
                            
                            {field.subcampos && field.subcampos.length > 0 && (
                              <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                                {field.subcampos.map((subfield, subIdx) => (
                                  <div key={subIdx} className="flex items-center gap-2 bg-blue-50 p-2 rounded">
                                    <input
                                      type="text"
                                      placeholder="Nombre subcampo (ej: Tipo, Capacidad)"
                                      value={subfield.nombre}
                                      onChange={(e) => {
                                        const updated = [...newCategoryFields];
                                        // Allow spaces while typing; trim on submit
                                        updated[idx].subcampos![subIdx].nombre = e.target.value;
                                        setNewCategoryFields(updated);
                                      }}
                                      className="flex-1 p-1 border rounded text-xs"
                                    />
                                    <select
                                      value={subfield.tipo}
                                      onChange={(e) => {
                                        const updated = [...newCategoryFields];
                                        updated[idx].subcampos![subIdx].tipo = e.target.value as 'text' | 'number' | 'select';
                                        setNewCategoryFields(updated);
                                      }}
                                      className="p-1 border rounded text-xs"
                                    >
                                      <option value="text">Texto</option>
                                      <option value="number">Número</option>
                                      <option value="select">Selección</option>
                                    </select>
                                    {subfield.tipo === 'select' && (
                                      <input
                                        type="text"
                                        placeholder="Opciones: DDR3, DDR4, DDR5"
                                        value={subfield.opciones?.join(', ') || ''}
                                        onChange={(e) => {
                                          const updated = [...newCategoryFields];
                                          // Preserve commas while typing; normalize on confirm
                                          updated[idx].subcampos![subIdx].opciones = e.target.value.split(',');
                                          setNewCategoryFields(updated);
                                        }}
                                        className="flex-1 p-1 border rounded text-xs"
                                      />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...newCategoryFields];
                                        updated[idx].subcampos = updated[idx].subcampos!.filter((_, i) => i !== subIdx);
                                        setNewCategoryFields(updated);
                                      }}
                                      className="text-red-600 hover:text-red-800 px-1 text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => { 
                    setShowCategoryModal(false); 
                    setNewCategoryFields([]); 
                    setCategoryPreview(null); 
                    setShowPreview(false);
                    setEditingCategoryId(null);
                  }} className="px-4 py-2 rounded border hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Previsualizar</button>
                </div>
              </div>
            </form>

            {showPreview && categoryPreview && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg w-full max-w-md p-6 border shadow-xl max-h-[80vh] overflow-y-auto">
                  <h4 className="text-lg font-semibold mb-4">Previsualizar categoría</h4>
                  <div className="space-y-3 mb-6">
                    <div>
                      <span className="text-sm text-gray-600">Nombre:</span>
                      <p className="font-semibold">{categoryPreview.nombre}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Subcategorías:</span>
                      <p className="font-semibold">{categoryPreview.subcategorias.join(', ') || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Fecha / Hora:</span>
                      <p className="font-semibold">{categoryPreview.createdAt}</p>
                    </div>
                    {categoryPreview.campos.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Campos personalizados:</span>
                        <div className="mt-2 space-y-2">
                          {categoryPreview.campos.map((campo, idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                              <span className="font-medium">{campo.nombre}</span>
                              <span className="text-gray-500"> - {campo.tipo}</span>
                              {campo.requerido && <span className="text-red-500"> *</span>}
                              {campo.opciones && campo.opciones.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">Opciones: {campo.opciones.join(', ')}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="px-4 py-2 border rounded hover:bg-gray-50" onClick={() => { setCategoryPreview(null); setShowPreview(false); }}>Cancelar</button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={async () => {
                      try {
                        
                        if (editingCategoryId) {
                          // EDITAR categoría existente
                          // Ensure final normalization before sending
                          const finalCampos = (categoryPreview.campos || []).map((f) => ({
                            ...f,
                            nombre: String(f.nombre || '').trim(),
                            opciones: (f.opciones || []).map(s => String(s || '').trim()).filter(Boolean),
                            subcampos: (f.subcampos || []).map((sf) => ({
                              ...sf,
                              nombre: String(sf.nombre || '').trim(),
                              opciones: (sf.opciones || []).map(s => String(s || '').trim()).filter(Boolean)
                            }))
                          }));
                          const updated = await updateCategoria(editingCategoryId, {
                            subcategorias: categoryPreview.subcategorias,
                            campos: finalCampos
                          });
                          setCategories(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
                          alert('✅ Categoría actualizada exitosamente');
                        } else {
                          // CREAR nueva categoría
                          
                          // Validar nombre
                          if (!categoryPreview.nombre || !categoryPreview.nombre.trim()) {
                            throw new Error('El nombre de la categoría es obligatorio');
                          }
                          
                          const finalCampos = (categoryPreview.campos || [])
                            .filter(f => f.nombre && String(f.nombre).trim().length > 0)
                            .map((f) => ({
                              ...f,
                              nombre: String(f.nombre || '').trim(),
                              tipo: f.tipo || 'text',
                              requerido: Boolean(f.requerido),
                              opciones: (f.opciones || []).map(s => String(s || '').trim()).filter(Boolean),
                              subcampos: (f.subcampos || []).map((sf) => ({
                                ...sf,
                                nombre: String(sf.nombre || '').trim(),
                                tipo: sf.tipo || 'text',
                                opciones: (sf.opciones || []).map(s => String(s || '').trim()).filter(Boolean)
                              }))
                            }));
                          
                          const payload = {
                            nombre: categoryPreview.nombre.trim(),
                            ...(categoryPreview.subcategorias && categoryPreview.subcategorias.length > 0 && { subcategorias: categoryPreview.subcategorias }),
                            ...(finalCampos.length > 0 && { campos: finalCampos })
                          };
                          
                          const created = await createCategoria(payload as any);
                          setCategories(prev => [created, ...prev]);
                          alert('✅ Categoría creada exitosamente');
                        }
                        
                        setCategoryPreview(null);
                        setShowPreview(false);
                        setShowCategoryModal(false);
                        setNewCategoryFields([]);
                        setEditingCategoryId(null);
                      } catch (err) {
                        console.error('❌ Error:', err);
                        const errorMsg = err instanceof Error ? err.message : 'Error al guardar la categoría';
                        alert(`❌ ${errorMsg}`);
                      }
                    }}>{editingCategoryId ? 'Actualizar' : 'Confirmar y crear'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioPage;
