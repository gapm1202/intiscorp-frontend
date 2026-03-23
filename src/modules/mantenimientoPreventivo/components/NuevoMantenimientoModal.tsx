import { useEffect, useMemo, useState } from 'react';
import { getEmpresas } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { usuariosInternosService } from '@/modules/usuarios/services/usuariosInternosService';
import type { UsuarioInterno } from '@/modules/usuarios/types/usuariosInternos.types';
import { createMantenimientoPreventivo } from '../services/mantenimientosPreventivosService';

type Option = {
  id: string;
  nombre: string;
};

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
}

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

export default function NuevoMantenimientoModal({ onClose, onStart }: NuevoMantenimientoModalProps) {
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

  const sedesDisponibles = useMemo(() => {
    return sedesByEmpresa[empresaId] || [];
  }, [empresaId, sedesByEmpresa]);

  const tecnicosSeleccionadosData = useMemo(() => {
    return tecnicos.filter((tecnico) => tecnicosSeleccionados.includes(tecnico.id));
  }, [tecnicos, tecnicosSeleccionados]);

  useEffect(() => {
    let active = true;

    const cargarDatos = async () => {
      setLoadingData(true);
      setLoadError(null);

      try {
        const [empresasResp, usuariosResp] = await Promise.all([
          getEmpresas(),
          usuariosInternosService.getAll(),
        ]);

        if (!active) return;

        const empresasList = toArray<Record<string, unknown>>(empresasResp)
          .map(mapEmpresaToOption)
          .filter((item): item is Option => item !== null);

        setEmpresas(empresasList);

        const usuariosFiltrados = (Array.isArray(usuariosResp) ? usuariosResp : [])
          .filter((usuario: UsuarioInterno) => usuario.activo && (usuario.rol === 'administrador' || usuario.rol === 'tecnico'))
          .map((usuario: UsuarioInterno) => ({ id: String(usuario.id), nombre: usuario.nombreCompleto }));

        setTecnicos(usuariosFiltrados);

        const sedesEntries: Array<[string, Option[]]> = await Promise.all(
          empresasList.map(async (empresa): Promise<[string, Option[]]> => {
            try {
              const sedesResp = await getSedesByEmpresa(empresa.id);
              const sedesList = toArray<Record<string, unknown>>(sedesResp)
                .map(mapSedeToOption)
                .filter((item): item is Option => item !== null);
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
      } catch {
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
  }, []);

  const labelCls = 'block text-sm font-semibold text-slate-700 mb-2';
  const inputCls =
    'w-full px-4 py-2.5 border border-blue-100 rounded-xl text-sm bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition';

  const canStart = Boolean(
    empresaId &&
      sedeId &&
      fecha &&
      tecnicosSeleccionados.length > 0 &&
      encargadoId
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-linear-to-r from-blue-900 to-blue-700 px-7 py-5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-0.5">Mantenimiento Preventivo</p>
            <h2 className="text-xl font-bold text-white tracking-tight">Nuevo mantenimiento</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-200 hover:bg-white/20 hover:text-white transition"
            aria-label="Cerrar"
          >
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
              const message = error instanceof Error ? error.message : 'No se pudo crear el mantenimiento.';
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
                <select
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  disabled={!empresaId || loadingData}
                  className={inputCls}
                >
                  <option value="">Seleccionar sede...</option>
                  {sedesDisponibles.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Fecha del mantenimiento</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputCls + ' max-w-xs'}
              />
            </div>

            <div>
              <label className={labelCls}>Tecnicos asignados</label>
              <select
                multiple
                value={tecnicosSeleccionados}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                  setTecnicosSeleccionados(selected);
                  if (!selected.includes(encargadoId)) {
                    setEncargadoId('');
                  }
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 pb-1">
                    Seleccionados: {tecnicosSeleccionadosData.length} - marca un encargado
                  </p>
                  {tecnicosSeleccionadosData.map((tecnico) => {
                    const esEncargado = tecnico.id === encargadoId;
                    return (
                      <div
                        key={tecnico.id}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                          esEncargado
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{tecnico.nombre}</span>
                          {esEncargado && (
                            <span className="inline-flex items-center text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                              Encargado
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEncargadoId(tecnico.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            esEncargado
                              ? 'bg-blue-100 text-blue-700 cursor-default'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          disabled={esEncargado}
                        >
                          {esEncargado ? 'Encargado actual' : 'Marcar encargado'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-3">
                  Selecciona tecnicos para definir al encargado
                </div>
              )}
            </div>

            {(loadingData || loadError) && (
              <div className="rounded-lg border px-4 py-3 text-sm font-medium bg-slate-50 border-slate-200 text-slate-600">
                {loadingData ? 'Cargando empresas, sedes y tecnicos...' : loadError}
              </div>
            )}

            <div>
              <label className={labelCls}>Observaciones</label>
              <textarea
                rows={4}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales del mantenimiento..."
                className={inputCls + ' resize-none'}
              />
            </div>

            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {saveError}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-7 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canStart || saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition shadow-md shadow-blue-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              {saving ? 'Creando...' : 'Crear mantenimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
