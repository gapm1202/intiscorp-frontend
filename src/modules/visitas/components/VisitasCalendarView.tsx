import { useState, useMemo, useEffect } from 'react';
import type { Visita, EstadoVisita } from '../types';

interface VisitasCalendarViewProps {
  visitas: Visita[];
  mes: string; // YYYY-MM format
  onFinalizarVisita: (visita: Visita) => void;
  estadoColor: Record<EstadoVisita, string>;
}

export default function VisitasCalendarView({
  visitas,
  mes,
  onFinalizarVisita,
  estadoColor,
}: VisitasCalendarViewProps) {
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
      EN_CURSO: '🔵',
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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      {/* Header del Calendario */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-blue-200 rounded-lg transition"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-bold text-blue-900 capitalize">{monthName}</h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-blue-200 rounded-lg transition"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Calendario */}
      <div className="p-6">
        {/* Headers de dias */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-gray-600 py-2 text-sm uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Celdas del calendario */}
        <div className="grid grid-cols-7 gap-2 auto-rows-max">
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square"></div>;
            }

            const fecha = `${currentMonth.getFullYear()}-${String(
              currentMonth.getMonth() + 1
            ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const visitasDelDia = visitasPorFecha.get(fecha) || [];
            const isToday = new Date().toDateString() === new Date(fecha).toDateString();

            return (
              <div
                key={day}
                className={`aspect-square p-2 rounded-lg border-2 transition ${
                  isToday
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {/* Numero de dia */}
                <div
                  className={`text-xs font-bold mb-1 ${
                    isToday ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>

                {/* Visitas del dia */}
                <div className="space-y-1 overflow-y-auto max-h-20">
                  {visitasDelDia.length > 0 ? (
                    <div>
                      {visitasDelDia.slice(0, 2).map((visita, idx) => (
                        <button
                          key={idx}
                          onClick={() => setVisitaSeleccionada(visita)}
                          className="w-full text-left group relative"
                          title={`${visita.tipoVisita} - ${visita.tecnicosAsignados.length} tecnico(s)`}
                        >
                          <div
                            className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition text-white font-medium ${
                              visita.estado === 'PROGRAMADA'
                                ? 'bg-blue-500'
                                : visita.estado === 'EN_CURSO'
                                  ? 'bg-yellow-500'
                                  : visita.estado === 'FINALIZADA'
                                    ? 'bg-green-500'
                                    : visita.estado === 'CANCELADA'
                                      ? 'bg-red-500'
                                      : 'bg-gray-500'
                            }`}
                          >
                            {getEstadoIcon(visita.estado)} {tipoVisitaLabel(visita.tipoVisita).slice(0, 8)}
                          </div>

                          {/* Tooltip */}
                          <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-1 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 pointer-events-none">
                            <p className="font-semibold mb-1">{tipoVisitaLabel(visita.tipoVisita)}</p>
                            <p className="truncate">
                              Tecnico: {visita.tecnicosAsignados[0]?.tecnicoNombre}
                            </p>
                            <p className="text-gray-300">{visita.estado}</p>
                          </div>
                        </button>
                      ))}

                      {visitasDelDia.length > 2 && (
                        <div className="text-xs text-gray-500 px-1 py-0.5">
                          + {visitasDelDia.length - 2} mas
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 h-full flex items-center justify-center">
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-400"></div>
            <span className="text-gray-600">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-600">Programada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-gray-600">En Curso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600">Finalizada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-gray-600">Cancelada</span>
          </div>
        </div>
      </div>

      {/* Modal detalle de visita */}
      {visitaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Detalle de visita</h3>
                <p className="text-xs text-slate-500">{tipoVisitaLabel(visitaSeleccionada.tipoVisita)}</p>
              </div>
              <button
                onClick={() => setVisitaSeleccionada(null)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Fecha</p>
                  <p className="font-semibold text-slate-900">
                    {visitaSeleccionada.fechaProgramada
                      ? formatDate(visitaSeleccionada.fechaProgramada)
                      : '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Estado</p>
                  <p className="font-semibold text-slate-900">{visitaSeleccionada.estado}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase">Tecnicos</p>
                <div className="mt-2 space-y-1">
                  {(visitaSeleccionada.tecnicosAsignados ?? []).length > 0 ? (
                    visitaSeleccionada.tecnicosAsignados.map((t, index) => (
                      <div key={t.tecnicoId ?? `tec-${index}`} className="flex items-center justify-between">
                        <span className="text-slate-800">{t.tecnicoNombre}</span>
                        {t.esEncargado && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Encargado
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Sin tecnicos asignados</p>
                  )}
                </div>
              </div>

              {visitaSeleccionada.observaciones && (
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Observaciones</p>
                  <p className="mt-2 text-slate-700">{visitaSeleccionada.observaciones}</p>
                </div>
              )}

              {(visitaSeleccionada.ticketNumero || visitaSeleccionada.ticketId) && (
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Ticket</p>
                  <p className="mt-2 text-slate-700">
                    {visitaSeleccionada.ticketNumero || visitaSeleccionada.ticketId}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              {visitaSeleccionada.estado === 'EN_CURSO' && (
                <button
                  onClick={() => {
                    onFinalizarVisita(visitaSeleccionada);
                    setVisitaSeleccionada(null);
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Finalizar visita
                </button>
              )}
              <button
                onClick={() => setVisitaSeleccionada(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
