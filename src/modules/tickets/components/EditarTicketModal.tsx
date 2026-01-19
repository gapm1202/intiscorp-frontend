import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Ticket, PrioridadTicket } from '../types';

interface EditarTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onSubmit: (cambios: any, motivo: string) => Promise<void>;
}

type Impacto = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
type Urgencia = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

const EditarTicketModal = ({ isOpen, onClose, ticket, onSubmit }: EditarTicketModalProps) => {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState('');
  
  // Estados del formulario (valores editables)
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: '' as PrioridadTicket | '',
    impacto: '' as Impacto | '',
    urgencia: '' as Urgencia | '',
  });

  // Cargar datos del ticket cuando se abre el modal
  useEffect(() => {
    if (isOpen && ticket) {
      setFormData({
        titulo: ticket.titulo || '',
        descripcion: ticket.descripcion || '',
        prioridad: ticket.prioridad || '',
        impacto: ticket.impacto || '',
        urgencia: ticket.urgencia || '',
      });
      setMotivo('');
    }
  }, [isOpen, ticket]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calcularPrioridad = (impacto: Impacto, urgencia: Urgencia): PrioridadTicket => {
    const matriz: Record<Impacto, Record<Urgencia, PrioridadTicket>> = {
      CRITICO: { CRITICA: 'CRITICA', ALTA: 'CRITICA', MEDIA: 'ALTA', BAJA: 'ALTA' },
      ALTO: { CRITICA: 'CRITICA', ALTA: 'ALTA', MEDIA: 'ALTA', BAJA: 'MEDIA' },
      MEDIO: { CRITICA: 'ALTA', ALTA: 'MEDIA', MEDIA: 'MEDIA', BAJA: 'BAJA' },
      BAJO: { CRITICA: 'MEDIA', ALTA: 'MEDIA', MEDIA: 'BAJA', BAJA: 'BAJA' }
    };
    return matriz[impacto][urgencia];
  };

  useEffect(() => {
    if (formData.impacto && formData.urgencia) {
      const nuevaPrioridad = calcularPrioridad(formData.impacto as Impacto, formData.urgencia as Urgencia);
      setFormData(prev => ({ ...prev, prioridad: nuevaPrioridad }));
    }
  }, [formData.impacto, formData.urgencia]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motivo.trim()) {
      alert('⚠️ Debe ingresar un motivo para los cambios');
      return;
    }

    // Detectar cambios comparando con valores originales
    const cambios: Record<string, { valorAnterior: any; valorNuevo: any }> = {};

    if (formData.titulo !== ticket.titulo) {
      cambios.titulo = { valorAnterior: ticket.titulo, valorNuevo: formData.titulo };
    }
    if (formData.descripcion !== ticket.descripcion) {
      cambios.descripcion = { valorAnterior: ticket.descripcion, valorNuevo: formData.descripcion };
    }
    if (formData.prioridad !== ticket.prioridad) {
      cambios.prioridad = { valorAnterior: ticket.prioridad, valorNuevo: formData.prioridad };
    }
    if (formData.impacto !== ticket.impacto) {
      cambios.impacto = { valorAnterior: ticket.impacto, valorNuevo: formData.impacto };
    }
    if (formData.urgencia !== ticket.urgencia) {
      cambios.urgencia = { valorAnterior: ticket.urgencia, valorNuevo: formData.urgencia };
    }

    if (Object.keys(cambios).length === 0) {
      alert('ℹ️ No se detectaron cambios');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(cambios, motivo);
      onClose();
    } catch (error) {
      console.error('Error editando ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Editar Ticket</h2>
            <p className="text-sm text-gray-500 mt-1">
              {ticket.codigo_ticket} - Modifique los campos necesarios
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Información Básica */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Información Básica
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => handleChange('titulo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.descripcion}
                    onChange={(e) => handleChange('descripcion', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Clasificación - Solo mostrar, no editar */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Clasificación (Solo lectura)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Categoría</label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                    {ticket.categoria_nombre || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Subcategoría</label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                    {ticket.subcategoria_nombre || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Servicio</label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                    {ticket.servicio_nombre || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tipo de Ticket</label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                    {ticket.tipo_ticket || 'N/A'}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                ℹ️ La clasificación no puede modificarse una vez creado el ticket
              </p>
            </div>

            {/* Priorización */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Priorización
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impacto <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.impacto}
                    onChange={(e) => handleChange('impacto', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="CRITICO">Crítico</option>
                    <option value="ALTO">Alto</option>
                    <option value="MEDIO">Medio</option>
                    <option value="BAJO">Bajo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgencia <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.urgencia}
                    onChange={(e) => handleChange('urgencia', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="CRITICA">Crítica</option>
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad (Calculada)
                  </label>
                  <div className={`w-full px-3 py-2 rounded-lg border text-center font-bold ${
                    formData.prioridad === 'CRITICA' ? 'bg-red-100 border-red-300 text-red-800' :
                    formData.prioridad === 'ALTA' ? 'bg-orange-100 border-orange-300 text-orange-800' :
                    formData.prioridad === 'MEDIA' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                    formData.prioridad === 'BAJA' ? 'bg-green-100 border-green-300 text-green-800' :
                    'bg-gray-100 border-gray-300 text-gray-500'
                  }`}>
                    {formData.prioridad || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-800">
                  <strong>ℹ️ Nota:</strong> La prioridad se calcula automáticamente según la matriz de Impacto × Urgencia.
                </p>
              </div>
            </div>

            {/* Motivo del Cambio */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Motivo del Cambio
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Por qué está editando este ticket? <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Actualización de información proporcionada por el usuario, corrección de datos incorrectos, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este motivo quedará registrado en el historial del ticket junto con los campos modificados.
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarTicketModal;
