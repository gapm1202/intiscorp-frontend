import { useState, useEffect } from 'react';
import type { MantenimientoForm } from '../types';

interface Props {
  data: MantenimientoForm;
  onChange: (data: MantenimientoForm) => void;
}

const FRECUENCIAS = ['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Según demanda'];
const MODALIDADES = ['Presencial', 'Remoto', 'Mixto'];
const APLICA_OPTIONS = ['Servidores', 'PCs y laptops', 'Equipos de red', 'Impresoras', 'Todos los equipos'];

export default function Step3Mantenimiento({ data, onChange }: Props) {
  const [local, setLocal] = useState<MantenimientoForm>(data);

  useEffect(() => { setLocal(data); }, [data]);

  const update = (patch: Partial<MantenimientoForm>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  const inputCls = 'w-full px-3 py-2.5 bg-white rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide';

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Configure si el contrato incluye mantenimientos preventivos programados.</p>

      {/* Toggle principal */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">¿Incluye Mantenimiento Preventivo?</p>
            <p className="text-xs text-slate-400 mt-0.5">Revisiones periódicas programadas de los equipos del cliente</p>
          </div>
          <button
            type="button"
            onClick={() => update({ incluyePreventivo: !local.incluyePreventivo })}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${local.incluyePreventivo ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${local.incluyePreventivo ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Detalle – solo si está activo */}
      {local.incluyePreventivo && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frecuencia */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <label className={labelCls}>Frecuencia <span className="text-red-500">*</span></label>
              <select value={local.frecuencia} onChange={e => update({ frecuencia: e.target.value })} className={inputCls}>
                <option value="">-- Seleccionar --</option>
                {FRECUENCIAS.map(f => <option key={f} value={f.toLowerCase()}>{f}</option>)}
              </select>
            </div>

            {/* Modalidad */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <label className={labelCls}>Modalidad <span className="text-red-500">*</span></label>
              <select value={local.modalidad} onChange={e => update({ modalidad: e.target.value })} className={inputCls}>
                <option value="">-- Seleccionar --</option>
                {MODALIDADES.map(m => <option key={m} value={m.toLowerCase()}>{m}</option>)}
              </select>
            </div>

            {/* Aplica a */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <label className={labelCls}>Aplica a <span className="text-red-500">*</span></label>
              <select value={local.aplica} onChange={e => update({ aplica: e.target.value })} className={inputCls}>
                <option value="">-- Seleccionar --</option>
                {APLICA_OPTIONS.map(a => <option key={a} value={a.toLowerCase()}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <label className={labelCls}>Observaciones del Mantenimiento</label>
            <textarea
              rows={3}
              placeholder="Notas adicionales sobre el alcance o condiciones del mantenimiento..."
              value={local.observaciones}
              onChange={e => update({ observaciones: e.target.value })}
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Resumen visual */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-700 mb-2">✅ Resumen del Mantenimiento</p>
            <div className="flex flex-wrap gap-2">
              {local.frecuencia && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">🗓️ {local.frecuencia}</span>}
              {local.modalidad && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">📍 {local.modalidad}</span>}
              {local.aplica && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">🖥️ {local.aplica}</span>}
            </div>
          </div>
        </div>
      )}

      {!local.incluyePreventivo && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700">El contrato no incluirá mantenimiento preventivo programado.</p>
          <p className="text-xs text-amber-500 mt-1">Puede activarse en cualquier renovación futura.</p>
        </div>
      )}
    </div>
  );
}
