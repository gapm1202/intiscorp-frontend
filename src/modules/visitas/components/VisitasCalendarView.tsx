import { useState, useMemo, useEffect } from 'react';
import type { Visita, EstadoVisita } from '../types';
import { useNavigate } from 'react-router-dom';

interface VisitasCalendarViewProps {
  visitas: Visita[];
  mes: string; // YYYY-MM format
  onFinalizarVisita: (visita: Visita) => void;
  onEditarVisita: (visita: Visita) => void;
  estadoColor: Record<EstadoVisita, string>;
}

export default function VisitasCalendarView({
  visitas,
  mes,
  onFinalizarVisita,
  onEditarVisita,
  estadoColor,
}: VisitasCalendarViewProps) {
  const navigate = useNavigate();
  const parseMonthToDate = (value: string) => {
    const [yearStr, monthStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) {
      return new Date();
    }
    return new Date(year, month - 1, 1);
  };

  const [currentMonth, setCurrentMonth] = useState(() => parseMonthToDate(mes));
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<Visita | null>(null);

  useEffect(() => {
    setCurrentMonth(parseMonthToDate(mes));
  }, [mes]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const visitasPorFecha = useMemo(() => {
    const mapa = new Map<string, Visita[]>();
    visitas.forEach((visita) => {
      if (!visita.fechaProgramada) return;
      const fecha = visita.fechaProgramada.split('T')[0];
      if (!mapa.has(fecha)) {
        mapa.set(fecha, []);
      }
      mapa.get(fecha)?.push(visita);
    });
    return mapa;
  }, [visitas]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days: Array<number | null> = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = currentMonth.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  const getEstadoIcon = (estado: EstadoVisita): string => {
    const iconMap: Record<EstadoVisita, string> = {
      PENDIENTE_PROGRAMACION: '⏳',
      PROGRAMADA: '📅',
      EN_PROCESO: '🔵',
      FINALIZADA: '✅',
      CANCELADA: '❌',
    };
    return iconMap[estado];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const tipoVisitaLabel = (tipo?: string) => (tipo ? tipo.replace(/_/g, ' ') : '-');

  const estadoBadgeColor = (estado: EstadoVisita) => {
    const map: Record<EstadoVisita, string> = {
      PROGRAMADA: 'bg-blue-600',
      EN_PROCESO: 'bg-amber-500',
      FINALIZADA: 'bg-emerald-600',
      CANCELADA: 'bg-red-500',
      PENDIENTE_PROGRAMACION: 'bg-slate-400',
    };
    return map[estado] ?? 'bg-slate-400';
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">

      {/* Header */}
      <div className="bg-blue-700 px-6 py-4 flex justify-between items-center">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-blue-800 transition-colors text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-lg font-bold text-white capitalize tracking-wide">{monthName}</h2>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-blue-800 transition-colors text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendario */}
      <div className="p-5">

        {/* Headers días */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center py-2 text-xs font-bold text-blue-700 uppercase tracking-widest"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Separador */}
        <div className="border-t border-blue-100 mb-3" />

        {/* Celdas */}
        <div className="grid grid-cols-7 gap-2 auto-rows-max">
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const fecha = `${currentMonth.getFullYear()}-${String(
              currentMonth.getMonth() + 1
            ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const visitasDelDia = visitasPorFecha.get(fecha) || [];
            const isToday = new Date().toDateString() === new Date(fecha).toDateString();

            return (
              <div
                key={day}
                className={`aspect-square p-1.5 rounded-lg border-2 transition-colors ${
                  isToday
                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                    : visitasDelDia.length > 0
                      ? 'border-sky-200 bg-sky-50 hover:bg-sky-100'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}
              >
                {/* Número de día */}
                <div
                  className={`text-xs font-bold mb-1 leading-none ${
                    isToday
                      ? 'text-blue-700'
                      : visitasDelDia.length > 0
                        ? 'text-blue-900'
                        : 'text-slate-400'
                  }`}
                >
                  {isToday ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-700 text-white text-[10px] font-bold">
                      {day}
                    </span>
                  ) : (
                    day
                  )}
                </div>

                {/* Visitas del día */}
                <div className="space-y-0.5 overflow-y-auto max-h-16">
                  {visitasDelDia.length > 0 ? (
                    <>
                      {visitasDelDia.slice(0, 2).map((visita, idx) => (
                        <button
                          key={idx}
                          onClick={() => setVisitaSeleccionada(visita)}
                          className="w-full text-left group relative"
                          title={`${visita.tipoVisita} - ${visita.tecnicosAsignados.length} tecnico(s)`}
                        >
                          <div
                            className={`text-[10px] px-1 py-0.5 rounded truncate text-white font-semibold hover:opacity-80 transition-opacity ${estadoBadgeColor(visita.estado)}`}
                          >
                            {getEstadoIcon(visita.estado)} {tipoVisitaLabel(visita.tipoVisita).slice(0, 8)}
                          </div>

                          {/* Tooltip */}
                          <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-52 bg-blue-900 text-white text-xs rounded-lg shadow-xl pointer-events-none overflow-hidden">
                            <div className="px-3 pt-2.5 pb-1 border-b border-blue-700">
                              <p className="font-bold text-sm">{tipoVisitaLabel(visita.tipoVisita)}</p>
                            </div>
                            <div className="px-3 py-2 space-y-1">
                              <p className="text-blue-200 text-[11px]">
                                Técnico: <span className="text-white font-medium">{visita.tecnicosAsignados[0]?.tecnicoNombre}</span>
                              </p>
                              <p className="text-blue-200 text-[11px]">
                                Estado: <span className="text-white font-medium">{visita.estado}</span>
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}

                      {visitasDelDia.length > 2 && (
                        <div className="text-[10px] font-semibold text-blue-600 px-1">
                          +{visitasDelDia.length - 2} más
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-blue-700 border-t border-blue-600 px-6 py-3">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
          {[
            { color: 'bg-slate-400', label: 'Pendiente' },
            { color: 'bg-blue-500', label: 'Programada' },
            { color: 'bg-amber-500', label: 'En Curso' },
            { color: 'bg-emerald-500', label: 'Finalizada' },
            { color: 'bg-red-500', label: 'Cancelada' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${color} flex-shrink-0`} />
              <span className="text-blue-200 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal detalle de visita */}
      {visitaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-blue-100 overflow-hidden">

            {/* Modal header */}
            <div className="bg-blue-700 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Detalle de visita</h3>
                <p className="text-xs text-blue-300 mt-0.5 uppercase tracking-wide font-medium">
                  {tipoVisitaLabel(visitaSeleccionada.tipoVisita)}
                </p>
              </div>
              <button
                onClick={() => setVisitaSeleccionada(null)}
                className="p-1.5 rounded-lg text-blue-300 hover:bg-blue-800 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Fecha</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {visitaSeleccionada.fechaProgramada
                      ? formatDate(visitaSeleccionada.fechaProgramada)
                      : '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Estado</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-white ${estadoBadgeColor(visitaSeleccionada.estado)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                    {visitaSeleccionada.estado}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">Técnicos</p>
                <div className="space-y-1.5">
                  {(visitaSeleccionada.tecnicosAsignados ?? []).length > 0 ? (
                    visitaSeleccionada.tecnicosAsignados.map((t, index) => (
                      <div
                        key={t.tecnicoId ?? `tec-${index}`}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md bg-sky-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {(t.tecnicoNombre || '?')[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-blue-900">{t.tecnicoNombre}</span>
                        </div>
                        {t.esEncargado && (
                          <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Encargado
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">Sin técnicos asignados</p>
                  )}
                </div>
              </div>

              {visitaSeleccionada.observaciones && (
                <div className="rounded-lg border border-blue-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700 mt-1">{visitaSeleccionada.observaciones}</p>
                </div>
              )}

              {(visitaSeleccionada.ticketNumero || visitaSeleccionada.ticketId) && (
                <div className="rounded-lg border border-blue-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Ticket</p>
                  <p className="text-sm font-semibold text-blue-900 mt-1">
                    {visitaSeleccionada.ticketNumero || visitaSeleccionada.ticketId}
                  </p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-2 border-t border-blue-100 px-5 py-3 bg-sky-50">
              {visitaSeleccionada.estado === 'EN_PROCESO' && visitaSeleccionada.tipoVisita !== 'POR_TICKET' && (
                <button
                  onClick={() => {
                    onFinalizarVisita(visitaSeleccionada);
                    setVisitaSeleccionada(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finalizar visita
                </button>
              )}
              {visitaSeleccionada.estado === 'EN_PROCESO' && visitaSeleccionada.tipoVisita === 'POR_TICKET' && (
                <button
                  onClick={() => {
                    if (visitaSeleccionada.ticketId) {
                      navigate(`/admin/tickets/${visitaSeleccionada.ticketId}`);
                      setVisitaSeleccionada(null);
                    }
                  }}
                  disabled={!visitaSeleccionada.ticketId}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Las visitas POR_TICKET deben finalizarse desde el ticket con el botón Culminar ticket"
                >
                  Ir al ticket
                </button>
              )}
              {(visitaSeleccionada.estado === 'PROGRAMADA' || visitaSeleccionada.estado === 'PENDIENTE_PROGRAMACION') && (
                <button
                  onClick={() => {
                    onEditarVisita(visitaSeleccionada);
                    setVisitaSeleccionada(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-white hover:bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
              )}
              <button
                onClick={() => setVisitaSeleccionada(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
