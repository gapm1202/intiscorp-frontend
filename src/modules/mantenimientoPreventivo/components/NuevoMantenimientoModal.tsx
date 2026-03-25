import { useEffect, useMemo, useState } from 'react';
import { getEmpresas } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getContratoActivo } from '@/modules/empresas/services/contratosService';
import { usuariosInternosService } from '@/modules/usuarios/services/usuariosInternosService';
import type { UsuarioInterno } from '@/modules/usuarios/types/usuariosInternos.types';
import { createMantenimientoPreventivo, updateMantenimientoPreventivo, getMantenimientoPreventivoById, listMantenimientosPreventivos, type MantenimientoPreventivoRecord } from '../services/mantenimientosPreventivosService';

type Option = { id: string; nombre: string };

interface NuevoMantenimientoModalProps {
  onClose: () => void;
  onStart?: (payload: {
    mantenimientoId?: string;
    empresaId: string;
    empresaNombre: string;
    sedeId: string;
    sedeNombre: string;
    fecha: string;
    tecnicos: Array<{ id: string; nombre: string }>;
  }) => void;
  editing?: {
    id: string;
    empresaId?: string;
    sedeId?: string;
    fecha?: string;
    tecnicoIds?: string[];
    encargadoId?: string;
    observaciones?: string;
  } | null;
  onUpdated?: (payload?: { id?: string }) => void;
}

function toArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (typeof response === 'object' && response !== null && 'data' in response && Array.isArray((response as { data?: unknown }).data)) {
    return (response as { data: T[] }).data;
  }
  return [];
}

function mapEmpresaToOption(empresa: Record<string, unknown>): Option | null {
  const id = String(empresa._id ?? empresa.id ?? '');
  const nombre = String(empresa.nombre ?? '').trim();
  if (!id || !nombre) return null;
  return { id, nombre };
}

function mapSedeToOption(sede: Record<string, unknown>): Option | null {
  const id = String(sede._id ?? sede.id ?? '');
  const nombre = String(sede.nombre ?? '').trim();
  if (!id || !nombre) return null;
  return { id, nombre };
}

function normalizeBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 't' || normalized === 'yes';
}

function pickFirstArray(obj: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function extractTecnicos(full: Record<string, unknown>): { tecnicoIds: string[]; encargadoId: string } {
  const direct = pickFirstArray(full, ['tecnicosAsignados', 'tecnicos_asignados', 'tecnicos', 'mantenimiento_tecnicos']);
  const nestedMantenimiento = typeof full.mantenimiento === 'object' && full.mantenimiento !== null
    ? pickFirstArray(full.mantenimiento as Record<string, unknown>, ['tecnicosAsignados', 'tecnicos_asignados', 'tecnicos', 'mantenimiento_tecnicos'])
    : [];

  const source = direct.length > 0 ? direct : nestedMantenimiento;

  const tecnicoIdsSet = new Set<string>();
  let encargado = '';

  source.forEach((it) => {
    if (typeof it === 'string' || typeof it === 'number') {
      tecnicoIdsSet.add(String(it));
      return;
    }

    if (!it || typeof it !== 'object') return;
    const rec = it as Record<string, unknown>;
    const tid = rec.tecnicoId ?? rec.tecnico_id ?? rec.tecnico ?? rec.id ?? rec._id ?? rec.usuarioId ?? rec.usuario_id;
    if (tid === undefined || tid === null || String(tid) === '') return;

    const tidStr = String(tid);
    tecnicoIdsSet.add(tidStr);

    const isEncargado = rec.esEncargado ?? rec.es_encargado ?? rec.isEncargado ?? rec.is_encargado;
    if (normalizeBool(isEncargado)) encargado = tidStr;
  });

  return { tecnicoIds: Array.from(tecnicoIdsSet), encargadoId: encargado };
}

function contractSafeGet(obj: unknown, key: string) {
  if (!obj || typeof obj !== 'object') return undefined;
  return (obj as Record<string, unknown>)[key];
}

export default function NuevoMantenimientoModal(props: NuevoMantenimientoModalProps) {
  const { onClose, onStart, editing = null, onUpdated } = props;

  const [empresaId, setEmpresaId] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [fecha, setFecha] = useState('');
  const [tecnicosSeleccionados, setTecnicosSeleccionados] = useState<string[]>([]);
  const [encargadoId, setEncargadoId] = useState('');
  const [empresas, setEmpresas] = useState<Option[]>([]);
  const [sedesByEmpresa, setSedesByEmpresa] = useState<Record<string, Option[]>>({});
  const [tecnicos, setTecnicos] = useState<Option[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [empresaPreventivoStatus, setEmpresaPreventivoStatus] = useState<'unknown' | 'checking' | 'no_contract' | 'disabled' | 'enabled'>('unknown');
  const [blockedDates, setBlockedDates] = useState<Record<string, string>>({});
  const [checkingBlockedDates, setCheckingBlockedDates] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const sedesDisponibles = useMemo(() => sedesByEmpresa[empresaId] || [], [empresaId, sedesByEmpresa]);
  const tecnicosSeleccionadosData = useMemo(() => tecnicos.filter((t) => tecnicosSeleccionados.includes(t.id)), [tecnicos, tecnicosSeleccionados]);

  useEffect(() => {
    let active = true;
    const cargarBloqueadas = async () => {
      setCheckingBlockedDates(true);
      try {
        if (!empresaId || !sedeId) {
          if (active) setBlockedDates({});
          return;
        }
        const list = await listMantenimientosPreventivos({ empresaId, sedeId });
        if (!active) return;
        const map: Record<string, string> = {};
        list.forEach((r: MantenimientoPreventivoRecord) => {
          const fecha = String(r.fechaProgramada || '').slice(0, 10);
          if (!fecha) return;
          if (editing && editing.id && String(editing.id) === String(r.id)) return;
          map[fecha] = r.id;
        });
        setBlockedDates(map);
      } catch (e) {
        setBlockedDates({});
      } finally {
        if (active) setCheckingBlockedDates(false);
      }
    };
    cargarBloqueadas();
    return () => { active = false; };
  }, [empresaId, sedeId, editing]);

  useEffect(() => {
    let active = true;
    const cargarDatos = async () => {
      setLoadingData(true);
      setLoadError(null);
      try {
        const [empresasResp, usuariosResp] = await Promise.all([getEmpresas(), usuariosInternosService.getAll()]);
        if (!active) return;
        const empresasList = toArray<Record<string, unknown>>(empresasResp).map(mapEmpresaToOption).filter((i): i is Option => i !== null);
        setEmpresas(empresasList);
        const usuariosFiltrados = (Array.isArray(usuariosResp) ? usuariosResp : [])
          .filter((usuario: UsuarioInterno) => usuario.activo && (usuario.rol === 'administrador' || usuario.rol === 'tecnico'))
          .map((usuario: UsuarioInterno) => ({ id: String(usuario.id), nombre: usuario.nombreCompleto }));
        setTecnicos(usuariosFiltrados);
        const sedesEntries: Array<[string, Option[]]> = await Promise.all(
          empresasList.map(async (empresa): Promise<[string, Option[]]> => {
            try {
              const sedesResp = await getSedesByEmpresa(empresa.id);
              const sedesList = toArray<Record<string, unknown>>(sedesResp).map(mapSedeToOption).filter((i): i is Option => i !== null);
              return [empresa.id, sedesList];
            } catch {
              return [empresa.id, []];
            }
          })
        );
        if (!active) return;
        const nextSedesByEmpresa: Record<string, Option[]> = {};
        sedesEntries.forEach(([id, sedes]) => { nextSedesByEmpresa[id] = sedes; });
        setSedesByEmpresa(nextSedesByEmpresa);
        if (editing && editing.id) {
          try {
            const full = await getMantenimientoPreventivoById(editing.id);
            if (full) {
              const empresaIdRaw = full.empresaId ?? full.empresa_id ?? full.empresa;
              const sedeIdRaw = full.sedeId ?? full.sede_id ?? full.sede;
              const fechaRaw = full.fechaProgramada ?? full.fecha_programada ?? full.fecha ?? '';
              setEmpresaId(String(empresaIdRaw ?? editing.empresaId ?? '') || '');
              setSedeId(String(sedeIdRaw ?? editing.sedeId ?? '') || '');
              setFecha(fechaRaw ? String(fechaRaw).slice(0, 10) : (editing.fecha ? String(editing.fecha).slice(0, 10) : ''));
              const extracted = extractTecnicos(full);
              let tecnicoIds: string[] = extracted.tecnicoIds;
              let encargadoIdVal: string | undefined = extracted.encargadoId || undefined;
              if (tecnicoIds.length === 0 && Array.isArray(editing.tecnicoIds) && editing.tecnicoIds.length > 0) {
                tecnicoIds = editing.tecnicoIds.map(String);
              }
              if (!encargadoIdVal && editing.encargadoId) encargadoIdVal = editing.encargadoId;
              if (!encargadoIdVal && tecnicoIds.length === 1) encargadoIdVal = tecnicoIds[0];
              setTecnicosSeleccionados(tecnicoIds);
              setEncargadoId(encargadoIdVal || '');
              setObservaciones(String(full.observaciones ?? full.observacion ?? editing.observaciones ?? ''));
            } else {
              setEmpresaId(editing.empresaId || '');
              setSedeId(editing.sedeId || '');
              setFecha(editing.fecha ? String(editing.fecha).slice(0, 10) : '');
              setTecnicosSeleccionados(Array.isArray(editing.tecnicoIds) ? editing.tecnicoIds : []);
              setEncargadoId(editing.encargadoId || '');
              setObservaciones(editing.observaciones || '');
            }
          } catch (e) {
            setEmpresaId(editing.empresaId || '');
            setSedeId(editing.sedeId || '');
            setFecha(editing.fecha ? String(editing.fecha).slice(0, 10) : '');
            setTecnicosSeleccionados(Array.isArray(editing.tecnicoIds) ? editing.tecnicoIds : []);
            setEncargadoId(editing.encargadoId || '');
            setObservaciones(editing.observaciones || '');
          }
        }
      } catch (err) {
        if (!active) return;
        setLoadError('No se pudieron cargar empresas, sedes o técnicos.');
      } finally {
        if (active) setLoadingData(false);
      }
    };
    cargarDatos();
    return () => { active = false; };
  }, [editing]);

  useEffect(() => {
    let activeCheck = true;
    if (!empresaId) {
      setEmpresaPreventivoStatus('unknown');
      return;
    }
    setEmpresaPreventivoStatus('checking');
    (async () => {
      try {
        const contrato = await getContratoActivo(empresaId);
        if (!activeCheck) return;
        if (!contrato) {
          setEmpresaPreventivoStatus('no_contract');
        } else {
          const normalized = (contrato as any).data ?? (contrato as any).contract ?? (contrato as any).result ?? contrato;
          const services = normalized.services ?? normalized.servicios ?? normalized.services ?? null;
          const preventivePolicy = normalized.preventivePolicy ?? normalized.preventive_policy ?? normalized.preventivo ?? null;
          const val = (v: unknown) => {
            if (v === true) return true;
            if (v === false) return false;
            if (typeof v === 'string') {
              const s = v.toLowerCase().trim();
              if (s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'yes') return true;
              if (s === 'false' || s === '0' || s === 'no') return false;
            }
            return undefined;
          };
          const candidatesYes = [
            normalized.mantenimientoPreventivo,
            normalized.mantenimiento_preventivo,
            normalized.incluyePreventivo,
            normalized.incluye_preventivo,
            contractSafeGet(preventivePolicy, 'incluyePreventivo'),
            contractSafeGet(preventivePolicy, 'incluye_preventivo'),
            contractSafeGet(preventivePolicy, 'aplica'),
            contractSafeGet(services, 'mantenimientoPreventivo'),
            contractSafeGet(services, 'mantenimiento_preventivo'),
            contractSafeGet(services, 'incluyePreventivo'),
            contractSafeGet(services, 'incluye_preventivo'),
          ];
          let foundYes = false;
          for (const c of candidatesYes) {
            const r = val(c);
            if (r === true) { foundYes = true; break; }
          }
          if (foundYes) {
            setEmpresaPreventivoStatus('enabled');
          } else {
            let foundNo = false;
            for (const c of candidatesYes) {
              const r = val(c);
              if (r === false) { foundNo = true; break; }
            }
            if (foundNo) setEmpresaPreventivoStatus('disabled');
            else setEmpresaPreventivoStatus('no_contract');
          }
        }
      } catch (e) {
        if (!activeCheck) return;
        setEmpresaPreventivoStatus('no_contract');
      }
    })();
    return () => { activeCheck = false; };
  }, [empresaId]);

  const canStart = Boolean(empresaId && sedeId && fecha && tecnicosSeleccionados.length > 0 && encargadoId);
  const title = editing ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento';
  const submitLabel = editing ? 'Guardar cambios' : 'Crear mantenimiento';

  // ── Shared style tokens ──────────────────────────────────────────────────
  const fieldLabel = 'block text-xs font-bold uppercase tracking-widest text-[#1e3a5f] mb-1.5';
  const selectInput =
    'w-full px-3.5 py-2.5 rounded-lg border border-[#c8ddf0] bg-white text-[#0f2744] text-sm font-medium shadow-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-[#2e7fcc]/40 focus:border-[#2e7fcc] transition placeholder:text-slate-400 ' +
    'disabled:bg-[#f0f6fc] disabled:text-slate-400 disabled:cursor-not-allowed';
  const sectionCard = 'bg-[#f4f8fd] rounded-xl border border-[#daeaf7] p-5 space-y-4';

  // ── Section divider label ────────────────────────────────────────────────
  const SectionTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#1a5fa8] text-white text-sm">{icon}</span>
      <span className="text-sm font-bold text-[#1a5fa8] uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-[#c8ddf0]" />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .mant-modal * { font-family: 'DM Sans', sans-serif; }
        .mant-scroll::-webkit-scrollbar { width: 5px; }
        .mant-scroll::-webkit-scrollbar-track { background: #f0f6fc; }
        .mant-scroll::-webkit-scrollbar-thumb { background: #93c0e8; border-radius: 99px; }
        .mant-multi::-webkit-scrollbar { width: 5px; }
        .mant-multi::-webkit-scrollbar-track { background: #f0f6fc; }
        .mant-multi::-webkit-scrollbar-thumb { background: #93c0e8; border-radius: 99px; }
        .mant-multi option:checked { background: #1a5fa8; color: #fff; }
        .mant-multi option:hover { background: #daeaf7; }
      `}</style>

      <div className="mant-modal fixed inset-0 bg-[#0a1929]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden border border-[#c8ddf0]">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden bg-[#0f2744] px-8 py-6 shrink-0">
            {/* decorative circles */}
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/5" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#2e7fcc] flex items-center justify-center shrink-0 shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#7bb8e8] text-[11px] font-bold uppercase tracking-[0.15em] mb-0.5">Mantenimiento Preventivo</p>
                  <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-[#7bb8e8] hover:bg-white/15 hover:text-white transition"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <form
            className="flex-1 overflow-y-auto mant-scroll"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canStart || saving) return;
              setSaveError(null);
              setSaving(true);
              const empresa = empresas.find((item) => item.id === empresaId);
              const sede = sedesDisponibles.find((item) => item.id === sedeId);
              try {
                if (editing && editing.id) {
                  await updateMantenimientoPreventivo(editing.id, {
                    empresaId, sedeId, fecha,
                    tecnicoIds: tecnicosSeleccionados,
                    encargadoId, observaciones,
                  });
                  onUpdated?.({ id: editing.id });
                  onClose();
                  return;
                }
                const created = await createMantenimientoPreventivo({
                  empresaId, sedeId, fecha,
                  tecnicoIds: tecnicosSeleccionados,
                  encargadoId, observaciones,
                });
                await onStart?.({
                  mantenimientoId: String(created.id ?? created._id ?? ''),
                  empresaId,
                  empresaNombre: empresa?.nombre || 'Empresa',
                  sedeId,
                  sedeNombre: sede?.nombre || 'Sede',
                  fecha,
                  tecnicos: tecnicosSeleccionadosData,
                });
                onClose();
              } catch (error) {
                const message = error instanceof Error ? error.message : 'No se pudo crear/actualizar el mantenimiento.';
                setSaveError(message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="px-8 py-6 space-y-6">

              {/* Loading state */}
              {loadingData && (
                <div className="flex items-center gap-3 rounded-xl border border-[#c8ddf0] bg-[#f4f8fd] px-5 py-4 text-sm text-[#1a5fa8] font-medium">
                  <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Cargando empresas, sedes y técnicos...
                </div>
              )}

              {loadError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 font-semibold">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {loadError}
                </div>
              )}

              {/* ── Sección 1: Ubicación ─────────────────────────────── */}
              <div>
                <SectionTitle
                  label="Ubicación"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  }
                />
                <div className={sectionCard}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={fieldLabel}>Empresa</label>
                      <select
                        value={empresaId}
                        onChange={(e) => { setEmpresaId(e.target.value); setSedeId(''); }}
                        disabled={loadingData}
                        className={selectInput}
                      >
                        <option value="">Seleccionar empresa...</option>
                        {empresas.map((empresa) => (
                          <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={fieldLabel}>Sede</label>
                      <select
                        value={sedeId}
                        onChange={(e) => setSedeId(e.target.value)}
                        disabled={!empresaId || loadingData}
                        className={selectInput}
                      >
                        <option value="">Seleccionar sede...</option>
                        {sedesDisponibles.map((sede) => (
                          <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Contract status banner */}
                  {empresaId && empresaPreventivoStatus === 'checking' && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-[#c8ddf0] bg-white px-4 py-3 text-sm text-[#1a5fa8] font-medium">
                      <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      Verificando contrato de la empresa...
                    </div>
                  )}

                  {empresaId && empresaPreventivoStatus === 'no_contract' && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-semibold text-amber-800">No se ha configurado el mantenimiento preventivo en el contrato de esta empresa.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem(`empresaTab_${empresaId}`, 'contrato');
                          window.location.href = `/admin/empresas/${empresaId}`;
                        }}
                        className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition whitespace-nowrap"
                      >
                        Ir al contrato →
                      </button>
                    </div>
                  )}

                  {empresaId && empresaPreventivoStatus === 'disabled' && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-red-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <span className="text-sm font-semibold text-red-700">Esta empresa no tiene habilitado el mantenimiento preventivo en su contrato.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem(`empresaTab_${empresaId}`, 'contrato');
                          window.location.href = `/admin/empresas/${empresaId}`;
                        }}
                        className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition whitespace-nowrap"
                      >
                        Ir al contrato →
                      </button>
                    </div>
                  )}

                  {empresaId && empresaPreventivoStatus === 'enabled' && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mantenimiento preventivo habilitado en el contrato.
                    </div>
                  )}
                </div>
              </div>

              {/* ── Sección 2: Fecha ─────────────────────────────────── */}
              <div>
                <SectionTitle
                  label="Programación"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                />
                <div className={sectionCard}>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[160px]">
                      <label className={fieldLabel}>Fecha del mantenimiento</label>
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && blockedDates[val]) {
                            setSaveError('La fecha seleccionada ya tiene un mantenimiento programado. Elige otra fecha.');
                            return;
                          }
                          setSaveError(null);
                          setFecha(val);
                        }}
                        className={selectInput + ' max-w-xs'}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowBlockedModal(true)}
                        disabled={checkingBlockedDates || Object.keys(blockedDates).length === 0}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition
                          ${checkingBlockedDates || Object.keys(blockedDates).length === 0
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-[#1a5fa8] border-[#c8ddf0] hover:bg-[#f4f8fd] hover:border-[#2e7fcc]'
                          }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {checkingBlockedDates ? 'Verificando...' : `Ver fechas ocupadas${Object.keys(blockedDates).length > 0 ? ` (${Object.keys(blockedDates).length})` : ''}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Sección 3: Técnicos ──────────────────────────────── */}
              <div>
                <SectionTitle
                  label="Técnicos asignados"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
                <div className={sectionCard}>
                  <div>
                    <label className={fieldLabel}>Seleccionar técnicos</label>
                    <select
                      multiple
                      value={tecnicosSeleccionados}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                        setTecnicosSeleccionados(selected);
                        if (!selected.includes(encargadoId)) setEncargadoId('');
                      }}
                      disabled={loadingData}
                      className={selectInput + ' mant-multi min-h-36 !py-1'}
                    >
                      {tecnicos.map((tecnico) => (
                        <option key={tecnico.id} value={tecnico.id} className="py-2 px-1">{tecnico.nombre}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-[#4a7fa5] font-medium">Mantén presionada la tecla <kbd className="px-1.5 py-0.5 rounded bg-[#daeaf7] text-[#1a5fa8] font-bold text-[11px]">Ctrl</kbd> para seleccionar varios técnicos.</p>
                  </div>

                  {/* Selected technicians panel */}
                  {tecnicosSeleccionadosData.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 px-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2e7fcc] text-white text-xs font-bold">{tecnicosSeleccionadosData.length}</span>
                        <p className="text-xs font-bold text-[#1a5fa8] uppercase tracking-wider">Seleccionados — marca al encargado</p>
                      </div>
                      <div className="space-y-2">
                        {tecnicosSeleccionadosData.map((tecnico) => {
                          const esEncargado = tecnico.id === encargadoId;
                          return (
                            <div
                              key={tecnico.id}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                                ${esEncargado
                                  ? 'bg-[#1a5fa8] border-[#1a5fa8] shadow-md shadow-[#1a5fa8]/20'
                                  : 'bg-white border-[#c8ddf0] hover:border-[#93c0e8]'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                  ${esEncargado ? 'bg-white/20 text-white' : 'bg-[#daeaf7] text-[#1a5fa8]'}`}>
                                  {tecnico.nombre.charAt(0).toUpperCase()}
                                </div>
                                <span className={`font-semibold text-sm ${esEncargado ? 'text-white' : 'text-[#0f2744]'}`}>
                                  {tecnico.nombre}
                                </span>
                                {esEncargado && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Encargado
                                  </span>
                                )}
                              </div>
                              {!esEncargado && (
                                <button
                                  type="button"
                                  onClick={() => setEncargadoId(tecnico.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f4f8fd] text-[#1a5fa8] border border-[#c8ddf0] hover:bg-[#daeaf7] hover:border-[#93c0e8] transition"
                                >
                                  Designar encargado
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[#c8ddf0] bg-white text-sm text-[#4a7fa5]">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Selecciona técnicos para definir al encargado.
                    </div>
                  )}
                </div>
              </div>

              {/* ── Sección 4: Observaciones ─────────────────────────── */}
              <div>
                <SectionTitle
                  label="Observaciones"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
                <div className={sectionCard}>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas adicionales del mantenimiento (opcional)..."
                    className={selectInput + ' resize-none'}
                  />
                </div>
              </div>

              {/* Save error */}
              {saveError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {saveError}
                </div>
              )}
            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            <div className="sticky bottom-0 bg-white border-t border-[#daeaf7] px-8 py-4 flex items-center justify-between gap-3">
              <div className="text-xs text-[#4a7fa5] font-medium">
                {!canStart && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Completa todos los campos requeridos
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-[#1a5fa8] bg-[#f4f8fd] hover:bg-[#daeaf7] border border-[#c8ddf0] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canStart || saving || empresaPreventivoStatus === 'no_contract' || empresaPreventivoStatus === 'disabled'}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1a5fa8] hover:bg-[#154e8f] disabled:bg-[#93c0e8] disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition shadow-md shadow-[#1a5fa8]/25"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      {editing ? 'Guardando...' : 'Creando...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={editing ? 'M5 13l4 4L19 7' : 'M12 4v16m8-8H4'} />
                      </svg>
                      {submitLabel}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Blocked dates modal ───────────────────────────────────────── */}
      {showBlockedModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1929]/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#c8ddf0] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#daeaf7] bg-[#f4f8fd]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#1a5fa8] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-[#0f2744] uppercase tracking-wider">Fechas Ocupadas</h3>
              </div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#4a7fa5] hover:bg-[#daeaf7] hover:text-[#1a5fa8] transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-64 overflow-auto mant-scroll p-4">
              {Object.keys(blockedDates).length === 0 ? (
                <p className="text-sm text-[#4a7fa5] text-center py-4">No hay fechas ocupadas para la selección actual.</p>
              ) : (
                <ul className="space-y-2">
                  {Object.keys(blockedDates).sort().map((d) => (
                    <li key={d} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-[#daeaf7] bg-[#f4f8fd]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-[#2e7fcc]" />
                        <span className="text-sm font-semibold text-[#0f2744]">{d}</span>
                      </div>
                      <span className="text-xs text-[#4a7fa5] font-mono bg-white border border-[#c8ddf0] px-2 py-0.5 rounded-md">#{blockedDates[d]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 pb-4 flex justify-end">
              <button
                onClick={() => setShowBlockedModal(false)}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-[#1a5fa8] text-white hover:bg-[#154e8f] transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}