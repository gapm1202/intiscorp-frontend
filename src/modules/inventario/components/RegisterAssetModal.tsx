import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { getWarrantyInfo } from "@/modules/inventario/utils/warranty";
import { formatAssetCode, getCompanyPrefix, getCategoryPrefix } from "@/utils/helpers";
import type { Category, FieldOption, SubField } from "@/modules/inventario/services/categoriasService";
import { createActivo, updateActivo } from "@/modules/inventario/services/inventarioService";
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
  { id: 'personalizados',  label: 'Campos Extra',      icon: '⚙️' },
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
    ...buildCategoryData(),
    camposPersonalizados: buildCamposPersonalizados(),
    camposPersonalizadosArray: buildCamposPersonalizadosArray(),
    fotosExistentes: fotosExistentes.map(f => ({ url: f.url, name: f.name, description: f.description })),
    fotosNuevas: fotos.map(f => ({ name: f.file.name, description: f.description })),
    fotosFiles: fotos.length > 0 ? fotos : undefined,
  });

  const procesarCreacion = async (empresaId: string, sedeId: string) => {
    setIsSubmitting(true);
    try {
      console.log('🟢 [DEBUG] Payload enviado al backend (CREATE):', buildPayload());
      const response = await createActivo(empresaId, sedeId, buildPayload());
      const activoCreado = response?.data || response;
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
      const activoActualizado = response?.data || response;
      if (activoActualizado.fotos && typeof activoActualizado.fotos === 'string') activoActualizado.fotos = JSON.parse(activoActualizado.fotos);
      onSuccess?.(activoActualizado); onClose();
    } catch (error) { console.error('❌ Error guardando activo:', error); alert('Error al guardar el activo. Revisa la consola para más detalles.'); }
    finally { setIsSubmitting(false); }
  };

  // ── Derivados ────────────────────────────────────────────────────────────
  if (!isOpen) return null;

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
    if (!selectedCategory?.campos?.length) {
      return (
        <div className={`${cardCls} flex flex-col items-center justify-center py-16 text-center`}>
          <span className="text-5xl mb-3">⚙️</span>
          <p className="text-slate-500 font-medium">No hay campos personalizados</p>
          <p className="text-xs text-slate-400 mt-1">Selecciona un Tipo de Activo en la pestaña de Identificación para ver sus campos.</p>
        </div>
      );
    }
    return (
      <div className={cardCls}>
        <p className={sectionTitle}><span>⚙️</span> Campos de {selectedCategory.nombre}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {selectedCategory.campos.map((field, idx) => {
            const fk = getFieldKey(field.nombre);
            const isArray = field.subcampos?.length > 0;
            const firstOpt = field.opciones?.[0];
            const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' &&
              (field.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos?.length > 0);

            if (isArray) return (
              <div key={idx} className="col-span-full border border-blue-200 rounded-xl p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-blue-800">{field.nombre}{field.requerido && <span className="text-red-500 ml-1">*</span>}</label>
                  <button type="button" onClick={() => { setDynamicArrayFields(prev => { const cur = prev[fk] || []; const entry: Record<string,string> = {}; field.subcampos!.forEach(sf => { entry[sf.nombre] = ''; }); return { ...prev, [fk]: [...cur, entry] }; }); }}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">+ Añadir {field.nombre}</button>
                </div>
                <div className="space-y-3">
                  {(dynamicArrayFields[fk] || []).map((entry, ei) => (
                    <div key={ei} className="bg-white border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {field.subcampos!.map((sf, si) => (
                          <div key={si}>
                            <label className="block text-xs text-slate-500 font-medium mb-1">{sf.nombre}</label>
                            {sf.tipo === 'select' && sf.opciones ? (
                              <select value={entry[sf.nombre] || ''} onChange={e => { setDynamicArrayFields(prev => { const arr = [...(prev[fk]||[])]; arr[ei] = {...arr[ei],[sf.nombre]:e.target.value}; return {...prev,[fk]:arr}; }); }} className={selectCls}>
                                <option value="">-- Seleccionar --</option>
                                {sf.opciones.map((o,oi) => <option key={oi} value={o}>{o}</option>)}
                              </select>
                            ) : sf.tipo === 'number' ? (
                              <input type="number" value={entry[sf.nombre]||''} onChange={e => { setDynamicArrayFields(prev => { const arr=[...(prev[fk]||[])]; arr[ei]={...arr[ei],[sf.nombre]:e.target.value}; return {...prev,[fk]:arr}; }); }} className={inputCls} />
                            ) : (
                              <input type="text" value={entry[sf.nombre]||''} onChange={e => { setDynamicArrayFields(prev => { const arr=[...(prev[fk]||[])]; arr[ei]={...arr[ei],[sf.nombre]:e.target.value}; return {...prev,[fk]:arr}; }); }} className={inputCls} />
                            )}
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => { setDynamicArrayFields(prev => ({ ...prev, [fk]: (prev[fk]||[]).filter((_,i)=>i!==ei) })); }}
                        className="px-2 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-xs transition">✕</button>
                    </div>
                  ))}
                  {!(dynamicArrayFields[fk]?.length) && <p className="text-center text-slate-400 text-sm py-3">No hay entradas. Haz clic en "+ Añadir {field.nombre}".</p>}
                </div>
              </div>
            );

            if (hasOptionSubcampos) {
              const instances = dynamicArrayFields[fk] || [];
              return (
                <div key={idx} className="col-span-full border border-violet-200 rounded-xl p-4 bg-violet-50">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-violet-800">{field.nombre}{field.requerido && <span className="text-red-500 ml-1">*</span>}</label>
                    <button type="button" onClick={() => { setDynamicArrayFields(prev => ({ ...prev, [fk]: [...(prev[fk]||[]), { _opcion:'' }] })); }}
                      className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition">+ Añadir {field.nombre}</button>
                  </div>
                  <div className="space-y-3">
                    {instances.map((entry, ei) => {
                      const selVal = entry._opcion || '';
                      const selOpt = selVal ? (field.opciones as FieldOption[]).find(o => typeof o !== 'string' && o.value === selVal) : null;
                      return (
                        <div key={ei} className="bg-white border border-violet-200 rounded-lg p-3 flex items-start gap-2">
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="block text-xs text-slate-500 font-medium mb-1">Opción</label>
                              <select value={selVal} onChange={e => { setDynamicArrayFields(prev => { const arr=[...(prev[fk]||[])]; arr[ei]={_opcion:e.target.value}; return {...prev,[fk]:arr}; }); }} className={selectCls}>
                                <option value="">-- Seleccionar --</option>
                                {field.opciones.map((o,oi) => { const v = typeof o === 'string' ? o : o.value; return <option key={oi} value={v}>{v}</option>; })}
                              </select>
                            </div>
                            {selOpt && typeof selOpt !== 'string' && selOpt.subcampos?.length > 0 && (
                              <div className="pl-3 border-l-2 border-violet-300 space-y-2">
                                <p className="text-xs font-semibold text-violet-700">Campos para "{selVal}"</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {selOpt.subcampos.map((sf, si) => (
                                    <div key={si}>
                                      <label className="block text-xs text-slate-500 font-medium mb-1">{sf.nombre}</label>
                                      {sf.tipo === 'select' && sf.opciones ? (
                                        <select value={entry[sf.nombre]||''} onChange={e => { setDynamicArrayFields(prev => { const arr=[...(prev[fk]||[])]; arr[ei]={...arr[ei],[sf.nombre]:e.target.value}; return {...prev,[fk]:arr}; }); }} className={selectCls}>
                                          <option value="">-- Seleccionar --</option>
                                          {sf.opciones.map((so,soi) => <option key={soi} value={so}>{so}</option>)}
                                        </select>
                                      ) : sf.tipo === 'number' ? (
                                        <input type="number" value={entry[sf.nombre]||''} onChange={e => { setDynamicArrayFields(prev => { const arr=[...(prev[fk]||[])]; arr[ei]={...arr[ei],[sf.nombre]:e.target.value}; return {...prev,[fk]:arr}; }); }} className={inputCls} />
                                      ) : (
                                        <input type="text" value={entry[sf.nombre]||''} onChange={e => { setDynamicArrayFields(prev => { const arr=[...(prev[fk]||[])]; arr[ei]={...arr[ei],[sf.nombre]:e.target.value}; return {...prev,[fk]:arr}; }); }} className={inputCls} />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => { setDynamicArrayFields(prev => ({ ...prev, [fk]: (prev[fk]||[]).filter((_,i)=>i!==ei) })); }}
                            className="px-2 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-xs transition">✕</button>
                        </div>
                      );
                    })}
                    {!instances.length && <p className="text-center text-slate-400 text-sm py-3">No hay entradas. Haz clic en "+ Añadir {field.nombre}".</p>}
                  </div>
                </div>
              );
            }

            // Campo simple
            return (
              <div key={idx}>
                <label className={labelCls}>{field.nombre}{field.requerido && <span className="text-red-500 ml-1">*</span>}</label>
                {field.tipo === 'select' && field.opciones ? (
                  <select value={dynamicFields[fk]||''} onChange={e => setDynamicFields(p => ({...p,[fk]:e.target.value}))} className={selectCls} required={field.requerido}>
                    <option value="">-- Seleccionar --</option>
                    {field.opciones.map((o,oi) => { const v = typeof o === 'string' ? o : o.value; return <option key={oi} value={v}>{v}</option>; })}
                  </select>
                ) : field.tipo === 'textarea' ? (
                  <textarea value={dynamicFields[fk]||''} onChange={e => setDynamicFields(p => ({...p,[fk]:e.target.value}))} className={inputCls} rows={3} required={field.requerido} />
                ) : field.tipo === 'number' ? (
                  <input type="number" value={dynamicFields[fk]||''} onChange={e => setDynamicFields(p => ({...p,[fk]:e.target.value}))} className={inputCls} required={field.requerido} />
                ) : (
                  <input type="text" value={dynamicFields[fk]||''} onChange={e => setDynamicFields(p => ({...p,[fk]:e.target.value}))} className={inputCls} required={field.requerido} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
  return (
    <div className="fixed inset-0 flex items-start justify-center pt-8 bg-black/50 backdrop-blur-sm" style={{ zIndex: 99999 }} role="dialog" aria-modal="true">
      <div className="bg-slate-50 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-lg">
              {editingAsset ? '✏️' : '➕'}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">
                {editingAsset ? 'Editar Activo' : 'Registrar Activo'}
              </h3>
              {editingAsset && editingAssetId && (
                <p className="text-blue-100 text-xs">ID: {editingAssetId}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center transition text-lg">✕</button>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-slate-200 px-6 flex gap-1 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'identificacion'  && renderIdentificacion()}
            {activeTab === 'compra'          && renderCompra()}
            {activeTab === 'personalizados'  && renderPersonalizados()}
            {activeTab === 'asignaciones'    && renderAsignaciones()}
          </div>

          {/* ── Footer: acciones ── */}
          <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
            <div className="flex gap-1.5">
              {TABS.map((tab, i) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`w-2 h-2 rounded-full transition-all ${activeTab === tab.id ? 'bg-blue-500 w-5' : 'bg-slate-300'}`} />
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={isSubmitting}
                className="px-5 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSubmitting ? (
                  <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Procesando…</>
                ) : (
                  editingAsset ? '✅ Actualizar Activo' : '➕ Registrar Activo'
                )}
              </button>
            </div>
          </div>
        </form>
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
    </div>
  );
};

export default RegisterAssetModal;