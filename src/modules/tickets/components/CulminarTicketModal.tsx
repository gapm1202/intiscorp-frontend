import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CulminarTicketModalProps {
  ticket: any;
  onClose: () => void;
  onConfirm: (data: { resumen: string; hayChangioComponente: boolean }) => Promise<void>;
  onError: (error: string) => void;
}

export default function CulminarTicketModal({
  ticket,
  onClose,
  onConfirm,
  onError,
}: CulminarTicketModalProps) {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState('');
  const [hayChangioComponente, setHayChangioComponente] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resumen.trim()) {
      onError('Debes ingresar un resumen de la solución');
      return;
    }

    if (hayChangioComponente === null) {
      onError('Debes indicar si se realizó algún cambio de componente');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        resumen: resumen.trim(),
        hayChangioComponente,
      });

      // Si se realizó cambio de componente, redirigir al inventario
      if (hayChangioComponente && ticket.sede_id) {
        setTimeout(() => {
          navigate(`/admin/empresas/${ticket.empresa_id}/sedes/${ticket.sede_id}/inventario`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error cumulating ticket:', error);
      onError(error.message || 'Error al culminar el ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Culminar Ticket</h2>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del Ticket */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Información del Ticket</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium">Código</p>
                <p className="text-blue-900 font-semibold">{ticket.codigo_ticket}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Categoría</p>
                <p className="text-blue-900 font-semibold">{ticket.categoria_nombre || 'N/A'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Prioridad</p>
                <p className="text-blue-900 font-semibold">{ticket.prioridad}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Técnico</p>
                <p className="text-blue-900 font-semibold">{ticket.tecnico_nombre || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Resumen de Solución */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resumen de la Solución Aplicada*
            </label>
            <textarea
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              placeholder="Describe la solución aplicada, cambios realizados, resultados obtenidos, etc..."
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo requerido para culminar</p>
          </div>

          {/* Checkbox - Cambio de Componente */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-900 mb-4">
              ¿Se realizó algún cambio de componente?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="hayChangeComponente"
                  value="si"
                  checked={hayChangioComponente === true}
                  onChange={() => setHayChangioComponente(true)}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="ml-3 font-medium text-amber-900">Sí, hay cambio de componente</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="hayChangeComponente"
                  value="no"
                  checked={hayChangioComponente === false}
                  onChange={() => setHayChangioComponente(false)}
                  className="w-4 h-4 text-red-600"
                />
                <span className="ml-3 font-medium text-amber-900">No, sin cambios</span>
              </label>
            </div>
          </div>

          {/* Info sobre cambio de componente */}
          {hayChangioComponente === true && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
              <p>
                Se abrirá automáticamente el módulo de <strong>Inventario</strong> para que registres los cambios de componentes realizados.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
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
              disabled={loading || hayChangioComponente === null || !resumen.trim()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              Culminar Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
