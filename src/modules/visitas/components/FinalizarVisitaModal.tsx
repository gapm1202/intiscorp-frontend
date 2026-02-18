import { useState, useEffect } from 'react';
import type { Visita, FinalizarVisitaPayload } from '../types';
import { finalizarVisita } from '../services/visitasService';
import { getTicketById } from '@/modules/tickets/services/ticketsService';

interface FinalizarVisitaModalProps {
  visita: Visita;
  onClose: () => void;
  onVisitaFinalizada: (visita: Visita) => void;
  onError: (error: string) => void;
  onAbrirModalEditarActivo?: (activo: any) => void | Promise<void>;
}

export default function FinalizarVisitaModal({
  visita,
  onClose,
  onVisitaFinalizada,
  onError,
  onAbrirModalEditarActivo,
}: FinalizarVisitaModalProps) {
  const [observaciones, setObservaciones] = useState('');
  const [cuentaComoVisita, setCuentaComoVisita] = useState<boolean | null>(null);
  const [hayChangioComponente, setHayChangioComponente] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [activo, setActivo] = useState<any>(null);
  const [cargandoActivo, setCargandoActivo] = useState(false);

  // Cargar activo del ticket si es tipo POR_TICKET
  useEffect(() => {
    const cargarActivo = async () => {
      if (visita.tipoVisita !== 'POR_TICKET' || !visita.ticketId) return;

      setCargandoActivo(true);
      try {
        // Obtener ticket completo - convertir ticketId a number
        const ticketId = Number(visita.ticketId);
        const ticket = await getTicketById(ticketId);
        console.log('✅ Ticket obtenido:', ticket);
        console.log('📌 Datos de empresa/sede:', { empresa_id: ticket?.empresa_id, sede_id: ticket?.sede_id });

        // Si el ticket tiene activos, enriquecerlo con datos de empresa y sede
        if (ticket.activos && ticket.activos.length > 0) {
          const activoDelTicket = ticket.activos[0];
          // Enriquecer el activo AQUÍ con empresa_id y sede_id del ticket
          const activoEnriquecido = {
            ...activoDelTicket,
            empresa_id: ticket.empresa_id,
            sede_id: ticket.sede_id,
          };
          console.log('📦 Activo del ticket enriquecido:', activoEnriquecido);
          setActivo(activoEnriquecido);
        }
      } catch (error) {
        console.error('Error cargando activo:', error);
      } finally {
        setCargandoActivo(false);
      }
    };

    cargarActivo();
  }, [visita]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cuentaComoVisita === null) {
      onError('Debes indicar si cuenta como visita contractual');
      return;
    }

    if (hayChangioComponente === null) {
      onError('Debes indicar si se realizó cambio de componente');
      return;
    }

    setLoading(true);
    try {
      const payload: FinalizarVisitaPayload = {
        observacionesClausura: observaciones,
        cuentaComoVisitaContractual: cuentaComoVisita,
      };

      const response = await finalizarVisita(visita._id, payload);
      const visitaFinalizada = response.data || response;
      
      onVisitaFinalizada(visitaFinalizada);

      // Si hay cambio de componente, abrir modal de edición del activo
      if (hayChangioComponente && activo?.activo_id && onAbrirModalEditarActivo) {
        onClose(); // Cerrar modal primero
        setTimeout(() => {
          // El activo ya está enriquecido con empresa_id y sede_id desde el useEffect
          console.log('🎯 [ENVIANDO ACTIVO YA ENRIQUECIDO A MODAL]', activo);
          console.log('   Datos incluidos:', { empresa_id: activo?.empresa_id, sede_id: activo?.sede_id });
          onAbrirModalEditarActivo(activo);
        }, 300);
      } else {
        onClose(); // Cerrar modal si no hay cambio de componente
      }
    } catch (error: any) {
      console.error('Error finalizing visita:', error);
      onError(error.message || 'Error al finalizar la visita');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold">Finalizar Visita</h2>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información de la Visita */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Información de la Visita</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium">Fecha Programada</p>
                <p className="text-blue-900 font-semibold">{formatDate(visita.fechaProgramada)}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Tipo</p>
                <p className="text-blue-900 font-semibold">{visita.tipoVisita}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Técnico Encargado</p>
                <p className="text-blue-900 font-semibold">
                  {visita.tecnicosAsignados.find((t) => t.esEncargado)?.tecnicoNombre || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Número de Técnicos</p>
                <p className="text-blue-900 font-semibold">{visita.tecnicosAsignados.length}</p>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones de Clausura
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Describe el resultado de la visita, actividades realizadas, incidencias, etc..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Checkbox - Cuenta como visita contractual */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-900 mb-4">
              ¿Cuenta esta visita como visita contractual?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="cuentaComoVisita"
                  value="si"
                  checked={cuentaComoVisita === true}
                  onChange={() => setCuentaComoVisita(true)}
                  className="w-4 h-4 text-green-600"
                />
                <span className="ml-3 font-medium text-amber-900">Sí, cuenta</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="cuentaComoVisita"
                  value="no"
                  checked={cuentaComoVisita === false}
                  onChange={() => setCuentaComoVisita(false)}
                  className="w-4 h-4 text-red-600"
                />
                <span className="ml-3 font-medium text-amber-900">No, no cuenta</span>
              </label>
            </div>
          </div>

          {/* Info sobre no contabilización */}
          {cuentaComoVisita === false && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
              ⚠️ Esta visita no se contabilizará como parte del compromiso contractual, pero quedará registrada en el
              historial.
            </div>
          )}

          {/* Checkbox - Cambio de Componente */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <p className="text-sm font-medium text-purple-900 mb-4">
              ¿Se realizó algún cambio de componente?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="hayChangioComponente"
                  value="si"
                  checked={hayChangioComponente === true}
                  onChange={() => setHayChangioComponente(true)}
                  className="w-4 h-4 text-green-600"
                />
                <span className="ml-3 font-medium text-purple-900">Sí, hay cambio</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="hayChangioComponente"
                  value="no"
                  checked={hayChangioComponente === false}
                  onChange={() => setHayChangioComponente(false)}
                  className="w-4 h-4 text-red-600"
                />
                <span className="ml-3 font-medium text-purple-900">No, sin cambios</span>
              </label>
            </div>
          </div>

          {/* Componente Cambiado - Mostrar Activo */}
          {hayChangioComponente === true && (
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
              <p className="text-sm font-medium text-indigo-900 mb-4">
                Componente Cambiado
              </p>
              {cargandoActivo ? (
                <div className="flex items-center gap-2 text-indigo-700">
                  <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                  <span>Cargando activo...</span>
                </div>
              ) : activo ? (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-300">
                  <div className="flex-1">
                    <p className="text-xs text-indigo-600 font-medium">CÓDIGO DEL ACTIVO</p>
                    <p className="text-lg font-bold text-indigo-900">{activo.activo_codigo || activo.assetId || activo.codigo || activo.id}</p>
                    {activo.categoria && (
                      <p className="text-sm text-indigo-700 mt-1">{activo.categoria}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (activo?.activo_id && onAbrirModalEditarActivo) {
                        onClose();
                        setTimeout(() => {
                          onAbrirModalEditarActivo(activo);
                        }, 300);
                      }
                    }}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition whitespace-nowrap"
                  >
                    Editar
                  </button>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p>No hay activos registrados para este ticket.</p>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || cuentaComoVisita === null || hayChangioComponente === null}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              Finalizar Visita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
