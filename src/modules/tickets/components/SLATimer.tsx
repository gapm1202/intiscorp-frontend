import { useEffect, useState } from 'react';

interface SLATimerProps {
  estadoSLA: string;
  porcentajeConsumido?: number; // preferido: backend debe enviar
  tiempoTranscurridoMinutos?: number;
  tiempoRestanteMinutos?: number;
  fechaLimite?: string;
  slaPausado?: boolean;
  alertas?: number[]; // e.g. [50,75,90]
  historialPausas?: Array<{ tipo: string; motivo?: string; fecha: string }>;
  motivoPausa?: string;
}

export default function SLATimer({
  estadoSLA,
  porcentajeConsumido,
  tiempoTranscurridoMinutos,
  tiempoRestanteMinutos,
  fechaLimite,
  slaPausado,
  alertas,
  historialPausas,
  motivoPausa
}: SLATimerProps) {
  const formatMinutes = (minutes?: number) => {
    if (minutes === null || minutes === undefined) return 'N/A';
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return parts.join(' ');
  };

  const slaLabel = (() => {
    if (slaPausado) return 'SLA Pausado';
    if (!estadoSLA) return 'SLA';
    const key = String(estadoSLA).toUpperCase();
    if (key === 'VENCIDO') return 'SLA Vencido';
    if (key === 'CUMPLIDO') return 'SLA Cumplido';
    return key.replace('_', ' ');
  })();

  const progressWidth = (typeof porcentajeConsumido === 'number') ? `${Math.max(0, Math.min(100, porcentajeConsumido))}%` : '0%';
  const progressLabel = (typeof porcentajeConsumido === 'number') ? `${porcentajeConsumido.toFixed(1)}%` : 'N/A';

  return (
    <div className={`border rounded-lg p-4 bg-white`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold">{slaLabel}</span>
          {slaPausado && <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded">Pausado</span>}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">{tiempoRestanteMinutos != null ? formatMinutes(tiempoRestanteMinutos) : 'N/A'}</div>
          <div className="text-xs text-gray-600">restante</div>
        </div>
      </div>

      {slaPausado && motivoPausa && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded p-2">
          <p className="text-xs font-medium text-gray-600 mb-1">Motivo de pausa:</p>
          <p className="text-sm text-gray-800">{motivoPausa}</p>
        </div>
      )}

      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-500`} style={{ width: progressWidth }} />
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-600">
        <span>Transcurrido: {formatMinutes(tiempoTranscurridoMinutos)}</span>
        <span>{progressLabel}</span>
        <span>Fecha límite: {fechaLimite ? new Date(fechaLimite).toLocaleString() : 'N/A'}</span>
      </div>

      {alertas && alertas.length > 0 && (
        <div className="mt-3 text-xs text-amber-700">
          Alertas: {alertas.join('%, ')}%
        </div>
      )}

      {historialPausas && historialPausas.length > 0 && (
        <div className="mt-3 text-xs text-gray-700">
          <div className="font-medium mb-1">Historial de pausas</div>
          <ul className="list-disc list-inside">
            {historialPausas.map((h, i) => (
              <li key={i}>{h.tipo} — {h.motivo || 'sin motivo'} — {new Date(h.fecha).toLocaleString()}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
