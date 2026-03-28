import { useEffect, useMemo, useRef, useState } from 'react';
import { getUsuariosByEmpresa, type Usuario } from '@/modules/usuarios/services/usuariosService';
import axiosClient from '@/api/axiosClient';
import RegisterAssetModal from '@/modules/inventario/components/RegisterAssetModal';
import { getAreasByEmpresa } from '@/modules/inventario/services/areasService';
import { getCategorias, type Category } from '@/modules/inventario/services/categoriasService';
import { getInventarioBySede } from '@/modules/inventario/services/inventarioService';
import { getActivoExecution, saveActivoExecution, finalizarMantenimiento, getMantenimientoPreventivoById } from '../services/mantenimientosPreventivosService';
import { htmlToPdfBase64 } from '@/modules/visitas/services/pdfService';
import { generateMantenimientoReportHtml, type ActivoReportData } from '../utils/mantenimientoReportTemplate';
import { listPreguntas, type ChecklistQuestion } from '@/modules/inventario/services/checklistService';

type TecnicoInfo = {
  id: string;
  nombre: string;
};

type MantenimientoContext = {
  mantenimientoId?: string;
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

type ChecklistValue = 'SI' | 'NO' | string | null;

type ChecklistRow = {
  key: string;
  label: string;
  value: ChecklistValue;
  comentario: string;
  tipo?: string;
  opciones?: string[];
};

type MantenimientoDraft = {
  diagnostico: string;
  trabajoRealizado: string;
  recomendaciones: string;
  cambioComponentes: 'NO' | 'SI';
  evidenciaAntes: File | string | null; // string = base64 tras guardar
  evidenciaDespues: File | string | null;
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
  { key: 'limpieza', label: 'Limpieza fisica del equipo', value: null, comentario: '', tipo: 'si_no' },
  { key: 'pasta', label: 'Cambio de pasta termica', value: null, comentario: '', tipo: 'si_no' },
  { key: 'software', label: 'Actualizacion de software', value: null, comentario: '', tipo: 'si_no' },
  { key: 'almacenamiento', label: 'Revision de almacenamiento', value: null, comentario: '', tipo: 'si_no' },
  { key: 'rendimiento', label: 'Verificacion de rendimiento', value: null, comentario: '', tipo: 'si_no' },
  { key: 'cables', label: 'Estado de cables', value: null, comentario: '', tipo: 'si_no' },
  { key: 'discos', label: 'Estado de discos', value: null, comentario: '', tipo: 'si_no' },
  { key: 'temperatura', label: 'Monitoreo de temperatura', value: null, comentario: '', tipo: 'si_no' },
  { key: 'antivirus', label: 'Antivirus actualizado', value: null, comentario: '', tipo: 'si_no' },
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

function getCurrentUserIdentity(): { id: string; nombre: string; email: string } {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return { id: '', nombre: '', email: '' };

    const user = JSON.parse(raw) as Record<string, unknown>;
    const id = String(user.id ?? user.userId ?? user.usuarioId ?? user._id ?? '').trim();
    const nombre = String(user.nombreCompleto ?? user.nombre ?? user.name ?? '').trim();
    const email = String(user.email ?? user.correo ?? user.mail ?? '').trim();

    return { id, nombre, email };
  } catch {
    return { id: '', nombre: '', email: '' };
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

function normalizeChecklistValue(value: unknown): ChecklistValue {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  if (normalized === 'SI' || normalized === 'S' || normalized === 'TRUE') return 'SI';
  if (normalized === 'NO' || normalized === 'N' || normalized === 'FALSE') return 'NO';
  return null;
}

function buildDraftFromExecutionData(raw: unknown): MantenimientoDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;

  const base = buildEmptyDraft();

  const diagnostico = getStringField(source, ['diagnostico']);
  const trabajoRealizado = getStringField(source, ['trabajoRealizado', 'trabajo_realizado']);
  const recomendaciones = getStringField(source, ['recomendaciones']);
  const observaciones = getStringField(source, ['observaciones']);

  const evidenciaAntes = getStringField(source, ['evidenciaAntes', 'evidencia_antes']);
  const evidenciaDespues = getStringField(source, ['evidenciaDespues', 'evidencia_despues']);

  const firmaTecnicoTipo = getStringField(source, ['firmaTecnicoTipo', 'firma_tecnico_tipo']).toUpperCase();
  const firmaUsuarioTipo = getStringField(source, ['firmaUsuarioTipo', 'firma_usuario_tipo']).toUpperCase();
  const firmaTecnicoValor = getStringField(source, ['firmaTecnicoValor', 'firma_tecnico_valor']);
  const firmaUsuarioValor = getStringField(source, ['firmaUsuarioValor', 'firma_usuario_valor']);

  const cambioRaw = source.cambioComponentes ?? source.cambio_componentes;
  const cambioComponentes: 'NO' | 'SI' =
    String(cambioRaw ?? '')
      .trim()
      .toUpperCase() === 'SI' ||
    cambioRaw === true
      ? 'SI'
      : 'NO';

  const checklistRaw = Array.isArray(source.checklist) ? source.checklist : [];
  const checklistMap = new Map<string, ChecklistRow>();
  const checklistOrder: string[] = [];

  checklistRaw.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const item = row as Record<string, unknown>;
    const key = getStringField(item, ['key', 'itemKey', 'item_key']);
    if (!key) return;
    const label = getStringField(item, ['label']) || CHECKLIST_BASE.find((baseItem) => baseItem.key === key)?.label || key;
    const tipo = getStringField(item, ['tipo']) || (CHECKLIST_BASE.find((b) => b.key === key)?.tipo ?? 'si_no');
    const opciones = Array.isArray(item.opciones) ? (item.opciones as string[]) : [];
    // Normalizar valor según contenido: SI/NO se mantienen, otros textos se preservan
    const rawVal = item.estado ?? item.value;
    let normalizedValue: ChecklistValue = null;
    if (typeof rawVal === 'string') {
      const up = rawVal.trim().toUpperCase();
      if (up === 'SI' || up === 'S' || up === 'TRUE') normalizedValue = 'SI';
      else if (up === 'NO' || up === 'N' || up === 'FALSE') normalizedValue = 'NO';
      else normalizedValue = String(rawVal);
    }

    if (!checklistMap.has(key)) {
      checklistOrder.push(key);
    }

    checklistMap.set(key, {
      key,
      label,
      value: normalizedValue,
      comentario: getStringField(item, ['comentario', 'comment']),
      tipo,
      opciones,
    });
  });

  const checklist =
    checklistMap.size > 0
      ? checklistOrder.map((key) => checklistMap.get(key)).filter((item): item is ChecklistRow => Boolean(item))
      : CHECKLIST_BASE.map((baseRow) => ({ ...baseRow }));

  const hasMeaningfulData =
    Boolean(diagnostico) ||
    Boolean(trabajoRealizado) ||
    Boolean(recomendaciones) ||
    Boolean(observaciones) ||
    Boolean(evidenciaAntes) ||
    Boolean(evidenciaDespues) ||
    checklist.some((item) => item.value !== null || Boolean(item.comentario));

  if (!hasMeaningfulData) return null;

  return {
    ...base,
    diagnostico,
    trabajoRealizado,
    recomendaciones,
    observaciones,
    cambioComponentes,
    evidenciaAntes: evidenciaAntes || null,
    evidenciaDespues: evidenciaDespues || null,
    checklist,
    firmaTecnicoModo: firmaTecnicoTipo === 'TRAZAR' ? 'TRAZAR' : 'AUTO',
    firmaUsuarioModo: firmaUsuarioTipo === 'TRAZAR' ? 'TRAZAR' : 'AUTO',
    firmaTecnico: firmaTecnicoValor,
    firmaUsuario: firmaUsuarioValor,
  };
}

function getDraftStorageKey(mantenimientoId: string, activoId: string): string {
  return `mp:ejecucion:draft:${mantenimientoId}:${activoId}`;
}

function getDraftFallbackStorageKey(scopeKey: string, activoId: string): string {
  return `mp:ejecucion:draft:fallback:${scopeKey}:${activoId}`;
}

function saveDraftSnapshot(
  mantenimientoId: string | undefined,
  scopeKey: string,
  activoId: string,
  draft: MantenimientoDraft
): void {
  const beforeAsString = typeof draft.evidenciaAntes === 'string' ? draft.evidenciaAntes : '';
  const afterAsString = typeof draft.evidenciaDespues === 'string' ? draft.evidenciaDespues : '';

  const isHeavyDataUrl = (value: string): boolean => {
    if (!value) return false;
    return value.startsWith('data:image/') && value.length > 64 * 1024;
  };

  const payload: MantenimientoDraft = {
    ...draft,
    // Evita romper localStorage por payloads base64 grandes; conserva URLs/valores livianos.
    evidenciaAntes: beforeAsString && !isHeavyDataUrl(beforeAsString) ? beforeAsString : null,
    evidenciaDespues: afterAsString && !isHeavyDataUrl(afterAsString) ? afterAsString : null,
  };

  try {
    if (mantenimientoId) {
      localStorage.setItem(getDraftStorageKey(mantenimientoId, activoId), JSON.stringify(payload));
    }
    localStorage.setItem(getDraftFallbackStorageKey(scopeKey, activoId), JSON.stringify(payload));
  } catch {
    // no-op: almacenamiento local opcional
  }
}

function loadDraftSnapshot(
  mantenimientoId: string | undefined,
  scopeKey: string,
  activoId: string
): MantenimientoDraft | null {
  try {
    const candidateKeys = [
      ...(mantenimientoId ? [getDraftStorageKey(mantenimientoId, activoId)] : []),
      getDraftFallbackStorageKey(scopeKey, activoId),
    ];

    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      const draft = buildDraftFromExecutionData(parsed);
      if (draft) return draft;
    }

    // Compatibilidad: busca snapshots antiguos por activo sin depender del mantenimiento actual.
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith('mp:ejecucion:draft:')) continue;
      if (!key.endsWith(`:${activoId}`)) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      const draft = buildDraftFromExecutionData(parsed);
      if (draft) return draft;
    }

    return null;
  } catch {
    return null;
  }
}

function clearDraftSnapshot(mantenimientoId: string | undefined, scopeKey: string, activoId: string): void {
  try {
    if (mantenimientoId) {
      localStorage.removeItem(getDraftStorageKey(mantenimientoId, activoId));
    }
    localStorage.removeItem(getDraftFallbackStorageKey(scopeKey, activoId));
  } catch {
    // no-op
  }
}

function clearLegacyDraftSnapshots(activoId: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith('mp:ejecucion:draft:')) continue;
      if (!key.endsWith(`:${activoId}`)) continue;
      keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // no-op
  }
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
  const [savingAsset, setSavingAsset] = useState<string | null>(null);
  const [pdfUrlByAsset, setPdfUrlByAsset] = useState<Record<string, string>>({});
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeUsuarios, setFinalizeUsuarios] = useState<Usuario[]>([]);
  const [selectedUsuarioEncargado, setSelectedUsuarioEncargado] = useState<string>('');
  const [encargadoSearch, setEncargadoSearch] = useState<string>('');
  const [encargadoDropdownOpen, setEncargadoDropdownOpen] = useState<boolean>(false);
  const [firmaModoFinalizar, setFirmaModoFinalizar] = useState<'AUTO'|'TRAZAR'>('AUTO');
  const [firmaFinalizar, setFirmaFinalizar] = useState<string>('');
  const [reprogramacionFecha, setReprogramacionFecha] = useState<string>('');
  const [motivoNoAtendidos, setMotivoNoAtendidos] = useState<string>('');
  const [finalizando, setFinalizando] = useState(false);
  const [finalizadoExito, setFinalizadoExito] = useState(false);
  const [estadoMantenimiento, setEstadoMantenimiento] = useState<string>('EN_PROCESO');

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

        // Prefetch execution status for each asset so UI reflects backend state after reload
        if (context.mantenimientoId) {
          try {
            const settled = await Promise.allSettled(
              assetsData.map((asset) => getActivoExecution(context.mantenimientoId as string, asset.id))
            );

            const nextStatus: Record<string, EstadoActivo> = {};
            for (let i = 0; i < settled.length; i += 1) {
              const asset = assetsData[i];
              const res = settled[i];
              if (res.status === 'fulfilled' && res.value) {
                const existing = res.value;
                const backendEstado = String(existing?.estado ?? '').trim().toUpperCase();
                const completedEstados = new Set(['COMPLETADO', 'EJECUTADO', 'FINALIZADO', 'CERRADO']);

                if (existing?.ejecucionId) {
                  if (completedEstados.has(backendEstado)) {
                    nextStatus[asset.id] = 'COMPLETADO';
                  } else {
                    nextStatus[asset.id] = 'EN_PROCESO';
                  }
                }
              }
            }

            if (Object.keys(nextStatus).length > 0) {
              setStatusByAsset((prev) => ({ ...prev, ...nextStatus }));
            }
          } catch (e) {
            // don't block UI on prefetch errors
            console.warn('No se pudo precargar estado de ejecuciones:', e);
          }
          // Also fetch maintenance header to know if it's already finalized
          try {
            const full = await getMantenimientoPreventivoById(context.mantenimientoId as string);
            if (full && mounted) {
              const backendEstado = String((full as any).estado ?? (full as any).status ?? '').toUpperCase();
              setEstadoMantenimiento(backendEstado || 'EN_PROCESO');

              // Debug: log backend header state for troubleshooting visibility of finalize button
              try {
                // eslint-disable-next-line no-console
                console.debug('[EjecucionMantenimiento] loaded maintenance header', { mantenimientoId: context.mantenimientoId, backendEstado });
              } catch (e) {}

              // If backend already finalized or sent for client signature, mark as finished to hide finalization UI
              const finishedSet = new Set(['FINALIZADO', 'PENDIENTE_FIRMA', 'EJECUTADO']);
              if (finishedSet.has(backendEstado)) {
                setFinalizadoExito(true);
              }
            }
          } catch (err) {
            // ignore; not critical
          }
        }

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

  const atendidosCount = completados;
  const noAtendidosCount = totalActivos - completados;

  const activeDraft = activeAsset ? draftByAsset[activeAsset.id] || buildEmptyDraft() : buildEmptyDraft();
  const currentUserIdentity = getCurrentUserIdentity();
  const tecnicoPrincipal = context.tecnicos[0];
  const tecnicoFirmaNombre = tecnicoPrincipal?.nombre || currentUserIdentity.nombre || getCurrentUserName() || 'Tecnico';
  const tecnicoEmail =
    currentUserIdentity.email ||
    (tecnicoFirmaNombre && !tecnicoFirmaNombre.toLowerCase().includes('tecnico')
      ? `${tecnicoFirmaNombre.split(' ').join('.').toLowerCase()}@intiscorp.com`
      : 'soporte@intiscorp.com');
  const usuarioFirmaNombre = activeAsset?.usuarioCompleto || activeAsset?.usuario || 'Usuario asignado';
  const usuarioEmail =
    (activeAsset?.raw as Record<string, unknown> | undefined)?.usuario_email?.toString() ||
    (activeAsset?.raw as Record<string, unknown> | undefined)?.usuarioEmail?.toString() ||
    'usuario@intiscorp.com';
  const snapshotScopeKey = `${context.empresaId}:${context.sedeId}`;

  const openExecutionModal = async (asset: AssetRow) => {
    let isCompleted = statusByAsset[asset.id] === 'COMPLETADO';
    let loadedDraft: MantenimientoDraft | null = null;
    let canUseCachedDraft = true;

    const cachedDraft = loadDraftSnapshot(context.mantenimientoId, snapshotScopeKey, asset.id);
    if (cachedDraft) {
      // Si hay un draft local, cargarlo para continuar edición, pero NO marcar como completado.
      // Marcar el modal como solo lectura solo debe ocurrir cuando exista una ejecución ya persistida en el backend.
      setDraftByAsset((prev) => ({
        ...prev,
        [asset.id]: cachedDraft,
      }));
    }

    if (context.mantenimientoId) {
      try {
        const existing = await getActivoExecution(context.mantenimientoId, asset.id);

        if (!existing?.ejecucionId) {
          // Si no existe ejecución en backend, eliminar cualquier snapshot local obsoleto.
          clearDraftSnapshot(context.mantenimientoId, snapshotScopeKey, asset.id);
          clearLegacyDraftSnapshots(asset.id);
          canUseCachedDraft = false;
          setDraftByAsset((prev) => {
            if (!prev[asset.id]) return prev;
            const next = { ...prev };
            delete next[asset.id];
            return next;
          });
        }

        const backendEstado = String(existing?.estado ?? '')
          .trim()
          .toUpperCase();
        const completedEstados = new Set(['COMPLETADO', 'EJECUTADO', 'FINALIZADO', 'CERRADO']);
        const editableEstados = new Set(['EN_PROCESO', 'INICIADO', 'PENDIENTE', 'BORRADOR', 'DRAFT']);

        const mappedDraft = buildDraftFromExecutionData(existing);
        loadedDraft = mappedDraft;

        const shouldBeReadOnly = Boolean(existing?.ejecucionId) && (
          completedEstados.has(backendEstado) ||
          (!editableEstados.has(backendEstado) && Boolean(mappedDraft))
        );

        if (shouldBeReadOnly) {
          isCompleted = true;
          setStatusByAsset((prev) => ({
            ...prev,
            [asset.id]: 'COMPLETADO',
          }));
        }

        if (mappedDraft) {
          setDraftByAsset((prev) => ({
            ...prev,
            [asset.id]: mappedDraft,
          }));

          saveDraftSnapshot(context.mantenimientoId, snapshotScopeKey, asset.id, mappedDraft);
        }

        if (existing?.pdf?.url) {
          setPdfUrlByAsset((prev) => ({
            ...prev,
            [asset.id]: existing.pdf?.url || '',
          }));
        }
        // Additionally, check maintenance-level state to hide finalization if already finished
        try {
          const full = await getMantenimientoPreventivoById(context.mantenimientoId as string);
          if (full) {
            const backendEstado = String((full as any).estado ?? (full as any).status ?? '').toUpperCase();
            const finishedSet = new Set(['FINALIZADO', 'PENDIENTE_FIRMA', 'EJECUTADO']);
            if (finishedSet.has(backendEstado)) setFinalizadoExito(true);
            setEstadoMantenimiento(backendEstado || 'EN_PROCESO');
              try {
                // eslint-disable-next-line no-console
                console.debug('[EjecucionMantenimiento] modal fetched maintenance header', { mantenimientoId: context.mantenimientoId, backendEstado, willSetFinalizado: finishedSet.has(backendEstado) });
              } catch (e) {}
          }
        } catch (e) {
          // ignore
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        setErrorMessage(err.message || 'No se pudo consultar la ejecución actual del activo.');
      }
    }

    // Cargar checklist según la categoría del activo
    try {
      // Determinar id de categoría posible en el raw del activo
      const raw = asset.raw || {};
      let categoriaId: number | null = null;

      // posibles keys donde puede venir la categoría
      const possibleKeys = ['categoriaId', 'categoria_id', 'categoriaIdNumber', 'categoriaIdNumber', 'categoryId', 'categoria'];
      for (const key of possibleKeys) {
        const v = (raw as Record<string, unknown>)[key];
        if (typeof v === 'number') {
          categoriaId = v;
          break;
        }
        if (typeof v === 'string' && /^\d+$/.test(v)) {
          categoriaId = Number(v);
          break;
        }
      }

      // Si no encontramos id numérico, intentar emparejar por nombre con las categorías cargadas
      if (categoriaId === null && raw && typeof (raw as Record<string, unknown>).categoria === 'string') {
        const name = String((raw as Record<string, unknown>).categoria).trim().toLowerCase();
        const found = categories.find((c) => String(c.nombre ?? '').trim().toLowerCase() === name);
        if (found && found.id) {
          const maybe = Number(found.id as unknown as string);
          if (!Number.isNaN(maybe)) categoriaId = maybe;
        }
      }

      // Si aún no hay categoría, omitimos la petición y usamos el checklist base
      let preguntas: ChecklistQuestion[] = [];
      if (categoriaId !== null) {
        preguntas = await listPreguntas({ categoriaId });
      }

      // Mapear preguntas al draft
      if (preguntas && preguntas.length > 0) {
        // Solo usar preguntas del backend, no mezclar con draft anterior ni CHECKLIST_BASE
        setDraftByAsset((prev) => {
          const newChecklist: ChecklistRow[] = preguntas.map((q) => ({
            key: q.id ? String(q.id) : q.pregunta.slice(0, 24).replace(/\s+/g, '_'),
            label: q.pregunta,
            value: q.tipo === 'si_no' ? null : '',
            comentario: '',
            tipo: q.tipo,
            opciones: Array.isArray(q.opciones) ? q.opciones : [],
          }));
          const currentDraft = prev[asset.id] || loadedDraft || (canUseCachedDraft ? cachedDraft : null) || buildEmptyDraft();
          return {
            ...prev,
            [asset.id]: { ...currentDraft, checklist: newChecklist },
          };
        });
      } else {
        // Si no hay preguntas, usar CHECKLIST_BASE
        setDraftByAsset((prev) => ({ ...prev, [asset.id]: prev[asset.id] || buildEmptyDraft() }));
      }
    } catch (err) {
      // no bloquear la apertura por error en checklist
      console.warn('No se pudo cargar checklist por categoria:', err);
    }

    setIsReadOnly(isCompleted);
    setActiveAsset(asset);
    setShowExecutionModal(true);
    if (!isCompleted) {
      setStatusByAsset((prev) => ({
        ...prev,
        [asset.id]: prev[asset.id] === 'COMPLETADO' ? 'COMPLETADO' : 'EN_PROCESO',
      }));
    }
  };

  const isMaintenanceFinalized = (() => {
    if (finalizadoExito) return true;
    const estadoNorm = String(estadoMantenimiento || '').toUpperCase();
    const finishedSet = new Set(['FINALIZADO', 'PENDIENTE_FIRMA', 'EJECUTADO']);
    if (finishedSet.has(estadoNorm)) return true;
    return false;
  })();

  try {
    // eslint-disable-next-line no-console
    console.debug('[EjecucionMantenimiento] finalized check', { isMaintenanceFinalized, finalizadoExito, estadoMantenimiento, totalActivos, completados, pdfUrls: Object.keys(pdfUrlByAsset) });
  } catch (e) {}

  const openFinalizeModal = async () => {
    setShowFinalizeModal(true);
    try {
      const usuarios = await getUsuariosByEmpresa(context.empresaId);
      setFinalizeUsuarios(Array.isArray(usuarios) ? usuarios : []);
    } catch (err) {
      setFinalizeUsuarios([]);
    }
  };

  const fileToDataUri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const generarFirmaAutomaticaDataUri = async (nombre: string): Promise<string> => {
    const text = nombre.trim() || 'Técnico';
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 260;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.18)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(44, 192);
    ctx.lineTo(canvas.width - 44, 192);
    ctx.stroke();
    let fontSize = 72;
    const maxTextWidth = canvas.width - 88;
    do {
      ctx.font = `italic ${fontSize}px "Segoe Script", "Brush Script MT", cursive`;
      if (ctx.measureText(text).width <= maxTextWidth || fontSize <= 36) break;
      fontSize -= 2;
    } while (fontSize >= 36);
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, 130);
    return canvas.toDataURL('image/png');
  };

  const handleFinalizarMantenimiento = async () => {
    // Validaciones
    if (completados === 0) {
      setErrorMessage('Debes completar al menos un activo antes de finalizar.');
      return;
    }

    if (noAtendidosCount > 0 && !motivoNoAtendidos.trim()) {
      setErrorMessage('Debes indicar el motivo por el que quedaron equipos sin atender.');
      return;
    }

    if (noAtendidosCount > 0 && !reprogramacionFecha) {
      setErrorMessage('Debes seleccionar una fecha de reprogramación para los equipos no atendidos.');
      return;
    }

    if (!selectedUsuarioEncargado) {
      setErrorMessage('Debes seleccionar un usuario para enviar la firma de conformidad.');
      return;
    }

    const selectedUser = finalizeUsuarios.find(
      (u) => String(u.id ?? u._id) === selectedUsuarioEncargado
    );
    if (!selectedUser) {
      setErrorMessage('Usuario seleccionado no válido.');
      return;
    }

    if (firmaModoFinalizar === 'TRAZAR' && !firmaFinalizar) {
      setErrorMessage('Debes trazar la firma del técnico para continuar.');
      return;
    }

    setErrorMessage(null);
    setFinalizando(true);

    try {
      // 1. Gather data from completed assets
      const activosAtendidos: ActivoReportData[] = [];
      const activosAtendidosIds: string[] = [];
      const activosNoAtendidosIds: string[] = [];

      for (const asset of assets) {
        const estado = statusByAsset[asset.id];
        if (estado === 'COMPLETADO') {
          activosAtendidosIds.push(asset.id);
          const draft = draftByAsset[asset.id];
          if (draft) {
            const evidAntes = draft.evidenciaAntes instanceof File
              ? await fileToDataUri(draft.evidenciaAntes)
              : (typeof draft.evidenciaAntes === 'string' ? draft.evidenciaAntes : undefined);
            const evidDespues = draft.evidenciaDespues instanceof File
              ? await fileToDataUri(draft.evidenciaDespues)
              : (typeof draft.evidenciaDespues === 'string' ? draft.evidenciaDespues : undefined);

            activosAtendidos.push({
              codigo: asset.codigo,
              equipo: asset.equipo,
              usuario: asset.usuario,
              diagnostico: draft.diagnostico,
              trabajoRealizado: draft.trabajoRealizado,
              recomendaciones: draft.recomendaciones,
              observaciones: draft.observaciones,
              cambioComponentes: draft.cambioComponentes === 'SI',
              checklist: draft.checklist.map((c) => ({
                label: c.label,
                value: c.value,
                comentario: c.comentario,
              })),
              evidenciaAntes: evidAntes,
              evidenciaDespues: evidDespues,
            });
          } else {
            activosAtendidos.push({
              codigo: asset.codigo,
              equipo: asset.equipo,
              usuario: asset.usuario,
              diagnostico: '',
              trabajoRealizado: '',
              recomendaciones: '',
              observaciones: '',
              cambioComponentes: false,
              checklist: [],
            });
          }
        } else {
          activosNoAtendidosIds.push(asset.id);
        }
      }

      // 2. Generate technician signature
      const firmaTecnicoDataUri = firmaModoFinalizar === 'TRAZAR' && firmaFinalizar
        ? firmaFinalizar
        : await generarFirmaAutomaticaDataUri(tecnicoFirmaNombre);

      // 3. Fetch logo
      let logoDataUri: string | undefined;
      try {
        const logoResp = await fetch('/logo.png');
        const blob = await logoResp.blob();
        logoDataUri = await fileToDataUri(new File([blob], 'logo.png', { type: blob.type }));
      } catch { /* logo unavailable */ }

      // 4. Generate consolidated PDF HTML
      const reportData = {
        empresaNombre: context.empresaNombre,
        sedeNombre: context.sedeNombre,
        fechaMantenimiento: context.fecha || new Date().toISOString().slice(0, 10),
        tecnicoEncargado: tecnicoFirmaNombre,
        otrosTecnicos: context.tecnicos.length > 1
          ? context.tecnicos.slice(1).map((t) => t.nombre).join(', ')
          : '',
        totalTecnicos: context.tecnicos.length,
        activos: activosAtendidos,
        firmaTecnicoNombre: tecnicoFirmaNombre,
        firmaTecnicoDataUri,
        logoDataUri,
        fechaGeneracion: new Date().toLocaleDateString('es-ES', {
          day: '2-digit', month: 'long', year: 'numeric',
        }),
      };

      const html = generateMantenimientoReportHtml(reportData);

      // 5. Convert HTML to PDF base64 via backend
      const pdfBase64 = await htmlToPdfBase64(html, {
        mantenimientoId: context.mantenimientoId || '',
        empresaNombre: context.empresaNombre,
        sedeNombre: context.sedeNombre,
        fecha: context.fecha,
        tecnicoEncargado: tecnicoFirmaNombre,
        estado: 'PENDIENTE_FIRMA',
      });

      // 6. Call finalize endpoint
      const pdfFileName = `mantenimiento-preventivo-${context.empresaNombre.replace(/\s+/g, '-')}-${context.fecha || 'sin-fecha'}.pdf`;

      const response = await finalizarMantenimiento({
        mantenimientoId: context.mantenimientoId || '',
        firmaTecnicoTipo: firmaModoFinalizar,
        firmaTecnicoValor: firmaTecnicoDataUri,
        tecnicoNombre: tecnicoFirmaNombre,
        destinatarioId: selectedUsuarioEncargado,
        destinatarioNombre: selectedUser.nombreCompleto || '',
        destinatarioCorreo: selectedUser.correoPrincipal || selectedUser.correo || '',
        pdfBase64,
        pdfFileName,
        activosAtendidos: activosAtendidosIds,
        activosNoAtendidos: activosNoAtendidosIds,
        motivoNoAtendidos: motivoNoAtendidos.trim(),
        reprogramacionFecha: reprogramacionFecha || undefined,
        observaciones: '',
      });

      setEstadoMantenimiento(response.estado || 'PENDIENTE_FIRMA');
      setFinalizadoExito(true);
      setShowFinalizeModal(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setErrorMessage(err.message || 'Error al finalizar el mantenimiento.');
    } finally {
      setFinalizando(false);
    }
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

    const unanswered = draft.checklist.some((item) => {
      const tipo = (item.tipo ?? 'si_no').toLowerCase();
      if (tipo === 'si_no') return item.value === null;
      // texto y seleccion esperan string no vacío
      return typeof item.value !== 'string' || !String(item.value).trim();
    });
    if (unanswered) return 'Debes responder todo el checklist.';

    const invalidComment = draft.checklist.some(
      (item) => (item.tipo ?? 'si_no').toLowerCase() === 'si_no' && item.value === 'NO' && !item.comentario.trim()
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

  const handleSaveAssetExecution = async () => {
    if (!activeAsset) return;

    const draft = draftByAsset[activeAsset.id] || buildEmptyDraft();
    const validation = validateDraft(draft);

    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setErrorMessage(null);
    setSavingAsset(activeAsset.id);

    try {
      // Convertir imágenes a base64
      const evidenciaAntesBase64 = draft.evidenciaAntes instanceof File 
        ? await fileToBase64(draft.evidenciaAntes) 
        : draft.evidenciaAntes || '';
      const evidenciaDespuesBase64 = draft.evidenciaDespues instanceof File 
        ? await fileToBase64(draft.evidenciaDespues) 
        : draft.evidenciaDespues || '';

      console.log('📷 [handleSaveAssetExecution] Evidencias base64:', {
        antesLength: evidenciaAntesBase64.length,
        despuesLength: evidenciaDespuesBase64.length,
        antesStart: evidenciaAntesBase64.substring(0, 50),
        despuesStart: evidenciaDespuesBase64.substring(0, 50),
      });

      // Mapear checklist - soporta distintos tipos (si_no, texto, seleccion)
      const checklistPayload = draft.checklist.map((item) => {
        const tipo = (item.tipo ?? 'si_no').toLowerCase();
        let estado: string = '';
        if (tipo === 'si_no') {
          estado = String(item.value ?? 'SI');
        } else {
          estado = String(item.value ?? '');
        }
        return {
          key: item.key,
          label: item.label,
          estado,
          comentario: item.comentario || '',
        };
      });

      const payload = {
        mantenimientoId: context.mantenimientoId || '',
        activoId: activeAsset.id,
        fechaInicio: context.fecha || new Date().toISOString().split('T')[0],
        fechaFin: new Date().toISOString().split('T')[0],
        diagnostico: draft.diagnostico,
        trabajoRealizado: draft.trabajoRealizado,
        recomendaciones: draft.recomendaciones,
        observaciones: draft.observaciones,
        tecnicoNombre: tecnicoFirmaNombre,
        tecnicoEmail,
        usuarioNombre: usuarioFirmaNombre,
        usuarioEmail,
        firmaTecnicoTipo: draft.firmaTecnicoModo,
        firmaTecnicoValor: draft.firmaTecnico || tecnicoFirmaNombre,
        firmaUsuarioTipo: draft.firmaUsuarioModo,
        firmaUsuarioValor: draft.firmaUsuario || usuarioFirmaNombre,
        checklist: checklistPayload,
        evidenciaAntes: evidenciaAntesBase64,
        evidenciaDespues: evidenciaDespuesBase64,
      };

      console.log('📤 [handleSaveAssetExecution] Enviando payload:', {
        mantenimientoId: payload.mantenimientoId,
        activoId: payload.activoId,
        checklistItems: payload.checklist.length,
        signatures: [payload.firmaTecnicoTipo, payload.firmaUsuarioTipo],
      });

      const response = await saveActivoExecution(payload);

      console.log('📥 [handleSaveAssetExecution] Respuesta del servidor:', {
        ejecucionId: response.ejecucionId,
        estado: response.estado,
        pdfEstado: response.pdf?.estado,
        pdfUrl: response.pdf?.url ? '✓ URL disponible' : '✗ Sin URL',
      });

      // Guardar ejecucionId y URL del PDF
      if (response.ejecucionId) {
        setStatusByAsset((prev) => ({
          ...prev,
          [activeAsset.id]: 'COMPLETADO',
        }));
      }

      if (response.pdf?.url) {
        setPdfUrlByAsset((prev) => ({ 
          ...prev, 
          [activeAsset.id]: response.pdf!.url 
        }));
        console.log('✅ PDF vinculado al activo:', activeAsset.id);
      } else if (response.pdf?.estado === 'ERROR') {
        console.warn('⚠️ Error en generación de PDF:', response.pdf);
      }

      // Persistir base64 en draft para mostrarlo en vista de solo lectura
      const persistedDraft: MantenimientoDraft = {
        ...draft,
        evidenciaAntes: evidenciaAntesBase64 || draft.evidenciaAntes,
        evidenciaDespues: evidenciaDespuesBase64 || draft.evidenciaDespues,
      };

      setDraftByAsset((prev) => ({
        ...prev,
        [activeAsset.id]: {
          ...persistedDraft,
        },
      }));

      saveDraftSnapshot(context.mantenimientoId, snapshotScopeKey, activeAsset.id, persistedDraft);

      // Cerrar modal y limpiar draft
      setShowExecutionModal(false);
      // Opcional: limpiar el draft del activo después de guardar exitosamente
      // setDraftByAsset((prev) => { const { [activeAsset.id]: _, ...rest } = prev; return rest; });

    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMsg = err.message || 'Error al guardar la ejecución del activo.';

      if (errorMsg.toLowerCase().includes('ya existe una ejecucion')) {
        setStatusByAsset((prev) => ({
          ...prev,
          [activeAsset.id]: 'COMPLETADO',
        }));
        setShowExecutionModal(false);
        setErrorMessage('Este activo ya tiene una ejecución registrada para este mantenimiento.');
        return;
      }

      console.error('🔴 [handleSaveAssetExecution] Error:', errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setSavingAsset(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

          {/* Debug banner (solo si se añade ?debugMantenimiento=1 en la URL) */}
          {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugMantenimiento') === '1' && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 m-4 rounded-lg text-sm font-semibold">
              <div className="flex flex-wrap gap-4">
                <div>estado: <span className="font-bold">{String(estadoMantenimiento)}</span></div>
                <div>finalizadoExito: <span className="font-bold">{String(finalizadoExito)}</span></div>
                <div>totalActivos: <span className="font-bold">{totalActivos}</span></div>
                <div>completados: <span className="font-bold">{completados}</span></div>
              </div>
            </div>
          )}
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

      {/* Acciones generales debajo de la tabla */}
      <div className="flex justify-end gap-3">
        {completados < totalActivos && !finalizadoExito && (
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-white border-2 border-[#1a6fc4] text-[#1a4d8f] text-sm font-bold hover:bg-[#e8f1fb] transition shadow-sm"
          >
            Reprogramar activos pendientes
          </button>
        )}

        {/* Botón Finalizar Mantenimiento (mostrar si hay al menos un activo completado y no está finalizado) */}
        {!finalizadoExito && completados > 0 && (
          <button
            type="button"
            onClick={openFinalizeModal}
            className="px-5 py-2.5 rounded-xl bg-[#ff8a65] text-white text-sm font-bold hover:bg-[#ff7043] transition shadow-sm"
            title="Abrir formulario de finalización"
          >
            Finalizar Mantenimiento
          </button>
        )}
      </div>

      {/* Error global */}
      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-3.5 flex items-start gap-3">
          <span className="text-red-500 text-lg mt-0.5">⚠</span>
          <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Success: mantenimiento finalizado */}
      {finalizadoExito && (
        <div className="rounded-xl border border-[#7dd3af] bg-[#f0fdf4] px-5 py-4 flex items-start gap-3">
          <span className="text-[#22c47a] text-lg mt-0.5">✓</span>
          <div>
            <p className="text-sm font-bold text-[#166534]">
              Mantenimiento finalizado correctamente
            </p>
            <p className="text-xs text-[#0d5c39] mt-1">
              {estadoMantenimiento === 'FINALIZADO'
                ? 'El mantenimiento ha sido finalizado. Se ha enviado el PDF firmado al cliente.'
                : 'Se ha enviado un correo con el PDF y enlace de firma de conformidad al usuario seleccionado. El estado del mantenimiento es "Pendiente de Firma" hasta que el cliente firme.'}
            </p>
            {noAtendidosCount > 0 && reprogramacionFecha && (
              <p className="text-xs text-[#92400e] mt-1 bg-[#fffbeb] rounded-lg px-3 py-1.5 border border-[#fde68a] inline-block">
                Se reprogramaron {noAtendidosCount} activos no atendidos para el {reprogramacionFecha}.
              </p>
            )}
          </div>
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
                  {isReadOnly ? 'Detalle de ejecución' : 'Formulario de ejecución'}
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
            {isReadOnly ? (
              <div className="p-6 space-y-7 overflow-y-auto bg-[#f7faff]">
                {/* ── VISTA DE SOLO LECTURA ─────────────────── */}

                {/* Informe técnico */}
                <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                  <SectionTitle>Informe técnico</SectionTitle>
                  <div className="space-y-4">
                    {[
                      { label: 'Diagnóstico', value: activeDraft.diagnostico },
                      { label: 'Trabajo realizado', value: activeDraft.trabajoRealizado },
                      { label: 'Recomendaciones', value: activeDraft.recomendaciones },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <FieldLabel>{label}</FieldLabel>
                        <p className="text-sm text-[#0f2744] bg-[#f4f8fd] rounded-xl p-3.5 border border-[#daeaf8] whitespace-pre-wrap min-h-[60px]">
                          {value || <span className="text-[#94afc8]">Sin información</span>}
                        </p>
                      </div>
                    ))}
                    {activeDraft.observaciones ? (
                      <div>
                        <FieldLabel>Observaciones</FieldLabel>
                        <p className="text-sm text-[#0f2744] bg-[#f4f8fd] rounded-xl p-3.5 border border-[#daeaf8] whitespace-pre-wrap min-h-12">
                          {activeDraft.observaciones}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Cambio de componentes */}
                <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                  <SectionTitle>Cambio de componentes</SectionTitle>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 ${activeDraft.cambioComponentes === 'SI' ? 'bg-[#1a6fc4] text-white border-[#1a6fc4]' : 'bg-[#0f2d5e] text-white border-[#0f2d5e]'}`}>
                    {activeDraft.cambioComponentes === 'SI' ? 'Sí se realizó cambio de componente' : 'No se realizó cambio de componente'}
                  </span>
                </div>

                {/* Evidencias */}
                <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                  <SectionTitle>Evidencias fotográficas</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {([
                      { kind: 'ANTES', evidence: activeDraft.evidenciaAntes },
                      { kind: 'DESPUES', evidence: activeDraft.evidenciaDespues },
                    ] as const).map(({ kind, evidence }) => (
                      <div key={kind} className="rounded-xl border-2 border-[#bdd7f0] bg-[#f4f8fd] p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#1a4d8f] mb-3">Imagen {kind}</p>
                        {evidence ? (
                          <img
                            src={typeof evidence === 'string' ? evidence : URL.createObjectURL(evidence)}
                            alt={`Evidencia ${kind}`}
                            className="w-full rounded-xl border border-[#bdd7f0] object-contain max-h-52"
                          />
                        ) : (
                          <p className="text-xs text-[#94afc8] font-semibold text-center py-10">Sin imagen</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checklist */}
                <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                  <SectionTitle>Checklist de mantenimiento</SectionTitle>
                  <div className="space-y-2">
                    {activeDraft.checklist.map((item, idx) => {
                      const tipo = (item.tipo ?? 'si_no').toLowerCase();
                      const isPositive = tipo === 'si_no' ? item.value === 'SI' : Boolean(item.value && String(item.value).trim());
                      const isNegative = tipo === 'si_no' ? item.value === 'NO' : false;
                      return (
                        <div
                          key={item.key}
                          className={`rounded-xl border p-3.5 ${isPositive ? 'border-[#7dd3af] bg-[#f0fbf6]' : isNegative ? 'border-[#f9a8a8] bg-[#fff5f5]' : 'border-[#daeaf8] bg-[#f7faff]'}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-bold text-[#94afc8] w-5 text-right">{idx + 1}</span>
                              <p className="text-sm font-semibold text-[#0f2744]">{item.label}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isPositive ? 'bg-[#e6f7f0] text-[#0d5c39] border-[#7dd3af]' : isNegative ? 'bg-[#fff5f5] text-[#b91c1c] border-[#f9a8a8]' : 'bg-[#f0f4fa] text-[#94afc8] border-[#daeaf8]'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-[#22c47a]' : isNegative ? 'bg-red-500' : 'bg-[#c8ddf0]'}`} />
                              {tipo === 'si_no' ? (item.value ?? 'Sin responder') : (String(item.value) || 'Sin responder')}
                            </span>
                          </div>
                          {tipo === 'si_no' && item.value === 'NO' && item.comentario && (
                            <p className="mt-2 text-sm text-[#7a0000] bg-[#fff5f5] rounded-lg p-2.5 border border-[#f9a8a8]">
                              {item.comentario}
                            </p>
                          )}
                          {tipo === 'texto' && item.value && (
                            <p className="mt-2 text-sm text-[#0f2744] bg-[#f4f8fd] rounded-lg p-2.5 border border-[#daeaf8] whitespace-pre-wrap">{String(item.value)}</p>
                          )}
                          {tipo === 'seleccion' && item.value && (
                            <p className="mt-2 text-sm text-[#0f2744] bg-[#f4f8fd] rounded-lg p-2.5 border border-[#daeaf8]">{String(item.value)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Firmas */}
                <div className="bg-white rounded-xl border border-[#daeaf8] p-5 shadow-sm">
                  <SectionTitle>Firmas de conformidad</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: 'Firma del Técnico', nombre: tecnicoFirmaNombre, modo: activeDraft.firmaTecnicoModo, firmaValue: activeDraft.firmaTecnico },
                      { label: 'Firma del Usuario', nombre: usuarioFirmaNombre, modo: activeDraft.firmaUsuarioModo, firmaValue: activeDraft.firmaUsuario },
                    ].map(({ label, nombre, modo, firmaValue }) => (
                      <div key={label} className="space-y-3">
                        <FieldLabel>{label}</FieldLabel>
                        <input type="text" value={nombre} readOnly className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#c8ddf0] bg-[#f0f6fd] text-[#0f2744] text-sm font-semibold" />
                        {modo === 'AUTO' ? (
                          <div className="h-32 rounded-xl border-2 border-[#c8ddf0] bg-white flex items-center px-5 overflow-hidden">
                            <p
                              className="text-[#0f2744] w-full whitespace-nowrap overflow-hidden text-ellipsis"
                              style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive', fontSize: getAutoSignatureFontSize(nombre), lineHeight: 1, letterSpacing: '0.01em' }}
                            >
                              {nombre}
                            </p>
                          </div>
                        ) : firmaValue ? (
                          <div className="h-32 rounded-xl border-2 border-[#c8ddf0] bg-white overflow-hidden">
                            <img src={firmaValue} alt={`Firma ${label}`} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-32 rounded-xl border-2 border-dashed border-[#c8ddf0] bg-[#f0f6fd] flex items-center justify-center">
                            <p className="text-xs text-[#94afc8] font-semibold">Sin firma</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
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
                            <span>✓</span> {file instanceof File ? file.name : 'Imagen cargada'}
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
                  {activeDraft.checklist.map((item, idx) => {
                    const tipo = (item.tipo ?? 'si_no').toLowerCase();
                    const isPositive = tipo === 'si_no' ? item.value === 'SI' : Boolean(item.value && String(item.value).trim());
                    const isNegative = tipo === 'si_no' ? item.value === 'NO' : false;
                    return (
                      <div
                        key={item.key}
                        className={`rounded-xl border p-3.5 transition ${
                          isPositive ? 'border-[#7dd3af] bg-[#f0fbf6]' : isNegative ? 'border-[#f9a8a8] bg-[#fff5f5]' : 'border-[#daeaf8] bg-[#f7faff]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-[#94afc8] w-5 text-right">{idx + 1}</span>
                            <p className="text-sm font-semibold text-[#0f2744]">{item.label}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {tipo === 'si_no' ? (
                              (['SI', 'NO'] as const).map((opt) => (
                                <label
                                  key={opt}
                                  className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold select-none ${opt === 'SI' ? 'text-[#0d5c39]' : 'text-[#b91c1c]'}`}
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
                              ))
                            ) : tipo === 'texto' ? (
                              <textarea
                                rows={2}
                                value={String(item.value ?? '')}
                                onChange={(e) => updateChecklist(item.key, { value: e.target.value })}
                                placeholder="Respuesta libre"
                                className="w-72 px-3.5 py-2.5 rounded-xl border-2 border-[#c8ddf0] bg-white text-[#0f2744] text-sm focus:outline-none focus:border-[#1a6fc4] focus:ring-2 focus:ring-[#1a6fc4]/20 transition placeholder:text-[#94afc8] resize-none"
                              />
                            ) : tipo === 'seleccion' ? (
                              <select
                                value={String(item.value ?? '')}
                                onChange={(e) => updateChecklist(item.key, { value: e.target.value })}
                                className="px-3.5 py-2 rounded-xl border-2 border-[#c8ddf0] bg-white text-[#0f2744] text-sm focus:outline-none focus:border-[#1a6fc4] focus:ring-2 focus:ring-[#1a6fc4]/20 transition"
                              >
                                <option value="">Seleccionar</option>
                                {(item.opciones || []).map((op) => (
                                  <option key={op} value={op}>{op}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={String(item.value ?? '')}
                                onChange={(e) => updateChecklist(item.key, { value: e.target.value })}
                                className="px-3.5 py-2 rounded-xl border-2 border-[#c8ddf0] bg-white text-[#0f2744] text-sm focus:outline-none focus:border-[#1a6fc4] focus:ring-2 focus:ring-[#1a6fc4]/20 transition"
                              />
                            )}
                          </div>
                        </div>

                        {tipo === 'si_no' && item.value === 'NO' && (
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
                    );
                  })}
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
            )}

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#daeaf8] bg-white flex items-center justify-between gap-3">
              {!isReadOnly && errorMessage && (
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
                  {isReadOnly ? 'Cerrar' : 'Cancelar'}
                </button>
                {!isReadOnly && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveAssetExecution}
                      disabled={savingAsset === activeAsset?.id}
                      className="px-6 py-2.5 rounded-xl bg-[#1a6fc4] text-white text-sm font-bold hover:bg-[#145faa] disabled:opacity-60 disabled:cursor-not-allowed shadow-md transition flex items-center gap-2"
                    >
                      {savingAsset === activeAsset?.id ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        'Guardar ejecución'
                      )}
                    </button>

                    
                  </>
                )}

                {/* Botón Finalizar Mantenimiento — navega al modal principal */}
                {completados > 0 && !isMaintenanceFinalized && !(completados === totalActivos && totalActivos > 0) && (
                  <button
                    type="button"
                    onClick={() => { setShowExecutionModal(false); openFinalizeModal(); }}
                    className="px-6 py-2.5 rounded-xl bg-[#ff8a65] text-white text-sm font-bold hover:bg-[#ff7043] shadow-md transition ml-2"
                  >
                    Finalizar Mantenimiento
                  </button>
                )}

                {isMaintenanceFinalized && (
                  <div className="px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
                    Mantenimiento preventivo finalizado.
                  </div>
                )}

                {pdfUrlByAsset[activeAsset?.id || ''] && (
                  <a
                    href={pdfUrlByAsset[activeAsset?.id || '']}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 rounded-xl bg-[#22c47a] text-white text-sm font-bold hover:bg-[#1ba866] shadow-md transition"
                  >
                    Ver PDF
                  </a>
                )}
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

      {/* Modal: Finalizar Mantenimiento (UI) */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-[#0f2d5e]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#bdd7f0]">
            <div className="bg-[#0f2d5e] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7eb8e8] mb-0.5">Finalizar Mantenimiento</p>
                <h4 className="text-lg font-extrabold text-white">Resumen y reprogramación</h4>
              </div>
              <button type="button" onClick={() => setShowFinalizeModal(false)} className="text-[#a8ccf0] hover:text-white text-xl font-bold leading-none">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto bg-[#f7faff]">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-[#daeaf8] p-4">
                  <p className="text-xs font-bold text-[#5a80a8]">Equipos atendidos</p>
                  <p className="text-2xl font-extrabold text-[#1a6fc4]">{atendidosCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#daeaf8] p-4">
                  <p className="text-xs font-bold text-[#5a80a8]">Equipos no atendidos</p>
                  <p className="text-2xl font-extrabold text-[#b91c1c]">{noAtendidosCount}</p>
                </div>
              </div>

              {noAtendidosCount > 0 && (
                <div className="bg-white rounded-xl border border-[#f9a8a8] p-4">
                  <p className="text-xs font-bold uppercase text-[#b91c1c] mb-2">Motivo por equipos no atendidos (obligatorio)</p>
                  <textarea
                    rows={3}
                    value={motivoNoAtendidos}
                    onChange={(e) => setMotivoNoAtendidos(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#f9a8a8] bg-white text-[#0f2744] text-sm focus:outline-none focus:border-red-400 transition"
                    placeholder="Explica por qué algunos equipos no fueron atendidos..."
                  />
                </div>
              )}

              {noAtendidosCount > 0 && (
                <div className="bg-white rounded-xl border border-[#daeaf8] p-4">
                  <p className="text-xs font-bold uppercase text-[#5a80a8] mb-2">Fecha de reprogramación de equipos restantes</p>
                  <p className="text-xs text-[#94afc8] mb-2">Selecciona una fecha (fechas ya usadas están deshabilitadas)</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={reprogramacionFecha}
                      onChange={(e) => setReprogramacionFecha(e.target.value)}
                      min={new Date().toISOString().slice(0,10)}
                      className="px-3.5 py-2.5 rounded-xl border-2 border-[#c8ddf0] bg-white text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-[#daeaf8] p-4">
                <p className="text-xs font-bold uppercase text-[#5a80a8] mb-2">Firma de técnico</p>
                <div className="inline-flex rounded-xl border-2 border-[#c8ddf0] bg-[#f0f6fd] p-0.5 gap-0.5 mb-3">
                  {(['AUTO','TRAZAR'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFirmaModoFinalizar(m)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${firmaModoFinalizar===m ? 'bg-[#1a6fc4] text-white shadow' : 'text-[#3a5a8a]'}`}
                    >{m==='AUTO' ? 'Automática' : 'Trazar'}</button>
                  ))}

                </div>
                {firmaModoFinalizar === 'AUTO' ? (
                  <div className="h-32 rounded-xl border-2 border-[#c8ddf0] bg-white flex items-center px-5 overflow-hidden">
                    <p
                      className="text-[#0f2744] w-full whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive', fontSize: getAutoSignatureFontSize(tecnicoFirmaNombre), lineHeight: 1, letterSpacing: '0.01em' }}
                    >
                      {tecnicoFirmaNombre}
                    </p>
                  </div>
                ) : (
                  <div>
                    <SignaturePad value={firmaFinalizar} onChange={(v) => setFirmaFinalizar(v)} />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-[#daeaf8] p-4">
                <p className="text-xs font-bold uppercase text-[#5a80a8] mb-2">Firma de conformidad — Enviar correo al encargado</p>
                <p className="text-xs text-[#94afc8] mb-3">Se enviará un correo con el PDF consolidado y un enlace para firmar la conformidad del mantenimiento.</p>
                <div className="relative">
                  <input
                    type="text"
                    value={encargadoSearch || (finalizeUsuarios.find((u) => String(u.id ?? u._id) === selectedUsuarioEncargado)?.nombreCompleto ?? '')}
                    onChange={(e) => {
                      setEncargadoSearch(e.target.value);
                      setEncargadoDropdownOpen(true);
                    }}
                    onFocus={() => setEncargadoDropdownOpen(true)}
                    placeholder="Buscar usuario por nombre o correo..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#c8ddf0] bg-white text-sm"
                  />

                  {encargadoDropdownOpen && (
                    <div className="absolute z-40 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-md max-h-48 overflow-auto">
                      {finalizeUsuarios.filter((u) => {
                        const q = (encargadoSearch || '').toLowerCase().trim();
                        if (!q) return true;
                        const text = `${u.nombreCompleto || ''} ${u.correo || ''}`.toLowerCase();
                        return text.includes(q);
                      }).map((u) => (
                        <button
                          key={String(u.id ?? u._id)}
                          type="button"
                          onClick={() => {
                            setSelectedUsuarioEncargado(String(u.id ?? u._id));
                            setEncargadoSearch(u.nombreCompleto || '');
                            setEncargadoDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 border-b last:border-b-0"
                        >
                          <div className="text-sm font-semibold text-slate-700">{u.nombreCompleto}</div>
                          <div className="text-xs text-slate-400">{u.correo}</div>
                        </button>
                      ))}
                      {finalizeUsuarios.filter((u) => {
                        const q = (encargadoSearch || '').toLowerCase().trim();
                        if (!q) return true;
                        const text = `${u.nombreCompleto || ''} ${u.correo || ''}`.toLowerCase();
                        return text.includes(q);
                      }).length === 0 && (
                        <div className="p-3 text-sm text-slate-500">No se encontraron usuarios.</div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-[#94afc8] mt-2">Solo se puede seleccionar un usuario.</p>
              </div>

              {/* Alerta si no hay activos completados */}
              {completados === 0 && (
                <div className="rounded-xl border border-[#f9a8a8] bg-[#fff5f5] px-4 py-3 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">⚠</span>
                  <p className="text-xs font-semibold text-[#b91c1c]">
                    No se puede finalizar el mantenimiento. Debes completar al menos un activo.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#daeaf8] bg-white flex items-center justify-end gap-3">
              <button type="button" onClick={() => setShowFinalizeModal(false)} disabled={finalizando} className="px-4 py-2 rounded-xl border-2 border-[#c8ddf0] text-sm font-bold disabled:opacity-50">Cerrar</button>
              <button
                type="button"
                onClick={handleFinalizarMantenimiento}
                disabled={finalizando || completados === 0 || !selectedUsuarioEncargado || (noAtendidosCount > 0 && (!motivoNoAtendidos.trim() || !reprogramacionFecha))}
                className="px-5 py-2.5 rounded-xl bg-[#1a6fc4] text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#145faa] transition shadow-md flex items-center gap-2"
              >
                {finalizando ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Generando PDF y enviando...
                  </>
                ) : (
                  <>Enviar</>
                )}
              </button>
            </div>
          </div>
        </div>
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