import { useState, useEffect } from 'react';
import type { MantenimientoForm } from '../types';
import { getCategorias, type Category } from '@/modules/inventario/services/categoriasService';

interface Props {
  data: MantenimientoForm;
  onChange: (data: MantenimientoForm) => void;
}

const FRECUENCIAS = [
  'Mensual',
  'Cada 2 meses',
  'Cada 3 meses',
  'Cada 4 meses',
  'Cada 5 meses',
  'Cada 6 meses',
  'Cada 7 meses',
  'Cada 8 meses',
  'Cada 12 meses',
];
const MODALIDADES = ['Presencial', 'Remoto', 'Mixto'];

export default function Step3Mantenimiento({ data, onChange }: Props) {
  const [local, setLocal] = useState<MantenimientoForm>({ categoriasAplica: [], ...data });
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => { setLocal({ categoriasAplica: [], ...data }); }, [data]);

  // Carga categorías solo cuando se selecciona "por_categoria"
  useEffect(() => {
    if (local.aplica === 'por_categoria' && categorias.length === 0) {
      setLoadingCats(true);
      getCategorias()
        .then(setCategorias)
        .finally(() => setLoadingCats(false));
    }
  }, [local.aplica]);

  const update = (patch: Partial<MantenimientoForm>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  const toggleCategoria = (id: string) => {
    const current = local.categoriasAplica ?? [];
    const next = current.includes(id)
      ? current.filter(c => c !== id)
      : [...current, id];
    update({ categoriasAplica: next });
  };

  const inputCls = 'w-full px-3 py-2.5 bg-white rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide';

  const aplicaLabel = local.aplica === 'todos' ? 'Todos los activos' : local.aplica === 'por_categoria' ? 'Por categoría' : '';

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
              <select
                value={local.aplica}
                onChange={e => update({ aplica: e.target.value, categoriasAplica: [] })}
                className={inputCls}
              >
                <option value="">-- Seleccionar --</option>
                <option value="todos">Todos los activos</option>
                <option value="por_categoria">Por categoría</option>
              </select>
            </div>
          </div>

          {/* Selector de categorías – solo cuando aplica = por_categoria */}
          {local.aplica === 'por_categoria' && (
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <label className={labelCls}>Categorías de activos <span className="text-red-500">*</span></label>
              {loadingCats ? (
                <p className="text-sm text-slate-400 mt-2">Cargando categorías...</p>
              ) : categorias.length === 0 ? (
                <p className="text-sm text-slate-400 mt-2">No hay categorías registradas.</p>
              ) : (
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categorias.map(cat => {
                    const id = String(cat.id ?? cat.codigo ?? cat.nombre);
                    const selected = (local.categoriasAplica ?? []).includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleCategoria(id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                          selected
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                          {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        {cat.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
              {(local.categoriasAplica ?? []).length > 0 && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  {local.categoriasAplica.length} categoría{local.categoriasAplica.length !== 1 ? 's' : ''} seleccionada{local.categoriasAplica.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

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
              {aplicaLabel && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">🖥️ {aplicaLabel}</span>}
              {local.aplica === 'por_categoria' && (local.categoriasAplica ?? []).map(id => {
                const cat = categorias.find(c => String(c.id ?? c.codigo ?? c.nombre) === id);
                return cat ? <span key={id} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{cat.nombre}</span> : null;
              })}
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
