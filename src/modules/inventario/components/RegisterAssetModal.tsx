import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { getWarrantyInfo } from "@/modules/inventario/utils/warranty";
import { formatAssetCode, getCompanyPrefix, getCategoryPrefix } from "@/utils/helpers";
import type { Category, FieldOption, SubField } from "@/modules/inventario/services/categoriasService";
import { createActivo, updateActivo, getInventarioBySede, API_BASE } from "@/modules/inventario/services/inventarioService";
import { getFormularioByCategoria } from '@/modules/inventario/services/componentesService';
import { getUsuariosByEmpresa, type Usuario } from "@/modules/usuarios/services/usuariosService";
import { getMarcas, type MarcaItemAPI } from '@/modules/inventario/services/marcasService';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AreaItem {
  id?: string | number;
  _id?: string;
  name?: string;
  nombre?: string;
  responsable?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId?: string;
  sedeId?: string;
  onSuccess?: (item: Record<string, unknown>) => void;
  empresaNombre?: string;
  sedeNombre?: string;
  empresa?: { id?: number; _id?: string; nombre?: string } | null;
  sedes?: Array<{ id?: number; _id?: string; nombre?: string }>;
  areas?: AreaItem[];
  categories?: Category[];
  groups?: Array<{ id?: string; nombre?: string; codigo?: string }>;
  editingAsset?: Record<string, unknown> | null;
}

type StorageEntry = { tipo: string; capacidad: string };
type RAMEntry     = { tipo: string; capacidad: string };

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type TabId = 'identificacion' | 'compra' | 'personalizados' | 'asignaciones';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'identificacion',  label: 'Identificación',   icon: '🏷️' },
  { id: 'compra',          label: 'Compra & Garantía', icon: '🧾' },
  { id: 'personalizados',  label: 'Componentes',      icon: '⚙️' },
  { id: 'asignaciones',    label: 'Asignaciones',      icon: '👥' },
];

// ─── Estilos utilitarios ───────────────────────────────────────────────────────
const inputCls  = "w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white";
const labelCls  = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5";
const selectCls = inputCls;
const sectionTitle = "flex items-center gap-2 text-base font-bold text-blue-800 mb-4";
const cardCls   = "bg-white border border-slate-100 rounded-xl shadow-sm p-5";

// ─── Componente ───────────────────────────────────────────────────────────────
const RegisterAssetModal = ({
  isOpen, onClose, empresaId, sedeId, onSuccess,
  empresaNombre, sedeNombre, empresa, sedes, areas,
  categories = [], groups = [], editingAsset = null,
}: Props) => {
  const navigate = useNavigate();

  // ── Estado: tab activo ──
  const [activeTab, setActiveTab] = useState<TabId>('identificacion');
  // Stepper index: 0..3 correspond to TABS order
  const STEP_ORDER: TabId[] = ['identificacion', 'compra', 'personalizados', 'asignaciones'];
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [stepError, setStepError] = useState<string | null>(null);

  // ── Estado: campos básicos ──
  const [categoria,        setCategoria]        = useState("");
  const [fabricante,       setFabricante]       = useState("");
  const [modelo,           setModelo]           = useState("");
  const [serie,            setSerie]            = useState("");
  const [assetId,          setAssetId]          = useState("");
  const [area,             setArea]             = useState("");
  const [responsable,      setResponsable]      = useState("");
  const [selectedSedeId,   setSelectedSedeId]   = useState<string | undefined>(sedeId);

  useEffect(() => { if (sedeId) setSelectedSedeId(sedeId); }, [sedeId]);

  // ── Estado: Laptop ──
  const [lapCpu,          setLapCpu]          = useState("");
  const [lapCpuSerie,     setLapCpuSerie]     = useState("");
  const [lapRams,         setLapRams]         = useState<RAMEntry[]>([]);
  const [lapStorages,     setLapStorages]     = useState<StorageEntry[]>([]);
  const [lapGpuIntegrada, setLapGpuIntegrada] = useState("");
  const [lapGpuDedicada,  setLapGpuDedicada]  = useState("");

  // ── Estado: PC ──
  const [pcCpu,         setPcCpu]         = useState("");
  const [pcCpuGen,      setPcCpuGen]      = useState("");
  const [pcCooler,      setPcCooler]      = useState("");
  const [pcPlacaBase,   setPcPlacaBase]   = useState("");
  const [pcChipset,     setPcChipset]     = useState("");
  const [pcRams,        setPcRams]        = useState<RAMEntry[]>([]);
  const [pcStorages,    setPcStorages]    = useState<StorageEntry[]>([]);
  const [pcGpuIntegrada,setPcGpuIntegrada]= useState("");
  const [pcGpuDedicada, setPcGpuDedicada] = useState("");
  const [pcFuente,      setPcFuente]      = useState("");

  // ── Estado: Servidor ──
  const [srvCpuModelo,      setSrvCpuModelo]      = useState("");
  const [srvCpuCantidad,    setSrvCpuCantidad]    = useState("");
  const [srvCpuGen,         setSrvCpuGen]         = useState("");
  const [srvRams,           setSrvRams]           = useState<RAMEntry[]>([]);
  const [srvStorages,       setSrvStorages]       = useState<StorageEntry[]>([]);
  const [srvRaidControladora,setSrvRaidControladora]=useState("");
  const [srvTipo,           setSrvTipo]           = useState("");
  const [srvSO,             setSrvSO]             = useState("");
  const [srvSOVer,          setSrvSOVer]          = useState("");
  const [srvVirtualizacion, setSrvVirtualizacion] = useState("");
  const [srvRoles,          setSrvRoles]          = useState("");
  const [srvBackup,         setSrvBackup]         = useState("No");

  // ── Estado: campos comunes ──
  const [estadoActivo,               setEstadoActivo]               = useState("activo");
  const [estadoOperativo,            setEstadoOperativo]            = useState("operativo");
  const [fechaCompra,                setFechaCompra]                = useState("");
  const [fechaFinGarantia,           setFechaFinGarantia]           = useState("");
  const [proveedor,                  setProveedor]                  = useState("");
  const [tipoDocumentoCompra,        setTipoDocumentoCompra]        = useState("Desconocido");
  const [numeroDocumentoCompra,      setNumeroDocumentoCompra]      = useState("");
  const [fechaCompraUnknown,         setFechaCompraUnknown]         = useState(false);
  const [fechaCompraAprox,           setFechaCompraAprox]           = useState("");
  const [purchaseDocumentFile,       setPurchaseDocumentFile]       = useState<File | null>(null);
  const [purchaseDocumentExisting,   setPurchaseDocumentExisting]   = useState("");
  const [purchaseDocumentDescription,setPurchaseDocumentDescription]= useState("");
  const [garantiaDuracion,           setGarantiaDuracion]           = useState("");
  const [warrantyDocumentFile,       setWarrantyDocumentFile]       = useState<File | null>(null);
  const [warrantyDocumentExisting,   setWarrantyDocumentExisting]   = useState("");
  const [warrantyDocumentDescription,setWarrantyDocumentDescription]= useState("");
  const [condicionFisica,            setCondicionFisica]            = useState("");
  const [antiguedadCalculada,        setAntiguedadCalculada]        = useState("");
  const [ip,                         setIp]                         = useState("");
  const [mac,                        setMac]                        = useState("");
  const [codigoAccesoRemoto,         setCodigoAccesoRemoto]         = useState("");
  const [usuariosAsignadosIds,       setUsuariosAsignadosIds]       = useState<string[]>([]);
  const [usuariosDisponibles,        setUsuariosDisponibles]        = useState<Usuario[]>([]);
  const [loadingUsuarios,            setLoadingUsuarios]            = useState(false);
  const [observaciones,              setObservaciones]              = useState("");
  const [fotos,                      setFotos]                      = useState<Array<{ file: File; description: string }>>([]);
  const [fotosExistentes,            setFotosExistentes]            = useState<Array<{ url: string; name: string; description: string }>>([]);
  const [dynamicFields,              setDynamicFields]              = useState<Record<string, string>>({});
  const [dynamicArrayFields,         setDynamicArrayFields]         = useState<Record<string, Array<Record<string, string>>>>({});
  const [componentesForm,            setComponentesForm]            = useState<Array<any>>([]);
  const [dynamicCompInstances,      setDynamicCompInstances]      = useState<Record<string, Array<Record<string, string>>>>({});
  const [valoresDinamicos,          setValoresDinamicos]          = useState<Array<{ campo_id: number | string; valor: string }>>([]);
  const [valoresDinamicosGrouped,   setValoresDinamicosGrouped]   = useState<any[] | null>(null);
  const [showMotivoModal,            setShowMotivoModal]            = useState(false);
  const [motivo,                     setMotivo]                     = useState('');
  const [isSubmitting,               setIsSubmitting]               = useState(false);
  const [selectedGroupId,            setSelectedGroupId]            = useState('');
  const [marcasList,                 setMarcasList]                 = useState<MarcaItemAPI[]>([]);

  const getFieldKey = (label: string) => String(label || '').trim().replace(/\s+/g, '_');

  // ── Effects: toda la lógica original sin cambios ──────────────────────────
  useEffect(() => {
    const loadUsuarios = async () => {
      setLoadingUsuarios(true);
      try {
        if (empresaId) {
          const res = await getUsuariosByEmpresa(empresaId);
          const list = res?.data || res || [];
          setUsuariosDisponibles(Array.isArray(list) ? list : []);
        } else { setUsuariosDisponibles([]); }
      } catch (err) {
        console.error('Error cargando usuarios:', err);
        setUsuariosDisponibles([]);
      } finally { setLoadingUsuarios(false); }
    };
    loadUsuarios();
  }, [empresaId, sedeId]);

  useEffect(() => {
    try {
      const inputFecha = tipoDocumentoCompra === 'Desconocido'
        ? (fechaCompraAprox || fechaCompra)
        : (fechaCompra || fechaCompraAprox);
      const info = getWarrantyInfo({ fechaCompra: inputFecha, garantiaDuracion, garantia: garantiaDuracion });
      if (info?.expiresAt) {
        const d = new Date(info.expiresAt);
        if (!isNaN(d.getTime())) {
          Promise.resolve().then(() => setFechaFinGarantia(d.toISOString().split('T')[0]));
          return;
        }
      }
      Promise.resolve().then(() => setFechaFinGarantia(''));
    } catch { Promise.resolve().then(() => setFechaFinGarantia('')); }
  }, [fechaCompra, fechaCompraAprox, garantiaDuracion, tipoDocumentoCompra]);

  useEffect(() => {
    try {
      const inputFecha = tipoDocumentoCompra === 'Desconocido'
        ? (fechaCompraAprox || fechaCompra)
        : (fechaCompra || fechaCompraAprox);
      if (!inputFecha) { Promise.resolve().then(() => setAntiguedadCalculada('')); return; }
      const maybeYear = Number(String(inputFecha).slice(0, 4));
      const now = new Date();
      if (!Number.isNaN(maybeYear) && String(inputFecha).length <= 4) {
        const years = now.getFullYear() - maybeYear;
        Promise.resolve().then(() => setAntiguedadCalculada(years > 0 ? `${years} año${years > 1 ? 's' : ''}` : '0 años'));
        return;
      }
      const d = new Date(String(inputFecha));
      if (isNaN(d.getTime())) { Promise.resolve().then(() => setAntiguedadCalculada('')); return; }
      let years = now.getFullYear() - d.getFullYear();
      let months = now.getMonth() - d.getMonth();
      if (months < 0) { years -= 1; months += 12; }
      if (years <= 0 && months <= 0) { Promise.resolve().then(() => setAntiguedadCalculada('0 meses')); return; }
      if (years <= 0)  { Promise.resolve().then(() => setAntiguedadCalculada(`${months} mes${months > 1 ? 'es' : ''}`)); return; }
      if (months <= 0) { Promise.resolve().then(() => setAntiguedadCalculada(`${years} año${years > 1 ? 's' : ''}`)); return; }
      Promise.resolve().then(() => setAntiguedadCalculada(`${years} año${years > 1 ? 's' : ''} ${months} mes${months > 1 ? 'es' : ''}`));
    } catch { Promise.resolve().then(() => setAntiguedadCalculada('')); }
  }, [fechaCompra, fechaCompraAprox, tipoDocumentoCompra]);

  useEffect(() => {
    if (isOpen && editingAsset) {
      Promise.resolve().then(() => {
        const asset = editingAsset as Record<string, unknown>;
        setCategoria(String(asset['categoria'] ?? ''));
        setFabricante(String(asset['fabricante'] ?? ''));
        setModelo(String(asset['modelo'] ?? ''));
        setSerie(String(asset['serie'] ?? ''));
        setAssetId(String(asset['assetId'] ?? asset['codigo'] ?? ''));
        // Set selected group id when editing an asset (may be stored as grupo_id, grupoId, groupId or grupo)
        const grp = asset['grupo_id'] ?? asset['grupoId'] ?? asset['groupId'] ?? asset['grupo'] ?? asset['group'] ?? '';
        setSelectedGroupId(grp ? String(grp) : '');
        const areaValue = String(asset['area'] ?? '');
        setArea(areaValue);
        setProveedor(String(asset['proveedor'] ?? ''));
        const areasToUse = Array.isArray(areas) ? areas : (asset['_areasDisponibles'] as any[] || []);
        if (!String(asset['responsable'] ?? '').trim() && areaValue && Array.isArray(areasToUse) && areasToUse.length > 0) {
          const found = areasToUse.find(a => String(a.name ?? a.nombre ?? '') === areaValue);
          setResponsable(found ? String(found.responsable ?? '') : '');
        } else {
          setResponsable(String(asset['responsable'] ?? asset['responsable_name'] ?? ''));
        }
        if (asset['fechaCompra']) { const f = new Date(String(asset['fechaCompra'])); setFechaCompra(f.toISOString().split('T')[0]); }
        if (asset['fechaFinGarantia']) { const f = new Date(String(asset['fechaFinGarantia'])); setFechaFinGarantia(f.toISOString().split('T')[0]); }
        setIp(String(asset['ip'] ?? ''));
        setMac(String(asset['mac'] ?? ''));
        setCodigoAccesoRemoto(String(asset['codigoAccesoRemoto'] ?? ''));
        setObservaciones(String(asset['observaciones'] ?? ''));
        try {
          setTipoDocumentoCompra(String(asset['tipoDocumentoCompra'] ?? asset['tipo_documento_compra'] ?? 'Desconocido'));
          setNumeroDocumentoCompra(String(asset['numeroDocumentoCompra'] ?? asset['numero_documento_compra'] ?? asset['numero_documento'] ?? ''));
          if (asset['fechaCompra'] || asset['fecha_compra']) {
            const f = new Date(String(asset['fechaCompra'] ?? asset['fecha_compra']));
            setFechaCompra(f.toISOString().split('T')[0]); setFechaCompraUnknown(false);
          } else if (asset['fechaCompraAprox'] || asset['fecha_compra_aprox'] || asset['fechaCompraAproxYear'] || asset['fecha_compra_aprox_year']) {
            const rawAprox = String(asset['fechaCompraAprox'] ?? asset['fecha_compra_aprox'] ?? asset['fechaCompraAproxYear'] ?? asset['fecha_compra_aprox_year'] ?? '');
            if (/^\d{4}$/.test(rawAprox)) { setFechaCompraAprox(rawAprox); }
            else { const fa = new Date(rawAprox); if (!isNaN(fa.getTime())) setFechaCompraAprox(fa.toISOString().split('T')[0]); }
            setFechaCompraUnknown(true);
          }
          setPurchaseDocumentExisting(String(asset['purchaseDocumentUrl'] ?? asset['purchase_document_url'] ?? asset['purchaseDocument'] ?? asset['purchase_document'] ?? ''));
          setPurchaseDocumentDescription(String(asset['purchaseDocumentDescription'] ?? asset['purchase_document_description'] ?? asset['purchase_document_desc'] ?? ''));
          setWarrantyDocumentExisting(String(asset['warrantyDocumentUrl'] ?? asset['warranty_document_url'] ?? asset['warrantyDocument'] ?? asset['warranty_document'] ?? ''));
          setWarrantyDocumentDescription(String(asset['warrantyDocumentDescription'] ?? asset['warranty_document_description'] ?? asset['warranty_document_desc'] ?? ''));
          const rawGarantia = String(asset['garantia'] ?? asset['garantiaDuracion'] ?? asset['garantia_duracion'] ?? '');
          if (rawGarantia) { setGarantiaDuracion(rawGarantia); }
          else if (asset['garantiaFechaInicio'] || asset['garantia_fecha_inicio'] || asset['fechaFinGarantia'] || asset['fecha_fin_garantia']) {
            try {
              const startRaw = String(asset['garantiaFechaInicio'] ?? asset['garantia_fecha_inicio'] ?? '');
              const endRaw   = String(asset['fechaFinGarantia']   ?? asset['fecha_fin_garantia']   ?? '');
              if (startRaw && endRaw) {
                const s = new Date(startRaw); const e = new Date(endRaw);
                if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                  const months = Math.round((e.getTime() - s.getTime()) / (1000*60*60*24*30));
                  if (months <= 9) setGarantiaDuracion('6 meses');
                  else if (months <= 18) setGarantiaDuracion('1 año');
                  else if (months <= 30) setGarantiaDuracion('2 años');
                  else setGarantiaDuracion('3 años');
                }
              }
            } catch {}
          }
          setCondicionFisica(String(asset['condicionFisica'] ?? asset['condicion_fisica'] ?? ''));
        } catch (e) { console.error('Error parsing información contable/garantía:', e); }

        const usuariosAsignados = asset['usuarios_asignados_m2n'] ?? asset['usuariosAsignados'] ?? asset['usuarios_asignados'] ?? [];
        if (Array.isArray(usuariosAsignados) && usuariosAsignados.length > 0) {
          setUsuariosAsignadosIds(usuariosAsignados.map((u: any) => String(u.usuarioId ?? u.usuario_id ?? u.id ?? '')).filter(Boolean));
        } else {
          const uid = asset['usuarioAsignadoId'] ?? asset['usuario_asignado_id'] ?? '';
          setUsuariosAsignadosIds(uid ? [String(uid)] : []);
        }

        const camposRaw = asset['campos_personalizados_array'] ?? asset['camposPersonalizadosArray'] ?? asset['campos_personalizados'] ?? asset['campos_array'];
        if (camposRaw) {
          try {
            const campos = typeof camposRaw === 'string' ? JSON.parse(String(camposRaw)) : camposRaw as unknown;
            const mappedFlat: Record<string, string> = {};
            const mappedArr: Record<string, Array<Record<string, string>>> = {};
            const cat = String(asset['categoria'] ?? '');
            const selectedCat = categories.find(c => c.nombre === cat);
            Object.keys(campos || {}).forEach(origKey => {
              const k = getFieldKey(origKey);
              const value = (campos as Record<string, unknown>)[origKey];
              if (Array.isArray(value)) { mappedArr[k] = value as Array<Record<string, string>>; }
              else if (typeof value === 'object' && value !== null) { mappedArr[k] = [value as Record<string, string>]; }
              else if (typeof value === 'string' || typeof value === 'number') {
                let shouldBeArray = false;
                if (selectedCat?.campos) {
                  const field = selectedCat.campos.find(f => getFieldKey(f.nombre) === k);
                  if (field) {
                    const firstOpt = field.opciones?.[0];
                    const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' &&
                      (field.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos && opt.subcampos.length > 0);
                    if (hasOptionSubcampos) { mappedArr[k] = [{ _opcion: String(value) }]; }
                    else { mappedFlat[k] = String(value); }
                  } else { mappedFlat[k] = String(value); }
                } else { mappedFlat[k] = String(value); }
              }
            });
            setDynamicFields(mappedFlat); setDynamicArrayFields(mappedArr);
          } catch (err) { console.error('❌ Error parsing campos_personalizados_array:', err); setDynamicFields({}); setDynamicArrayFields({}); }
        } else { setDynamicFields({}); setDynamicArrayFields({}); }

        // Cargar valoresDinamicos si existen en el activo (modo edición)
        try {
          const rawValDyn = asset['valoresDinamicos'] ?? asset['valores_dinamicos'] ?? asset['valoresDinamicosArray'] ?? asset['valores_dinamicos_array'] ?? asset['valores_dinamicos'] ?? asset['valores'] ?? null;
          if (rawValDyn) {
            // keep grouped version if backend provided it (componentes -> instancias)
            try {
              const parsedRaw = typeof rawValDyn === 'string' ? JSON.parse(String(rawValDyn)) : rawValDyn;
              if (Array.isArray(parsedRaw) && parsedRaw.length > 0 && parsedRaw[0] && Array.isArray(parsedRaw[0].campos || parsedRaw[0].instancias)) {
                setValoresDinamicosGrouped(parsedRaw);
              } else {
                setValoresDinamicosGrouped(null);
              }
            } catch (e) { setValoresDinamicosGrouped(null); }

            const normalized = normalizeBackendValoresDinamicos(rawValDyn);
            setValoresDinamicos(Array.isArray(normalized) ? normalized : []);
          } else {
            setValoresDinamicos([]); setValoresDinamicosGrouped(null);
          }
        } catch (err) { console.error('Error parsing valoresDinamicos from asset:', err); setValoresDinamicos([]); }

        const cat = String(asset['categoria'] ?? '');
        if (cat === 'Laptop') {
          setLapCpu(String(asset['lapCpu'] ?? '')); setLapCpuSerie(String(asset['lapCpuSerie'] ?? ''));
          setLapGpuIntegrada(String(asset['lapGpuIntegrada'] ?? '')); setLapGpuDedicada(String(asset['lapGpuDedicada'] ?? ''));
          if (asset['lapRams'])    { try { const r = typeof asset['lapRams']    === 'string' ? JSON.parse(String(asset['lapRams']))    : asset['lapRams'];    setLapRams(Array.isArray(r)    ? r as RAMEntry[]     : []); } catch {} }
          if (asset['lapStorages'])  { try { const s = typeof asset['lapStorages']  === 'string' ? JSON.parse(String(asset['lapStorages']))  : asset['lapStorages'];  setLapStorages(Array.isArray(s)  ? s as StorageEntry[] : []); } catch {} }
        }
        if (cat === 'PC') {
          setPcCpu(String(asset['pcCpu'] ?? '')); setPcCpuGen(String(asset['pcCpuGen'] ?? '')); setPcCooler(String(asset['pcCooler'] ?? ''));
          setPcPlacaBase(String(asset['pcPlacaBase'] ?? '')); setPcChipset(String(asset['pcChipset'] ?? ''));
          setPcGpuIntegrada(String(asset['pcGpuIntegrada'] ?? '')); setPcGpuDedicada(String(asset['pcGpuDedicada'] ?? '')); setPcFuente(String(asset['pcFuente'] ?? ''));
          if (asset['pcRams'])    { try { const r = typeof asset['pcRams']    === 'string' ? JSON.parse(String(asset['pcRams']))    : asset['pcRams'];    setPcRams(Array.isArray(r)    ? r as RAMEntry[]     : []); } catch {} }
          if (asset['pcStorages'])  { try { const s = typeof asset['pcStorages']  === 'string' ? JSON.parse(String(asset['pcStorages']))  : asset['pcStorages'];  setPcStorages(Array.isArray(s)  ? s as StorageEntry[] : []); } catch {} }
        }
        if (cat === 'Servidor') {
          setSrvCpuModelo(String(asset['srvCpuModelo'] ?? '')); setSrvCpuCantidad(String(asset['srvCpuCantidad'] ?? '')); setSrvCpuGen(String(asset['srvCpuGen'] ?? ''));
          setSrvRaidControladora(String(asset['srvRaidControladora'] ?? '')); setSrvTipo(String(asset['srvTipo'] ?? '')); setSrvSO(String(asset['srvSO'] ?? ''));
          setSrvSOVer(String(asset['srvSOVer'] ?? '')); setSrvVirtualizacion(String(asset['srvVirtualizacion'] ?? '')); setSrvRoles(String(asset['srvRoles'] ?? '')); setSrvBackup(String(asset['srvBackup'] ?? 'No'));
          if (asset['srvRams'])    { try { const r = typeof asset['srvRams']    === 'string' ? JSON.parse(String(asset['srvRams']))    : asset['srvRams'];    setSrvRams(Array.isArray(r)    ? r as RAMEntry[]     : []); } catch {} }
          if (asset['srvStorages'])  { try { const s = typeof asset['srvStorages']  === 'string' ? JSON.parse(String(asset['srvStorages']))  : asset['srvStorages'];  setSrvStorages(Array.isArray(s)  ? s as StorageEntry[] : []); } catch {} }
        }

        if (asset['fotos']) {
          try {
            const fotosData = typeof asset['fotos'] === 'string' ? JSON.parse(String(asset['fotos'])) : asset['fotos'];
            if (Array.isArray(fotosData)) {
              const fotosNorm = (fotosData as Array<Record<string, unknown>>).map(foto => {
                let url = String(foto['url'] ?? '');
                if (url) {
                  if (String(url).startsWith('http')) {
                    const match = String(url).match(/\/uploads\/(.+)$/);
                    if (match) { const apiBase = (import.meta.env.VITE_API_URL as string) || ''; url = `${apiBase}/uploads/${encodeURIComponent(decodeURIComponent(match[1]))}`; }
                  } else { const apiBase = (import.meta.env.VITE_API_URL as string) || ''; url = `${apiBase}/uploads/${encodeURIComponent(decodeURIComponent(String(url)))}`; }
                }
                return { url, name: String(foto['name'] ?? foto['url'] ?? ''), description: String(foto['description'] ?? foto['descripcion'] ?? '') };
              });
              setFotosExistentes(fotosNorm);
            }
          } catch (err) { console.error('Error parsing fotos:', err); }
        }
      });
    }
  }, [isOpen, editingAsset, areas]);

  useEffect(() => { setCategoria(''); setDynamicFields({}); setAssetId(''); setFabricante(''); }, [selectedGroupId]);

  // Keep activeTab in sync with stepIndex and viceversa
  useEffect(() => {
    const tab = STEP_ORDER[Math.max(0, Math.min(STEP_ORDER.length - 1, stepIndex))];
    if (tab && tab !== activeTab) setActiveTab(tab);
  }, [stepIndex]);

  useEffect(() => {
    const idx = STEP_ORDER.indexOf(activeTab);
    if (idx >= 0 && idx !== stepIndex) setStepIndex(idx);
  }, [activeTab]);

  // Validation for advancing steps
  const isStep0Valid = () => {
    return Boolean(
      (selectedGroupId && String(selectedGroupId).trim()) &&
      (categoria && String(categoria).trim()) &&
      (fabricante && String(fabricante).trim()) &&
      (area && String(area).trim())
    );
  };

  const getMissingStep0Fields = () => {
    const missing: string[] = [];
    if (!area || !String(area).trim()) missing.push('Área');
    if (!selectedGroupId || !String(selectedGroupId).trim()) missing.push('Grupo de Activo');
    if (!categoria || !String(categoria).trim()) missing.push('Tipo de Activo');
    if (!fabricante || !String(fabricante).trim()) missing.push('Marca');
    return missing;
  };

  const canAdvanceFromStep = (si: number) => {
    if (si === 0) return isStep0Valid();
    return true;
  };

  // Cargar componentes dinámicos cuando cambia la categoría seleccionada
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setComponentesForm([]);
        if (!editingAsset) setValoresDinamicos([]);
        const sel = categories.find(c => String(c.nombre) === String(categoria));
        const catId = sel?.id ?? sel?._id ?? sel?.codigo ?? '';
        if (!catId) return;
        const data = await getFormularioByCategoria(catId);
        if (!mounted) return;
        // normalize fields order if needed
        const comps = Array.isArray(data) ? data : [];
        setComponentesForm(comps);
      } catch (err) {
        console.error('Error cargando componentes:', err);
        if (mounted) { setComponentesForm([]); }
      }
    };
    if (categoria) load();
    return () => { mounted = false; };
  }, [categoria, categories, editingAsset]);

  // Inicializar instancias dinámicas cuando cambian los componentes cargados o los valores dinámicos (modo edición)
  useEffect(() => {
    try {
      if (!componentesForm || componentesForm.length === 0) return;
      const init: Record<string, Array<Record<string,string>>> = {};

      // If we have grouped valores from backend (with instancias), use them directly
      const grouped = valoresDinamicosGrouped;

      componentesForm.forEach((comp: any) => {
        const compId = String(comp.id ?? comp._id ?? comp.nombre ?? Math.random());
        const campos = Array.isArray(comp.campos) ? comp.campos : [];
        init[compId] = [];

        if (grouped && Array.isArray(grouped)) {
          // find matching grouped component by id or nombre
          const found = grouped.find((g: any) => String(g.id ?? g._id ?? g.nombre) === String(comp.id ?? comp._id ?? comp.nombre) || String(g.nombre) === String(comp.nombre));
          if (found && Array.isArray(found.instancias) && found.instancias.length > 0) {
            found.instancias.forEach((inst: any) => {
              const entry: Record<string,string> = {};
              (inst.campos || []).forEach((c: any) => {
                const cid = String(c.campo_id ?? c.field_id ?? c.id ?? c.campoId ?? '');
                entry[cid] = String(c.valor ?? '');
              });
              init[compId].push(entry);
            });
            return; // next component
          }
        }

        // Fallback: derive from flat valoresDinamicos (counts per campo)
        const counts = campos.map((cf: any) => {
          const cid = String(cf.id ?? cf.campo_id ?? `${compId}_${cf.nombre}`);
          return (valoresDinamicos || []).filter(v => String(v.campo_id) === cid).length;
        });
        const maxCount = counts.length ? Math.max(1, ...counts) : 1;
        for (let i = 0; i < maxCount; i++) {
          const entry: Record<string,string> = {};
          campos.forEach((cf: any, idx: number) => {
            const cid = String(cf.id ?? cf.campo_id ?? `${compId}_${idx}`);
            const matched = (valoresDinamicos || []).filter(v => String(v.campo_id) === cid);
            entry[cid] = matched[i] ? String(matched[i].valor ?? '') : '';
          });
          init[compId].push(entry);
        }
      });
      setDynamicCompInstances(init);
    } catch (err) { console.error('Error inicializando instancias dinámicas (effect):', err); }
  }, [componentesForm, valoresDinamicos, valoresDinamicosGrouped]);

  const buildValoresDinamicosFromInstances = () => {
    const out: Array<{ campo_id: number | string; valor: string; instancia?: number }> = [];
    try {
      Object.keys(dynamicCompInstances || {}).forEach(compId => {
        const instances = dynamicCompInstances[compId] || [];
        instances.forEach((inst, instIndex) => {
          Object.keys(inst || {}).forEach(fieldKey => {
            out.push({ campo_id: fieldKey, valor: String(inst[fieldKey] ?? ''), instancia: instIndex });
          });
        });
      });
    } catch (e) { console.error('Error construyendo valoresDinamicos desde instancias:', e); }
    return out;
  };

  const sanitizeValoresDinamicos = (arr: Array<any>) => {
    if (!Array.isArray(arr)) return [];
    type Item = { campo_id: number; valor: string; instancia: number };
    const out: Item[] = [];
    let dropped = 0;
    arr.forEach(item => {
      if (!item) return;
      const rawId = item.campo_id ?? item.campoId ?? item.field_id ?? item.id ?? item.campo_id;
      const numId = Number(rawId);
      const rawInst = item.instancia ?? item.instance ?? 0;
      const numInst = Number(rawInst);
      if (!Number.isFinite(numId) || Number.isNaN(numId) || !Number.isFinite(numInst) || Number.isNaN(numInst)) { dropped++; return; }
      const valor = item.valor != null ? String(item.valor) : '';
      out.push({ campo_id: Math.trunc(numId), valor, instancia: Math.trunc(numInst) });
    });
    if (dropped) console.warn(`[RegisterAssetModal] valoresDinamicos: descartados ${dropped} entries con campo_id/instancia no numérico`);
    // Deduplicate by (campo_id, instancia) keeping the last occurrence
    const map = new Map<string, string>();
    out.forEach(o => map.set(`${o.campo_id}::${o.instancia}`, o.valor));
    return Array.from(map.entries()).map(([k, valor]) => {
      const [campo_id, instancia] = k.split('::');
      return { campo_id: Number(campo_id), valor, instancia: Number(instancia) };
    });
  };

  // Normaliza formatos que el backend puede devolver:
  // - Flat: [{ campo_id, valor }, ...]
  // - Agrupado por componentes: [{ id, nombre, campos: [{ campo_id, valor, ... }, ...] }, ...]
  const normalizeBackendValoresDinamicos = (raw: any) => {
    try {
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) return [];
      // Detectar formato agrupado (componentes con `campos`)
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
      // Si es ya flat, mapear campos comunes
      return parsed.map((v: any) => ({ campo_id: v.campo_id ?? v.campoId ?? v.field_id ?? v.id ?? v.campo_id, valor: v.valor != null ? String(v.valor) : '' }));
    } catch (e) { console.warn('normalizeBackendValoresDinamicos error:', e); return []; }
  };

  const setValorDinamico = (campoId: number | string, valor: string) => {
    setValoresDinamicos(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(p => String(p.campo_id) === String(campoId));
      if (idx === -1) copy.push({ campo_id: campoId, valor });
      else copy[idx] = { ...copy[idx], valor };
      return copy;
    });
  };

  const getValorDinamico = (campoId: number | string) => {
    const found = valoresDinamicos.find(p => String(p.campo_id) === String(campoId));
    return found ? found.valor : '';
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await getMarcas();
        if (mounted) {
          const normalized = (Array.isArray(list) ? list : []).map((m: any) => ({
            id: String(m.id ?? m._id ?? ''), nombre: String(m.nombre ?? m.name ?? ''), activo: Boolean(m.activo ?? true),
            categorias: Array.isArray(m.categorias) ? m.categorias.flatMap((c: any) => {
              if (!c && c !== 0) return [];
              if (typeof c === 'object') {
                const out: string[] = [];
                if (c.id   != null) out.push(String(c.id));   if (c._id  != null) out.push(String(c._id));
                if (c.nombre != null) out.push(String(c.nombre)); if (c.name != null) out.push(String(c.name));
                return out.filter(Boolean);
              }
              return [String(c)];
            }) : [],
          } as MarcaItemAPI));
          setMarcasList(normalized);
        }
      } catch { if (mounted) setMarcasList([]); }
    };
    if (isOpen) load();
    return () => { mounted = false; };
  }, [isOpen]);

  // ── Handlers: sin cambios de lógica ─────────────────────────────────────
  const handleConfirmUpdate = async () => {
    if (!motivo || motivo.trim().length < 10) { alert('❌ El motivo debe tener al menos 10 caracteres'); return; }
    setShowMotivoModal(false);
    await procesarActualizacion(motivo.trim());
    setMotivo('');
  };
  const handleCancelUpdate = () => { setShowMotivoModal(false); setMotivo(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) { console.warn('⚠️ Ya se está procesando un submit, ignorando...'); return; }
    const targetSedeId = sedeId ?? selectedSedeId;
    if (!empresaId || !targetSedeId) { alert('Error: No se puede crear activo sin empresa o sede'); return; }
    // If not on final step, advance to next step instead of submitting
    const lastIndex = STEP_ORDER.length - 1;
    if (stepIndex < lastIndex) {
      // Validate current step before advancing
      if (!canAdvanceFromStep(stepIndex)) {
        const missing = getMissingStep0Fields();
        setStepError(missing.length ? `Faltan campos obligatorios: ${missing.join(', ')}.` : 'Completa los campos requeridos antes de avanzar.');
        return;
      }
      setStepIndex(si => Math.min(lastIndex, si + 1));
      return;
    }
    // final step: proceed with create/update
    if (editingAsset) { setShowMotivoModal(true); return; }
    await procesarCreacion(empresaId, targetSedeId);
  };

  const buildCategoryData = (): Record<string, unknown> => {
    if (categoria === 'Laptop') return { lapCpu, lapCpuSerie, lapRams, lapStorages, lapGpuIntegrada, lapGpuDedicada };
    if (categoria === 'PC')     return { pcCpu, pcCpuGen, pcCooler, pcPlacaBase, pcChipset, pcRams, pcStorages, pcGpuIntegrada, pcGpuDedicada, pcFuente };
    if (categoria === 'Servidor') return { srvCpuModelo, srvCpuCantidad, srvCpuGen, srvRams, srvStorages, srvRaidControladora, srvTipo, srvSO, srvSOVer, srvVirtualizacion, srvRoles, srvBackup };
    return {};
  };

  const buildCamposPersonalizados = () => {
    const payload: Record<string, unknown> = {};
    const selectedCat = categories.find(c => c.nombre === categoria);
    if (selectedCat?.campos?.length) {
      selectedCat.campos.forEach(f => {
        const firstOpt = f.opciones?.[0];
        const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' &&
          (f.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos?.length > 0);
        if (!hasOptionSubcampos && !f.subcampos) payload[getFieldKey(f.nombre)] = dynamicFields[getFieldKey(f.nombre)] ?? '';
      });
    }
    return payload;
  };

  const buildCamposPersonalizadosArray = () => {
    const payloadArr: Record<string, unknown> = {};
    const selectedCat = categories.find(c => c.nombre === categoria);
    if (selectedCat?.campos?.length) {
      selectedCat.campos.forEach(f => {
        const fk = getFieldKey(f.nombre);
        if (f.subcampos?.length) payloadArr[fk] = dynamicArrayFields[fk] || [];
        const firstOpt = f.opciones?.[0];
        const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' &&
          (f.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos?.length > 0);
        if (hasOptionSubcampos) payloadArr[fk] = dynamicArrayFields[fk] || [];
      });
    } else { Object.keys(dynamicArrayFields).forEach(k => { payloadArr[k] = dynamicArrayFields[k]; }); }
    return payloadArr;
  };

  const buildPayload = () => ({
    categoria, fabricante, modelo, serie, assetId, area, estadoActivo, estadoOperativo,
    fechaCompra, fechaFinGarantia, proveedor, tipoDocumentoCompra, numeroDocumentoCompra,
    fechaCompraAprox, fechaCompraUnknown,
    purchaseDocumentExisting, purchaseDocumentFile: purchaseDocumentFile ?? undefined, purchaseDocumentDescription,
    garantia: garantiaDuracion,
    warrantyDocumentExisting, warrantyDocumentFile: warrantyDocumentFile ?? undefined, warrantyDocumentDescription,
    condicionFisica, antiguedadCalculada, ip, mac,
    codigoAccesoRemoto: codigoAccesoRemoto || undefined,
    usuariosAsignadosIds: usuariosAsignadosIds.length > 0 ? usuariosAsignadosIds : undefined,
    observaciones,
    // Include selected group id (DB column: grupo_id)
    ...(selectedGroupId ? { grupo_id: selectedGroupId } : {}),
    ...buildCategoryData(),
    camposPersonalizados: buildCamposPersonalizados(),
    camposPersonalizadosArray: buildCamposPersonalizadosArray(),
    valoresDinamicos: (() => {
      const fromInst = buildValoresDinamicosFromInstances();
      const compFieldIds = new Set<string>();
      (componentesForm || []).forEach((c: any) => ((c.campos||[]) as any[]).forEach(cf => compFieldIds.add(String(cf.id ?? cf.campo_id ?? `${c.id}_${cf.nombre}`))));
      const others = (valoresDinamicos || []).filter(v => !compFieldIds.has(String(v.campo_id)));
      const merged = [...others, ...fromInst];
      const sanitized = sanitizeValoresDinamicos(merged);
      return sanitized && sanitized.length ? sanitized : undefined;
    })(),
    fotosExistentes: fotosExistentes.map(f => ({ url: f.url, name: f.name, description: f.description })),
    fotosNuevas: fotos.map(f => ({ name: f.file.name, description: f.description })),
    fotosFiles: fotos.length > 0 ? fotos : undefined,
  });

  const procesarCreacion = async (empresaId: string, sedeId: string) => {
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      console.log('🟢 [DEBUG] componentesForm:', componentesForm);
      console.log('🟢 [DEBUG] dynamicCompInstances:', dynamicCompInstances);
      console.log('🟢 [DEBUG] valoresDinamicos (state):', valoresDinamicos);
      console.log('🟢 [DEBUG] Payload enviado al backend (CREATE):', payload);
      console.log('🟢 [DEBUG] payload.valoresDinamicos (CREATE):', payload.valoresDinamicos);
      const response = await createActivo(empresaId, sedeId, payload);
      console.log('🟢 [DEBUG] Response backend (CREATE):', response);
      console.log('🟢 [DEBUG] Response.data.valoresDinamicos (CREATE):', response?.data?.valoresDinamicos);
      let activoCreado = response?.data || response;

      // Si el backend devolviera la definición de componentes bajo "valoresDinamicos"
      // en lugar de los valores (caso observado: array de componentes con `campos`),
      // preferimos usar los valores que enviamos en el payload para poblar el activo
      // y evitar que la UI quede sin los valores dinámicos esperados.
      try {
        const respVals = response?.data?.valoresDinamicos ?? response?.data?.valores_dinamicos;
        if (Array.isArray(respVals) && respVals.length && respVals[0] && (respVals[0].campos || respVals[0].nombre)) {
          console.warn('[RegisterAssetModal] Backend devolvió componentes en `valoresDinamicos`; usando payload.valoresDinamicos en su lugar.');
          activoCreado = { ...(activoCreado || {}), valoresDinamicos: payload.valoresDinamicos ?? [] };
        }
      } catch (e) { console.warn('Error normalizando valoresDinamicos tras CREATE:', e); }

      // Fallback: si la respuesta no incluye valoresDinamicos, intentar obtener el activo por sede y tomar los valores
      try {
        const hasValores = activoCreado && (activoCreado.valoresDinamicos || activoCreado.valores_dinamicos);
        if (!hasValores && activoCreado && (activoCreado.id || activoCreado._id)) {
          const id = activoCreado.id ?? activoCreado._id;
          // 1) Intentar listado por sede (sin filtrar soloSedeActual)
          try {
            const listado = await getInventarioBySede(empresaId, sedeId, false);
            const items = listado?.data ?? listado ?? [];
            console.log('🟢 [DEBUG] Fallback listado (soloSedeActual=false) length:', Array.isArray(items) ? items.length : 'not-array');
            const found = Array.isArray(items) ? items.find((it: any) => String(it.id ?? it._id) === String(id)) : null;
            if (found) {
              activoCreado = { ...activoCreado, ...found };
              console.log('🟢 [DEBUG] Fallback listado encontró activo:', found?.id ?? found?._id);
              console.log('🟢 [DEBUG] Fallback valoresDinamicos (list):', activoCreado.valoresDinamicos ?? activoCreado.valores_dinamicos);
            }
          } catch (err) {
            console.warn('⚠️ Fallback listado por sede falló:', err);
          }

          // 2) Si aún no hay valores, intentar GET directo por ID
          try {
            const token = localStorage.getItem('token');
            const urlById = `${API_BASE}/api/empresas/${empresaId}/sedes/${sedeId}/inventario/${id}`;
            console.log('🟢 [DEBUG] Intentando GET directo por ID:', urlById);
            const resById = await fetch(urlById, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
            });
            if (resById.ok) {
              const dataById = await resById.json();
              console.log('🟢 [DEBUG] GET por ID response:', dataById);
              const found = dataById?.data ?? dataById;
              if (found) {
                activoCreado = { ...activoCreado, ...found };
                console.log('🟢 [DEBUG] Fallback GET por ID valoresDinamicos:', activoCreado.valoresDinamicos ?? activoCreado.valores_dinamicos);
              }
            } else {
              console.warn('⚠️ GET por ID no OK:', resById.status, await resById.text());
            }
          } catch (err) { console.warn('⚠️ Fallback GET por ID falló:', err); }
        }
      } catch (e) { console.error('Error en fallback de valoresDinamicos:', e); }

      if (activoCreado.fotos && typeof activoCreado.fotos === 'string') activoCreado.fotos = JSON.parse(activoCreado.fotos);
      onSuccess?.(activoCreado); onClose();
    } catch (error) { console.error('❌ Error creando activo:', error); alert('Error al crear el activo. Revisa la consola para más detalles.'); }
    finally { setIsSubmitting(false); }
  };

  const procesarActualizacion = async (motivo: string) => {
    if (!editingAsset || !empresaId || !sedeId) return;
    const activoId = String((editingAsset as Record<string, unknown>)['id'] ?? (editingAsset as Record<string, unknown>)['_id'] ?? '');
    try {
      const payload = { ...buildPayload(), motivo };
      console.log('🟣 [DEBUG] Payload enviado al backend (UPDATE):', payload);
      const response = await updateActivo(empresaId, sedeId, activoId, payload);
      console.log('🟣 [DEBUG] Response backend (UPDATE):', response);
      console.log('🟣 [DEBUG] Response.data.valoresDinamicos (UPDATE):', response?.data?.valoresDinamicos);
      const activoActualizado = response?.data || response;
      // Normalizar caso análogo al CREATE: si el backend devuelve componentes
      // en `valoresDinamicos` (estructura con `campos`), mantener los valores
      // que enviamos en el payload para evitar perder los datos en la UI.
      try {
        const respValsU = response?.data?.valoresDinamicos ?? response?.data?.valores_dinamicos;
        if (Array.isArray(respValsU) && respValsU.length && respValsU[0] && (respValsU[0].campos || respValsU[0].nombre)) {
          console.warn('[RegisterAssetModal] Backend devolvió componentes en `valoresDinamicos` (UPDATE); usando payload.valoresDinamicos en su lugar.');
          (activoActualizado as any).valoresDinamicos = payload.valoresDinamicos ?? [];
        }
      } catch (e) { console.warn('Error normalizando valoresDinamicos tras UPDATE:', e); }
      if (activoActualizado.fotos && typeof activoActualizado.fotos === 'string') activoActualizado.fotos = JSON.parse(activoActualizado.fotos);
      onSuccess?.(activoActualizado); onClose();
    } catch (error) { console.error('❌ Error guardando activo:', error); alert('Error al guardar el activo. Revisa la consola para más detalles.'); }
    finally { setIsSubmitting(false); }
  };

  // ── Derivados ────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  // Small CSS for modal animation and prettier popup
  const modalStyles = `
    @keyframes modalEnter { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .animate-modal-enter { animation: modalEnter 220ms cubic-bezier(.2,.9,.3,1) both; }
  `;

  const editingAssetId = editingAsset
    ? String((editingAsset as Record<string, unknown>)['asset_id'] ?? (editingAsset as Record<string, unknown>)['id'] ?? (editingAsset as Record<string, unknown>)['_id'] ?? '')
    : '';

  const sedeDisplay = sedeNombre ?? sedes?.find(s => String(s._id ?? s.id) === String(sedeId))?.nombre ?? sedeId ?? '';

  const editing = (editingAsset ?? null) as Record<string, unknown> | null;
  const computedWarranty = getWarrantyInfo({
    estado_garantia: editing?.['estado_garantia'] ?? editing?.['estadoGarantia'],
    warranty_expires_at: editing?.['warranty_expires_at'] ?? editing?.['warrantyExpiresAt'],
    fechaFinGarantia: editing?.['fechaFinGarantia'] ?? editing?.['fecha_fin_garantia'],
    garantiaDuracion: garantiaDuracion || (editing?.['garantia'] ?? editing?.['garantiaDuracion']),
    garantia: editing?.['garantia'],
    fechaCompra: tipoDocumentoCompra === 'Desconocido'
      ? (fechaCompraAprox || (editing?.['fechaCompra'] ?? editing?.['fecha_compra']))
      : (fechaCompra || (editing?.['fechaCompra'] ?? editing?.['fecha_compra'])),
  });

  const selectedCategory = categories.find(c => String(c.nombre) === String(categoria));
  const filteredCategories = categories.filter(c => {
    const gid = String((c as any).grupo_id ?? (c as any).grupoId ?? (c as any).groupId ?? (c as any).grupo ?? (c as any).group_id ?? '');
    return !selectedGroupId ? true : gid === selectedGroupId;
  });
  const fabricantesFromMarcas = Array.isArray(marcasList) && selectedCategory
    ? marcasList.filter(m => {
        const cats = Array.isArray(m.categorias) ? m.categorias.map(String) : [];
        const catId   = String((selectedCategory as any).id ?? (selectedCategory as any)._id ?? (selectedCategory as any).codigo ?? '');
        const catName = String(selectedCategory.nombre ?? '').toLowerCase();
        return cats.some(c => {
          const cStr = String(c);
          if (!cStr) return false;
          if (cStr === catId) return true;
          if (cStr.toLowerCase() === catName) return true;
          if (Number(cStr) && String(Number(cStr)) === String(Number(catId))) return true;
          return false;
        });
      })
    : [];

  // ── Render helpers ────────────────────────────────────────────────────────
  const warrantyBadge = computedWarranty ? (
    <div className="flex items-center gap-2 mt-2">
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
        ${computedWarranty.estado === 'Vigente'    ? 'bg-emerald-100 text-emerald-700' :
          computedWarranty.estado === 'No vigente' ? 'bg-red-100 text-red-700'         : 'bg-slate-100 text-slate-600'}`}>
        {computedWarranty.estado === 'Vigente' ? '✅' : computedWarranty.estado === 'No vigente' ? '❌' : '—'}
        {computedWarranty.estado}
      </span>
      {computedWarranty.expiresAt && (
        <span className="text-xs text-slate-500">
          {computedWarranty.estado === 'No vigente' ? 'Venció:' : 'Vence:'}{' '}
          {new Date(computedWarranty.expiresAt).toLocaleDateString('es-ES')}
        </span>
      )}
    </div>
  ) : null;

  // ── Render: Tab Identificación ──────────────────────────────────────────
  const renderIdentificacion = () => (
    <div className="space-y-5">
      {/* Contexto */}
      <div className={cardCls}>
        <p className={sectionTitle}><span>🏢</span> Contexto del Activo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Empresa</label>
            <input value={empresaNombre ?? empresa?.nombre ?? empresaId ?? ''} readOnly
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 cursor-default" />
          </div>
          <div>
            <label className={labelCls}>Sede</label>
            {sedeId ? (
              <input value={sedeDisplay} readOnly
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 cursor-default" />
            ) : (
              <select value={selectedSedeId ?? ''} onChange={e => setSelectedSedeId(e.target.value || undefined)} className={selectCls}>
                <option value="">-- Seleccionar sede --</option>
                {sedes?.map((s, i) => <option key={s._id ?? s.id ?? i} value={String(s._id ?? s.id)}>{String(s.nombre ?? s.id ?? '')}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className={labelCls}>Área</label>
            <select value={area} onChange={e => {
              const val = e.target.value; setArea(val);
              const found = areas?.find(a => String(a.name ?? a.nombre ?? '') === val);
              setResponsable(found ? String(found.responsable ?? '') : '');
            }} className={selectCls}>
              <option value="">-- Seleccionar área --</option>
              {areas?.map((a, i) => <option key={a._id ?? a.id ?? i} value={String(a.name ?? a.nombre ?? '')}>{String(a.name ?? a.nombre ?? '')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Responsable</label>
            <input value={responsable} readOnly
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 cursor-default" />
          </div>
        </div>
      </div>

      {/* Clasificación */}
      <div className={cardCls}>
        <p className={sectionTitle}><span>📁</span> Clasificación</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Grupo de Activo</label>
            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className={selectCls}>
              <option value="">-- Seleccionar grupo --</option>
              {Array.isArray(groups) && groups.map((g, i) => (
                <option key={String((g as any).id ?? (g as any)._id ?? i)} value={String((g as any).id ?? (g as any)._id ?? '')}>
                  {String((g as any).nombre ?? (g as any).codigo ?? (g as any).id ?? '')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tipo de Activo <span className="text-red-500">*</span></label>
            <select
              value={categoria}
              onChange={e => { setCategoria(e.target.value); setDynamicFields({}); setAssetId(''); setFabricante(''); }}
              className={`${selectCls} ${(!!editingAsset || !selectedGroupId) ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
              required
              disabled={!!editingAsset || categories.length === 0 || !selectedGroupId}
            >
              <option value="">-- Seleccionar --</option>
              {filteredCategories.map((cat, i) => <option key={cat.nombre ?? i} value={cat.nombre}>{cat.nombre}</option>)}
            </select>
            {!selectedGroupId && !editingAsset && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">⚠️ Seleccione primero un Grupo de Activo</p>
            )}
            {editingAsset && <p className="text-xs text-slate-400 mt-1">La categoría no puede modificarse</p>}
          </div>
        </div>
      </div>

      {/* Identificación del equipo */}
      <div className={cardCls}>
        <p className={sectionTitle}><span>🏷️</span> Identificación del Equipo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Marca</label>
            {fabricantesFromMarcas.length > 0 ? (
              <select value={fabricante} onChange={e => setFabricante(e.target.value)} className={selectCls}>
                <option value="">-- Seleccionar marca --</option>
                {fabricantesFromMarcas.map(m => <option key={m.id} value={m.nombre ?? m.id}>{m.nombre ?? m.id}</option>)}
              </select>
            ) : (
              <select disabled className={`${selectCls} bg-slate-50 text-slate-400 cursor-not-allowed`}>
                <option>{categoria ? 'Sin marcas relacionadas' : 'Seleccione un tipo primero'}</option>
              </select>
            )}
          </div>
          <div>
            <label className={labelCls}>Modelo</label>
            <input value={modelo} onChange={e => setModelo(e.target.value)} className={inputCls} placeholder="Ej: ThinkPad X1" />
          </div>
          <div>
            <label className={labelCls}>N° de Serie</label>
            <input value={serie} onChange={e => setSerie(e.target.value)} className={inputCls} placeholder="Ej: SN-000123" />
          </div>
          <div>
            <label className={labelCls}>Código (automático)</label>
            <input
              value={categoria ? `${getCompanyPrefix(empresaNombre ?? empresa?.nombre ?? String(empresaId ?? ''))}-${getCategoryPrefix(categoria)}XXXX` : ''}
              readOnly
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 italic cursor-default"
              placeholder="Se asignará automáticamente"
            />
          </div>
        </div>
      </div>

      {/* Red y Estado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className={cardCls}>
          <p className={sectionTitle}><span>🌐</span> Red</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Dirección IP</label>
              <input value={ip} onChange={e => setIp(e.target.value)} className={inputCls} placeholder="192.168.1.1" />
            </div>
            <div>
              <label className={labelCls}>MAC Address</label>
              <input value={mac} onChange={e => setMac(e.target.value)} className={inputCls} placeholder="AA:BB:CC:DD:EE:FF" />
            </div>
            <div>
              <label className={labelCls}>Código Acceso Remoto</label>
              <input value={codigoAccesoRemoto} onChange={e => setCodigoAccesoRemoto(e.target.value)} className={inputCls} placeholder="AnyDesk, TeamViewer…" />
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <p className={sectionTitle}><span>📊</span> Estado</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Estado del Activo</label>
              <select value={estadoActivo} onChange={e => setEstadoActivo(e.target.value)} className={selectCls}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="dado_de_baja">Dado de baja</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado Operativo</label>
              <select value={estadoOperativo} onChange={e => setEstadoOperativo(e.target.value)} className={selectCls}>
                <option value="operativo">Operativo</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="fuera_servicio">Fuera de servicio</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Render: Tab Compra & Garantía ──────────────────────────────────────
  const renderCompra = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Compra */}
        <div className={cardCls}>
          <p className={sectionTitle}><span>🧾</span> Información de Compra</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Tipo de Documento</label>
              <select value={tipoDocumentoCompra} onChange={e => {
                const val = e.target.value; setTipoDocumentoCompra(val);
                if (val === 'Desconocido') { setFechaCompraUnknown(true); setFechaCompra(''); setFechaCompraAprox(''); setNumeroDocumentoCompra(''); setPurchaseDocumentFile(null); }
                else { setFechaCompraUnknown(false); setFechaCompraAprox(''); }
              }} className={selectCls}>
                <option value="Factura">Factura</option>
                <option value="Boleta">Boleta</option>
                <option value="Guía">Guía</option>
                <option value="Desconocido">Desconocido</option>
              </select>
            </div>
            {tipoDocumentoCompra !== 'Desconocido' && (
              <div>
                <label className={labelCls}>N° de Documento</label>
                <input type="text" value={numeroDocumentoCompra} onChange={e => setNumeroDocumentoCompra(e.target.value)} className={inputCls} placeholder="Ej: F001-12345" />
              </div>
            )}
            <div>
              <label className={labelCls}>Proveedor</label>
              <input value={proveedor} onChange={e => setProveedor(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha de Compra</label>
              {tipoDocumentoCompra !== 'Desconocido' ? (
                <input type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} className={inputCls} />
              ) : (
                <input type="number" min={1900} max={new Date().getFullYear()} value={fechaCompraAprox} onChange={e => setFechaCompraAprox(e.target.value)} placeholder="Año aproximado (Ej: 2022)" className={inputCls} />
              )}
            </div>
            <div>
              <label className={labelCls}>Condición Física</label>
              <select value={condicionFisica} onChange={e => setCondicionFisica(e.target.value)} className={selectCls}>
                <option value="">-- Seleccionar --</option>
                {['Excelente','Bueno','Regular','Malo'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Antigüedad Calculada</label>
              <input value={antiguedadCalculada} readOnly className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 cursor-default" placeholder="—" />
            </div>
          </div>
        </div>

        {/* Garantía */}
        <div className={cardCls}>
          <p className={sectionTitle}><span>🛡️</span> Garantía</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Duración de Garantía</label>
              <select value={garantiaDuracion} onChange={e => setGarantiaDuracion(e.target.value)} className={selectCls}>
                <option value="">-- Seleccionar --</option>
                <option value="6 meses">6 meses</option>
                <option value="1 año">1 año</option>
                <option value="2 años">2 años</option>
                <option value="3 años">3 años</option>
              </select>
              {warrantyBadge}
            </div>

            {/* Doc. garantía */}
            <div className="border border-dashed border-blue-200 bg-blue-50 rounded-xl p-4">
              <label className="block text-xs font-semibold text-blue-700 mb-2">📎 Documento de Garantía</label>
              <input type="file" accept="application/pdf,image/png,image/jpeg"
                onChange={e => { const f = e.target.files?.[0] ?? null; setWarrantyDocumentFile(f); if (!f) setWarrantyDocumentDescription(''); }}
                className="text-sm" />
              {warrantyDocumentExisting && <a className="text-xs text-blue-600 underline mt-1 block" href={warrantyDocumentExisting} target="_blank" rel="noreferrer">Ver documento existente</a>}
              {(warrantyDocumentFile || warrantyDocumentExisting) && (
                <div className="mt-3">
                  <label className={labelCls}>Descripción</label>
                  <input type="text" value={warrantyDocumentDescription} onChange={e => setWarrantyDocumentDescription(e.target.value)} placeholder="Ej: Certificado garantía 2 años" className={inputCls} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Doc. compra */}
      <div className={cardCls}>
        <p className={sectionTitle}><span>📂</span> Documento de Compra</p>
        <div className="border border-dashed border-cyan-200 bg-cyan-50 rounded-xl p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <input type="file" accept="application/pdf,image/png,image/jpeg"
              onChange={e => { const f = e.target.files?.[0] ?? null; setPurchaseDocumentFile(f); if (!f) setPurchaseDocumentDescription(''); }}
              className="text-sm" />
            {purchaseDocumentExisting && <a className="text-xs text-blue-600 underline" href={purchaseDocumentExisting} target="_blank" rel="noreferrer">Ver documento existente</a>}
          </div>
          {(purchaseDocumentFile || purchaseDocumentExisting) && (
            <div className="mt-3">
              <label className={labelCls}>Descripción</label>
              <input type="text" value={purchaseDocumentDescription} onChange={e => setPurchaseDocumentDescription(e.target.value)} placeholder="Ej: Factura proveedor X" className={inputCls} />
              <p className="text-xs text-slate-400 mt-1">Describe brevemente qué contiene este documento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Render: Tab Campos Personalizados ──────────────────────────────────
  const renderPersonalizados = () => {
    // Mostrar únicamente los componentes dinámicos; ya no se muestran "campos personalizados"
    const comps = renderComponentesDinamicos();
    if (!comps) {
      return (
        <div className={`${cardCls} flex flex-col items-center justify-center py-16 text-center`}>
          <span className="text-5xl mb-3">🧩</span>
          <p className="text-slate-500 font-medium">No hay componentes</p>
          <p className="text-xs text-slate-400 mt-1">Selecciona un Tipo de Activo en la pestaña de Identificación para cargar componentes.</p>
        </div>
      );
    }
    return comps;
  };

  // ── Render: Tab Asignaciones ───────────────────────────────────────────
  const renderAsignaciones = () => (
    <div className="space-y-5">
      {/* Usuarios */}
      <div className={cardCls}>
        <p className={sectionTitle}><span>👥</span> Usuarios Asignados <span className="ml-1 text-sm font-normal text-slate-400">({usuariosAsignadosIds.length})</span></p>
        {loadingUsuarios ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><span className="animate-spin">⏳</span> Cargando usuarios…</div>
        ) : !empresaId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">⚠️ No se pudo cargar la empresa</div>
        ) : (
          <div className="space-y-4">
            {usuariosAsignadosIds.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-semibold text-blue-800">✅ Asignados ({usuariosAsignadosIds.length})</h5>
                  {usuariosAsignadosIds.length > 1 && (
                    <span className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1 rounded-full font-semibold">Compartido</span>
                  )}
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {usuariosAsignadosIds.map(uid => {
                    const u = usuariosDisponibles.find(u => String(u.id || u._id || '') === String(uid));
                    if (!u) return (
                      <div key={uid} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                        Usuario ID {uid} no encontrado en la lista
                      </div>
                    );
                    return (
                      <div key={uid} className="flex items-center justify-between bg-white border border-blue-100 rounded-lg px-4 py-2.5 hover:shadow-sm transition">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow">
                            {u.nombreCompleto?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{u.nombreCompleto || 'Sin nombre'}</p>
                            <p className="text-xs text-slate-400">{u.correo || u.email || '—'} · <span className="text-blue-600">{u.cargo || 'Sin cargo'}</span></p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setUsuariosAsignadosIds(p => p.filter(id => id !== uid))}
                          className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition" title="Quitar usuario">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block text-xs font-semibold text-slate-600 mb-2">➕ Agregar Usuario</label>
              <select value="" onChange={e => {
                const id = e.target.value;
                if (id && !usuariosAsignadosIds.includes(id)) setUsuariosAsignadosIds(p => [...p, id]);
                e.target.value = '';
              }} className={selectCls} disabled={!empresaId || (!selectedSedeId && !sedeId)}>
                <option value="">Seleccionar usuario…</option>
                {usuariosDisponibles.filter(u => !usuariosAsignadosIds.includes(String(u.id||u._id||''))).map(u => (
                  <option key={u.id||u._id} value={u.id||u._id}>{u.nombreCompleto} — {u.cargo||'Sin cargo'}</option>
                ))}
              </select>
              {usuariosDisponibles.filter(u => !usuariosAsignadosIds.includes(String(u.id||u._id||''))).length === 0 && (
                <p className="text-xs text-blue-500 mt-2">✓ Todos los usuarios disponibles ya están asignados</p>
              )}
              {!usuariosDisponibles.length && (
                <p className="text-xs text-slate-400 mt-2">⚠️ No hay usuarios registrados en esta empresa</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fotos y Observaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className={cardCls}>
          <p className={sectionTitle}><span>📷</span> Fotos del Activo</p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 bg-blue-50 rounded-xl py-6 cursor-pointer hover:bg-blue-100 transition">
            <span className="text-3xl mb-1">📷</span>
            <span className="text-sm font-medium text-blue-600">Agregar fotos</span>
            <span className="text-xs text-slate-400 mt-0.5">Puedes seleccionar varias imágenes</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
              if (!e.target.files) return;
              const arr = Array.from(e.target.files).map(f => ({ file: f, description: '' }));
              setFotos(p => [...p, ...arr]); e.currentTarget.value = '';
            }} />
          </label>
          {fotosExistentes.length > 0 && <p className="text-xs text-slate-400 mt-2">Fotos guardadas: {fotosExistentes.length}</p>}
          {fotos.length > 0 && (
            <div className="mt-3 space-y-2">
              {fotos.map((f, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                  <img src={URL.createObjectURL(f.file)} alt={f.file.name} className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-700 truncate">{f.file.name}</p>
                      <button type="button" onClick={() => setFotos(p => p.filter((_,j)=>j!==i))} className="text-xs text-red-400 hover:text-red-600 ml-2">Eliminar</button>
                    </div>
                    <input type="text" value={f.description} onChange={e => { const v=e.target.value; setFotos(p => { const c=[...p]; c[i]={...c[i],description:v}; return c; }); }} placeholder="Descripción…" className={`${inputCls} mt-1`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cardCls}>
          <p className={sectionTitle}><span>📝</span> Observaciones</p>
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className={`${inputCls} resize-none`} rows={8} placeholder="Escribe observaciones relevantes sobre este activo…" />
        </div>
      </div>
    </div>
  );

  // ── Render principal ───────────────────────────────────────────────────
  const renderComponentesDinamicos = () => {
    if (!componentesForm || componentesForm.length === 0) return null;
    return (
      <div className={cardCls}>
        <p className={sectionTitle}><span>🧩</span> Componentes</p>
        <div className="space-y-4">
          {componentesForm.map((comp: any) => {
            const compId = String(comp.id ?? comp._id ?? comp.nombre ?? Math.random());
            const instances = dynamicCompInstances[compId] || [{}];
            return (
              <div key={compId} className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{comp.nombre}</div>
                    <div className="text-xs text-slate-400">{comp.campos?.length ?? 0} campo{(comp.campos?.length ?? 0) !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => {
                      setDynamicCompInstances(prev => {
                        const cur = prev[compId] ? [...prev[compId]] : [];
                        const entry: Record<string,string> = {};
                        (comp.campos || []).forEach((cf: any, idx: number) => { const cid = String(cf.id ?? cf.campo_id ?? `${compId}_${idx}`); entry[cid] = ''; });
                        cur.push(entry);
                        return { ...prev, [compId]: cur };
                      });
                    }} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">+ Añadir {comp.nombre}</button>
                  </div>
                </div>

                <div className="space-y-3">
                  {instances.map((inst: any, ii: number) => (
                    <div key={`${compId}_inst_${ii}`} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-slate-600">{comp.nombre} #{ii+1}</div>
                        {instances.length > 1 && (
                          <button type="button" onClick={() => setDynamicCompInstances(prev => {
                            const cur = prev[compId] ? [...prev[compId]] : [];
                            cur.splice(ii,1);
                            return { ...prev, [compId]: cur };
                          })} className="px-2 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-xs transition">✕</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(comp.campos || []).map((cf: any, ci: number) => {
                          const campoId = String(cf.id ?? cf.campo_id ?? `${compId}_${ci}`);
                          const value = (dynamicCompInstances[compId] && dynamicCompInstances[compId][ii] && dynamicCompInstances[compId][ii][campoId]) || '';
                          const required = Boolean(cf.requerido);
                          if (cf.tipo === 'select') {
                            const opts: any[] = Array.isArray(cf.opciones) ? cf.opciones : [];
                            return (
                              <div key={campoId}>
                                <label className={labelCls}>{cf.nombre}{required && <span className="text-red-500 ml-1">*</span>}</label>
                                <select value={value} onChange={e => setDynamicCompInstances(prev => { const cur = { ...(prev||{}) }; cur[compId] = cur[compId] || [{}]; cur[compId][ii] = { ...(cur[compId][ii]||{}), [campoId]: e.target.value }; return cur; })} className={selectCls}>
                                  <option value="">-- Seleccionar --</option>
                                  {opts.map((o, oi) => <option key={oi} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.value}</option>)}
                                </select>
                              </div>
                            );
                          }
                          if (cf.tipo === 'textarea') {
                            return (
                              <div key={campoId}>
                                <label className={labelCls}>{cf.nombre}{required && <span className="text-red-500 ml-1">*</span>}</label>
                                <textarea value={value} onChange={e => setDynamicCompInstances(prev => { const cur = { ...(prev||{}) }; cur[compId] = cur[compId] || [{}]; cur[compId][ii] = { ...(cur[compId][ii]||{}), [campoId]: e.target.value }; return cur; })} className={inputCls} rows={3} />
                              </div>
                            );
                          }
                          if (cf.tipo === 'number') {
                            return (
                              <div key={campoId}>
                                <label className={labelCls}>{cf.nombre}{required && <span className="text-red-500 ml-1">*</span>}</label>
                                <input type="number" value={value} onChange={e => setDynamicCompInstances(prev => { const cur = { ...(prev||{}) }; cur[compId] = cur[compId] || [{}]; cur[compId][ii] = { ...(cur[compId][ii]||{}), [campoId]: e.target.value }; return cur; })} className={inputCls} />
                              </div>
                            );
                          }
                          // default: text
                          return (
                            <div key={campoId}>
                              <label className={labelCls}>{cf.nombre}{required && <span className="text-red-500 ml-1">*</span>}</label>
                              <input type="text" value={value} onChange={e => setDynamicCompInstances(prev => { const cur = { ...(prev||{}) }; cur[compId] = cur[compId] || [{}]; cur[compId][ii] = { ...(cur[compId][ii]||{}), [campoId]: e.target.value }; return cur; })} className={inputCls} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" style={{ zIndex: 99999 }} role="dialog" aria-modal="true">
      <style>{modalStyles}</style>
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform-gpu animate-modal-enter border border-slate-100">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5 flex items-center justify-between rounded-t-3xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-lg">
              {editingAsset ? '✏️' : '➕'}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">
                {editingAsset ? 'Editar Activo' : 'Registrar Activo'}
              </h3>
              <p className="text-blue-100 text-xs mt-1">Formulario por pasos — completa la información requerida</p>
              {editingAsset && editingAssetId && (
                <p className="text-blue-100 text-xs mt-1">ID: {editingAssetId}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-white/90 hover:text-white hover:bg-white/10 w-9 h-9 rounded-lg flex items-center justify-center transition text-lg">✕</button>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-slate-100 px-6 flex gap-1 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                const targetIdx = STEP_ORDER.indexOf(tab.id);
                // if trying to advance forward, validate current step
                if (targetIdx > stepIndex && !canAdvanceFromStep(stepIndex)) {
                  const missing = getMissingStep0Fields();
                  setStepError(missing.length ? `Faltan campos obligatorios: ${missing.join(', ')}.` : 'Completa los campos requeridos antes de avanzar.');
                  return;
                }
                setActiveTab(tab.id); setStepIndex(targetIdx);
              }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenido ── */}
        <div role="form" className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* stepError ahora se muestra como un pop-up modal bonito (ver abajo) */}
            {activeTab === 'identificacion'  && renderIdentificacion()}
            {activeTab === 'compra'          && renderCompra()}
            {activeTab === 'personalizados'  && renderPersonalizados()}
            {activeTab === 'asignaciones'    && renderAsignaciones()}
          </div>

          {/* ── Footer: acciones ── */}
          <div className="bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-b-3xl">
            <div className="flex gap-1.5">
              {TABS.map((tab, i) => (
                <button key={tab.id} type="button" onClick={() => {
                  const targetIdx = STEP_ORDER.indexOf(tab.id);
                  if (targetIdx > stepIndex && !canAdvanceFromStep(stepIndex)) { const missing = getMissingStep0Fields(); setStepError(missing.length ? `Faltan campos obligatorios: ${missing.join(', ')}.` : 'Completa los campos requeridos antes de avanzar.'); return; }
                  setActiveTab(tab.id); setStepIndex(targetIdx);
                }}
                  className={`w-2 h-2 rounded-full transition-all ${activeTab === tab.id ? 'bg-blue-500 w-5' : 'bg-slate-300'}`} />
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={isSubmitting}
                className="px-4 py-2 border border-slate-100 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
                Cancelar
              </button>
              {/* If not final step, the main button advances the stepper; final step submits the form */}
              <button type="button" disabled={isSubmitting}
                onClick={async () => {
                  const last = STEP_ORDER.length - 1;
                  if (stepIndex < last) {
                    if (!canAdvanceFromStep(stepIndex)) { const missing = getMissingStep0Fields(); setStepError(missing.length ? `Faltan campos obligatorios: ${missing.join(', ')}.` : 'Completa los campos requeridos antes de avanzar.'); return; }
                    setStepIndex(si => Math.min(last, si + 1));
                    return;
                  }
                  // Final step: only create/update when user explicitly clicks the final button
                  if (isSubmitting) return;
                  const targetSedeId = sedeId ?? selectedSedeId;
                  if (!empresaId || !targetSedeId) { alert('Error: No se puede crear activo sin empresa o sede'); return; }
                  if (editingAsset) { setShowMotivoModal(true); return; }
                  await procesarCreacion(empresaId, targetSedeId);
                }}
                className="px-6 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-full font-semibold text-sm shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSubmitting ? (
                  <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Procesando…</>
                ) : (
                  stepIndex === STEP_ORDER.length - 1
                    ? (editingAsset ? '✅ Actualizar Activo' : '➕ Registrar Activo')
                    : 'Siguiente'
                )}
              </button>
            </div>
          </div>
          </div>
      </div>

      {/* ── Modal Motivo de Actualización ── */}
      {showMotivoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-4 rounded-t-2xl flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">✏️</div>
              <h3 className="text-lg font-bold">Confirmar Actualización</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800">
                  Estás a punto de modificar el activo <span className="font-bold">{editingAssetId}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">Esta acción quedará registrada en el historial de cambios.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Motivo del Cambio <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivo} onChange={e => setMotivo(e.target.value)}
                  placeholder="Describe el motivo de esta actualización (mínimo 10 caracteres)…"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition text-sm"
                  rows={4} autoFocus
                />
                <div className="flex justify-between mt-1.5">
                  <span className={`text-xs font-medium ${motivo.trim().length < 10 ? 'text-red-400' : 'text-emerald-600'}`}>
                    {motivo.trim().length < 10 ? `Faltan ${10 - motivo.trim().length} caracteres` : '✓ Motivo válido'}
                  </span>
                  <span className="text-xs text-slate-400">{motivo.trim().length}/500</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <button type="button" onClick={handleCancelUpdate}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmUpdate} disabled={motivo.trim().length < 10}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2
                  ${motivo.trim().length < 10
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow hover:shadow-md hover:from-blue-700 hover:to-cyan-600'}`}>
                ✅ Confirmar Actualización
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup de error de step (estilizado) ── */}
      {stepError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100001]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-red-100">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-50 rounded-t-2xl bg-red-50">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 text-red-700">⚠️</div>
              <div>
                <h4 className="text-red-800 font-semibold">Campos requeridos</h4>
                <p className="text-xs text-red-600">Completa los campos requeridos antes de continuar</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">{stepError}</p>
            </div>
            <div className="px-4 py-3 flex justify-end gap-2 border-t border-red-50 rounded-b-2xl">
              <button type="button" onClick={() => setStepError(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">Cerrar</button>
              <button type="button" onClick={() => { setStepError(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  

export default RegisterAssetModal;