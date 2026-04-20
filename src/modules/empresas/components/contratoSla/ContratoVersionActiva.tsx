import type { ContratoVersion } from './types';

interface Props {
  contrato: ContratoVersion;
  onRenovar: () => void;
  mostrarBotonRenovar: boolean;
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-800">{display}</p>
    </div>
  );
}

function Chip({ children, color = 'slate' }: { children: React.ReactNode; color?: 'blue' | 'emerald' | 'red' | 'amber' | 'violet' | 'slate' }) {
  const cls: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${cls[color]}`}>{children}</span>;
}

function estadoColor(estado?: string): 'emerald' | 'red' | 'amber' | 'slate' {
  const s = (estado || '').toLowerCase();
  if (s === 'activo' || s === 'vigente') return 'emerald';
  if (s === 'vencido' || s === 'expirado') return 'red';
  if (s === 'suspendido') return 'amber';
  return 'slate';
}

function calcularVigencia(fechaInicio?: string, fechaFin?: string): string {
  if (!fechaInicio || !fechaFin) return '—';
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diffMonths = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
  if (diffMonths >= 12) {
    const y = Math.floor(diffMonths / 12), m = diffMonths % 12;
    return m === 0 ? `${y} año${y > 1 ? 's' : ''}` : `${y} año${y > 1 ? 's' : ''} y ${m} mes${m > 1 ? 'es' : ''}`;
  }
  if (diffMonths > 0) return `${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
  const diffDays = Math.ceil((fin.getTime() - inicio.getTime()) / 86400000);
  return `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

const SERVICIOS_LABELS: Record<string, string> = {
  soporteRemoto: '💻 Soporte Remoto',
  soportePresencial: '🏢 Soporte Presencial',
  mantenimientoPreventivo: '🔧 Mant. Preventivo',
  gestionInventario: '📦 Gestión Inventario',
  gestionCredenciales: '🔑 Gestión Credenciales',
  monitoreo: '📡 Monitoreo',
  informesMensuales: '📊 Informes Mensuales',
  gestionAccesos: '🔐 Gestión Accesos',
};

export default function ContratoVersionActiva({ contrato, onRenovar, mostrarBotonRenovar }: Props) {
  const d = contrato.datosContrato;
  const s = contrato.servicios;
  const m = contrato.mantenimiento;
  const e = contrato.economicas;
  const sla = contrato.alcanceSla;
  const tiempos = contrato.tiemposSla;

  const simbolo = e?.moneda === 'USD' ? '$' : e?.moneda === 'EUR' ? '€' : 'S/';

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-black">V{contrato.version}</span>
              <Chip color={estadoColor(contrato.estado) as any}>
                {(contrato.estado || 'activo').toUpperCase()}
              </Chip>
            </div>
            <p className="text-blue-100 text-sm">
              {formatDate(d?.fechaInicio)} → {formatDate(d?.fechaFin)}
              <span className="ml-2 opacity-70">({calcularVigencia(d?.fechaInicio, d?.fechaFin)})</span>
            </p>
            {d?.tipoContrato && <p className="text-blue-200 text-xs mt-1 capitalize">{d.tipoContrato}</p>}
          </div>
          <div className="text-right">
            {e?.montoReferencial && (
              <div>
                <p className="text-blue-300 text-xs">Monto referencial</p>
                <p className="text-2xl font-bold">{simbolo} {parseFloat(e.montoReferencial).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                {e.tipoFacturacion && <p className="text-blue-200 text-xs capitalize">{e.tipoFacturacion}</p>}
              </div>
            )}
            {mostrarBotonRenovar && (
              <button
                onClick={onRenovar}
                className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/30 flex items-center gap-2 ml-auto"
              >
                🔁 Renovar contrato
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Datos del contrato */}
      {d && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">📋 Datos del Contrato</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Tipo de contrato" value={d.tipoContrato} />
            <Field label="Estado" value={d.estadoContrato} />
            <Field label="Fecha de inicio" value={formatDate(d.fechaInicio)} />
            <Field label="Fecha de fin" value={formatDate(d.fechaFin)} />
            <Field label="Vigencia" value={calcularVigencia(d.fechaInicio, d.fechaFin)} />
            <Field label="Renovación automática" value={d.renovacionAutomatica} />
            {d.responsableComercial && <Field label="Responsable comercial" value={d.responsableComercial} />}
            {d.visitaFrecuencia && <Field label="Frecuencia de visitas" value={d.visitaFrecuencia} />}
            {d.cantidadVisitas && <Field label="Cantidad de visitas" value={d.cantidadVisitas} />}
          </div>
          {d.observacionesContractuales && (
            <div className="mt-3 bg-slate-50 rounded-xl border border-slate-100 p-3.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Observaciones</p>
              <p className="text-sm text-slate-700">{d.observacionesContractuales}</p>
            </div>
          )}
        </div>
      )}

      {/* Servicios */}
      {s && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-800 mb-4">📦 Servicios Incluidos</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(SERVICIOS_LABELS).map(([key, label]) => {
              const active = Boolean(s[key as keyof typeof s]);
              return active ? (
                <span key={key} className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-full">{label}</span>
              ) : null;
            })}
            {s.serviciosPersonalizados?.filter(p => p.activo).map(p => (
              <span key={p.id} className="text-xs bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-full">✨ {p.nombre}</span>
            ))}
          </div>
          {(s.horasMensualesIncluidas || s.excesoHorasFacturable) && (
            <div className="flex flex-wrap gap-3">
              {s.horasMensualesIncluidas && <Field label="Horas mensuales" value={s.horasMensualesIncluidas + ' h'} />}
              {s.excesoHorasFacturable && <Field label="Exceso facturable" value={true} />}
            </div>
          )}
        </div>
      )}

      {/* Mantenimiento */}
      {m && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-800 mb-4">🔧 Mantenimiento Preventivo</h4>
          {!m.incluyePreventivo ? (
            <p className="text-sm text-slate-400 italic">No incluye mantenimiento preventivo.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Frecuencia" value={m.frecuencia} />
              <Field label="Modalidad" value={m.modalidad} />
              <Field label="Aplica a" value={m.aplica} />
              {m.observaciones && <Field label="Observaciones" value={m.observaciones} />}
            </div>
          )}
        </div>
      )}

      {/* Económicas */}
      {e && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-800 mb-4">💰 Condiciones Económicas</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Tipo de facturación" value={e.tipoFacturacion} />
            <Field label="Moneda" value={e.moneda} />
            {e.montoReferencial && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-3.5 col-span-1">
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-1">Monto referencial</p>
                <p className="text-lg font-bold text-blue-700">{simbolo} {parseFloat(e.montoReferencial).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
              </div>
            )}
            {e.diaFacturacion && <Field label="Día de facturación" value={'Día ' + e.diaFacturacion} />}
          </div>
          {e.observaciones && (
            <div className="mt-3 bg-slate-50 rounded-xl border border-slate-100 p-3.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Observaciones</p>
              <p className="text-sm text-slate-700">{e.observaciones}</p>
            </div>
          )}
        </div>
      )}

      {/* SLA Alcance */}
      {sla && (
        <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-800 mb-4">⚡ SLA – Resumen</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="SLA Activo" value={sla.slaActivo} />
            <Field label="Aplica a" value={sla.aplicaA} />
            <Field label="Servicios cubiertos" value={sla.serviciosCatalogoSLA?.tipo === 'todos' ? 'Todos los servicios' : `${sla.serviciosCatalogoSLA?.servicios?.length || 0} seleccionados`} />
            <Field label="Activos cubiertos" value={sla.activosCubiertos?.tipo === 'todos' ? 'Todos' : 'Por categoría'} />
            <Field label="Sedes cubiertas" value={sla.sedesCubiertas?.tipo === 'todas' ? 'Todas' : `${sla.sedesCubiertas?.sedes?.length || 0} seleccionadas`} />
          </div>
        </div>
      )}

      {/* SLA Tiempos */}
      {tiempos && tiempos.tiemposPorPrioridad?.length > 0 && (
        <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-800 mb-4">⏱️ Tiempos por Prioridad</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Prioridad', 'Respuesta', 'Resolución', 'Escalamiento'].map(h => (
                    <th key={h} className="px-4 py-2 text-xs font-semibold text-slate-500 text-left uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiempos.tiemposPorPrioridad.map(t => {
                  const colors: Record<string, string> = { critica: 'text-red-600', alta: 'text-orange-600', media: 'text-yellow-700', baja: 'text-green-700' };
                  return (
                    <tr key={t.prioridad} className="border-t border-slate-100">
                      <td className={`px-4 py-3 font-bold capitalize ${colors[t.prioridad] || 'text-slate-700'}`}>{t.prioridad}</td>
                      <td className="px-4 py-3 text-slate-600">{t.tiempoRespuesta}</td>
                      <td className="px-4 py-3 text-slate-600">{t.tiempoResolucion}</td>
                      <td className="px-4 py-3 text-slate-600">{t.escalamiento ? `✅ ${t.tiempoEscalamiento || '—'}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
