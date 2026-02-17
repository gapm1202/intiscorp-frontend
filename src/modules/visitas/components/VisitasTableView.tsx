import { useState } from 'react';
import type { Visita, EstadoVisita } from '../types';
import { actualizarVisita, cancelarVisita } from '../services/visitasService';

interface VisitasTableViewProps {
  visitas: Visita[];
  onFinalizarVisita: (visita: Visita) => void;
  estadoColor: Record<EstadoVisita, string>;
  onRefresh: () => void;
}

export default function VisitasTableView({
  visitas,
  onFinalizarVisita,
  estadoColor,
  onRefresh,
}: VisitasTableViewProps) {
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

  const handleIniciarVisita = async (visita: Visita) => {
    if (visita.estado !== 'PROGRAMADA') return;

    setLoading(true);
    try {
      await actualizarVisita(visita._id, { estado: 'EN_CURSO' });
      onRefresh();
    } catch (error) {
      console.error('Error starting visita:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-3">
          <p className="text-lg font-medium">No hay visitas registradas</p>
          <p className="text-sm">Selecciona filtros o crea una nueva visita</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-visible border border-gray-200">
      <div className="overflow-x-auto overflow-y-visible pb-12">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('fechaProgramada')}
                className="px-8 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
              >
                <div className="flex items-center gap-2">
                  Fecha
                  {sortConfig.key === 'fechaProgramada' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-8 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
              <th className="px-8 py-3 text-left text-sm font-semibold text-gray-700">Técnico(s)</th>
              <th className="px-8 py-3 text-left text-sm font-semibold text-gray-700">Encargado</th>
              <th
                onClick={() => handleSort('estado')}
                className="px-8 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
              >
                <div className="flex items-center gap-2">
                  Estado
                  {sortConfig.key === 'estado' && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="px-8 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedVisitas.map((visita, visitaIndex) => {
              const tecnicosAsignados = visita.tecnicosAsignados ?? [];
              const tecnicosCount = visita.tecnicosAsignadosCount ?? tecnicosAsignados.length;
              const encargado = tecnicosAsignados.find((t) => t.esEncargado) || tecnicosAsignados[0];
              const tipoVisitaLabel = (visita.tipoVisita || '').replace(/_/g, ' ');
              const nombresTecnicosList = tecnicosAsignados
                .filter((t) => !encargado || t.tecnicoId !== encargado.tecnicoId)
                .map((t) => t.tecnicoNombre)
                .filter(Boolean);
              const tooltipTecnicos = nombresTecnicosList.length > 0 ? nombresTecnicosList : ['Solo encargado'];
              const puedeCambiarEstado =
                visita.estado === 'PROGRAMADA' || visita.estado === 'EN_CURSO' || visita.estado === 'PENDIENTE_PROGRAMACION';

              return (
                <tr key={visita._id ?? `${visita.fechaProgramada}-${visitaIndex}`} className="hover:bg-gray-50 transition">
                  <td className="px-8 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(visita.fechaProgramada)}
                    </div>
                    {visita.horaProgramada && (
                      <div className="text-xs text-gray-500">{formatTime(visita.horaProgramada)}</div>
                    )}
                  </td>

                  <td className="px-8 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {tipoVisitaLabel}
                    </span>
                  </td>

                  <td className="px-8 py-4">
                    <div className="relative inline-block group text-sm text-gray-700">
                      <span className="underline decoration-dotted decoration-gray-300 underline-offset-2">
                        {tecnicosCount > 0
                          ? `${tecnicosCount} tecnico${tecnicosCount !== 1 ? 's' : ''}`
                          : '-'}
                      </span>
                      <div className="absolute left-0 top-full z-20 hidden min-w-[12rem] translate-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg group-hover:block">
                        <div className="text-[10px] font-semibold uppercase text-slate-400">Tecnicos</div>
                        <div className="mt-1 space-y-1">
                          {tooltipTecnicos.map((nombre, index) => (
                            <div key={`${visita._id ?? visitaIndex}-tooltip-${index}`} className="rounded bg-slate-50 px-2 py-1">
                              {nombre}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-8 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {visita.encargadoNombre || encargado?.tecnicoNombre || '-'}
                    </div>
                  </td>

                  <td className="px-8 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${estadoColor[visita.estado]}`}>
                      {visita.estado}
                    </span>
                  </td>

                  <td className="px-8 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      {visita.estado === 'PROGRAMADA' && (
                        <button
                          onClick={() => handleIniciarVisita(visita)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 transition"
                          title="Iniciar visita"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}

                      {visita.estado === 'EN_CURSO' && (
                        <button
                          onClick={() => onFinalizarVisita(visita)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 transition"
                          title="Finalizar visita"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      )}

                      {puedeCambiarEstado && visita.estado !== 'EN_CURSO' && (
                        <button
                          onClick={() => handleCancelarVisita(visita)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 transition"
                          title="Cancelar visita"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H4v2h16V7h-2.5z" /></svg>
                        </button>
                      )}

                      {!puedeCambiarEstado && (
                        <span className="text-gray-400 cursor-not-allowed" title="No se puede modificar este estado">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H4v2h16V7h-2.5z" /></svg>
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

      {/* Pie de página con información */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 mt-4 text-sm text-gray-600">
        Total: {visitas.length} visita{visitas.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
