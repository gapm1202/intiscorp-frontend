
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getInventarioByEmpresa, getInventarioBySede, getInventarioById } from "@/modules/inventario/services/inventarioService";
import { getEmpresaById } from "@/modules/empresas/services/empresasService";
import { getSedesByEmpresa } from "@/modules/empresas/services/sedesService";
import { getAreasByEmpresa } from "@/modules/inventario/services/areasService";
import { getCategorias, createCategoria, updateCategoria, getCategoriaById } from "@/modules/inventario/services/categoriasService";
import type { Category, CategoryField, FieldOption } from "@/modules/inventario/services/categoriasService";
import RegisterAssetModal from "../components/RegisterAssetModal";
import axiosClient from '@/api/axiosClient';
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
  usuarioId?: string;
  asignacionId?: string;
  nombre?: string;
  nombreCompleto?: string;
  correo?: string;
  email?: string;
  cargo?: string;
  fechaAsignacion?: string;
}

interface FotoItem {
  url?: string;
  name?: string;
  description?: string;
}

const getAssetUniqueKey = (item: InventarioItem | null): string => {
  if (!item) return '';
  return String(item.assetId ?? item._id ?? item.id ?? item.codigo ?? '');
};

// ─── Shared style tokens ───────────────────────────────────────────────────────
const btn = {
  primary:   "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all",
  secondary: "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-sm font-semibold transition-all",
  danger:    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-medium transition-all",
  ghost:     "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-sm font-medium transition-all",
  icon:      "flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-500 hover:text-blue-600 transition-all",
};
const card  = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden";
const badge = {
  green:  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200",
  yellow: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200",
  red:    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200",
  gray:   "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200",
  blue:   "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200",
};

const estadoBadge = (estado: string) => {
  const s = String(estado ?? '').toLowerCase();
  if (s === 'activo' || s === 'operativo') return badge.green;
  if (s === 'inactivo' || s === 'mantenimiento') return badge.yellow;
  if (s === 'dado de baja') return badge.red;
  return badge.gray;
};

const dot = (estado: string) => {
  const s = String(estado ?? '').toLowerCase();
  if (s === 'activo' || s === 'operativo') return 'bg-emerald-500';
  if (s === 'inactivo' || s === 'mantenimiento') return 'bg-amber-500';
  return 'bg-red-500';
};

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Shared page header strip */
const PageHeader = ({
  title, subtitle, onBack, children,
}: { title: string; subtitle?: string; onBack?: () => void; children?: React.ReactNode }) => (
  <div className={`${card} mb-5`}>
    <div className="flex items-center justify-between gap-4 px-6 py-4 border-l-4 border-blue-500">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className={btn.icon} aria-label="Volver">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <div>
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  </div>
);

/** Generic info card used in viewAsset */
const InfoSection = ({
  title, icon, color = 'blue', children,
}: { title: string; icon: React.ReactNode; color?: string; children: React.ReactNode }) => {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 border-blue-100 text-blue-700',
    green:  'bg-emerald-50 border-emerald-100 text-emerald-700',
    purple: 'bg-violet-50 border-violet-100 text-violet-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    yellow: 'bg-amber-50 border-amber-100 text-amber-700',
    pink:   'bg-pink-50 border-pink-100 text-pink-700',
    slate:  'bg-slate-50 border-slate-100 text-slate-600',
  };
  return (
    <div className={card}>
      <div className={`flex items-center gap-3 px-6 py-3.5 border-b ${colors[color] ?? colors.blue}`}>
        <span className="w-5 h-5 shrink-0">{icon}</span>
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};

/** Key-value grid cell */
const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm font-semibold text-slate-800 break-words">{value ?? '—'}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const InventarioPage = () => {
  const { empresaId, sedeId } = useParams<{ empresaId: string; sedeId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [viewItem, setViewItem] = useState<InventarioItem | null>(null);
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
  const [showEditAreaModal, setShowEditAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaItem | null>(null);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; nombre: string; codigo?: string; descripcion?: string; activo?: boolean }>>([]);
  const [categoryPreview, setCategoryPreview] = useState<{ nombre: string; codigo: string; marcas: string[]; campos: CategoryField[]; createdAt: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryGroupId, setCategoryGroupId] = useState<string>('');
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryCodeInput, setCategoryCodeInput] = useState('');
  const [brandInput, setBrandInput] = useState('');
  const [marcas, setMarcas] = useState<string[]>([]);
  const [subcategoriesInput, setSubcategoriesInput] = useState('');
  const [copyFromCategoryId, setCopyFromCategoryId] = useState('');
  const [currentView, setCurrentView] = useState<'main' | 'areas' | 'categories' | 'viewAsset' | 'historialAsset' | 'generalView'>('main');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [groupDescriptionInput, setGroupDescriptionInput] = useState('');
  const [groupActiveInput, setGroupActiveInput] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newCategoryFields, setNewCategoryFields] = useState<CategoryField[]>([]);
  const [editingAsset, setEditingAsset] = useState<InventarioItem | null>(null);
  const [showTrasladarModal, setShowTrasladarModal] = useState(false);
  const [assetToTransfer, setAssetToTransfer] = useState<InventarioItem | null>(null);
  const [showSupportReportModal, setShowSupportReportModal] = useState(false);
  const [historialData, setHistorialData] = useState<Array<{
    id: number; fecha: string; motivo: string; campo_modificado: string;
    valor_anterior: string; valor_nuevo: string; asset_id: string;
  }>>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ── helpers (unchanged logic) ────────────────────────────────────────────────
  const normalizeCampos = (campos: any[] = []): CategoryField[] =>
    (campos || []).map((f: any) => {
      const opcionesRaw = f.opciones || f.options || [];
      const opciones: string[] = Array.isArray(opcionesRaw)
        ? opcionesRaw.map((o: any) => (typeof o === 'string' ? o : String(o?.value ?? ''))).map((s: string) => s.trim()).filter(Boolean)
        : (typeof opcionesRaw === 'string' ? opcionesRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      return { nombre: String(f.nombre || f.name || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
    });

  const generateGroupCode = (rawName: string): string => {
    if (!rawName) return '';
    const withoutAccents = rawName.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const cleaned = withoutAccents.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    const stopWords = new Set(['de','del','la','las','los','el','y','e','en','para','por','con','a','al']);
    const words = cleaned.split(/\s+/).map(w => w.toLowerCase()).filter(Boolean).filter(w => !stopWords.has(w));
    if (words.length === 0) return '';
    const take = (s: string, n: number) => s.substring(0, Math.min(n, s.length)).toUpperCase();
    const part1 = take(words[0], 4);
    const part2 = words.length >= 2 ? take(words[1], 5) : (words[0].length > 4 ? take(words[0].substring(4), 5) : '');
    return part2 ? `${part1}-${part2}` : part1;
  };

  const generateCategoryCode = (rawName: string): string => {
    if (!rawName) return '';
    const withoutAccents = rawName.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const cleaned = withoutAccents.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    const words = cleaned.split(/\s+/).map(w => w.trim()).filter(Boolean);
    if (words.length === 0) return '';
    const first = words[0].toUpperCase();
    const second = words.length >= 2 ? words[1].substring(0, Math.min(4, words[1].length)).toUpperCase() : '';
    return second ? `${first}-${second}` : first;
  };

  const fetchGroups = async () => {
    try {
      const res = await axiosClient.get('/api/gestion-grupos-categorias');
      let data: any = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.data)) data = data.data;
        else if (Array.isArray(data.results)) data = data.results;
      }
      if (!Array.isArray(data)) { setGroups([]); return; }
      setGroups(data.filter((g: any) => g.activo !== false).map((g: any) => ({
        id: String(g.id ?? g._id ?? g.uuid ?? ''), nombre: g.nombre,
        codigo: g.codigo, descripcion: g.descripcion, activo: g.activo,
      })));
    } catch { setGroups([]); }
  };

  useEffect(() => { fetchGroups(); }, []);

  const isInactiveView = Boolean(sedeId && sedeActivo === false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('view') === 'categories') setCurrentView('categories');
    } catch {}
  }, [location.search]);

  useEffect(() => {
    if (!empresaId) return;
    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        const [empresaData, sedesData] = await Promise.all([getEmpresaById(empresaId), getSedesByEmpresa(empresaId, true)]);
        setEmpresa(empresaData);
        const sedesList = Array.isArray(sedesData) ? sedesData : sedesData?.data ?? [];
        setSedes(sedesList);
        try {
          const areasData = await getAreasByEmpresa(empresaId);
          setAreas((Array.isArray(areasData) ? areasData : ((areasData as Record<string, unknown>)['data'] as unknown[]) ?? []) as AreaItem[]);
        } catch { setAreas([]); }
        try {
          const cats = await getCategorias();
          setCategories((Array.isArray(cats) ? cats : []) as Category[]);
        } catch { setCategories([]); }
        if (sedeId) {
          const inv = await getInventarioBySede(empresaId, sedeId);
          const itemList = Array.isArray(inv) ? inv : inv?.data ?? [];
          setItems(itemList);
          const found = sedesList.find((s: Sede) => String(s._id ?? s.id) === String(sedeId));
          if (found) { setSedeName(found.nombre ?? ""); setSedeActivo(found.activo ?? null); }
        } else {
          if (!sedesList || sedesList.length === 0) {
            const inv = await getInventarioByEmpresa(empresaId);
            setItems(Array.isArray(inv) ? inv : inv?.data ?? []);
          } else { setItems([]); }
        }
      } catch (err) {
        const maybe = err as unknown as { status?: number; body?: string };
        const status = maybe?.status;
        const text = maybe?.body ?? (err instanceof Error ? err.message : "Error al cargar datos");
        if (status === 404) { setNoInventory({ status: status!, message: String(text).slice(0, 200) }); setError(null); }
        else { setError(err instanceof Error ? err.message : "Error al cargar datos"); }
      } finally { setLoading(false); }
    };
    fetchData();
  }, [empresaId, sedeId]);

  // Normaliza formatos de `valoresDinamicos` que el backend puede devolver
  // - Flat: [{ campo_id, valor }, ...]
  // - Agrupado por componentes: [{ id, nombre, campos: [{ campo_id, valor, ... }, ...] }, ...]
  const normalizeBackendValoresDinamicos = (raw: any) => {
    try {
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) return [];
      if (parsed.length > 0 && parsed[0] && Array.isArray(parsed[0].campos)) {
        const out: Array<{ campo_id: number | string; valor: string }> = [];
        parsed.forEach((comp: any) => {
          (comp.campos || []).forEach((c: any) => {
            const id = c.campo_id ?? c.campoId ?? c.id ?? c.field_id ?? c.fieldId;
            out.push({ campo_id: id, valor: c.valor != null ? String(c.valor) : '' });
          });
        });
        return out;
      }
      return parsed.map((v: any) => ({ campo_id: v.campo_id ?? v.campoId ?? v.field_id ?? v.id ?? v.campo_id, valor: v.valor != null ? String(v.valor) : '' }));
    } catch (e) { console.warn('normalizeBackendValoresDinamicos error:', e); return []; }
  };

  // Cuando se abre la vista de detalle, re-fetch del activo por id para asegurar valoresDinamicos actuales
  useEffect(() => {
    if (currentView !== 'viewAsset' || !viewItem || !empresaId || !sedeId) return;
    let mounted = true;
    (async () => {
      try {
        const activoId = viewItem.id ?? viewItem._id ?? viewItem.id;
        if (!activoId) return;
        const refreshed = await getInventarioById(empresaId, sedeId, activoId);
        if (!mounted) return;
        if (refreshed) {
          try {
            const rawVals = refreshed.valoresDinamicos ?? refreshed.valores_dinamicos ?? refreshed.valores ?? null;
            const normalized = normalizeBackendValoresDinamicos(rawVals);
            // Preserve the original/grouped format returned by backend under `valoresDinamicosGrouped`
            // and expose a flat normalized version under `valoresDinamicosFlat` for editors.
            try {
              if (Array.isArray(rawVals) && rawVals.length && rawVals[0] && Array.isArray(rawVals[0].campos)) {
                (refreshed as any).valoresDinamicosGrouped = rawVals;
                (refreshed as any).valoresDinamicosFlat = normalized;
                console.log('[InventarioPage] refreshed activo valoresDinamicos grouped -> preserved grouped and created flat version');
              } else {
                // If backend already returned flat, keep it as `valoresDinamicosFlat` and also set grouped=null
                (refreshed as any).valoresDinamicosGrouped = null;
                (refreshed as any).valoresDinamicosFlat = normalized;
                console.log('[InventarioPage] refreshed activo valoresDinamicos flat -> stored flat version');
              }
            } catch (e) { console.warn('Error normalizando valoresDinamicos en InventarioPage:', e); }
          } catch (e) { console.warn('Error normalizando valoresDinamicos en InventarioPage:', e); }

          // Merge safely into current viewItem to avoid changing the object id and
          // triggering effects repeatedly. Use functional setState to merge values.
          setViewItem(prev => ({ ...(prev || {}), ...(refreshed as any) }));
        }
      } catch (err) {
        console.warn('No se pudo refrescar activo por id:', err);
      }
    })();
    return () => { mounted = false; };
  // Depend only on the asset id to avoid re-running when the whole object changes
  }, [currentView, empresaId, sedeId, viewItem?.id]);

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ════════════════════════════ MAIN VIEW ═════════════════════════════ */}
        {(currentView === 'main' || !currentView) && (
          <>
            {/* Header */}
            <PageHeader
              title={`Gestión de Inventario${sedeName ? ` · ${sedeName}` : ''}`}
              subtitle={empresa?.nombre ?? 'Cargando...'}
              onBack={() => sedeId ? navigate(`/admin/empresas/${empresaId}/inventario`) : navigate('/admin/empresas')}
            >
              {isInactiveView && (
                <span className={badge.gray}>Sede inactiva</span>
              )}
              <button onClick={() => setCurrentView('areas')} className={btn.secondary}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                </svg>
                Áreas
                <span className="ml-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{areas.length}</span>
              </button>
            </PageHeader>

            {/* Body */}
            {loading ? (
              <div className={`${card} p-12 text-center`}>
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Cargando inventario…</p>
              </div>
            ) : noInventory ? (
              <div className={`${card} p-12 text-center`}>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Sin inventario</h3>
                <p className="text-sm text-slate-500 mb-6">No se encontró inventario para esta selección.</p>
                <button onClick={() => setShowRegisterModal(true)} className={btn.primary}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Registrar activo
                </button>
                <p className="text-xs text-slate-400 mt-4">{noInventory.status} — {noInventory.message}</p>
              </div>
            ) : error ? (
              <div className={`${card} p-8 text-center`}>
                <span className={badge.red + ' mb-3'}>{error}</span>
              </div>
            ) : !sedeId && sedes.length > 0 ? (
              /* ── SEDES DASHBOARD ── */
              <div className="space-y-5">
                {/* Stats strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Sedes totales',   value: sedes.length,                              icon: '🏢' },
                    { label: 'Sedes activas',   value: sedes.filter(s => s.activo !== false).length, icon: '✅' },
                    { label: 'Sedes inactivas', value: sedes.filter(s => s.activo === false).length,  icon: '⚠️' },
                    { label: 'Áreas registradas', value: areas.length,                            icon: '📐' },
                  ].map(s => (
                    <div key={s.label} className={`${card} px-4 py-3 flex items-center gap-3`}>
                      <span className="text-2xl">{s.icon}</span>
                      <div>
                        <p className="text-xl font-bold text-slate-800">{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sedes grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sedes.map((s, idx) => {
                    const inactive = s.activo === false;
                    return (
                      <div key={s._id ?? s.id ?? idx} className={`${card} flex flex-col transition-shadow hover:shadow-md ${inactive ? 'opacity-70' : ''}`}>
                        {/* card top */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${inactive ? 'bg-slate-400' : 'bg-blue-600'}`}>
                              {String(s.nombre ?? 'S').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm leading-tight">{s.nombre ?? 'Sin nombre'}</p>
                              <p className="text-xs text-slate-400">Sede #{idx + 1}</p>
                            </div>
                          </div>
                          <span className={inactive ? badge.gray : badge.green}>
                            <span className={`w-1.5 h-1.5 rounded-full ${inactive ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                            {inactive ? 'Inactiva' : 'Activa'}
                          </span>
                        </div>
                        {/* card body */}
                        <div className="px-5 py-4 flex flex-col gap-3 flex-1">
                          <p className="text-xs text-slate-400 font-mono truncate">ID: {String(s._id ?? s.id ?? '—').slice(0, 16)}…</p>
                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => navigate(`/admin/empresas/${empresaId}/sedes/${s._id ?? s.id}/inventario`)}
                              className={`flex-1 justify-center ${inactive ? btn.ghost : btn.primary}`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                              Ver inventario
                            </button>
                            <button
                              onClick={() => navigate(`/admin/empresas/${empresaId}/sedes/${s._id ?? s.id}/etiquetas`)}
                              className={btn.secondary + ' px-3'}
                              title="Generar etiquetas"
                            >
                              📇
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista general card */}
                <div className={`${card} px-6 py-5 flex items-center justify-between gap-4`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Vista General de la Empresa</p>
                      <p className="text-sm text-slate-500">Inventario consolidado de todas las sedes</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const inv = await getInventarioByEmpresa(empresaId!);
                          setItems(Array.isArray(inv) ? inv : inv?.data ?? []);
                          setCurrentView('generalView');
                        } catch (err) { setError(err instanceof Error ? err.message : "Error al cargar inventario"); }
                        finally { setLoading(false); }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-sm transition-all"
                    >
                      Ver vista general
                    </button>
                    <button onClick={() => navigate(`/admin/empresas/${empresaId}/etiquetas`)} className={btn.secondary}>📇 Etiquetas</button>
                  </div>
                </div>
              </div>
            ) : currentView === 'main' && items.length === 0 ? (
              /* ── EMPTY STATE ── */
              <div className={`${card} p-16 text-center`}>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">No hay activos registrados</h3>
                <p className="text-sm text-slate-500 mb-6">Comienza agregando tu primer activo al inventario.</p>
                <div className="flex justify-center gap-2">
                  <button onClick={() => setShowRegisterModal(true)} className={btn.primary}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Registrar primer activo
                  </button>
                  <button onClick={() => navigate(`/admin/empresas/${empresaId}/etiquetas`)} className={btn.secondary}>📇 Etiquetas</button>
                </div>
              </div>
            ) : currentView === 'main' ? (
              /* ── ASSETS TABLE ── */
              <div className={card}>
                {/* table header */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-800">Activos registrados</p>
                    <p className="text-xs text-slate-500 mt-0.5">{items.length} {items.length === 1 ? 'activo' : 'activos'} en esta sede</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const shared = items.filter(item => {
                        const u = item.usuariosAsignados || item.usuario_asignado;
                        const arr = Array.isArray(u) ? u : (typeof u === 'string' ? JSON.parse(u || '[]') : []);
                        return arr.length > 1;
                      }).length;
                      return shared > 0 ? <span className={badge.blue}>{shared} compartido{shared !== 1 ? 's' : ''}</span> : null;
                    })()}
                    {isInactiveView && <span className={badge.gray}>Sede inactiva</span>}
                    <button onClick={() => setShowRegisterModal(true)}
                      className={isInactiveView ? btn.ghost : btn.primary}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Registrar activo
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        {['Código', 'Usuario asignado', 'Categoría', 'Área', 'Estado', 'Acciones'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const itemSedeId = String(item.sedeId || item.sede_id);
                        const isTrasladado = item.trasladado === true && itemSedeId !== String(sedeId);
                        const usuarios = item.usuariosAsignados || item.usuario_asignado;
                        const usuariosArray = Array.isArray(usuarios) ? usuarios : (typeof usuarios === 'string' ? JSON.parse(usuarios || '[]') : []);
                        const usuarioData = item.usuarioAsignadoData || item.usuario_asignado_data;

                        return (
                          <tr key={item.id ?? item._id ?? idx}
                            className={`transition-colors ${isTrasladado ? 'bg-slate-50 opacity-60' : isInactiveView ? 'bg-slate-50/50' : 'hover:bg-blue-50/30'}`}>

                            {/* Código */}
                            <td className="px-5 py-3.5 font-mono font-semibold text-slate-800 text-xs">
                              {formatAssetCode(String(item.assetId ?? item.codigo ?? item._id ?? item.id ?? ''))}
                              {isTrasladado && <span className={`ml-2 ${badge.gray}`}>Trasladado</span>}
                            </td>

                            {/* Usuario */}
                            <td className="px-5 py-3.5">
                              {usuariosArray.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                                    {String(usuariosArray[0].nombreCompleto || usuariosArray[0].nombre || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-slate-700 font-medium text-xs truncate max-w-[120px]">{usuariosArray[0].nombreCompleto || usuariosArray[0].nombre || '—'}</span>
                                  {usuariosArray.length > 1 && (
                                    <span className={badge.blue}>+{usuariosArray.length - 1}</span>
                                  )}
                                </div>
                              ) : usuarioData && (usuarioData.nombreCompleto || usuarioData.nombre) ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                                    {String(usuarioData.nombreCompleto || usuarioData.nombre || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-slate-700 font-medium text-xs truncate max-w-[120px]">{usuarioData.nombreCompleto || usuarioData.nombre}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Sin asignar</span>
                              )}
                            </td>

                            {/* Categoría */}
                            <td className="px-5 py-3.5 text-slate-600 text-xs">{String(item.categoria ?? '—')}</td>

                            {/* Área */}
                            <td className="px-5 py-3.5 text-slate-600 text-xs">{String(item.area ?? '—')}</td>

                            {/* Estado */}
                            <td className="px-5 py-3.5">
                              {isTrasladado ? (
                                <span className={badge.gray}>Trasladado</span>
                              ) : (
                                <span className={estadoBadge(String(item.estadoActivo ?? ''))}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${dot(String(item.estadoActivo ?? ''))}`} />
                                  {String(item.estadoActivo ?? '—').replace(/_/g, ' ')}
                                </span>
                              )}
                            </td>

                            {/* Acciones */}
                            <td className="px-5 py-3.5">
                              {isTrasladado ? (
                                <span className={`${btn.ghost} cursor-not-allowed opacity-50`}>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                  Bloqueado
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => { setViewItem(item); setCurrentView('viewAsset'); }}
                                    className={btn.secondary + ' py-1.5 text-xs'}>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Ver
                                  </button>
                                  <button onClick={() => { setAssetToTransfer(item); setShowTrasladarModal(true); }}
                                    className={btn.ghost + ' py-1.5 text-xs'}>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* ════════════════════════════ AREAS VIEW ════════════════════════════ */}
        {currentView === 'areas' && (
          <>
            <PageHeader title="Gestión de Áreas" subtitle={`${areas.length} ${areas.length === 1 ? 'área registrada' : 'áreas registradas'}`} onBack={() => setCurrentView('main')}>
              <button onClick={() => setShowAddAreaModal(true)} className={btn.primary}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar área
              </button>
            </PageHeader>
            <div className={card}>
              {areas.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-700 mb-1 text-sm">Sin áreas registradas</p>
                  <p className="text-xs text-slate-400">Agrega una área para comenzar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-700 to-blue-600">
                        {['Área', 'Responsable', 'Acciones'].map(h => (
                          <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {areas.map((a, i) => (
                        <tr key={a._id ?? a.id ?? i} className="hover:bg-sky-50/60 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                                </svg>
                              </div>
                              <span className="font-semibold text-slate-800 text-sm">{String(a.name ?? a.nombre ?? '—')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-sm">{String(a.responsable ?? '—')}</td>
                          <td className="px-6 py-4">
                            <button onClick={() => { setEditingArea(a); setShowEditAreaModal(true); }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-all shadow-sm">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
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
          </>
        )}

        {/* ════════════════════════ CATEGORIES VIEW ═══════════════════════════ */}
        {currentView === 'categories' && (
          <div className="space-y-6">
            {/* Groups section */}
            <PageHeader title="Grupos de Activo" subtitle={`${groups.length} ${groups.length === 1 ? 'grupo' : 'grupos'} registrados`}>
              <button onClick={() => { setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); setShowGroupModal(true); }} className={btn.primary}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo grupo
              </button>
            </PageHeader>
            <div className={card}>
              {groups.length === 0 ? (
                <div className="p-14 text-center text-sm text-slate-400">No hay grupos. Crea uno para agrupar los tipos de activo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-700 to-blue-600">
                        {['Nombre', 'Código', 'Acciones'].map(h => (
                          <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groups.map(g => (
                        <tr key={g.id} className="hover:bg-sky-50/60 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{g.nombre}</td>
                          <td className="px-6 py-4"><span className={badge.blue}>{g.codigo || '—'}</span></td>
                          <td className="px-6 py-4">
                            <button onClick={() => { setEditingGroupId(g.id); setGroupNameInput(g.nombre); setGroupCodeInput(g.codigo || ''); setGroupDescriptionInput((g as any).descripcion || ''); setGroupActiveInput((g as any).activo ?? true); setShowGroupModal(true); }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-all shadow-sm">
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

            {/* Categories section */}
            <PageHeader title="Tipos de Activo" subtitle={`${Array.isArray(categories) ? categories.length : 0} tipos registrados`} onBack={() => setCurrentView('main')}>
              <button onClick={() => { setEditingCategoryId(null); setCategoryGroupId(''); setCategoryNameInput(''); setSubcategoriesInput(''); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setShowCategoryModal(true); }} className={btn.primary}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Añadir tipo
              </button>
            </PageHeader>
            <div className={card}>
              {!Array.isArray(categories) || categories.length === 0 ? (
                <div className="p-14 text-center text-sm text-slate-400">No hay tipos de activo configurados.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-700 to-blue-600">
                        {['Nombre', 'Marcas', 'Campos personalizados', 'Acciones'].map(h => (
                          <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(Array.isArray(categories) ? categories : []).map((c, i) => (
                        <tr key={c.id ?? i} className="hover:bg-sky-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                              </div>
                              <span className="font-semibold text-slate-800 text-sm">{c.nombre}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {(c.marcas || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {(c.marcas || []).map((m, mi) => <span key={mi} className={badge.blue}>{m}</span>)}
                              </div>
                            ) : <span className="text-slate-400 text-xs italic">Sin marcas</span>}
                          </td>
                          <td className="px-6 py-4">
                            {c.campos && c.campos.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {c.campos.map((campo, ci) => (
                                  <span key={ci} className={badge.gray}>
                                    {campo.nombre}
                                    {campo.requerido && <span className="text-red-500 ml-0.5">*</span>}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-slate-400 text-xs italic">Sin campos</span>}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setEditingCategoryId(c.id || null);
                                setCategoryGroupId(String((c as any).grupoId || (c as any).groupId || (c as any).grupo || ''));
                                setCategoryNameInput(c.nombre || '');
                                setCategoryCodeInput(c.codigo || '');
                                setMarcas(Array.isArray(c.marcas) ? c.marcas : []);
                                setNewCategoryFields((normalizeCampos(c.campos || []) as any[]).map(f => ({ ...f, opcionesRaw: (Array.isArray(f.opciones) ? f.opciones.join(', ') : '') })));
                                setCategoryPreview(null); setShowPreview(false); setShowCategoryModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-all shadow-sm">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
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

        {/* ═══════════════════════════ VIEW ASSET ═════════════════════════════ */}
        {currentView === 'viewAsset' && viewItem && (
          <div className="space-y-5">
            {/* Asset header */}
            <div className={`${card} overflow-visible`}>
              <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-sky-600 px-7 py-6 rounded-t-xl">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentView('main')} className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all border border-white/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-white font-bold text-2xl font-mono tracking-wider">{formatAssetCode(String(viewItem.assetId ?? viewItem._id ?? viewItem.id ?? ''))}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          String(viewItem.estadoActivo ?? '').toLowerCase() === 'activo'
                            ? 'bg-emerald-400/25 text-emerald-100 border-emerald-400/40'
                            : 'bg-amber-400/25 text-amber-100 border-amber-400/40'
                        }`}>
                          {String(viewItem.estadoActivo ?? '—').replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sky-200 text-sm mt-1.5 font-medium">{String(viewItem.categoria ?? 'Activo')}{String(viewItem.area ?? '') ? ` · ${viewItem.area}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => { setEditingAsset(viewItem); setShowRegisterModal(true); }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-900 text-sm font-bold transition-all shadow-md">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Editar
                    </button>
                    <button onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const apiBase = (import.meta.env.VITE_API_URL as string) || '';
                          const response = await fetch(`${apiBase}/api/activos/${viewItem.id || viewItem._id}/historial`, {
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                          });
                          if (!response.ok) { alert(`Error ${response.status}`); return; }
                          const data = await response.json();
                          setHistorialData(Array.isArray(data.data || data) ? (data.data || data) : []);
                          setCurrentView('historialAsset');
                        } catch (err) { alert('Error al cargar historial: ' + (err as Error).message); }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold border border-white/25 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Historial
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Información Básica */}
            <InfoSection title="Información básica" color="blue" icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Código" value={formatAssetCode(String(viewItem.assetId ?? viewItem.codigo ?? ''))} />
                <Field label="Categoría" value={String(viewItem.categoria ?? '—')} />
                <Field label="Área" value={String(viewItem.area ?? '—')} />
                <Field label="Fabricante" value={String(viewItem.fabricante ?? '—')} />
                <Field label="Modelo" value={String(viewItem.modelo ?? '—')} />
                <Field label="N° Serie" value={String(viewItem.serie ?? '—')} />
              </div>
            </InfoSection>

            {/* Componentes dinámicos (lectura) */}
            {(() => {
              const rawDyn = viewItem.valoresDinamicos ?? viewItem.valores_dinamicos ?? viewItem.valores ?? null;
              if (!rawDyn) return null;
              if (Array.isArray(rawDyn) && rawDyn.length && rawDyn[0] && Array.isArray(rawDyn[0].campos)) {
                return (
                  <InfoSection title="Componentes" color="teal" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/></svg>}>
                    <div className="space-y-3">
                      {(rawDyn as any[]).map((comp: any, ci: number) => (
                        <div key={ci} className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                          <div className="font-bold text-sm text-slate-700 mb-3 pb-2 border-b border-slate-200">{String(comp.nombre ?? comp.name ?? `Componente ${ci+1}`)}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {(comp.campos || []).map((c: any, fi: number) => (
                              <div key={fi} className="bg-white border border-slate-100 rounded-lg p-3 text-sm">
                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">{String(c.nombre ?? c.label ?? `Campo ${fi+1}`)}</div>
                                <div className="font-semibold text-slate-800 mt-1">{String(c.valor ?? c.valor ?? '')}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </InfoSection>
                );
              }
              if (Array.isArray(rawDyn) && rawDyn.length) {
                return (
                  <InfoSection title="Componentes" color="teal" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/></svg>}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(rawDyn as any[]).map((v: any, i: number) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm">
                          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Campo {String(v.campo_id ?? v.id ?? '')}</div>
                          <div className="font-semibold text-slate-700 mt-1">{String(v.valor ?? '')}</div>
                        </div>
                      ))}
                    </div>
                  </InfoSection>
                );
              }
              return null;
            })()}

            {/* Estados */}
            <InfoSection title="Estados del activo" color="green" icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estado activo</p>
                  <span className={estadoBadge(String(viewItem.estadoActivo ?? ''))}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dot(String(viewItem.estadoActivo ?? ''))}`} />
                    {String(viewItem.estadoActivo ?? '—').replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estado operativo</p>
                  <span className={estadoBadge(String(viewItem.estadoOperativo ?? ''))}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dot(String(viewItem.estadoOperativo ?? ''))}`} />
                    {String(viewItem.estadoOperativo ?? '—').replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </InfoSection>

            {/* Usuarios Asignados */}
            {(() => {
              const usuarios = viewItem.usuariosAsignados || viewItem.usuario_asignado;
              const arr = Array.isArray(usuarios) ? usuarios : (typeof usuarios === 'string' ? JSON.parse(usuarios || '[]') : []);
              const legacy = viewItem.usuarioAsignadoData || viewItem.usuario_asignado_data;
              const list = arr.length > 0 ? arr : (legacy && (legacy.nombreCompleto || legacy.nombre) ? [legacy] : []);
              if (list.length === 0) return null;
              return (
                <InfoSection title={`Usuarios asignados (${list.length})`} color="purple" icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                }>
                  <div className="space-y-2.5">
                    {list.map((u: UsuarioItem, i: number) => (
                      <div key={i} className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                        <Field label="Nombre" value={u.nombreCompleto || u.nombre || '—'} />
                        <Field label="Correo" value={u.correo || u.email || '—'} />
                        <Field label="Cargo" value={u.cargo || '—'} />
                      </div>
                    ))}
                  </div>
                </InfoSection>
              );
            })()}

            {/* Información Adicional */}
            <InfoSection title="Información adicional" color="orange" icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            }>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {String(viewItem.proveedor ?? '') !== '' && <Field label="Proveedor" value={String(viewItem.proveedor)} />}
                {String(viewItem.tipoDocumentoCompra ?? viewItem.tipo_documento_compra ?? '') !== '' && <Field label="Tipo documento" value={String(viewItem.tipoDocumentoCompra ?? viewItem.tipo_documento_compra)} />}
                {String(viewItem.numeroDocumentoCompra ?? viewItem.numero_documento_compra ?? viewItem.numero_documento ?? '') !== '' && <Field label="N° documento" value={String(viewItem.numeroDocumentoCompra ?? viewItem.numero_documento_compra ?? viewItem.numero_documento)} />}
                {String(viewItem.fechaCompra ?? '') !== '' && (
                  <Field label="Fecha de compra" value={new Date(String(viewItem.fechaCompra)).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} />
                )}
                {String(viewItem.fechaCompra ?? viewItem.fecha_compra ?? '') === '' && String(viewItem.fechaCompraAprox ?? viewItem.fecha_compra_aprox ?? viewItem.fechaCompraAproxYear ?? viewItem.fecha_compra_aprox_year ?? '') !== '' && (
                  <Field label="Año de compra (aprox.)" value={String(viewItem.fechaCompraAprox ?? viewItem.fecha_compra_aprox ?? viewItem.fechaCompraAproxYear ?? viewItem.fecha_compra_aprox_year)} />
                )}
                {String(viewItem.garantiaDuracion ?? viewItem.garantia_duracion ?? viewItem.garantia ?? '') !== '' && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-4 col-span-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Garantía</p>
                    <p className="text-sm font-bold text-slate-800">{String(viewItem.garantiaDuracion ?? viewItem.garantia_duracion ?? viewItem.garantia)}</p>
                    {(() => {
                      try {
                        const w = getWarrantyInfo({ estado_garantia: viewItem.estado_garantia ?? viewItem.estadoGarantia, warranty_expires_at: viewItem.warranty_expires_at ?? viewItem.warrantyExpiresAt, fechaFinGarantia: viewItem.fechaFinGarantia ?? viewItem.fecha_fin_garantia, garantiaDuracion: viewItem.garantia ?? viewItem.garantiaDuracion ?? viewItem.garantia_duracion, garantia: viewItem.garantia, fechaCompra: viewItem.fechaCompra ?? viewItem.fecha_compra ?? viewItem.fechaCompraAprox ?? viewItem.fechaCompraAproxYear ?? viewItem.fecha_compra_aprox });
                        if (w?.estado) return <div className="mt-1.5 flex items-center gap-2">
                          <span className={w.estado === 'Vigente' ? badge.green : badge.red}>{w.estado}</span>
                          {w.expiresAt && <span className="text-xs text-slate-400">Vence: {new Date(w.expiresAt).toLocaleDateString('es-ES')}</span>}
                        </div>;
                      } catch {}
                      return null;
                    })()}
                  </div>
                )}
                {String(viewItem.ip ?? '') !== '' && <Field label="Dirección IP" value={<span className="font-mono">{String(viewItem.ip)}</span>} />}
                {String(viewItem.mac ?? '') !== '' && <Field label="MAC Address" value={<span className="font-mono">{String(viewItem.mac)}</span>} />}
                {String(viewItem.codigoAccesoRemoto ?? '') !== '' && <Field label="Acceso remoto" value={<span className="font-mono">{String(viewItem.codigoAccesoRemoto)}</span>} />}
                {(() => {
                  let condicion: unknown = viewItem.condicionFisica ?? viewItem.condicion_fisica ?? viewItem.estadoFisico ?? viewItem.estado_fisico ?? '';
                  if (!condicion || String(condicion).trim() === '') {
                    try {
                      const cpRaw = viewItem.camposPersonalizados ?? viewItem.campos_personalizados;
                      const cp = typeof cpRaw === 'string' ? (cpRaw ? JSON.parse(cpRaw) : {}) : (cpRaw || {});
                      for (const [k, v] of Object.entries(cp || {})) {
                        if (String(k).toLowerCase().includes('condici') && v !== null && v !== undefined && String(v).trim() !== '') { condicion = v; break; }
                      }
                    } catch {}
                  }
                  return String(condicion ?? '') !== '' ? <Field label="Condición física" value={String(condicion)} /> : null;
                })()}
                {(() => {
                  const raw = viewItem.antiguedadCalculada ?? viewItem.antiguedad_text ?? viewItem.antiguedad ?? null;
                  if (raw) return <Field label="Antigüedad" value={String(raw)} />;
                  const fechaRaw = viewItem.fechaCompra ?? viewItem.fecha_compra ?? null;
                  if (fechaRaw) {
                    try {
                      const d = new Date(String(fechaRaw));
                      if (!isNaN(d.getTime())) {
                        const now = new Date(); let y = now.getFullYear() - d.getFullYear(); let m = now.getMonth() - d.getMonth();
                        if (m < 0) { y--; m += 12; }
                        const parts = []; if (y > 0) parts.push(`${y} año${y > 1 ? 's' : ''}`); if (m > 0) parts.push(`${m} mes${m > 1 ? 'es' : ''}`);
                        return <Field label="Antigüedad" value={parts.length > 0 ? parts.join(' y ') : 'Menos de 1 mes'} />;
                      }
                    } catch {}
                  }
                  return null;
                })()}
              </div>
              {[
                { urlKey: 'purchaseDocumentUrl', nameKey: 'purchaseDocumentName', descKey: 'purchaseDocumentDescription', label: 'Documento de compra', altUrl: 'purchase_document_url', altName: 'purchase_document_name' },
                { urlKey: 'warrantyDocumentUrl', nameKey: 'warrantyDocumentName', descKey: 'warrantyDocumentDescription', label: 'Documento de garantía', altUrl: 'warranty_document_url', altName: 'warranty_document_name' },
              ].map(doc => {
                const url = String((viewItem as any)[doc.urlKey] ?? (viewItem as any)[doc.altUrl] ?? '');
                if (!url) return null;
                const name = String((viewItem as any)[doc.nameKey] ?? (viewItem as any)[doc.altName] ?? '').split('/').pop() ?? '';
                const desc = String((viewItem as any)[doc.descKey] ?? '');
                return (
                  <div key={doc.label} className="mt-3 flex items-center gap-4 bg-sky-50 border border-sky-200 rounded-xl px-5 py-3.5">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{doc.label}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{name}</p>
                      {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
                    </div>
                    <a href={url} target="_blank" rel="noreferrer" className={btn.secondary + ' py-1.5 text-xs shrink-0'}>Ver</a>
                  </div>
                );
              })}
            </InfoSection>

            {/* Campos Personalizados */}
            {(() => {
              const raw = viewItem.campos_personalizados_array || viewItem.camposPersonalizadosArray || viewItem.camposPersonalizados || viewItem.campos_personalizados;
              const parsed: Record<string, unknown> = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
              const arrayFields: Record<string, any[]> = {};
              const standalone: Record<string, string> = {};
              try {
                Object.entries(parsed).forEach(([k, v]) => {
                  if (v === null || v === undefined) return;
                  if (Array.isArray(v)) { arrayFields[k] = v; return; }
                  standalone[k.replace(/_/g, ' ')] = String(v);
                });
              } catch {}
              if (Object.keys(arrayFields).length === 0 && Object.keys(standalone).length === 0) return null;
              return (
                <InfoSection title="Campos personalizados" color="yellow" icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                }>
                  <div className="space-y-3">
                    {Object.entries(arrayFields).map(([k, instances]) => (
                      <div key={k}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{k.replace(/_/g, ' ')}</p>
                        {instances.map((inst, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 mb-2">
                            <p className="text-xs font-semibold text-slate-400 mb-1.5">Instancia {i + 1}</p>
                            {Object.entries(inst).map(([sk, sv]) => (
                              <p key={sk} className="text-xs"><span className="text-slate-500">{sk}: </span><span className="font-bold text-slate-800">{String(sv)}</span></p>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                    {Object.keys(standalone).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(standalone).map(([k, v]) => <Field key={k} label={k} value={v} />)}
                      </div>
                    )}
                  </div>
                </InfoSection>
              );
            })()}

            {/* Observaciones */}
            {String(viewItem.observaciones ?? '') !== '' && (
              <InfoSection title="Observaciones" color="slate" icon={
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              }>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{String(viewItem.observaciones)}</p>
              </InfoSection>
            )}

            {/* Fotos */}
            {(() => {
              const fotos = viewItem.fotos;
              let fotosArray = Array.isArray(fotos) ? fotos : (typeof fotos === 'string' ? JSON.parse(fotos || '[]') : []);
              fotosArray = fotosArray.map((foto: FotoItem) => {
                const f = foto as Record<string, unknown>;
                let url = String(f['url'] ?? '');
                const description = String(f['description'] ?? f['descripcion'] ?? '');
                const name = String(f['name'] ?? f['nombre'] ?? '');
                if (url) {
                  const match = url.match(/\/uploads\/(.+)$/);
                  if (match) {
                    const apiBase = (import.meta.env.VITE_API_URL as string) || '';
                    url = `${apiBase}/uploads/${encodeURIComponent(decodeURIComponent(match[1]))}`;
                  }
                }
                return { ...foto, url, description, name };
              });
              if (fotosArray.length === 0) return null;
              return (
                <InfoSection title={`Galería de fotos (${fotosArray.length})`} color="pink" icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                }>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {fotosArray.map((foto: FotoItem, i: number) => (
                      <div key={i} className="rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative h-44 bg-slate-100">
                          <img src={foto.url} alt={foto.description || foto.name} className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160"><rect fill="%23e2e8f0" width="200" height="160"/><text x="50%" y="50%" font-size="12" text-anchor="middle" fill="%2394a3b8">Sin imagen</text></svg>'; }}
                          />
                          <span className="absolute top-2 right-2 bg-blue-700/80 text-white text-xs font-bold px-2 py-0.5 rounded-lg backdrop-blur-sm">#{i + 1}</span>
                        </div>
                        <div className="px-4 py-3">
                          {foto.name && <p className="text-xs font-bold text-slate-700 truncate mb-0.5">{foto.name}</p>}
                          {foto.description && <p className="text-xs text-slate-500 truncate">{foto.description}</p>}
                          <a href={foto.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Ver imagen
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </InfoSection>
              );
            })()}

            {/* Informe de soporte inicial */}
            <div className={card}>
              <div className="px-6 py-5">
                {(() => {
                  const rawField = (viewItem as any)?.informe_soporte_inicial_url ?? (viewItem as any)?.informeSoporteInicialUrl ?? '';
                  const backendField = String(rawField ?? '').trim();
                  const isGenerating = !loading && backendField.toLowerCase() === 'generating';
                  const isGenerated = !loading && backendField !== '' && backendField.toLowerCase() !== 'generating' && backendField.toLowerCase() !== 'null';
                  return (
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Informe de soporte inicial</p>
                          <p className="text-xs text-slate-500 mt-0.5">{isGenerated ? 'El informe ya fue generado.' : 'Genera el informe PDF para este activo.'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {isGenerated && (
                          <a href={backendField} target="_blank" rel="noreferrer" className={btn.secondary + ' text-xs'}>Ver PDF</a>
                        )}
                        <button
                          disabled={isGenerated || isGenerating}
                          onClick={() => { if (!isGenerated && !isGenerating) setShowSupportReportModal(true); }}
                          className={`${btn.primary} text-xs ${(isGenerated || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {isGenerating ? (
                            <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Generando…</>
                          ) : isGenerated ? 'Ya generado' : 'Generar informe'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════ HISTORIAL ══════════════════════════════ */}
        {currentView === 'historialAsset' && viewItem && (
          <>
            <PageHeader title="Historial de cambios" subtitle={`${formatAssetCode(String(viewItem.assetId ?? viewItem.codigo ?? ''))} · ${String(viewItem.categoria ?? '')}`} onBack={() => setCurrentView('viewAsset')} />
            <div className={card}>
              {historialData.length === 0 ? (
                <div className="p-14 text-center text-sm text-slate-400">No hay cambios registrados para este activo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-700 to-blue-600">
                        {['Fecha y hora', 'Código', 'Campo', 'Valor nuevo', 'Motivo'].map(h => (
                          <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historialData.map((reg, idx) => {
                        const fmtCampo = (c: string) => ({ fabricante:'Fabricante',modelo:'Modelo',serie:'Serie',area:'Área',traslado:'Traslado',estadoActivo:'Estado Activo',estadoOperativo:'Estado Operativo',fechaCompra:'Fecha Compra',proveedor:'Proveedor',ip:'IP',mac:'MAC',observaciones:'Observaciones',usuariosAsignados:'Usuarios Asignados',categoria:'Categoría',camposPersonalizadosArray:'Campos Personalizados' }[c] || c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' '));
                        const fmtValor = (v: string, campo?: string) => {
                          if (!v || v === 'null') return '—';
                          try {
                            const p = JSON.parse(v);
                            if (campo === 'traslado' && typeof p === 'object') return `${p.sede_destino || '?'} → ${p.area_destino || 'Sin área'}`;
                            if (Array.isArray(p)) return p.length === 0 ? 'Sin datos' : p.map((i: any) => typeof i === 'object' ? Object.values(i).filter(Boolean).join(' - ') : String(i)).join(' | ');
                            if (typeof p === 'object') return Object.values(p).filter(Boolean).join(' - ');
                            return String(p);
                          } catch { return v; }
                        };
                        const fmtMotivo = (m: string) => { if (!m) return '—'; const match = m.match(/^TRASLADO:\s*(.+?)\.\s*Responsable/); return match ? `TRASLADO: ${match[1]}` : m; };
                        return (
                          <tr key={reg.id || idx} className="hover:bg-sky-50/60 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800 text-xs">{new Date(reg.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })}</p>
                              <p className="text-slate-400 text-xs mt-0.5">{new Date(reg.fecha).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })}</p>
                            </td>
                            <td className="px-6 py-4"><span className={badge.blue + ' font-mono'}>{reg.asset_id}</span></td>
                            <td className="px-6 py-4"><span className={badge.gray}>{fmtCampo(reg.campo_modificado)}</span></td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium px-2.5 py-1 rounded-lg max-w-xs truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                {fmtValor(reg.valor_nuevo, reg.campo_modificado)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-xs">{fmtMotivo(reg.motivo)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════ GENERAL VIEW ════════════════════════════ */}
        {currentView === 'generalView' && (
          <>
            <PageHeader
              title="Inventario consolidado"
              subtitle={`${empresa?.nombre ?? ''} · ${items.length} activos en ${sedes.length} sedes`}
              onBack={() => setCurrentView('main')}
            />
            <div className={card}>
              {items.length === 0 ? (
                <div className="p-14 text-center text-sm text-slate-400">No hay activos registrados en ninguna sede.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-700 to-blue-600">
                        {['Código','Categoría','Fabricante','Modelo','N° Serie','Ubicación','Estado',''].map(h => (
                          <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const itemSedeId = String(item.sedeId || item.sede_id);
                        const sedeNombre = sedes.find(s => String(s._id ?? s.id) === itemSedeId)?.nombre ?? 'Sin sede';
                        const condicion = String(item.condicionFisica ?? item.condicion_fisica ?? '');
                        return (
                          <tr key={item.id ?? item._id ?? idx} className="hover:bg-sky-50/60 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-blue-700 text-xs">{formatAssetCode(String(item.assetId ?? item._id ?? item.id ?? ''))}</td>
                            <td className="px-6 py-4 text-slate-700 text-xs font-medium">{String(item.categoria ?? '—')}</td>
                            <td className="px-6 py-4 text-slate-600 text-xs">{String(item.fabricante ?? '—')}</td>
                            <td className="px-6 py-4 text-slate-600 text-xs">{String(item.modelo ?? '—')}</td>
                            <td className="px-6 py-4 font-mono text-slate-500 text-xs">{String(item.serie ?? '—')}</td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-bold text-slate-800">{sedeNombre}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{String(item.area ?? 'Sin área')}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={estadoBadge(condicion || String(item.estadoActivo ?? ''))}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dot(condicion || String(item.estadoActivo ?? ''))}`} />
                                {(condicion || String(item.estadoActivo ?? '—')).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => { setViewItem(item); setCurrentView('viewAsset'); }} className={btn.secondary + ' text-xs py-1.5'}>Ver detalles</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════ MODALS (unchanged logic) ═════════════════ */}

      <RegisterAssetModal
        key={editingAsset?.id || 'new-asset'}
        isOpen={showRegisterModal}
        onClose={() => { setShowRegisterModal(false); setEditingAsset(null); }}
        empresaId={empresaId} sedeId={sedeId}
        empresaNombre={empresa?.nombre} sedeNombre={sedeName ?? undefined}
        empresa={empresa} sedes={sedes} areas={areas} categories={categories} groups={groups}
        editingAsset={editingAsset}
        onSuccess={(item: unknown) => {
          if (editingAsset) setItems(prev => prev.map(i => (i.id === editingAsset.id ? item as InventarioItem : i)));
          else setItems(prev => [item as InventarioItem, ...prev]);
          setNoInventory(null); setEditingAsset(null); setShowRegisterModal(false);
        }}
      />

      {showSupportReportModal && viewItem && (
        <InitialSupportReportModal
          isOpen={showSupportReportModal}
          onClose={() => setShowSupportReportModal(false)}
          onReportGenerated={(pdfUrl) => {
            const key = getAssetUniqueKey(viewItem);
            if (!key) return;
            setViewItem(prev => prev ? ({ ...prev, informeSoporteInicialUrl: pdfUrl, informe_soporte_inicial_url: pdfUrl }) : prev);
            setItems(prev => prev.map(it => getAssetUniqueKey(it as any) === key ? { ...(it as any), informeSoporteInicialUrl: pdfUrl, informe_soporte_inicial_url: pdfUrl } as InventarioItem : it));
          }}
          onStartGenerating={() => {
            const key = getAssetUniqueKey(viewItem);
            if (!key) return;
            setViewItem(prev => prev ? ({ ...(prev as any), informeSoporteInicialUrl: 'generating', informe_soporte_inicial_url: 'generating' }) : prev);
            setItems(prev => prev.map(it => getAssetUniqueKey(it as any) === key ? { ...(it as any), informeSoporteInicialUrl: 'generating', informe_soporte_inicial_url: 'generating' } as InventarioItem : it));
          }}
          onReportFailed={() => {
            const key = getAssetUniqueKey(viewItem);
            if (!key) return;
            setViewItem(prev => { if (!prev) return prev; const c = { ...(prev as any) }; if (c.informeSoporteInicialUrl === 'generating') delete c.informeSoporteInicialUrl; if (c.informe_soporte_inicial_url === 'generating') delete c.informe_soporte_inicial_url; return c as typeof prev; });
            setItems(prev => prev.map(it => { if (getAssetUniqueKey(it as any) !== key) return it; const c = { ...(it as any) }; if (c.informeSoporteInicialUrl === 'generating') delete c.informeSoporteInicialUrl; if (c.informe_soporte_inicial_url === 'generating') delete c.informe_soporte_inicial_url; return c as InventarioItem; }));
          }}
          asset={viewItem}
          empresaNombre={String(empresa?.nombre ?? viewItem.empresaNombre ?? viewItem.empresa ?? '')}
          sedeNombre={String((() => { const sid = String(viewItem.sedeId ?? viewItem.sede_id ?? viewItem.sede ?? ''); return sedes.find(s => String(s._id ?? s.id) === sid)?.nombre ?? viewItem.sedeNombre ?? viewItem.sede ?? sedeName ?? ''; })())}
        />
      )}

      {/* Group modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className={`${card} w-full max-w-md shadow-2xl`}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-600 rounded-t-xl">
              <div>
                <h3 className="font-bold text-white text-base">{editingGroupId ? 'Editar grupo' : 'Nuevo grupo'}</h3>
                <p className="text-blue-200 text-xs mt-0.5">Gestión de grupos de activos</p>
              </div>
              <button onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all" aria-label="Cerrar">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Nombre del grupo *</label>
                <input value={groupNameInput} onChange={e => { setGroupNameInput(e.target.value); setGroupCodeInput(generateGroupCode(e.target.value)); }}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder-slate-400" placeholder="Ej: Equipos de Cómputo" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Código (auto-generado)</label>
                <input value={groupCodeInput} readOnly className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Descripción</label>
                <textarea value={groupDescriptionInput} onChange={e => setGroupDescriptionInput(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-slate-800 placeholder-slate-400" rows={3} placeholder="Descripción opcional" />
              </div>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={groupActiveInput} onChange={e => setGroupActiveInput(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="font-medium">Activo</span>
              </label>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }} className={btn.ghost}>Cancelar</button>
                <button onClick={async () => {
                    const name = String(groupNameInput || '').trim();
                    if (!name) { setErrorMessage('El nombre del grupo es obligatorio'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
                    const payload: any = { nombre: name, descripcion: String(groupDescriptionInput || '').trim(), activo: Boolean(groupActiveInput) };
                    if (String(groupCodeInput || '').trim() !== '') payload.codigo = String(groupCodeInput || '').trim();
                    try {
                      if (editingGroupId) await axiosClient.put(`/api/gestion-grupos-categorias/${editingGroupId}`, payload);
                      else await axiosClient.post('/api/gestion-grupos-categorias', payload);
                      setSuccessMessage(editingGroupId ? 'Grupo actualizado' : 'Grupo creado'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
                      await fetchGroups();
                      setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true);
                    } catch (err: any) {
                      const status = err?.response?.status;
                      const msg = err?.response?.data?.message || err?.message || 'Error';
                      setErrorMessage(status === 409 ? (typeof msg === 'string' ? msg : 'El código ya existe') : 'Error al guardar grupo');
                      setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 5000);
                    }
                  }} className={btn.primary}>{editingGroupId ? 'Actualizar' : 'Crear'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddAreaModal isOpen={showAddAreaModal} onClose={() => setShowAddAreaModal(false)} empresaId={empresaId} sedeId={sedeId}
        onSuccess={async (areaName) => {
          alert(`Área creada: ${areaName}`);
          if (empresaId) { try { const d = await getAreasByEmpresa(empresaId); setAreas((Array.isArray(d) ? d : ((d as any)['data'] ?? [])) as AreaItem[]); } catch {} }
          setShowAddAreaModal(false);
        }}
      />
      <AddAreaModal isOpen={showEditAreaModal} onClose={() => { setShowEditAreaModal(false); setEditingArea(null); }} empresaId={empresaId}
        mode="edit" areaId={String(editingArea?._id ?? editingArea?.id ?? '')}
        initialName={String(editingArea?.name ?? editingArea?.nombre ?? '')}
        initialResponsable={String(editingArea?.responsable ?? '')}
        onSuccess={async () => {
          if (empresaId) { try { const d = await getAreasByEmpresa(empresaId); setAreas((Array.isArray(d) ? d : ((d as any)['data'] ?? [])) as AreaItem[]); setSuccessMessage('Área actualizada exitosamente'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000); } catch {} }
          setShowEditAreaModal(false); setEditingArea(null);
        }}
      />

      <TrasladarAssetModal isOpen={showTrasladarModal} onClose={() => { setShowTrasladarModal(false); setAssetToTransfer(null); }}
        asset={assetToTransfer} empresaId={empresaId} empresaNombre={empresa?.nombre}
        sedeOrigenId={sedeId} sedeOrigenNombre={sedeName ?? undefined} sedes={sedes}
        onSuccess={async () => {
          setLoading(true);
          try {
            if (sedeId) { const d = await getInventarioBySede(empresaId!, sedeId); setItems(Array.isArray(d) ? d : d?.data ?? []); }
            else if (empresaId) { const d = await getInventarioByEmpresa(empresaId); setItems(Array.isArray(d) ? d : d?.data ?? []); }
          } catch {} finally { setLoading(false); }
        }}
      />

      {/* Category modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`${card} w-full max-w-3xl my-8 shadow-2xl`}>
            {/* header */}
            <div className="px-7 py-5 border-b border-blue-800 flex items-center justify-between bg-gradient-to-r from-blue-800 via-blue-700 to-sky-600 rounded-t-xl">
              <div>
                <h3 className="font-bold text-white text-base">{editingCategoryId ? 'Editar tipo de activo' : 'Nuevo tipo de activo'}</h3>
                <p className="text-sky-200 text-xs mt-0.5">Define el tipo y sus campos para el formulario de registro.</p>
              </div>
              <button onClick={() => { setShowCategoryModal(false); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput(''); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all border border-white/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-7 py-6 overflow-y-auto max-h-[75vh]">
              <form onSubmit={e => {
                e.preventDefault();
                const cat = String(categoryNameInput || '').trim();
                if (!cat) { setErrorMessage('El nombre de la categoría es obligatorio'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
                if (!categoryGroupId) { setErrorMessage('Selecciona un Grupo de Activo'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
                if (!marcas || marcas.length === 0) { setErrorMessage('Agrega al menos una marca para este tipo'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
                const subs = String(subcategoriesInput || '').split(',').map(s => s.trim()).filter(Boolean);
                const cleanedCampos: CategoryField[] = (newCategoryFields || []).map(f => {
                  const rawOpts = (f as any).opciones || (f as any).options || (f as any).opcionesRaw || [];
                  const opciones: string[] = Array.isArray(rawOpts) ? rawOpts.map((o: any) => typeof o === 'string' ? o : String(o?.value ?? '')).map((s: string) => s.trim()).filter(Boolean) : (typeof rawOpts === 'string' ? rawOpts.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
                  return { nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
                });
                const hasValidField = (cleanedCampos || []).some(f => String(f.nombre || '').trim().length > 0);
                if (!hasValidField) { setErrorMessage('Agrega al menos un campo personalizado'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
                setCategoryPreview({ nombre: cat, grupoId: categoryGroupId || undefined, subcategorias: subs, campos: cleanedCampos, createdAt: new Date().toLocaleString() } as any);
                setShowPreview(true);
              }}>
                <div className="space-y-6">
                  {/* Step 1: Básico */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2.5">
                      <span className="w-6 h-6 bg-blue-700 text-white rounded-full text-[10px] flex items-center justify-center font-bold shrink-0">1</span>
                      Información básica
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Grupo de activo</label>
                        <select value={categoryGroupId} onChange={e => setCategoryGroupId(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800">
                          <option value="">— Sin grupo —</option>
                          {groups.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Nombre *</label>
                        <input value={categoryNameInput} onChange={e => { setCategoryNameInput(e.target.value); if (!editingCategoryId) setCategoryCodeInput(generateCategoryCode(e.target.value)); }}
                          className={`w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 ${editingCategoryId ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'placeholder-slate-400'}`}
                          placeholder="Ej: Laptop" readOnly={!!editingCategoryId} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Código (auto)</label>
                        <input value={categoryCodeInput} readOnly className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* Step 2: Marcas */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2.5">
                      <span className="w-6 h-6 bg-blue-700 text-white rounded-full text-[10px] flex items-center justify-center font-bold shrink-0">2</span>
                      Marcas
                    </p>
                    <div className="flex gap-2.5">
                      <input value={brandInput} onChange={e => setBrandInput(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder-slate-400"
                        placeholder="Escribe una marca y pulsa Agregar" />
                      <button type="button" onClick={() => { const v = String(brandInput || '').trim(); if (v && !marcas.includes(v)) { setMarcas(p => [...p, v]); setBrandInput(''); } }} className={btn.secondary}>Agregar</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 min-h-[32px]">
                      {marcas.length === 0
                        ? <span className="text-xs text-slate-400 italic">Sin marcas</span>
                        : marcas.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                            {m}
                            <button type="button" onClick={() => setMarcas(p => p.filter(x => x !== m))} className="text-blue-400 hover:text-red-500 transition-colors font-bold">×</button>
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* Step 3: Campos */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2.5">
                        <span className="w-6 h-6 bg-blue-700 text-white rounded-full text-[10px] flex items-center justify-center font-bold shrink-0">3</span>
                        Campos personalizados
                      </p>
                      <div className="flex items-center gap-2.5">
                        <select value={copyFromCategoryId} onChange={e => {
                            const id = e.target.value; setCopyFromCategoryId(id);
                            if (!id) return;
                            (async () => {
                              try {
                                const cat = await getCategoriaById(id);
                                const source = cat ?? (categories || []).find(c => String(c.id ?? c._id ?? '') === String(id));
                                if (!source) return;
                                setNewCategoryFields((normalizeCampos((source as any).campos || []) as any[]).map(f => ({ ...f, opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : '' })));
                              } catch {
                                const catLocal = (categories || []).find(c => String(c.id ?? c._id ?? '') === String(id));
                                if (!catLocal) return;
                                setNewCategoryFields((normalizeCampos(catLocal.campos || []) as any[]).map(f => ({ ...f, opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : '' })));
                              }
                            })();
                          }}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium">
                          <option value="">Copiar desde…</option>
                          {(categories || []).map(c => <option key={String(c.id ?? c._id ?? '')} value={String(c.id ?? c._id ?? '')}>{c.nombre}</option>)}
                        </select>
                        <button type="button" onClick={() => setNewCategoryFields([...newCategoryFields, { nombre: '', tipo: 'text', requerido: false, opcionesRaw: '' } as any])} className={btn.primary + ' py-1.5 text-xs'}>
                          + Agregar campo
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            {['Nombre del campo', 'Tipo', 'Req.', 'Opciones', ''].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {newCategoryFields.map((field, idx) => (
                            <tr key={idx} className="hover:bg-sky-50/40 transition-colors">
                              <td className="px-4 py-2.5">
                                <input type="text" value={field.nombre} onChange={e => { const u = [...newCategoryFields]; u[idx] = { ...u[idx], nombre: e.target.value }; setNewCategoryFields(u); }}
                                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400" placeholder="Nombre del campo" />
                              </td>
                              <td className="px-4 py-2.5">
                                <select value={field.tipo} onChange={e => { const u = [...newCategoryFields]; u[idx] = { ...u[idx], tipo: e.target.value as CategoryField['tipo'] }; if (e.target.value !== 'select') { u[idx].opciones = []; delete (u[idx] as any).opcionesRaw; } else { (u[idx] as any).opcionesRaw = ((u[idx] as any).opciones || []).join(', '); } setNewCategoryFields(u); }}
                                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800">
                                  <option value="text">Texto</option>
                                  <option value="number">Número</option>
                                  <option value="select">Selección</option>
                                  <option value="textarea">Texto largo</option>
                                </select>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <input type="checkbox" checked={Boolean(field.requerido)} onChange={e => { const u = [...newCategoryFields]; u[idx] = { ...u[idx], requerido: e.target.checked }; setNewCategoryFields(u); }} className="w-4 h-4 accent-blue-600" />
                              </td>
                              <td className="px-4 py-2.5">
                                {field.tipo === 'select' ? (
                                  <input type="text" value={((field as any).opcionesRaw ?? '')}
                                    onChange={e => { const u = [...newCategoryFields]; (u[idx] as any).opcionesRaw = e.target.value; setNewCategoryFields(u); }}
                                    onBlur={() => { const u = [...newCategoryFields]; const raw = String((u[idx] as any).opcionesRaw || ''); u[idx] = { ...u[idx], opciones: raw.split(',').map((s: string) => s.trim()).filter(Boolean) } as any; setNewCategoryFields(u); }}
                                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400" placeholder="Op1, Op2" />
                                ) : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                <button type="button" onClick={() => setNewCategoryFields(newCategoryFields.filter((_, i) => i !== idx))} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {newCategoryFields.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400 italic">Sin campos personalizados. Pulsa "+ Agregar campo".</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => { setShowCategoryModal(false); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput(''); }} className={btn.ghost}>Cancelar</button>
                    <button type="submit" className={btn.primary}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Previsualizar
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Preview overlay */}
            {showPreview && categoryPreview && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className={`${card} w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl`}>
                  <div className="px-7 py-5 border-b border-blue-800 bg-gradient-to-r from-blue-800 via-blue-700 to-sky-600 rounded-t-xl">
                    <h3 className="font-bold text-white text-base">Vista previa</h3>
                    <p className="text-sky-200 text-xs mt-0.5">Confirme la información antes de guardar</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
                    <div className="bg-sky-50 border border-sky-200 rounded-xl px-6 py-4">
                      <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-1">Nombre del tipo</p>
                      <p className="text-xl font-bold text-slate-800">{categoryPreview.nombre}</p>
                    </div>
                    {marcas.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Marcas</p>
                        <div className="flex flex-wrap gap-1.5">{marcas.map((m, i) => <span key={i} className={badge.blue}>{m}</span>)}</div>
                      </div>
                    )}
                    {categoryPreview.campos && categoryPreview.campos.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Campos personalizados ({categoryPreview.campos.length})</p>
                        <div className="grid grid-cols-2 gap-2.5">
                          {categoryPreview.campos.map((campo, i) => (
                            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-slate-800 text-sm">{campo.nombre || `Campo ${i+1}`}</span>
                                {campo.requerido && <span className={badge.red}>Req.</span>}
                              </div>
                              <span className={badge.gray + ' capitalize'}>{campo.tipo}</span>
                              {campo.opciones && campo.opciones.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">{campo.opciones.map((opt, oi) => <span key={oi} className={badge.gray + ' text-[10px]'}>{typeof opt === 'string' ? opt : (opt as any).value}</span>)}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-7 py-4 border-t border-slate-200 flex justify-between gap-2.5">
                    <button onClick={() => { setCategoryPreview(null); setShowPreview(false); }} className={btn.ghost}>← Volver</button>
                    <button onClick={async () => {
                        try {
                          if (editingCategoryId) {
                            const finalCampos: CategoryField[] = (categoryPreview.campos || []).map((f: any) => {
                              const raw = f.opciones || f.options || [];
                              const opciones: string[] = Array.isArray(raw) ? raw.map((o: any) => typeof o === 'string' ? o : String(o?.value ?? '')).map((s: string) => s.trim()).filter(Boolean) : (typeof raw === 'string' ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
                              return { nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
                            });
                            if (!categoryPreview.grupoId) throw new Error('Selecciona un Grupo de Activo');
                            if (!finalCampos || finalCampos.filter(f => String(f.nombre || '').trim().length > 0).length === 0) throw new Error('Agrega al menos un campo personalizado');
                            const updated = await updateCategoria(editingCategoryId, { ...((categoryPreview as any).grupoId ? { grupo_id: (categoryPreview as any).grupoId } : {}), subcategorias: (categoryPreview as any).subcategorias, campos: finalCampos });
                            setCategories(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
                            setSuccessMessage('Categoría actualizada'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
                          } else {
                            if (!categoryPreview.nombre?.trim()) throw new Error('El nombre es obligatorio');
                            if (!categoryPreview.grupoId) throw new Error('Selecciona un Grupo de Activo');
                            if (!marcas || marcas.length === 0) throw new Error('Agrega al menos una marca para este tipo');
                            const finalCampos: CategoryField[] = (categoryPreview.campos || []).filter((f: any) => f.nombre?.trim()).map((f: any) => {
                              const raw = f.opciones || f.options || [];
                              const opciones: string[] = Array.isArray(raw) ? raw.map((o: any) => typeof o === 'string' ? o : String(o?.value ?? '')).map((s: string) => s.trim()).filter(Boolean) : (typeof raw === 'string' ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
                              return { nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
                            });
                            if (!finalCampos || finalCampos.length === 0) throw new Error('Agrega al menos un campo personalizado');
                            const payload: any = { nombre: categoryPreview.nombre.trim(), ...((categoryPreview as any).grupoId ? { grupo_id: (categoryPreview as any).grupoId } : {}), ...((categoryPreview as any).subcategorias?.length ? { subcategorias: (categoryPreview as any).subcategorias } : {}), ...(finalCampos.length > 0 ? { campos: finalCampos } : {}) };
                            const created = await createCategoria(payload);
                            setCategories(prev => [created, ...prev]);
                            setSuccessMessage('Categoría creada'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
                          }
                          setCategoryPreview(null); setShowPreview(false); setShowCategoryModal(false); setNewCategoryFields([]); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput('');
                        } catch (err) {
                          setErrorMessage(err instanceof Error ? err.message : 'Error al guardar'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 4000);
                        }
                      }} className={btn.primary}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {editingCategoryId ? 'Actualizar' : 'Confirmar y crear'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast success ── */}
      {showSuccessToast && (
        <div className="fixed top-5 right-5 z-[70] animate-in slide-in-from-right">
          <div className="flex items-start gap-3 bg-white rounded-xl border border-emerald-200 shadow-xl px-5 py-4 min-w-[300px]">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">Operación exitosa</p>
              <p className="text-xs text-slate-500 mt-0.5">{successMessage}</p>
            </div>
            <button onClick={() => setShowSuccessToast(false)} className="text-slate-300 hover:text-slate-600 transition-colors mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Toast error ── */}
      {showErrorToast && (
        <div className="fixed top-5 right-5 z-[70]">
          <div className="flex items-start gap-3 bg-white rounded-xl border border-red-200 shadow-xl px-5 py-4 min-w-[300px]">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">Ha ocurrido un error</p>
              <p className="text-xs text-slate-500 mt-0.5">{errorMessage}</p>
            </div>
            <button onClick={() => setShowErrorToast(false)} className="text-slate-300 hover:text-slate-600 transition-colors mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioPage;