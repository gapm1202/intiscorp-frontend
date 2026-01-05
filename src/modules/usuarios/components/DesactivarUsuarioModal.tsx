import { useState } from 'react';
import type { DesactivarUsuarioData } from '../services/usuariosService';

interface DesactivarUsuarioModalProps {
  usuarioNombre: string;
  onConfirm: (data: DesactivarUsuarioData) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const MOTIVOS_DESACTIVACION = [
  { value: 'Renuncia del empleado', label: 'Renuncia' },
  { value: 'Despido del empleado', label: 'Despido' },
  { value: 'Cambio de área o sede', label: 'Cambio de área' },
  { value: 'Usuario duplicado en sistema', label: 'Usuario duplicado' },
  { value: 'otro', label: 'Otro motivo' },
];

export function DesactivarUsuarioModal({
  usuarioNombre,
  onConfirm,
  onCancel,
  isSaving
}: DesactivarUsuarioModalProps) {
  const [formData, setFormData] = useState<DesactivarUsuarioData>({
    motivo: '',
    observacionAdicional: '',
  });

  const [motivoOtro, setMotivoOtro] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.motivo) {
      alert('Por favor seleccione un motivo de desactivación');
      return;
    }

    const motivoFinal = formData.motivo === 'otro' ? motivoOtro : formData.motivo;

    if (formData.motivo === 'otro' && !motivoOtro.trim()) {
      alert('Por favor especifique el motivo');
      return;
    }

    if (motivoFinal.trim().length < 10) {
      alert('El motivo debe tener al menos 10 caracteres');
      return;
    }

    const dataToSubmit = {
      ...formData,
      motivo: motivoFinal,
    };

    onConfirm(dataToSubmit);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="bg-linear-to-r from-red-600 to-pink-600 px-8 py-6 border-b border-red-500 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🚫</span>
            Desactivar Usuario
          </h2>
          <p className="text-red-100 text-sm mt-1">Usuario: <strong>{usuarioNombre}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Alerta de advertencia */}
          <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
            <p className="text-sm text-red-800 flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <span>
                <strong>Atención:</strong> Esta acción desactivará al usuario pero no lo eliminará. 
                El usuario seguirá visible en tickets históricos.
              </span>
            </p>
          </div>

          {/* Motivo de desactivación */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Motivo de desactivación <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.motivo}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              <option value="">Seleccione un motivo</option>
              {MOTIVOS_DESACTIVACION.map((motivo) => (
                <option key={motivo.value} value={motivo.value}>
                  {motivo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Campo "Otro" condicional */}
          {formData.motivo === 'otro' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Especifique el motivo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={motivoOtro}
                onChange={(e) => setMotivoOtro(e.target.value)}
                placeholder="Ej: Finalización de contrato"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {/* Observación adicional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Observación adicional
            </label>
            <textarea
              value={formData.observacionAdicional}
              onChange={(e) => setFormData(prev => ({ ...prev, observacionAdicional: e.target.value }))}
              placeholder="Agregue detalles adicionales si es necesario..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Fecha (automática) */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Fecha de desactivación:</strong> {new Date().toLocaleDateString('es-PE', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>

          {/* Info box con reglas */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-start gap-2">
              <span className="text-lg">📌</span>
              <span>
                <strong>Reglas importantes:</strong><br />
                • El usuario no se elimina de la base de datos<br />
                • No puede asignarse a nuevos activos<br />
                • Sigue visible en tickets históricos<br />
                • Puede reactivarse posteriormente si es necesario
              </span>
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
            >
              ↩️ Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Desactivando...
                </>
              ) : (
                <>🚫 Confirmar desactivación</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
