import { useState, useEffect } from 'react';
import { getHistorial } from '../services/ticketsService';

interface HistorialEvento {
  id: number;
  tipo_evento: string;
  campo_modificado?: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  motivo?: string;
  usuario_interno_nombre: string;
  fecha_evento: string;
}

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number;
  ticketCodigo: string;
}

export default function HistorialModal({
  isOpen,
  onClose,
  ticketId,
  ticketCodigo
}: HistorialModalProps) {
  const [historial, setHistorial] = useState<HistorialEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');

  useEffect(() => {
    if (isOpen) {
      loadHistorial();
    }
  }, [isOpen, ticketId, filtroTipo]);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      const data = await getHistorial(ticketId, filtroTipo === 'TODOS' ? undefined : filtroTipo);
      setHistorial(data);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  };

  const getIconoTipoEvento = (tipo: string) => {
    const iconos: Record<string, { icon: string; color: string }> = {
      'CREACION': { icon: '✨', color: 'bg-green-100 text-green-700' },
      'CAMBIO_ESTADO': { icon: '🔄', color: 'bg-blue-100 text-blue-700' },
      'ASIGNACION': { icon: '👤', color: 'bg-purple-100 text-purple-700' },
      'REASIGNACION': { icon: '🔁', color: 'bg-indigo-100 text-indigo-700' },
      'EDICION_CAMPO': { icon: '✏️', color: 'bg-amber-100 text-amber-700' },
      'CAMBIO_PRIORIDAD': { icon: '⚡', color: 'bg-orange-100 text-orange-700' },
      'PAUSA_SLA': { icon: '⏸️', color: 'bg-red-100 text-red-700' },
      'REANUDACION_SLA': { icon: '▶️', color: 'bg-teal-100 text-teal-700' },
      'COMENTARIO': { icon: '💬', color: 'bg-gray-100 text-gray-700' },
    };
    return iconos[tipo] || { icon: '📝', color: 'bg-gray-100 text-gray-700' };
  };

  const getTextoEvento = (evento: HistorialEvento) => {
    switch (evento.tipo_evento) {
      case 'CREACION':
        return 'Ticket creado';
      case 'ASIGNACION':
        return `Asignado a ${evento.valor_nuevo}`;
      case 'REASIGNACION':
        return `Reasignado de ${evento.valor_anterior} a ${evento.valor_nuevo}`;
      case 'CAMBIO_ESTADO':
        return `Estado cambiado de ${evento.valor_anterior} a ${evento.valor_nuevo}`;
      case 'EDICION_CAMPO':
        return `Campo "${evento.campo_modificado}" modificado`;
      case 'CAMBIO_PRIORIDAD':
        return `Prioridad cambiada de ${evento.valor_anterior} a ${evento.valor_nuevo}`;
      case 'PAUSA_SLA':
        return 'SLA pausado';
      case 'REANUDACION_SLA':
        return 'SLA reanudado';
      case 'COMENTARIO':
        return 'Comentario añadido';
      default:
        return evento.tipo_evento;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Historial del Ticket</h2>
              <p className="text-sm text-gray-600 mt-1">
                {ticketCodigo}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filtros */}
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-700 block mb-2">Filtrar por tipo:</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="TODOS">Todos los eventos</option>
              <option value="CREACION">Creación</option>
              <option value="CAMBIO_ESTADO">Cambios de estado</option>
              <option value="ASIGNACION">Asignaciones</option>
              <option value="REASIGNACION">Reasignaciones</option>
              <option value="EDICION_CAMPO">Ediciones</option>
              <option value="PAUSA_SLA">Pausas de SLA</option>
              <option value="REANUDACION_SLA">Reanudaciones SLA</option>
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">
                {filtroTipo === 'TODOS' ? 'No hay eventos en el historial' : 'No hay eventos de este tipo'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* Eventos */}
                {historial.map((evento, index) => {
                  const icono = getIconoTipoEvento(evento.tipo_evento);
                  return (
                    <div key={evento.id} className="relative flex gap-4 pb-6">
                      {/* Icono */}
                      <div className={`relative z-10 shrink-0 w-12 h-12 rounded-full ${icono.color} flex items-center justify-center text-lg`}>
                        {icono.icon}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {getTextoEvento(evento)}
                            </p>
                            
                            {evento.motivo && (
                              <div className="mt-2 bg-white border border-gray-200 rounded p-2">
                                <p className="text-xs font-medium text-gray-500 mb-1">Motivo:</p>
                                <p className="text-sm text-gray-700">{evento.motivo}</p>
                              </div>
                            )}

                            {evento.campo_modificado && evento.tipo_evento === 'EDICION_CAMPO' && (
                              <div className="mt-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">De:</span>
                                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs">
                                    {evento.valor_anterior || 'vacío'}
                                  </span>
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">
                                    {evento.valor_nuevo}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {evento.usuario_interno_nombre}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(evento.fecha_evento).toLocaleString('es-PE', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center rounded-b-lg shrink-0">
          <p className="text-sm text-gray-600">
            {historial.length} evento{historial.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
