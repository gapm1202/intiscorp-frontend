import { useEffect, useMemo, useRef, useState } from 'react';
import axiosClient from '@/api/axiosClient';
import RegisterAssetModal from '@/modules/inventario/components/RegisterAssetModal';
import { getAreasByEmpresa } from '@/modules/inventario/services/areasService';
import { getCategorias, type Category } from '@/modules/inventario/services/categoriasService';
import { getInventarioBySede } from '@/modules/inventario/services/inventarioService';

type TecnicoInfo = {
  id: string;
  nombre: string;
};

type MantenimientoContext = {
  empresaId: string;
  empresaNombre: string;
  sedeId: string;
  sedeNombre: string;
  fecha: string;
  tecnicos: TecnicoInfo[];
};

type EstadoActivo = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO';

type AreaItem = {
  id?: string | number;
  _id?: string;
  name?: string;
  nombre?: string;
  responsable?: string;
};

type AssetRow = {
  id: string;
  codigo: string;
  equipo: string;
  usuario: string;
  usuarioCompleto: string;
  raw: Record<string, unknown>;
};

type ChecklistValue = 'SI' | 'NO' | null;

type ChecklistRow = {
  key: string;
  label: string;
  value: ChecklistValue;
  comentario: string;
};

type MantenimientoDraft = {
  diagnostico: string;
  trabajoRealizado: string;
  recomendaciones: string;
  cambioComponentes: 'NO' | 'SI';
  evidenciaAntes: File | null;
  evidenciaDespues: File | null;
  checklist: ChecklistRow[];
  observaciones: string;
  firmaTecnicoModo: 'AUTO' | 'TRAZAR';
  firmaUsuarioModo: 'AUTO' | 'TRAZAR';
  firmaTecnico: string;
  firmaUsuario: string;
};

type SignaturePadProps = {
  value: string;
  onChange: (value: string) => void;
};

type Props = {
  context: MantenimientoContext;
  onBack: () => void;
};

const CHECKLIST_BASE: ChecklistRow[] = [
  { key: 'limpieza', label: 'Limpieza fisica del equipo', value: null, comentario: '' },
  { key: 'pasta', label: 'Cambio de pasta termica', value: null, comentario: '' },
  { key: 'software', label: 'Actualizacion de software', value: null, comentario: '' },
  { key: 'almacenamiento', label: 'Revision de almacenamiento', value: null, comentario: '' },
  { key: 'rendimiento', label: 'Verificacion de rendimiento', value: null, comentario: '' },
  { key: 'cables', label: 'Estado de cables', value: null, comentario: '' },
  { key: 'discos', label: 'Estado de discos', value: null, comentario: '' },
  { key: 'temperatura', label: 'Monitoreo de temperatura', value: null, comentario: '' },
  { key: 'antivirus', label: 'Antivirus actualizado', value: null, comentario: '' },
];

function toArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Array.isArray((response as { data?: unknown }).data)
  ) {
    return (response as { data: T[] }).data;
  }
  return [];
}

function getAssetId(item: Record<string, unknown>): string {
  return String(item.id ?? item._id ?? item.assetId ?? item.codigo ?? Math.random().toString(36).slice(2));
}

function getStringField(source: unknown, keys: string[]): string {
  if (!source || typeof source !== 'object') return '';
  const obj = source as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getCurrentUserName(): string {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const user = JSON.parse(raw) as Record<string, unknown>;
    return String(user.nombreCompleto ?? user.nombre ?? user.name ?? '').trim();
  } catch {
    return '';
  }
}

function getAutoSignatureFontSize(nombre: string): string {
  const length = nombre.trim().length;
  if (length <= 18) return '2.1rem';
  if (length <= 24) return '1.9rem';
  if (length <= 30) return '1.7rem';
  if (length <= 36) return '1.5rem';
  if (length <= 42) return '1.3rem';
  return '1.15rem';
}

function extractAssignedUser(item: Record<string, unknown>): { displayName: string; fullName: string } {
  const directName = String(
    item.usuarioNombre ??
      item.usuarioAsignadoNombre ??
      item.usuario_asignado_nombre ??
      item.usuario ??
      item.responsable ??
      ''
  ).trim();

  if (directName) {
    return { displayName: directName, fullName: directName };
  }

  const usuarioData =
    (typeof item.usuarioAsignadoData === 'object' && item.usuarioAsignadoData !== null
      ? (item.usuarioAsignadoData as Record<string, unknown>)
      : null) ||
    (typeof item.usuario_asignado_data === 'object' && item.usuario_asignado_data !== null
      ? (item.usuario_asignado_data as Record<string, unknown>)
      : null);

  const usuarioDataName = getStringField(usuarioData, ['nombreCompleto', 'nombre', 'name', 'fullName']);
  if (usuarioDataName) {
    return { displayName: usuarioDataName, fullName: usuarioDataName };
  }

  const usuariosRaw =
    item.usuariosAsignados ||
    item.usuarios_asignados ||
    item.usuarios_asignados_m2n ||
    item.usuarios ||
    item.usuario_asignado ||
    item.usuariosAsignadosArray ||
    item.usuariosAsignadosIds ||
    [];

  const usuariosArray = Array.isArray(usuariosRaw)
    ? usuariosRaw
    : typeof usuariosRaw === 'string'
    ? (() => {
        try {
          const parsed = JSON.parse(usuariosRaw);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [usuariosRaw];
        }
      })()
    : [usuariosRaw];

  for (const userItem of usuariosArray) {
    if (typeof userItem === 'string' && userItem.trim()) {
      return { displayName: userItem.trim(), fullName: userItem.trim() };
    }

    const fullName = getStringField(userItem, ['nombreCompleto', 'nombre', 'nombreUsuario', 'name', 'fullName']);
    if (fullName) {
      return { displayName: fullName, fullName };
    }
  }

  return { displayName: 'Sin asignar', fullName: 'Sin asignar' };
}

function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsDrawing(true);
    canvas.setPointerCapture(event.pointerId);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPoint(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(false);
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={520}
        height={140}
        className="w-full border-2 border-[#bdd7f0] rounded-xl bg-white touch-none"
        onPointerDown={beginDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#e8f1fb] text-[#1a4d8f] hover:bg-[#d0e4f7] border border-[#bdd7f0] transition"
        >
          Limpiar firma
        </button>
      </div>
    </div>
  );
}

function mapAsset(item: Record<string, unknown>): AssetRow {
  const usuarioAsignado = extractAssignedUser(item);

  return {
    id: getAssetId(item),
    codigo: String(item.assetId ?? item.codigo ?? item.id ?? '-'),
    equipo: String(item.categoria ?? item.nombre ?? item.modelo ?? 'Activo sin nombre'),
    usuario: usuarioAsignado.displayName,
    usuarioCompleto: usuarioAsignado.fullName,
    raw: item,
  };
}

function buildEmptyDraft(): MantenimientoDraft {
  return {
    diagnostico: '',
    trabajoRealizado: '',
    recomendaciones: '',
    cambioComponentes: 'NO',
    evidenciaAntes: null,
    evidenciaDespues: null,
    checklist: CHECKLIST_BASE.map((row) => ({ ...row })),
    observaciones: '',
    firmaTecnicoModo: 'AUTO',
    firmaUsuarioModo: 'AUTO',
    firmaTecnico: '',
    firmaUsuario: '',
  };
}

async function compressImageIfNeeded(file: File): Promise<File> {
  const maxBytes = 2 * 1024 * 1024;
  if (file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

  let scale = 1;
  let quality = 0.9;

  for (let i = 0; i < 8; i += 1) {
    canvas.width = Math.max(640, Math.floor(bitmap.width * scale));
    canvas.height = Math.max(480, Math.floor(bitmap.height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (blob && blob.size <= maxBytes) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-optimizada.jpg', { type: 'image/jpeg' });
    }

    scale -= 0.12;
    quality -= 0.1;
  }

  return file;
}

// ─── Subcomponentes de UI ──────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 rounded-full bg-[#1a6fc4]" />
      <h3 className="text-sm font-bold uppercase tracking-widest text-[#1a4d8f]">{children}</h3>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-[#3a5a8a] mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function StyledTextarea({
  rows = 3,
  value,
  onChange,
  placeholder,
}: {
  rows?: number;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#c8ddf0] bg-white text-[#0f2744] text-sm focus:outline-none focus:border-[#1a6fc4] focus:ring-2 focus:ring-[#1a6fc4]/20 transition placeholder:text-[#94afc8] resize-none"
    />
  );
}

// ─── Badge de estado ──────────────────────────────────────────────────────

const estadoBadge: Record<EstadoActivo, { bg: string; text: string; dot: string; label: string }> = {
  PENDIENTE: {
    bg: 'bg-[#f0f4fa] border border-[#c8d8ef]',
    text: 'text-[#3a5a8a]',
    dot: 'bg-[#7aa3cc]',
    label: 'Pendiente',
  },
  EN_PROCESO: {
    bg: 'bg-[#fff8e6] border border-[#f5d77a]',
    text: 'text-[#7a5a00]',
    dot: 'bg-[#f0b429]',
    label: 'En proceso',
  },
  COMPLETADO: {
    bg: 'bg-[#e6f7f0] border border-[#7dd3af]',
    text: 'text-[#0d5c39]',
    dot: 'bg-[#22c47a]',
    label: 'Completado',
  },
};

function EstadoBadge({ estado }: { estado: EstadoActivo }) {
  const s = estadoBadge[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function EjecucionMantenimientoView({ context, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [statusByAsset, setStatusByAsset] = useState<Record<string, EstadoActivo>>({});
  const [draftByAsset, setDraftByAsset] = useState<Record<string, MantenimientoDraft>>({});
  const [activeAsset, setActiveAsset] = useState<AssetRow | null>(null);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [showRegisterAssetModal, setShowRegisterAssetModal] = useState(false);
  const [showEditComponentsModal, setShowEditComponentsModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; nombre: string; codigo?: string }>>([]);

  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [inventarioResp, areasResp, categoriasResp, groupsResp] = await Promise.all([
          getInventarioBySede(context.empresaId, context.sedeId),
          getAreasByEmpresa(context.empresaId),
          getCategorias(),
          axiosClient.get('/api/gestion-grupos-categorias'),
        ]);

        if (!mounted) return;

        const assetsData = toArray<Record<string, unknown>>(inventarioResp).map(mapAsset);
        setAssets(assetsData);

        setStatusByAsset(
          assetsData.reduce<Record<string, EstadoActivo>>((acc, asset) => {
            acc[asset.id] = 'PENDIENTE';
            return acc;
          }, {})
        );

        const parsedAreas = toArray<Record<string, unknown>>(areasResp) as AreaItem[];
        setAreas(parsedAreas);

        setCategories(Array.isArray(categoriasResp) ? categoriasResp : []);

        const groupsData = Array.isArray(groupsResp?.data)
          ? groupsResp.data
          : Array.isArray(groupsResp?.data?.data)
          ? groupsResp.data.data
          : [];

        const mappedGroups = groupsData
          .filter((group: Record<string, unknown>) => group.activo !== false)
          .map((group: Record<string, unknown>) => ({
            id: String(group.id ?? group._id ?? group.uuid ?? ''),
            nombre: String(group.nombre ?? ''),
            codigo: String(group.codigo ?? ''),
          }));

        setGroups(mappedGroups);
      } catch {
        if (!mounted) return;
        setErrorMessage('No se pudo cargar la lista de activos para la sede seleccionada.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [context.empresaId, context.sedeId]);

  const totalActivos = assets.length;
  const completados = useMemo(
    () => Object.values(statusByAsset).filter((state) => state === 'COMPLETADO').length,
    [statusByAsset]
  );

  const progreso = totalActivos === 0 ? 0 : Math.round((completados / totalActivos) * 100);

  const activeDraft = activeAsset ? draftByAsset[activeAsset.id] || buildEmptyDraft() : buildEmptyDraft();
  const tecnicoFirmaNombre = context.tecnicos[0]?.nombre || getCurrentUserName() || 'Tecnico asignado';
  const usuarioFirmaNombre = activeAsset?.usuarioCompleto || activeAsset?.usuario || 'Usuario asignado';

  const openExecutionModal = (asset: AssetRow) => {
    setActiveAsset(asset);
    setShowExecutionModal(true);
    setStatusByAsset((prev) => ({
      ...prev,
      [asset.id]: prev[asset.id] === 'COMPLETADO' ? 'COMPLETADO' : 'EN_PROCESO',
    }));
  };

  const updateActiveDraft = (patch: Partial<MantenimientoDraft>) => {
    if (!activeAsset) return;
    const current = draftByAsset[activeAsset.id] || buildEmptyDraft();
    setDraftByAsset((prev) => ({
      ...prev,
      [activeAsset.id]: { ...current, ...patch },
    }));
  };

  const updateChecklist = (key: string, patch: Partial<ChecklistRow>) => {
    if (!activeAsset) return;
    const current = draftByAsset[activeAsset.id] || buildEmptyDraft();

    const nextChecklist = current.checklist.map((item) => {
      if (item.key !== key) return item;
      return { ...item, ...patch };
    });

    setDraftByAsset((prev) => ({
      ...prev,
      [activeAsset.id]: {
        ...current,
        checklist: nextChecklist,
      },
    }));
  };

  const handleEvidenceChange = async (kind: 'ANTES' | 'DESPUES', file: File | null) => {
    if (!file) return;
    const compressed = await compressImageIfNeeded(file);
    if (kind === 'ANTES') {
      updateActiveDraft({ evidenciaAntes: compressed });
    } else {
      updateActiveDraft({ evidenciaDespues: compressed });
    }
  };

  const validateDraft = (draft: MantenimientoDraft): string | null => {
    if (!draft.diagnostico.trim()) return 'El diagnostico es obligatorio.';
    if (!draft.trabajoRealizado.trim()) return 'El trabajo realizado es obligatorio.';
    if (!draft.recomendaciones.trim()) return 'Las recomendaciones son obligatorias.';
    if (!draft.evidenciaAntes) return 'La imagen ANTES es obligatoria.';
    if (!draft.evidenciaDespues) return 'La imagen DESPUES es obligatoria.';

    const unanswered = draft.checklist.some((item) => item.value === null);
    if (unanswered) return 'Debes responder todo el checklist.';

    const invalidComment = draft.checklist.some(
      (item) => item.value === 'NO' && !item.comentario.trim()
    );
    if (invalidComment) return 'Cada item marcado en NO requiere comentario obligatorio.';

    if (draft.firmaTecnicoModo === 'TRAZAR' && !draft.firmaTecnico) {
      return 'La firma del tecnico es obligatoria en modo trazar.';
    }
    if (draft.firmaUsuarioModo === 'TRAZAR' && !draft.firmaUsuario) {
      return 'La firma del usuario asignado es obligatoria en modo trazar.';
    }

    return null;
  };

  const handleSaveAssetExecution = () => {
    if (!activeAsset) return;

    const draft = draftByAsset[activeAsset.id] || buildEmptyDraft();
    const validation = validateDraft(draft);

    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setErrorMessage(null);
    setStatusByAsset((prev) => ({ ...prev, [activeAsset.id]: 'COMPLETADO' }));
    setShowExecutionModal(false);
  };

  const handleOpenComponentsEdit = () => {
    if (!activeAsset) return;

    setSelectedAssetForEdit({
      ...activeAsset.raw,
      empresa_id: context.empresaId,
      sede_id: context.sedeId,
      empresaNombre: context.empresaNombre,
      sedeNombre: context.sedeNombre,
      _areasDisponibles: areas,
    });
    setShowEditComponentsModal(true);
  };

  return (
    <div className="space-y-5 font-[system-ui,sans-serif]">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-[#bdd7f0]">
        {/* Franja superior azul navy */}
        <div className="bg-[#0f2d5e] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7eb8e8] mb-0.5">
              Módulo de Mantenimiento
            </p>
            <h2 className="text-xl font-extrabold text-white leading-tight">
              Ejecución de Mantenimiento
            </h2>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4a7ab5] text-[#a8ccf0] hover:bg-[#1a3d6e] hover:text-white font-semibold text-sm transition"
          >
            ← Volver al calendario
          </button>
        </div>

        {/* Metadatos de la orden */}
        <div className="bg-white px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#daeaf8]">
          {[
            { label: 'Empresa', value: context.empresaNombre },
            { label: 'Sede', value: context.sedeNombre },
            { label: 'Fecha', value: context.fecha || 'Sin fecha' },
            {
              label: 'Técnicos asignados',
              value: context.tecnicos.length > 0
                ? context.tecnicos.map((t) => t.nombre).join(', ')
                : 'Sin técnicos',
            },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a80a8]">{label}</p>
              <p className="text-sm font-bold text-[#0f2744] leading-snug">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROGRESO ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#bdd7f0] shadow-md px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a80a8] mb-0.5">
              Indicador general
            </p>
            <h3 className="text-base font-extrabold text-[#0f2744]">Progreso de Mantenimiento</h3>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-[#1a6fc4]">{progreso}%</span>
            <p className="text-xs text-[#5a80a8] font-semibold">{completados} de {totalActivos} activos</p>
          </div>
        </div>

        {/* Barra */}
        <div className="w-full h-2.5 rounded-full bg-[#e4eef8]">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${progreso}%`,
              background: 'linear-gradient(90deg, #1a6fc4 0%, #38bdf8 100%)',
            }}
          />
        </div>

        {/* Pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e8f1fb] text-[#1a4d8f] border border-[#bdd7f0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4a90d9]" />
            Total: {totalActivos}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f7f0] text-[#0d5c39] border border-[#7dd3af]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c47a]" />
            Completados: {completados}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fff8e6] text-[#7a5a00] border border-[#f5d77a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429]" />
            Pendientes: {totalActivos - completados}
          </span>
        </div>
      </div>

      {/* ── TABLA ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#bdd7f0] shadow-md overflow-hidden">
        {/* Header tabla */}
        <div className="px-6 py-4 border-b border-[#daeaf8] bg-[#f4f8fd] flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a80a8] mb-0.5">Inventario</p>
            <h3 className="text-base font-extrabold text-[#0f2744]">Tabla de Activos</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowRegisterAssetModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a6fc4] text-white text-sm font-bold hover:bg-[#145faa] shadow transition"
          >
            + Agregar activo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#f0f6fd] border-b border-[#daeaf8]">
                {['Código', 'Equipo', 'Usuario', 'Estado', 'Acción'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 font-bold text-[11px] uppercase tracking-widest text-[#3a5a8a] ${
                      i === 4 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf2fb]">
              {assets.map((asset) => {
                const estado = statusByAsset[asset.id] || 'PENDIENTE';
                return (
                  <tr key={asset.id} className="hover:bg-[#f7faff] transition">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-[#1a4d8f] bg-[#e8f1fb] px-2 py-0.5 rounded-md text-xs">
                        {asset.codigo}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#0f2744]">{asset.equipo}</td>
                    <td className="px-5 py-3.5 text-[#3a5a8a]">{asset.usuario}</td>
                    <td className="px-5 py-3.5">
                      <EstadoBadge estado={estado} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openExecutionModal(asset)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition ${
                          estado === 'COMPLETADO'
                            ? 'bg-[#e8f1fb] text-[#1a4d8f] hover:bg-[#d0e4f7] border border-[#bdd7f0]'
                            : 'bg-[#1a6fc4] text-white hover:bg-[#145faa]'
                        }`}
                      >
                        {estado === 'COMPLETADO' ? 'Ver detalle' : 'Iniciar'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-[#5a80a8] font-semibold text-sm">No hay activos registrados en esta sede.</p>
                    <p className="text-[#94afc8] text-xs mt-1">Usa "Agregar activo" para continuar.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botón reprogramar */}
      {completados < totalActivos && (
        <div className="flex justify-end">
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-white border-2 border-[#1a6fc4] text-[#1a4d8f] text-sm font-bold hover:bg-[#e8f1fb] transition shadow-sm"
          >
            Reprogramar activos pendientes
          </button>
        </div>
      )}

      {/* Error global */}
      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-3.5 flex items-start gap-3">
          <span className="text-red-500 text-lg mt-0.5">⚠</span>
          <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-[#5a80a8] font-semibold">
          <span className="w-4 h-4 rounded-full border-2 border-[#1a6fc4] border-t-transparent animate-spin" />
          Cargando activos y configuraciones...
        </div>
      )}

      {/* ── MODAL EJECUCION ─────────────────────────────────────────── */}
      {showExecutionModal && activeAsset && (
        <div className="fixed inset-0 z-50 bg-[#0f2d5e]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col border border-[#bdd7f0]">

            {/* Modal header */}
            <div className="bg-[#0f2d5e] px-6 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7eb8e8] mb-0.5">
                  Formulario de ejecución
                </p>
                <h4 className="text-lg font-extrabold text-white leading-tight">
                  {activeAsset.equipo}
                </h4>
                <p className="text-xs text-[#a8ccf0] mt-0.5">
                  <span className="font-mono bg-[#1a3d6e] px-1.5 py-0.5 rounded text-[11px] mr-2">
                    {activeAsset.codigo}
                  </span>
                  {activeAsset.usuario}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExecutionModal(false)}
                className="text-[#a8ccf0] hover:text-white text-xl font-bold leading-none mt-1 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-7 overflow-y-auto bg-[#f7faff]">

              {/* Sección: Diagnóstico */}
              <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                <SectionTitle>Informe técnico</SectionTitle>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Diagnóstico</FieldLabel>
                    <StyledTextarea
                      rows={3}
                      value={activeDraft.diagnostico}
                      onChange={(e) => updateActiveDraft({ diagnostico: e.target.value })}
                      placeholder="Describe el diagnóstico del equipo..."
                    />
                  </div>
                  <div>
                    <FieldLabel required>Trabajo realizado</FieldLabel>
                    <StyledTextarea
                      rows={3}
                      value={activeDraft.trabajoRealizado}
                      onChange={(e) => updateActiveDraft({ trabajoRealizado: e.target.value })}
                      placeholder="Detalla las tareas realizadas..."
                    />
                  </div>
                  <div>
                    <FieldLabel required>Recomendaciones</FieldLabel>
                    <StyledTextarea
                      rows={3}
                      value={activeDraft.recomendaciones}
                      onChange={(e) => updateActiveDraft({ recomendaciones: e.target.value })}
                      placeholder="Indica recomendaciones para el usuario o próximo mantenimiento..."
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Cambio de componentes */}
              <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                <SectionTitle>Cambio de componentes</SectionTitle>
                <p className="text-sm font-semibold text-[#0f2744] mb-3">
                  ¿Se realizó algún cambio de componente?
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {(['NO', 'SI'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateActiveDraft({ cambioComponentes: opt })}
                      className={`px-5 py-2 rounded-xl text-sm font-bold border-2 transition ${
                        activeDraft.cambioComponentes === opt
                          ? opt === 'SI'
                            ? 'bg-[#1a6fc4] text-white border-[#1a6fc4]'
                            : 'bg-[#0f2d5e] text-white border-[#0f2d5e]'
                          : 'bg-white text-[#3a5a8a] border-[#c8ddf0] hover:border-[#1a6fc4]'
                      }`}
                    >
                      {opt === 'NO' ? 'No' : 'Sí'}
                    </button>
                  ))}
                  {activeDraft.cambioComponentes === 'SI' && (
                    <button
                      type="button"
                      onClick={handleOpenComponentsEdit}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-[#fff8e6] text-[#7a5a00] border-2 border-[#f5d77a] hover:bg-[#fef0c0] transition"
                    >
                      Editar componentes del activo
                    </button>
                  )}
                </div>
              </div>

              {/* Sección: Evidencias */}
              <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                <SectionTitle>Evidencias fotográficas</SectionTitle>
                <p className="text-xs text-[#5a80a8] font-semibold mb-4">
                  Obligatorio · Máximo 2 MB por imagen
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {(['ANTES', 'DESPUES'] as const).map((kind) => {
                    const file = kind === 'ANTES' ? activeDraft.evidenciaAntes : activeDraft.evidenciaDespues;
                    return (
                      <div key={kind} className="rounded-xl border-2 border-dashed border-[#bdd7f0] bg-[#f4f8fd] p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#1a4d8f] mb-2">
                          Imagen {kind}
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleEvidenceChange(kind, e.target.files?.[0] || null)}
                          className="w-full text-xs text-[#3a5a8a] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1a6fc4] file:text-white hover:file:bg-[#145faa] cursor-pointer"
                        />
                        {file && (
                          <p className="mt-2 text-xs text-[#0d5c39] font-semibold flex items-center gap-1">
                            <span>✓</span> {file.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sección: Checklist */}
              <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                <SectionTitle>Checklist de mantenimiento</SectionTitle>
                <div className="space-y-2">
                  {activeDraft.checklist.map((item, idx) => (
                    <div
                      key={item.key}
                      className={`rounded-xl border p-3.5 transition ${
                        item.value === 'SI'
                          ? 'border-[#7dd3af] bg-[#f0fbf6]'
                          : item.value === 'NO'
                          ? 'border-[#f9a8a8] bg-[#fff5f5]'
                          : 'border-[#daeaf8] bg-[#f7faff]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-[#94afc8] w-5 text-right">{idx + 1}</span>
                          <p className="text-sm font-semibold text-[#0f2744]">{item.label}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {(['SI', 'NO'] as const).map((opt) => (
                            <label
                              key={opt}
                              className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold select-none ${
                                opt === 'SI' ? 'text-[#0d5c39]' : 'text-[#b91c1c]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={item.value === opt}
                                onChange={() =>
                                  updateChecklist(item.key, {
                                    value: item.value === opt ? null : opt,
                                    ...(opt === 'SI' ? { comentario: '' } : {}),
                                  })
                                }
                                className="w-4 h-4 rounded accent-current"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>

                      {item.value === 'NO' && (
                        <div className="mt-3">
                          <FieldLabel required>Comentario obligatorio</FieldLabel>
                          <textarea
                            rows={2}
                            value={item.comentario}
                            onChange={(e) => updateChecklist(item.key, { comentario: e.target.value })}
                            placeholder="Explica el motivo o falla encontrada..."
                            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#f9a8a8] bg-white text-[#0f2744] text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 transition placeholder:text-[#d4a0a0] resize-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección: Observaciones */}
              <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                <SectionTitle>Observaciones generales</SectionTitle>
                <StyledTextarea
                  rows={3}
                  value={activeDraft.observaciones}
                  onChange={(e) => updateActiveDraft({ observaciones: e.target.value })}
                  placeholder="Notas adicionales, condiciones del entorno, acuerdos con el usuario..."
                />
              </div>

              {/* Sección: Firmas */}
              <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                <SectionTitle>Firmas de conformidad</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      label: 'Firma del Técnico',
                      nombre: tecnicoFirmaNombre,
                      modo: activeDraft.firmaTecnicoModo,
                      setModo: (m: 'AUTO' | 'TRAZAR') => updateActiveDraft({ firmaTecnicoModo: m }),
                      firmaValue: activeDraft.firmaTecnico,
                      onFirma: (v: string) => updateActiveDraft({ firmaTecnico: v }),
                    },
                    {
                      label: 'Firma del Usuario',
                      nombre: usuarioFirmaNombre,
                      modo: activeDraft.firmaUsuarioModo,
                      setModo: (m: 'AUTO' | 'TRAZAR') => updateActiveDraft({ firmaUsuarioModo: m }),
                      firmaValue: activeDraft.firmaUsuario,
                      onFirma: (v: string) => updateActiveDraft({ firmaUsuario: v }),
                    },
                  ].map(({ label, nombre, modo, setModo, firmaValue, onFirma }) => (
                    <div key={label} className="space-y-3">
                      <FieldLabel>{label}</FieldLabel>
                      {/* Nombre */}
                      <input
                        type="text"
                        value={nombre}
                        readOnly
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#c8ddf0] bg-[#f0f6fd] text-[#0f2744] text-sm font-semibold"
                      />
                      {/* Toggle modo */}
                      <div className="inline-flex rounded-xl border-2 border-[#c8ddf0] bg-[#f0f6fd] p-0.5 gap-0.5">
                        {(['AUTO', 'TRAZAR'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModo(m)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                              modo === m
                                ? 'bg-[#1a6fc4] text-white shadow'
                                : 'text-[#3a5a8a] hover:text-[#1a4d8f]'
                            }`}
                          >
                            {m === 'AUTO' ? 'Automática' : 'Trazar'}
                          </button>
                        ))}
                      </div>
                      {/* Canvas / cursiva */}
                      {modo === 'AUTO' ? (
                        <div className="h-32 rounded-xl border-2 border-[#c8ddf0] bg-white flex items-center px-5 overflow-hidden">
                          <p
                            className="text-[#0f2744] w-full whitespace-nowrap overflow-hidden text-ellipsis"
                            style={{
                              fontFamily: '"Segoe Script", "Brush Script MT", cursive',
                              fontSize: getAutoSignatureFontSize(nombre),
                              lineHeight: 1,
                              letterSpacing: '0.01em',
                            }}
                          >
                            {nombre}
                          </p>
                        </div>
                      ) : (
                        <SignaturePad value={firmaValue} onChange={onFirma} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#daeaf8] bg-white flex items-center justify-between gap-3">
              {errorMessage && (
                <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                  <span>⚠</span> {errorMessage}
                </p>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowExecutionModal(false)}
                  className="px-5 py-2.5 rounded-xl border-2 border-[#c8ddf0] text-[#3a5a8a] text-sm font-bold hover:bg-[#f0f6fd] transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssetExecution}
                  className="px-6 py-2.5 rounded-xl bg-[#1a6fc4] text-white text-sm font-bold hover:bg-[#145faa] shadow-md transition"
                >
                  Guardar ejecución
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales de activo */}
      {showRegisterAssetModal && (
        <RegisterAssetModal
          isOpen={showRegisterAssetModal}
          onClose={() => setShowRegisterAssetModal(false)}
          empresaId={context.empresaId}
          sedeId={context.sedeId}
          empresaNombre={context.empresaNombre}
          sedeNombre={context.sedeNombre}
          areas={areas}
          categories={categories}
          groups={groups}
          onSuccess={(newAsset) => {
            const mapped = mapAsset(newAsset);
            setAssets((prev) => [mapped, ...prev]);
            setStatusByAsset((prev) => ({ ...prev, [mapped.id]: 'PENDIENTE' }));
            setShowRegisterAssetModal(false);
          }}
        />
      )}

      {showEditComponentsModal && selectedAssetForEdit && (
        <RegisterAssetModal
          key={String(selectedAssetForEdit.id ?? selectedAssetForEdit._id ?? selectedAssetForEdit.assetId ?? 'edit')}
          isOpen={showEditComponentsModal}
          onClose={() => {
            setShowEditComponentsModal(false);
            setSelectedAssetForEdit(null);
          }}
          initialTab="personalizados"
          lockToTab="personalizados"
          editingAsset={selectedAssetForEdit}
          empresaId={context.empresaId}
          sedeId={context.sedeId}
          empresaNombre={context.empresaNombre}
          sedeNombre={context.sedeNombre}
          areas={areas}
          categories={categories}
          groups={groups}
          onSuccess={(updatedAsset) => {
            const mapped = mapAsset(updatedAsset);
            setAssets((prev) => prev.map((asset) => (asset.id === mapped.id ? mapped : asset)));
            setShowEditComponentsModal(false);
            setSelectedAssetForEdit(null);
          }}
        />
      )}
    </div>
  );
}