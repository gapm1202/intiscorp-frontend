import { useState, useEffect } from 'react';
import type { ServiciosForm, ServicioPersonalizado } from '../types';

interface Props {
  data: ServiciosForm;
  onChange: (data: ServiciosForm) => void;
}

const SERVICIOS_BASE: Array<{ key: keyof ServiciosForm; label: string; desc: string; icon: string }> = [
  { key: 'soporteRemoto', label: 'Soporte Remoto', desc: 'Atención y resolución de incidencias de forma remota', icon: '💻' },
  { key: 'soportePresencial', label: 'Soporte Presencial', desc: 'Visitas técnicas en las instalaciones del cliente', icon: '🏢' },
  { key: 'mantenimientoPreventivo', label: 'Mantenimiento Preventivo', desc: 'Revisiones periódicas programadas de equipos', icon: '🔧' },
  { key: 'gestionInventario', label: 'Gestión de Inventario', desc: 'Control y registro del inventario tecnológico', icon: '📦' },
  { key: 'gestionCredenciales', label: 'Gestión de Credenciales', desc: 'Administración de accesos y contraseñas', icon: '🔑' },
  { key: 'monitoreo', label: 'Monitoreo', desc: 'Supervisión continua de sistemas e infraestructura', icon: '📡' },
  { key: 'informesMensuales', label: 'Informes Mensuales', desc: 'Reportes de actividad y KPIs del servicio', icon: '📊' },
  { key: 'gestionAccesos', label: 'Gestión de Accesos', desc: 'Control de permisos y roles de usuarios', icon: '🔐' },
];

export default function Step2Servicios({ data, onChange }: Props) {
  const [local, setLocal] = useState<ServiciosForm>(data);
  const [nuevoServicioNombre, setNuevoServicioNombre] = useState('');
  const [showAgregar, setShowAgregar] = useState(false);

  useEffect(() => { setLocal(data); }, [data]);

  const update = (patch: Partial<ServiciosForm>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  const toggleServicio = (key: keyof ServiciosForm) => {
    update({ [key]: !local[key] });
  };

  const agregarServicioPersonalizado = () => {
    const nombre = nuevoServicioNombre.trim();
    if (!nombre) return;
    const nuevo: ServicioPersonalizado = { id: crypto.randomUUID(), nombre, activo: true };
    update({ serviciosPersonalizados: [...local.serviciosPersonalizados, nuevo] });
    setNuevoServicioNombre('');
    setShowAgregar(false);
  };

  const toggleServicioPersonalizado = (id: string) => {
    update({
      serviciosPersonalizados: local.serviciosPersonalizados.map(s =>
        s.id === id ? { ...s, activo: !s.activo } : s
      ),
    });
  };

  const eliminarServicioPersonalizado = (id: string) => {
    update({ serviciosPersonalizados: local.serviciosPersonalizados.filter(s => s.id !== id) });
  };

  const inputCls = 'w-full px-3 py-2.5 bg-white rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Seleccione los servicios incluidos en este contrato.</p>

      {/* Servicios base */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SERVICIOS_BASE.map(({ key, label, desc, icon }) => {
          const active = Boolean(local[key]);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleServicio(key)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                active
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-slate-800'}`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                active ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              }`}>
                {active && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horas mensuales */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">⏰ Horas de Servicio</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Horas Mensuales Incluidas</label>
            <input
              type="number" min="0" placeholder="0"
              value={local.horasMensualesIncluidas}
              onChange={e => update({ horasMensualesIncluidas: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Exceso facturable</p>
              <p className="text-xs text-slate-400">Las horas extra se facturan por separado</p>
            </div>
            <button
              type="button"
              onClick={() => update({ excesoHorasFacturable: !local.excesoHorasFacturable })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${local.excesoHorasFacturable ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${local.excesoHorasFacturable ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Servicios personalizados */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">✨ Servicios Adicionales</p>
          <button
            type="button"
            onClick={() => setShowAgregar(!showAgregar)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            + Agregar
          </button>
        </div>

        {showAgregar && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre del servicio personalizado"
              value={nuevoServicioNombre}
              onChange={e => setNuevoServicioNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarServicioPersonalizado()}
              className={inputCls}
              autoFocus
            />
            <button type="button" onClick={agregarServicioPersonalizado} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Agregar</button>
            <button type="button" onClick={() => setShowAgregar(false)} className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300">✕</button>
          </div>
        )}

        {local.serviciosPersonalizados.length === 0 && !showAgregar && (
          <p className="text-xs text-slate-400">No hay servicios adicionales configurados.</p>
        )}

        <div className="space-y-2">
          {local.serviciosPersonalizados.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2.5">
              <button
                type="button"
                onClick={() => toggleServicioPersonalizado(s.id)}
                className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${s.activo ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}
              >
                {s.activo && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </button>
              <span className="text-sm text-slate-800 flex-1">{s.nombre}</span>
              <button type="button" onClick={() => eliminarServicioPersonalizado(s.id)} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
