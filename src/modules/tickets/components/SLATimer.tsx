import { useEffect, useState } from 'react';

interface SLATimerProps {
  estadoSLA: string;
  tiempoTotalMinutos: number;
  tiempoTranscurridoMinutos: number;
  tiempoRestanteMinutos: number;
  fechaCreacion: string;
  enHorarioLaboral: boolean;
  motivoPausa?: string;
}

export default function SLATimer({
  estadoSLA,
  tiempoTotalMinutos,
  tiempoTranscurridoMinutos,
  tiempoRestanteMinutos,
  fechaCreacion,
  enHorarioLaboral,
  motivoPausa
}: SLATimerProps) {
  const [transcurrido, setTranscurrido] = useState(tiempoTranscurridoMinutos);
  const [restante, setRestante] = useState(tiempoRestanteMinutos);

  useEffect(() => {
    // Solo actualizar el timer si el SLA está activo y en horario laboral
    if (estadoSLA === 'pausado' || !enHorarioLaboral || estadoSLA === 'vencido') {
      return;
    }

    const interval = setInterval(() => {
      setTranscurrido(prev => prev + 1);
      setRestante(prev => Math.max(0, prev - 1));
    }, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, [estadoSLA, enHorarioLaboral]);

  useEffect(() => {
    setTranscurrido(tiempoTranscurridoMinutos);
    setRestante(tiempoRestanteMinutos);
  }, [tiempoTranscurridoMinutos, tiempoRestanteMinutos]);

  const formatMinutes = (minutes: number) => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    
    return parts.join(' ');
  };

  const getEstadoSLAInfo = () => {
    const info: Record<string, { color: string; bg: string; label: string; icon: string }> = {
      'en_tiempo': { 
        color: 'text-emerald-800', 
        bg: 'bg-emerald-50 border-emerald-300', 
        label: '✓ En Tiempo',
        icon: '✓'
      },
      'EN_TIEMPO': { 
        color: 'text-emerald-800', 
        bg: 'bg-emerald-50 border-emerald-300', 
        label: '✓ En Tiempo',
        icon: '✓'
      },
      'por_vencer': { 
        color: 'text-amber-800', 
        bg: 'bg-amber-50 border-amber-300', 
        label: '⚠ Por Vencer',
        icon: '⚠'
      },
      'PROXIMO_VENCER': { 
        color: 'text-amber-800', 
        bg: 'bg-amber-50 border-amber-300', 
        label: '⚠ Por Vencer',
        icon: '⚠'
      },
      'vencido': { 
        color: 'text-rose-800', 
        bg: 'bg-rose-50 border-rose-300', 
        label: '✕ Vencido',
        icon: '✕'
      },
      'VENCIDO': { 
        color: 'text-rose-800', 
        bg: 'bg-rose-50 border-rose-300', 
        label: '✕ Vencido',
        icon: '✕'
      },
      'pausado': { 
        color: 'text-slate-800', 
        bg: 'bg-slate-50 border-slate-300', 
        label: '⏸ Pausado',
        icon: '⏸'
      }
    };
    return info[estadoSLA] || info['en_tiempo'];
  };

  const getSLAProgressColor = () => {
    const porcentaje = (transcurrido / tiempoTotalMinutos) * 100;
    
    if (estadoSLA === 'pausado') return 'bg-slate-400';
    if (estadoSLA === 'vencido' || estadoSLA === 'VENCIDO') return 'bg-red-500';
    if (porcentaje >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const calculateProgress = () => {
    if (tiempoTotalMinutos === 0) return 0;
    return Math.min(100, (transcurrido / tiempoTotalMinutos) * 100);
  };

  const slaInfo = getEstadoSLAInfo();
  const progress = calculateProgress();

  return (
    <div className={`border rounded-lg p-4 ${slaInfo.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${slaInfo.color}`}>{slaInfo.label}</span>
          {!enHorarioLaboral && estadoSLA !== 'pausado' && estadoSLA !== 'vencido' && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-300">
              Fuera de horario laboral
            </span>
          )}
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${slaInfo.color}`}>
            {formatMinutes(restante)}
          </div>
          <div className="text-xs text-gray-600">restante</div>
        </div>
      </div>
      
      {/* Mensaje de pausa */}
      {estadoSLA === 'pausado' && motivoPausa && (
        <div className="mb-3 bg-white border border-slate-300 rounded p-2">
          <p className="text-xs font-medium text-slate-600 mb-1">Motivo de pausa:</p>
          <p className="text-sm text-slate-800">{motivoPausa}</p>
        </div>
      )}

      {/* Mensaje fuera de horario */}
      {!enHorarioLaboral && estadoSLA !== 'pausado' && estadoSLA !== 'vencido' && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-2">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800">
              El contador de SLA está pausado automáticamente porque está fuera del horario laboral configurado.
              Se reanudará al inicio del siguiente día hábil.
            </p>
          </div>
        </div>
      )}
      
      {/* Barra de progreso */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full ${getSLAProgressColor()} transition-all duration-500`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-gray-600">
        <span>Transcurrido: {formatMinutes(transcurrido)}</span>
        <span>{progress.toFixed(1)}%</span>
        <span>Total: {formatMinutes(tiempoTotalMinutos)}</span>
      </div>
    </div>
  );
}
