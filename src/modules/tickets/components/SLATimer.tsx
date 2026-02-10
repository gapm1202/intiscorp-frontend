interface SLATimerProps {
  estadoSLA: string;
  porcentajeConsumido?: number; // preferido: backend debe enviar
  label?: string; // e.g. 'Respuesta' or 'Resolución'
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
  label,
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
    if (label) return label;
    if (!estadoSLA) return 'SLA';
    const key = String(estadoSLA).toUpperCase();
    if (key === 'VENCIDO') return 'SLA Vencido';
    if (key === 'CUMPLIDO') return 'SLA Cumplido';
    return key.replace('_', ' ');
  })();

  const rawPct = (typeof porcentajeConsumido === 'number') ? porcentajeConsumido : 0;
  const cappedPct = Math.max(0, Math.min(100, rawPct));
  const progressWidth = `${cappedPct}%`;
  const progressLabel = (typeof porcentajeConsumido === 'number') ? `${porcentajeConsumido.toFixed(1)}%` : 'N/A';

  const gradientClass = (() => {
    if (slaPausado) return 'from-gray-300 to-gray-400';
    const pct = rawPct;
    if (pct < 70) return 'from-emerald-400 to-emerald-600';
    if (pct >= 70 && pct < 90) return 'from-amber-400 to-amber-600';
    if (pct >= 90 && pct < 100) return 'from-orange-400 to-orange-600';
    return 'from-rose-500 to-rose-700';
  })();

  const alertMarkers = (alertas && alertas.length > 0) ? alertas : [50, 75, 90];

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

      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
        <span>Transcurrido: {formatMinutes(tiempoTranscurridoMinutos)}</span>
        <span className="text-xs font-semibold text-gray-700">Consumido: {progressLabel}</span>
      </div>

      <div className="relative w-full h-3 bg-sky-100 rounded-full overflow-hidden ring-1 ring-slate-200">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%)' }} />
        <div className={`absolute top-0 left-0 h-full transition-all duration-700 bg-linear-to-r ${gradientClass}`} style={{ width: progressWidth }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white ring-2"
          style={{ left: `calc(${Math.max(0, Math.min(100, cappedPct))}% - 6px)`, borderColor: 'rgba(15, 23, 42, 0.25)' }}
        />
        {alertMarkers.map((m) => (
          <span
            key={m}
            className="absolute top-0 h-full w-px bg-white/70"
            style={{ left: `${Math.max(0, Math.min(100, m))}%` }}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between mt-2 text-xs text-gray-600 gap-2">
        <span>Fecha límite: {fechaLimite ? new Date(fechaLimite).toLocaleString() : 'N/A'}</span>
        <span className={`text-xs font-semibold ${slaPausado ? 'text-gray-500' : 'text-gray-700'}`}>Estado: {slaLabel}</span>
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
