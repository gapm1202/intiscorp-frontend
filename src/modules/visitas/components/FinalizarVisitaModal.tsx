import { useState } from 'react';
import type { Visita, FinalizarVisitaPayload } from '../types';
import { finalizarVisita } from '../services/visitasService';

interface FinalizarVisitaModalProps {
  visita: Visita;
  onClose: () => void;
  onVisitaFinalizada: (visita: Visita) => void;
  onError: (error: string) => void;
}

export default function FinalizarVisitaModal({
  visita,
  onClose,
  onVisitaFinalizada,
  onError,
}: FinalizarVisitaModalProps) {
  const [observaciones, setObservaciones] = useState('');
  const [cuentaComoVisita, setCuentaComoVisita] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cuentaComoVisita === null) {
      onError('Debes indicar si cuenta como visita contractual');
      return;
    }

    setLoading(true);
    try {
      const payload: FinalizarVisitaPayload = {
        observacionesClausura: observaciones,
        cuentaComoVisitaContractual: cuentaComoVisita,
      };

      const response = await finalizarVisita(visita._id, payload);
      onVisitaFinalizada(response.data || response);
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center">
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
              rows={5}
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

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || cuentaComoVisita === null}
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
