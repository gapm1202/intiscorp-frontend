import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Visita, EstadoVisita } from '../types';
import { actualizarVisita, cancelarVisita } from '../services/visitasService';
import ConfirmModal from '../../../components/ui/ConfirmModal';

interface VisitasTableViewProps {
  visitas: Visita[];
  onFinalizarVisita: (visita: Visita) => void;
  onEditarVisita: (visita: Visita) => void;
  estadoColor: Record<EstadoVisita, string>;
  onRefresh: () => void;
}

export default function VisitasTableView({
  visitas,
  onFinalizarVisita,
  onEditarVisita,
  estadoColor,
  onRefresh,
}: VisitasTableViewProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'fechaProgramada',
    direction: 'desc',
  });

  const sortedVisitas = [...visitas].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof Visita];
    const bValue = b[sortConfig.key as keyof Visita];

    if (aValue === undefined || bValue === undefined) return 0;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === 'asc'
      ? (aValue as any) - (bValue as any)
      : (bValue as any) - (aValue as any);
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);

  const openConfirm = (visita: Visita) => {
    if (visita.estado !== 'PROGRAMADA') return;
    if (!esDiaProgramado(visita.fechaProgramada)) return;
    setSelectedVisita(visita);
    setConfirmOpen(true);
  };

  const handleConfirmStart = async () => {
    if (!selectedVisita) return;

    setLoading(true);
    try {
      await actualizarVisita(selectedVisita._id, { estado: 'EN_PROCESO' });
      onRefresh();

      if (selectedVisita.ticketId) {
        navigate(`/admin/tickets/${selectedVisita.ticketId}`);
      }
    } catch (error) {
      console.error('Error starting visita:', error);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
      setSelectedVisita(null);
    }
  };

  const esDiaProgramado = (fechaProgramada: string) => {
    if (!fechaProgramada) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaVisita = new Date(fechaProgramada);
    fechaVisita.setHours(0, 0, 0, 0);
    return fechaVisita <= hoy;
  };

  const handleCancelarVisita = async (visita: Visita) => {
    if (confirm('¿Estás seguro de que deseas cancelar esta visita?')) {
      setLoading(true);
      try {
        await cancelarVisita(visita._id, 'Cancelada manualmente');
        onRefresh();
      } catch (error) {
        console.error('Error canceling visita:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (visitas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-16 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sky-50 mb-4">
          <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-blue-900">No hay visitas registradas</p>
        <p className="text-sm text-slate-500 mt-1">Selecciona filtros o crea una nueva visita</p>
      </div>
    );
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) {
      return (
        <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
          d={sortConfig.direction === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-visible">

      {/* Table */}
      <div className="overflow-x-auto overflow-y-visible pb-12">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-700">
              <th
                onClick={() => handleSort('fechaProgramada')}
                className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest cursor-pointer hover:bg-blue-800 transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Fecha
                  <SortIcon column="fechaProgramada" />
                </div>
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest">
                Tipo de Visita
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest">
                Técnico(s)
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest">
                Encargado
              </th>
              <th
                onClick={() => handleSort('estado')}
                className="px-6 py-3.5 text-left text-xs font-bold text-white uppercase tracking-widest cursor-pointer hover:bg-blue-800 transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  Estado
                  <SortIcon column="estado" />
                </div>
              </th>
              <th className="px-6 py-3.5 text-center text-xs font-bold text-white uppercase tracking-widest">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedVisitas.map((visita, visitaIndex) => {
              const tecnicosAsignados = visita.tecnicosAsignados ?? [];
              const tecnicosCount = visita.tecnicosAsignadosCount ?? tecnicosAsignados.length;
              const encargado = tecnicosAsignados.find((t) => t.esEncargado) || tecnicosAsignados[0];
              const tipoVisitaLabel = (visita.tipoVisita || '').replace(/_/g, ' ');
              const esVisitaPorTicket = visita.tipoVisita === 'POR_TICKET';
              const nombresTecnicosList = tecnicosAsignados
                .filter((t) => !encargado || t.tecnicoId !== encargado.tecnicoId)
                .map((t) => t.tecnicoNombre)
                .filter(Boolean);
              const tooltipTecnicos = nombresTecnicosList.length > 0 ? nombresTecnicosList : ['Solo encargado'];
              const puedeCambiarEstado =
                visita.estado === 'PROGRAMADA' || visita.estado === 'EN_PROCESO' || visita.estado === 'PENDIENTE_PROGRAMACION';

              return (
                <tr
                  key={visita._id ?? `${visita.fechaProgramada}-${visitaIndex}`}
                  className="border-b border-blue-50 hover:bg-sky-50 transition-colors duration-150"
                >
                  {/* Fecha */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-900">
                      {formatDate(visita.fechaProgramada)}
                    </div>
                    {visita.horaProgramada && (
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTime(visita.horaProgramada)}
                      </div>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wide">
                      {tipoVisitaLabel}
                    </span>
                  </td>

                  {/* Técnicos */}
                  <td className="px-6 py-4">
                    <div className="relative inline-block group">
                      <div className="flex items-center gap-1.5 cursor-default">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {tecnicosCount > 0 ? tecnicosCount : '–'}
                        </div>
                        <span className="text-sm text-blue-800 font-medium">
                          {tecnicosCount > 0
                            ? `técnico${tecnicosCount !== 1 ? 's' : ''}`
                            : '-'}
                        </span>
                        {tecnicosCount > 0 && (
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute left-0 top-full z-30 hidden min-w-[14rem] mt-2 rounded-lg border border-blue-100 bg-white shadow-xl group-hover:block">
                        <div className="px-3 pt-2.5 pb-1 border-b border-blue-50">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Técnicos asignados</p>
                        </div>
                        <div className="p-2 space-y-1">
                          {tooltipTecnicos.map((nombre, index) => (
                            <div
                              key={`${visita._id ?? visitaIndex}-tooltip-${index}`}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sky-50 text-sm text-blue-900 font-medium"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                              {nombre}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Encargado */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(visita.encargadoNombre || encargado?.tecnicoNombre || '?')[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-blue-900">
                        {visita.encargadoNombre || encargado?.tecnicoNombre || '-'}
                      </span>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold border ${estadoColor[visita.estado]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1.5" />
                      {visita.estado}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-1.5">

                      {visita.estado === 'PROGRAMADA' && esDiaProgramado(visita.fechaProgramada) && (
                        <button
                          onClick={() => openConfirm(visita)}
                          disabled={loading}
                          title="Iniciar atención"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Iniciar
                        </button>
                      )}

                      {visita.estado === 'PROGRAMADA' && !esDiaProgramado(visita.fechaProgramada) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200" title="Se habilitará el día programado">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pendiente
                        </span>
                      )}

                      {visita.estado === 'EN_PROCESO' && !esVisitaPorTicket && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onFinalizarVisita(visita)}
                            disabled={loading}
                            title="Finalizar visita"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Finalizar
                          </button>
                          {visita.ticketId && (
                            <button
                              onClick={() => navigate(`/admin/tickets/${visita.ticketId}`)}
                              disabled={loading}
                              title="Ver detalle del ticket"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}

                      {visita.estado === 'EN_PROCESO' && esVisitaPorTicket && (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200"
                            title="Debes culminar el ticket para luego finalizar la visita"
                          >
                            Desde ticket
                          </span>
                          {visita.ticketId && (
                            <button
                              onClick={() => navigate(`/admin/tickets/${visita.ticketId}`)}
                              disabled={loading}
                              title="Ir al ticket para culminarlo"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}

                      {(visita.estado === 'PROGRAMADA' || visita.estado === 'PENDIENTE_PROGRAMACION') && (
                        <button
                          onClick={() => onEditarVisita(visita)}
                          disabled={loading}
                          title="Editar visita"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-sky-200 text-sky-600 hover:bg-sky-50 disabled:opacity-50 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}

                      {puedeCambiarEstado && visita.estado !== 'EN_PROCESO' && (
                        <button
                          onClick={() => handleCancelarVisita(visita)}
                          disabled={loading}
                          title="Cancelar visita"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H4v2h16V7h-2.5z" />
                          </svg>
                        </button>
                      )}

                      {!puedeCambiarEstado && (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-300 cursor-not-allowed" title="No se puede modificar este estado">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H4v2h16V7h-2.5z" />
                          </svg>
                        </span>
                      )}

                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between bg-blue-700 border-t border-blue-600 px-6 py-2.5 rounded-b-xl">
        <div className="flex items-center gap-2 text-xs text-blue-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="font-medium text-white">{visitas.length}</span>
          <span>visita{visitas.length !== 1 ? 's' : ''} en total</span>
        </div>
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Iniciar atención"
        message="¿Estás seguro de que quieres iniciar esta atención?"
        onConfirm={handleConfirmStart}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      />
    </div>
  );
}