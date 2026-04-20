import { useState, useEffect } from 'react';
import type { DatosContratoForm } from '../contratoSla/types';

interface Props {
  data: DatosContratoForm;
  onChange: (data: DatosContratoForm) => void;
  usuariosAdmin?: Array<{ id: string; nombre: string }>;
}

const TIPOS_CONTRATO = ['Servicio Anual', 'Servicio Mensual', 'Proyecto Puntual', 'Soporte On-demand', 'Otro'];

export default function Step1DatosContrato({ data, onChange, usuariosAdmin = [] }: Props) {
  const [local, setLocal] = useState<DatosContratoForm>(data);

  // Sync parent → local when data changes externally (prefill on renewal)
  useEffect(() => {
    setLocal(data);
  }, [data]);

  const update = (field: keyof DatosContratoForm, value: unknown) => {
    const next = { ...local, [field]: value };
    setLocal(next);
    onChange(next);
  };

  // Auto-compute estadoContrato from fechaFin
  useEffect(() => {
    if (!local.fechaFin) {
      update('estadoContrato', '');
      return;
    }
    if (local.estadoContrato === 'suspendido') return;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fin = new Date(local.fechaFin); fin.setHours(0, 0, 0, 0);
    const nuevoEstado = fin >= hoy ? 'activo' : 'vencido';
    if (local.estadoContrato !== nuevoEstado) update('estadoContrato', nuevoEstado);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.fechaFin]);

  const inputCls = 'w-full px-3 py-2.5 bg-white rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';
  const fieldWrap = 'bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-1';

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Complete los datos principales del contrato con el cliente.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo de contrato */}
        <div className={fieldWrap}>
          <label className={labelCls}>Tipo de Contrato <span className="text-red-500">*</span></label>
          <select value={local.tipoContrato} onChange={e => update('tipoContrato', e.target.value)} className={inputCls}>
            <option value="">-- Seleccionar --</option>
            {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Estado */}
        <div className={fieldWrap}>
          <label className={labelCls}>Estado</label>
          <div className={`${inputCls} bg-slate-100 cursor-not-allowed flex items-center gap-2`}>
            <span className={`inline-block w-2 h-2 rounded-full ${
              local.estadoContrato === 'activo' ? 'bg-emerald-500' :
              local.estadoContrato === 'vencido' ? 'bg-red-500' :
              local.estadoContrato === 'suspendido' ? 'bg-yellow-500' : 'bg-slate-400'
            }`} />
            <span className="text-sm capitalize">{local.estadoContrato || 'Se calcula automáticamente'}</span>
          </div>
        </div>

        {/* Fecha inicio */}
        <div className={fieldWrap}>
          <label className={labelCls}>Fecha de Inicio <span className="text-red-500">*</span></label>
          <input type="date" value={local.fechaInicio} onChange={e => update('fechaInicio', e.target.value)} className={inputCls} />
        </div>

        {/* Fecha fin */}
        <div className={fieldWrap}>
          <label className={labelCls}>Fecha de Fin <span className="text-red-500">*</span></label>
          <input type="date" value={local.fechaFin} onChange={e => update('fechaFin', e.target.value)} className={inputCls} />
        </div>

        {/* Responsable comercial */}
        <div className={fieldWrap}>
          <label className={labelCls}>Responsable Comercial</label>
          {usuariosAdmin.length > 0 ? (
            <select value={local.responsableComercial} onChange={e => update('responsableComercial', e.target.value)} className={inputCls}>
              <option value="">-- Seleccionar --</option>
              {usuariosAdmin.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
            </select>
          ) : (
            <input type="text" placeholder="Nombre del responsable" value={local.responsableComercial} onChange={e => update('responsableComercial', e.target.value)} className={inputCls} />
          )}
        </div>

        {/* Renovación automática */}
        <div className={fieldWrap + ' flex items-center justify-between'}>
          <div>
            <p className={labelCls + ' mb-0'}>Renovación Automática</p>
            <p className="text-xs text-slate-400 mt-0.5">El contrato se renueva solo al vencer</p>
          </div>
          <button
            type="button"
            onClick={() => update('renovacionAutomatica', !local.renovacionAutomatica)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${local.renovacionAutomatica ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${local.renovacionAutomatica ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Visita frecuencia */}
        <div className={fieldWrap}>
          <label className={labelCls}>Frecuencia de Visitas</label>
          <select value={local.visitaFrecuencia} onChange={e => update('visitaFrecuencia', e.target.value)} className={inputCls}>
            <option value="">-- Seleccionar --</option>
            <option value="mensual">Mensual</option>
            <option value="bimestral">Bimestral</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
            <option value="según_demanda">Según demanda</option>
          </select>
        </div>

        {/* Cantidad visitas */}
        <div className={fieldWrap}>
          <label className={labelCls}>Cantidad de Visitas por Período</label>
          <input type="number" min="0" placeholder="0" value={local.cantidadVisitas} onChange={e => update('cantidadVisitas', e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Observaciones */}
      <div className={fieldWrap}>
        <label className={labelCls}>Observaciones Contractuales</label>
        <textarea
          rows={3}
          placeholder="Cláusulas especiales, acuerdos adicionales..."
          value={local.observacionesContractuales}
          onChange={e => update('observacionesContractuales', e.target.value)}
          className={inputCls + ' resize-none'}
        />
      </div>

      {/* Advertencia sin fechas */}
      {(!local.tipoContrato || !local.fechaInicio || !local.fechaFin) && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ Tipo de contrato y fechas de inicio/fin son obligatorios para continuar.
        </p>
      )}
    </div>
  );
}
