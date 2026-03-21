import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmpresas } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getContratoActivo } from '@/modules/empresas/services/contratosService';

type Option = {
  id: string;
  nombre: string;
};

type EstadoMantenimiento = 'PENDIENTE' | 'PROGRAMADO' | 'EJECUTADO' | 'ATRASADO';

type MantenimientoItem = {
  id: string;
  empresaId: string;
  empresaNombre: string;
  sedeId: string;
  sedeNombre: string;
  estado: EstadoMantenimiento;
  mes: number;
  anio: number;
  dia?: number;
};

type EstadoContratoPreventivo = 'SIN_EMPRESA' | 'CARGANDO' | 'PERMITIDO' | 'NO_INCLUIDO' | 'NO_CONFIGURADO';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const estadoStyles: Record<EstadoMantenimiento, { chip: string; dot: string; label: string }> = {
  PENDIENTE: {
    chip: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Pendiente',
  },
  PROGRAMADO: {
    chip: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Programado',
  },
  EJECUTADO: {
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Ejecutado',
  },
  ATRASADO: {
    chip: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Atrasado',
  },
};

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

function getIncludePreventivo(rawContrato: unknown): boolean | undefined {
  if (typeof rawContrato !== 'object' || rawContrato === null) return undefined;
  const contrato = rawContrato as Record<string, unknown>;

  const preventivePolicy = contrato.preventivePolicy as Record<string, unknown> | undefined;
  const preventivePolicyLegacy = contrato.preventive_policy as Record<string, unknown> | undefined;

  const include = preventivePolicy?.incluyePreventivo;
  const includeLegacy = preventivePolicyLegacy?.incluye_preventivo;
  const includeFlat = contrato.incluyePreventivo;

  if (typeof include === 'boolean') return include;
  if (typeof includeLegacy === 'boolean') return includeLegacy;
  if (typeof includeFlat === 'boolean') return includeFlat;
  return undefined;
}

function buildDemoMantenimientos(
  empresas: Option[],
  sedesByEmpresa: Record<string, Option[]>,
  mes: number,
  anio: number
): MantenimientoItem[] {
  const items: MantenimientoItem[] = [];

  empresas.slice(0, 8).forEach((empresa, index) => {
    const sedes = sedesByEmpresa[empresa.id] || [];
    const sede = sedes[0] || { id: `sede-${empresa.id}`, nombre: 'Sede principal' };

    items.push({
      id: `pend-${empresa.id}-${mes}-${anio}`,
      empresaId: empresa.id,
      empresaNombre: empresa.nombre,
      sedeId: sede.id,
      sedeNombre: sede.nombre,
      estado: 'PENDIENTE',
      mes,
      anio,
    });

    items.push({
      id: `prog-${empresa.id}-${mes}-${anio}`,
      empresaId: empresa.id,
      empresaNombre: empresa.nombre,
      sedeId: sede.id,
      sedeNombre: sede.nombre,
      estado: 'PROGRAMADO',
      mes,
      anio,
      dia: ((index * 3) % 26) + 2,
    });

    if (index % 2 === 0) {
      items.push({
        id: `done-${empresa.id}-${mes}-${anio}`,
        empresaId: empresa.id,
        empresaNombre: empresa.nombre,
        sedeId: sede.id,
        sedeNombre: sede.nombre,
        estado: 'EJECUTADO',
        mes,
        anio,
        dia: ((index * 4) % 24) + 3,
      });
    }

    if (index % 3 === 0) {
      items.push({
        id: `late-${empresa.id}-${mes}-${anio}`,
        empresaId: empresa.id,
        empresaNombre: empresa.nombre,
        sedeId: sede.id,
        sedeNombre: sede.nombre,
        estado: 'ATRASADO',
        mes,
        anio,
        dia: ((index * 5) % 22) + 4,
      });
    }
  });

  return items;
}

export default function MantenimientoPreventivoCalendar() {
  const navigate = useNavigate();
  const now = new Date();

  const [empresaId, setEmpresaId] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());

  const [empresas, setEmpresas] = useState<Option[]>([]);
  const [sedesByEmpresa, setSedesByEmpresa] = useState<Record<string, Option[]>>({});
  const [loadingData, setLoadingData] = useState(true);

  const [estadoContrato, setEstadoContrato] = useState<EstadoContratoPreventivo>('SIN_EMPRESA');
  const [selectedMantenimiento, setSelectedMantenimiento] = useState<MantenimientoItem | null>(null);

  const sedesDisponibles = useMemo(() => {
    if (!empresaId) return [];
    return sedesByEmpresa[empresaId] || [];
  }, [empresaId, sedesByEmpresa]);

  const mantenimientos = useMemo(() => {
    return buildDemoMantenimientos(empresas, sedesByEmpresa, mes, anio);
  }, [empresas, sedesByEmpresa, mes, anio]);

  const mantenimientosFiltrados = useMemo(() => {
    return mantenimientos.filter((item) => {
      const matchEmpresa = !empresaId || item.empresaId === empresaId;
      const matchSede = !sedeId || item.sedeId === sedeId;
      const matchMes = item.mes === mes;
      const matchAnio = item.anio === anio;
      return matchEmpresa && matchSede && matchMes && matchAnio;
    });
  }, [mantenimientos, empresaId, sedeId, mes, anio]);

  const pendientesMes = useMemo(() => {
    return mantenimientosFiltrados.filter((item) => item.estado === 'PENDIENTE');
  }, [mantenimientosFiltrados]);

  const itemsPorDia = useMemo(() => {
    const map = new Map<number, MantenimientoItem[]>();
    mantenimientosFiltrados
      .filter((item) => item.estado !== 'PENDIENTE' && typeof item.dia === 'number')
      .forEach((item) => {
        const day = item.dia as number;
        const existing = map.get(day) || [];
        existing.push(item);
        map.set(day, existing);
      });
    return map;
  }, [mantenimientosFiltrados]);

  const diasCalendario = useMemo(() => {
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);
    const diasEnMes = ultimoDia.getDate();

    const diaSemanaInicio = (primerDia.getDay() + 6) % 7;
    const days: Array<number | null> = [];

    for (let i = 0; i < diaSemanaInicio; i += 1) days.push(null);
    for (let d = 1; d <= diasEnMes; d += 1) days.push(d);

    return days;
  }, [anio, mes]);

  const canOperate = estadoContrato === 'SIN_EMPRESA' || estadoContrato === 'PERMITIDO';

  useEffect(() => {
    let active = true;

    const cargarBase = async () => {
      setLoadingData(true);
      try {
        const empresasResp = await getEmpresas();
        if (!active) return;

        const empresasList = toArray<Record<string, unknown>>(empresasResp)
          .map(mapEmpresaToOption)
          .filter((item): item is Option => item !== null);

        setEmpresas(empresasList);

        const sedesEntries: Array<[string, Option[]]> = await Promise.all(
          empresasList.map(async (empresa): Promise<[string, Option[]]> => {
            try {
              const sedesResp = await getSedesByEmpresa(empresa.id);
              const sedes = toArray<Record<string, unknown>>(sedesResp)
                .map(mapSedeToOption)
                .filter((item): item is Option => item !== null);
              return [empresa.id, sedes];
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
      } finally {
        if (active) setLoadingData(false);
      }
    };

    cargarBase();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const evaluarContrato = async () => {
      if (!empresaId) {
        setEstadoContrato('SIN_EMPRESA');
        return;
      }

      setEstadoContrato('CARGANDO');
      try {
        const contrato = await getContratoActivo(empresaId);
        if (!active) return;

        if (!contrato) {
          setEstadoContrato('NO_CONFIGURADO');
          return;
        }

        const includePreventivo = getIncludePreventivo(contrato);
        if (includePreventivo === true) {
          setEstadoContrato('PERMITIDO');
        } else if (includePreventivo === false) {
          setEstadoContrato('NO_INCLUIDO');
        } else {
          setEstadoContrato('NO_CONFIGURADO');
        }
      } catch {
        if (!active) return;
        setEstadoContrato('NO_CONFIGURADO');
      }
    };

    evaluarContrato();
    return () => {
      active = false;
    };
  }, [empresaId]);

  const actionLabel = useMemo(() => {
    if (!selectedMantenimiento) return '';
    if (selectedMantenimiento.estado === 'PENDIENTE') return 'Programar';
    if (selectedMantenimiento.estado === 'PROGRAMADO') return 'Iniciar mantenimiento';
    return 'Ver detalle';
  }, [selectedMantenimiento]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Empresa</label>
            <select
              value={empresaId}
              onChange={(e) => {
                setEmpresaId(e.target.value);
                setSedeId('');
                setSelectedMantenimiento(null);
              }}
              className="w-full px-4 py-2.5 border border-blue-100 rounded-xl text-sm bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            >
              <option value="">Todas las empresas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Sede</label>
            <select
              value={sedeId}
              onChange={(e) => {
                setSedeId(e.target.value);
                setSelectedMantenimiento(null);
              }}
              disabled={!empresaId}
              className="w-full px-4 py-2.5 border border-blue-100 rounded-xl text-sm bg-blue-50/50 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            >
              <option value="">Todas las sedes</option>
              {sedesDisponibles.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-blue-100 rounded-xl text-sm bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            >
              {MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Ano</label>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-blue-100 rounded-xl text-sm bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            >
              {[anio - 1, anio, anio + 1].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(Object.keys(estadoStyles) as EstadoMantenimiento[]).map((estado) => (
            <span
              key={estado}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${estadoStyles[estado].chip}`}
            >
              <span className={`w-2 h-2 rounded-full ${estadoStyles[estado].dot}`} />
              {estadoStyles[estado].label}
            </span>
          ))}
        </div>
      </div>

      {empresaId && estadoContrato !== 'PERMITIDO' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium">
            {estadoContrato === 'NO_INCLUIDO' && 'Esta empresa no tiene mantenimiento preventivo segun su contrato.'}
            {estadoContrato === 'NO_CONFIGURADO' && 'No se ha configurado el mantenimiento preventivo en el contrato de esta empresa.'}
            {estadoContrato === 'CARGANDO' && 'Validando contrato de la empresa...'}
          </div>
          {estadoContrato !== 'CARGANDO' && (
            <button
              onClick={() => navigate(`/admin/empresas/${empresaId}?tab=contrato`)}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition"
            >
              Ir a contrato
            </button>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Calendario mensual - {MONTHS[mes - 1]} {anio}
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            {mantenimientosFiltrados.length} mantenimiento{mantenimientosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-800 mb-2">Pendientes del mes</div>
            {pendientesMes.length === 0 ? (
              <p className="text-sm text-amber-700">No hay mantenimientos pendientes en este mes con los filtros actuales.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pendientesMes.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMantenimiento(item)}
                    className="text-left px-3 py-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-100 transition"
                  >
                    <p className="text-xs font-bold text-amber-800">{item.empresaNombre}</p>
                    <p className="text-xs text-amber-700">{item.sedeNombre} - mantenimiento pendiente este mes</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1 bg-slate-200 p-1 rounded-xl">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider text-center py-2 rounded-md">
                {day}
              </div>
            ))}

            {diasCalendario.map((dia, index) => (
              <div key={`${dia}-${index}`} className="min-h-[116px] bg-white rounded-md p-2">
                {dia ? (
                  <>
                    <div className="text-xs font-bold text-slate-600 mb-1">{dia}</div>
                    <div className="space-y-1">
                      {(itemsPorDia.get(dia) || []).slice(0, 2).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedMantenimiento(item)}
                          className={`w-full text-left px-2 py-1 rounded border text-[11px] font-semibold transition hover:shadow-sm ${estadoStyles[item.estado].chip}`}
                        >
                          <p className="truncate">{item.sedeNombre || item.empresaNombre}</p>
                        </button>
                      ))}
                      {(itemsPorDia.get(dia) || []).length > 2 && (
                        <p className="text-[11px] text-slate-500 font-semibold">+{(itemsPorDia.get(dia) || []).length - 2} mas</p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedMantenimiento && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Mantenimiento seleccionado</p>
              <h4 className="text-lg font-bold text-slate-800">{selectedMantenimiento.empresaNombre}</h4>
              <p className="text-sm text-slate-600">{selectedMantenimiento.sedeNombre}</p>
              <span className={`inline-flex mt-2 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${estadoStyles[selectedMantenimiento.estado].chip}`}>
                <span className={`w-2 h-2 rounded-full ${estadoStyles[selectedMantenimiento.estado].dot}`} />
                {estadoStyles[selectedMantenimiento.estado].label}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedMantenimiento(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={!canOperate || (selectedMantenimiento.estado !== 'PENDIENTE' && selectedMantenimiento.estado !== 'PROGRAMADO')}
                className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingData && (
        <div className="text-sm text-slate-500">Cargando calendario de mantenimientos...</div>
      )}
    </div>
  );
}
