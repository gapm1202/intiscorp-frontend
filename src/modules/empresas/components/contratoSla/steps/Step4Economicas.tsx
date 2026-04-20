import { useState, useEffect } from 'react';
import type { EconomicasForm } from '../types';

interface Props {
  data: EconomicasForm;
  onChange: (data: EconomicasForm) => void;
}

const TIPOS_FACTURACION = ['Mensual', 'Trimestral', 'Semestral', 'Anual', 'Por proyecto', 'Bajo demanda'];
const MONEDAS = [
  { value: 'PEN', label: 'S/ – Soles (PEN)' },
  { value: 'USD', label: '$ – Dólares (USD)' },
  { value: 'EUR', label: '€ – Euros (EUR)' },
];

export default function Step4Economicas({ data, onChange }: Props) {
  const [local, setLocal] = useState<EconomicasForm>(data);

  useEffect(() => { setLocal(data); }, [data]);

  const update = (patch: Partial<EconomicasForm>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  const inputCls = 'w-full px-3 py-2.5 bg-white rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide';
  const fieldWrap = 'bg-slate-50 rounded-xl border border-slate-100 p-4';

  const montoNum = parseFloat(local.montoReferencial || '0') || 0;
  const simbolo = local.moneda === 'USD' ? '$' : local.moneda === 'EUR' ? '€' : 'S/';

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Defina las condiciones económicas y de facturación del contrato.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo de facturación */}
        <div className={fieldWrap}>
          <label className={labelCls}>Tipo de Facturación <span className="text-red-500">*</span></label>
          <select value={local.tipoFacturacion} onChange={e => update({ tipoFacturacion: e.target.value })} className={inputCls}>
            <option value="">-- Seleccionar --</option>
            {TIPOS_FACTURACION.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
          </select>
        </div>

        {/* Moneda */}
        <div className={fieldWrap}>
          <label className={labelCls}>Moneda <span className="text-red-500">*</span></label>
          <select value={local.moneda} onChange={e => update({ moneda: e.target.value })} className={inputCls}>
            <option value="">-- Seleccionar --</option>
            {MONEDAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Monto referencial */}
        <div className={fieldWrap}>
          <label className={labelCls}>Monto Referencial <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{simbolo}</span>
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={local.montoReferencial}
              onChange={e => update({ montoReferencial: e.target.value })}
              className={inputCls + ' pl-8'}
            />
          </div>
        </div>

        {/* Día de facturación */}
        <div className={fieldWrap}>
          <label className={labelCls}>Día de Facturación</label>
          <input
            type="number" min="1" max="31" placeholder="Ej: 5"
            value={local.diaFacturacion}
            onChange={e => update({ diaFacturacion: e.target.value })}
            className={inputCls}
          />
          <p className="text-xs text-slate-400 mt-1">Día del mes en que se emite la factura</p>
        </div>
      </div>

      {/* Observaciones */}
      <div className={fieldWrap}>
        <label className={labelCls}>Observaciones Económicas</label>
        <textarea
          rows={3}
          placeholder="Condiciones de pago, descuentos, penalidades..."
          value={local.observaciones}
          onChange={e => update({ observaciones: e.target.value })}
          className={inputCls + ' resize-none'}
        />
      </div>

      {/* Resumen económico */}
      {(montoNum > 0 || local.tipoFacturacion || local.moneda) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-blue-700 mb-3">💰 Resumen Económico</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {montoNum > 0 && (
              <div className="bg-white rounded-lg border border-blue-100 p-3 text-center">
                <p className="text-xs text-slate-400">Monto</p>
                <p className="text-lg font-bold text-blue-700">{simbolo} {montoNum.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
              </div>
            )}
            {local.tipoFacturacion && (
              <div className="bg-white rounded-lg border border-blue-100 p-3 text-center">
                <p className="text-xs text-slate-400">Facturación</p>
                <p className="text-sm font-semibold text-slate-700 capitalize">{local.tipoFacturacion}</p>
              </div>
            )}
            {local.moneda && (
              <div className="bg-white rounded-lg border border-blue-100 p-3 text-center">
                <p className="text-xs text-slate-400">Moneda</p>
                <p className="text-sm font-semibold text-slate-700">{local.moneda}</p>
              </div>
            )}
            {local.diaFacturacion && (
              <div className="bg-white rounded-lg border border-blue-100 p-3 text-center">
                <p className="text-xs text-slate-400">Día de pago</p>
                <p className="text-sm font-semibold text-slate-700">Día {local.diaFacturacion}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
