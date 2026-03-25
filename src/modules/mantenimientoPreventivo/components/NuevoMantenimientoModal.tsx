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
          // si estamos editando el mismo mantenimiento, no bloquear esa fecha
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
    return () => {
      active = false;
    };
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
        sedesEntries.forEach(([id, sedes]) => {
          nextSedesByEmpresa[id] = sedes;
        });

        setSedesByEmpresa(nextSedesByEmpresa);

        // si editing está presente, prefill campos desde backend (para obtener tecnicos asignados)
        if (editing && editing.id) {
          try {
            const full = await getMantenimientoPreventivoById(editing.id);
            if (full) {
              // varios formatos posibles desde backend
              const empresaIdRaw = full.empresaId ?? full.empresa_id ?? full.empresa;
              const sedeIdRaw = full.sedeId ?? full.sede_id ?? full.sede;
              const fechaRaw = full.fechaProgramada ?? full.fecha_programada ?? full.fecha ?? '';

              setEmpresaId(String(empresaIdRaw ?? editing.empresaId ?? '') || '');
              setSedeId(String(sedeIdRaw ?? editing.sedeId ?? '') || '');
              setFecha(fechaRaw ? String(fechaRaw).slice(0, 10) : (editing.fecha ? String(editing.fecha).slice(0,10) : ''));

              const extracted = extractTecnicos(full);
              let tecnicoIds: string[] = extracted.tecnicoIds;
              let encargadoIdVal: string | undefined = extracted.encargadoId || undefined;

              // fallback: si editing prop tiene tecnicoIds, úsalo
              if (tecnicoIds.length === 0 && Array.isArray(editing.tecnicoIds) && editing.tecnicoIds.length > 0) {
                tecnicoIds = editing.tecnicoIds.map(String);
              }

              // fallback encargado
              if (!encargadoIdVal && editing.encargadoId) encargadoIdVal = editing.encargadoId;
              if (!encargadoIdVal && tecnicoIds.length === 1) encargadoIdVal = tecnicoIds[0];

              setTecnicosSeleccionados(tecnicoIds);
              setEncargadoId(encargadoIdVal || '');
              setObservaciones(String(full.observaciones ?? full.observacion ?? editing.observaciones ?? ''));
            } else {
              // no hay detalle, usar lo que venga en editing
              setEmpresaId(editing.empresaId || '');
              setSedeId(editing.sedeId || '');
              setFecha(editing.fecha ? String(editing.fecha).slice(0, 10) : '');
              setTecnicosSeleccionados(Array.isArray(editing.tecnicoIds) ? editing.tecnicoIds : []);
              setEncargadoId(editing.encargadoId || '');
              setObservaciones(editing.observaciones || '');
            }
          } catch (e) {
            // si falla la carga detallada, mantener lo mínimo
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
        setLoadError('No se pudieron cargar empresas, sedes o tecnicos.');
      } finally {
        if (active) setLoadingData(false);
      }
    };

    cargarDatos();
    return () => {
      active = false;
    };
  }, [editing]);

  // Cuando cambia la empresa seleccionada, comprobar si el contrato incluye preventivo
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
          // Normalizar wrapper comunes (data, contract, result)
          const normalized = (contrato as any).data ?? (contrato as any).contract ?? (contrato as any).result ?? contrato;
          console.debug('[DEBUG] contrato activo (normalized):', normalized);

          // Normalizar distintas posibles rutas y nombres que devuelve el backend
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

          const candidatesNo = [
            contrato.mantenimientoPreventivo === false ? false : undefined,
            contrato.mantenimiento_preventivo === false ? false : undefined,
            contrato.incluyePreventivo === false ? false : undefined,
            contrato.incluye_preventivo === false ? false : undefined,
            contractSafeGet(preventivePolicy, 'incluyePreventivo') === false ? false : undefined,
            contractSafeGet(preventivePolicy, 'incluye_preventivo') === false ? false : undefined,
            contractSafeGet(services, 'mantenimientoPreventivo') === false ? false : undefined,
          ];

          // evaluar yes
          let foundYes = false;
          for (const c of candidatesYes) {
            const r = val(c);
            if (r === true) { foundYes = true; break; }
          }

          if (foundYes) {
            setEmpresaPreventivoStatus('enabled');
          } else {
            // evaluar no-explicit
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

    return () => {
      activeCheck = false;
    };
  }, [empresaId]);

  const labelCls = 'block text-sm font-semibold text-slate-700 mb-2';
  const inputCls =
    'w-full px-4 py-2.5 border border-blue-100 rounded-xl text-sm bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition';

  const canStart = Boolean(empresaId && sedeId && fecha && tecnicosSeleccionados.length > 0 && encargadoId);

  const title = editing ? 'Editar mantenimiento' : 'Nuevo mantenimiento';
  const submitLabel = editing ? 'Guardar cambios' : 'Crear mantenimiento';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-linear-to-r from-blue-900 to-blue-700 px-7 py-5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-0.5">Mantenimiento Preventivo</p>
            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-200 hover:bg-white/20 hover:text-white transition" aria-label="Cerrar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          className="flex-1 overflow-y-auto"
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
                  empresaId,
                  sedeId,
                  fecha,
                  tecnicoIds: tecnicosSeleccionados,
                  encargadoId,
                  observaciones,
                });

                onUpdated?.({ id: editing.id });
                onClose();
                return;
              }

              const created = await createMantenimientoPreventivo({
                empresaId,
                sedeId,
                fecha,
                tecnicoIds: tecnicosSeleccionados,
                encargadoId,
                observaciones,
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
          <div className="px-7 py-6 space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Empresa</label>
                <select
                  value={empresaId}
                  onChange={(e) => {
                    setEmpresaId(e.target.value);
                    setSedeId('');
                  }}
                  disabled={loadingData}
                  className={inputCls}
                >
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Sede</label>
                <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} disabled={!empresaId || loadingData} className={inputCls}>
                  <option value="">Seleccionar sede...</option>
                  {sedesDisponibles.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {empresaId && (
              <div className="mt-3">
                {empresaPreventivoStatus === 'checking' && (
                  <div className="rounded-lg border px-4 py-3 text-sm font-medium bg-slate-50 border-slate-200 text-slate-600">Comprobando configuración del contrato...</div>
                )}

                {empresaPreventivoStatus === 'no_contract' && (
                  <div className="rounded-lg border px-4 py-3 text-sm font-semibold bg-red-50 border-red-200 text-red-700 flex items-center justify-between">
                    <div>No se ha configurado el mantenimiento preventivo en el contrato de esta empresa.</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem(`empresaTab_${empresaId}`, 'contrato');
                          window.location.href = `/admin/empresas/${empresaId}`;
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
                      >
                        Ir a contrato
                      </button>
                    </div>
                  </div>
                )}

                {empresaPreventivoStatus === 'disabled' && (
                  <div className="rounded-lg border px-4 py-3 text-sm font-semibold bg-red-50 border-red-200 text-red-700 flex items-center justify-between">
                    <div>Esta empresa no tiene habilitado el mantenimiento preventivo en su contrato.</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem(`empresaTab_${empresaId}`, 'contrato');
                          window.location.href = `/admin/empresas/${empresaId}`;
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
                      >
                        Ir a contrato
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={labelCls}>Fecha del mantenimiento</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => {
                  const val = e.target.value;
                  // si la fecha está bloqueada por otro mantenimiento, impedir selección
                  if (val && blockedDates[val]) {
                    setSaveError('La fecha seleccionada ya tiene un mantenimiento programado. Elige otra fecha.');
                    return;
                  }
                  setSaveError(null);
                  setFecha(val);
                }}
                className={inputCls + ' max-w-xs'}
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockedModal(true)}
                  disabled={checkingBlockedDates || Object.keys(blockedDates).length === 0}
                  className={`ml-2 text-sm px-3 py-1.5 rounded-lg border ${checkingBlockedDates || Object.keys(blockedDates).length === 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  {checkingBlockedDates ? 'Comprobando...' : 'Ver fechas ocupadas'}
                </button>
              </div>
              {showBlockedModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold">Fechas ocupadas</h3>
                      <button onClick={() => setShowBlockedModal(false)} className="text-slate-500 hover:text-slate-700">Cerrar</button>
                    </div>
                    <div className="max-h-60 overflow-auto text-sm text-slate-700">
                      {Object.keys(blockedDates).length === 0 ? (
                        <p className="text-slate-500">No hay fechas ocupadas para la empresa/sede seleccionada.</p>
                      ) : (
                        <ul className="space-y-2">
                          {Object.keys(blockedDates).sort().map((d) => (
                            <li key={d} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                              <span>{d}</span>
                              <span className="text-xs text-slate-400">ID {blockedDates[d]}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Tecnicos asignados</label>
              <select
                multiple
                value={tecnicosSeleccionados}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                  setTecnicosSeleccionados(selected);
                  if (!selected.includes(encargadoId)) setEncargadoId('');
                }}
                disabled={loadingData}
                className={inputCls + ' min-h-40'}
              >
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">Mantén presionada la tecla Ctrl para seleccionar varios tecnicos.</p>

              {tecnicosSeleccionadosData.length > 0 ? (
                <div className="mt-3 space-y-2 bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 pb-1">Seleccionados: {tecnicosSeleccionadosData.length} - marca un encargado</p>
                  {tecnicosSeleccionadosData.map((tecnico) => {
                    const esEncargado = tecnico.id === encargadoId;
                    return (
                      <div key={tecnico.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border transition ${esEncargado ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{tecnico.nombre}</span>
                          {esEncargado && <span className="inline-flex items-center text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Encargado</span>}
                        </div>
                        <button type="button" onClick={() => setEncargadoId(tecnico.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${esEncargado ? 'bg-blue-100 text-blue-700 cursor-default' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} disabled={esEncargado}>
                          {esEncargado ? 'Encargado actual' : 'Marcar encargado'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-3">Selecciona tecnicos para definir al encargado</div>
              )}
            </div>

            {(loadingData || loadError) && (
              <div className="rounded-lg border px-4 py-3 text-sm font-medium bg-slate-50 border-slate-200 text-slate-600">{loadingData ? 'Cargando empresas, sedes y tecnicos...' : loadError}</div>
            )}

            <div>
              <label className={labelCls}>Observaciones</label>
              <textarea rows={4} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas adicionales del mantenimiento..." className={inputCls + ' resize-none'} />
            </div>

            {saveError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{saveError}</div>}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-7 py-4 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">Cancelar</button>
            <button type="submit" disabled={!canStart || saving || empresaPreventivoStatus === 'no_contract' || empresaPreventivoStatus === 'disabled'} className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition shadow-md shadow-blue-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              {saving ? (editing ? 'Guardando...' : 'Creando...') : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
