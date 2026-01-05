import { useState, useEffect } from 'react';
import type { AsignarActivoData } from '../services/usuariosService';
import { getInventarioByEmpresa, getInventarioBySede } from '@/modules/inventario/services/inventarioService';

interface AsignarActivoModalProps {
  empresaId: string;
  sedeId?: string;
  usuarioNombre: string;
  activosAsignados?: Array<{id: string; _id?: string}>;
  onSave: (data: AsignarActivoData) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function AsignarActivoModal({
  empresaId,
  sedeId,
  usuarioNombre,
  activosAsignados = [],
  onSave,
  onCancel,
  isSaving
}: AsignarActivoModalProps) {
  const [formData, setFormData] = useState<AsignarActivoData>({
    activoId: '',
    fechaAsignacion: new Date().toISOString().split('T')[0],
    motivo: '',
    observacion: '',
  });

  const [activos, setActivos] = useState<any[]>([]);
  const [loadingActivos, setLoadingActivos] = useState(false);

  useEffect(() => {
    const loadActivos = async () => {
      setLoadingActivos(true);
      try {
        let data;
        // Si hay sedeId, cargar activos de la sede, sino de toda la empresa
        if (sedeId) {
          console.log('🏪 Cargando activos de la sede:', sedeId);
          data = await getInventarioBySede(empresaId, sedeId);
        } else {
          console.log('🏛️ Cargando activos de toda la empresa:', empresaId);
          data = await getInventarioByEmpresa(empresaId);
        }
        
        const activosArray = Array.isArray(data) ? data : data?.data || [];
        console.log('📦 Activos cargados:', activosArray.length);
        
        // Debug: ver el primer activo
        if (activosArray.length > 0) {
          console.log('🔍 Primer activo:', activosArray[0]);
        }
        
        // Filtrar activos que ya están asignados a este usuario
        const idsAsignados = activosAsignados.map(a => String(a.id || a._id));
        const activosDisponibles = activosArray.filter(activo => {
          const activoId = String(activo.id || activo._id);
          return !idsAsignados.includes(activoId);
        });
        
        console.log('✅ Activos disponibles (sin los ya asignados):', activosDisponibles.length);
        setActivos(activosDisponibles);
      } catch (error) {
        console.error('❌ Error cargando activos:', error);
      } finally {
        setLoadingActivos(false);
      }
    };

    loadActivos();
  }, [empresaId, sedeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.activoId) {
      alert('Por favor seleccione un activo');
      return;
    }

    if (!formData.motivo || formData.motivo.trim().length < 10) {
      alert('Por favor ingrese un motivo (mínimo 10 caracteres)');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="bg-linear-to-r from-green-600 to-teal-600 px-8 py-6 border-b border-green-500 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">�</span>
            Asignar Activo
          </h2>
          <p className="text-green-100 text-sm mt-1">Usuario: <strong>{usuarioNombre}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Activo a asignar */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Activo a asignar <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.activoId}
              onChange={(e) => setFormData(prev => ({ ...prev, activoId: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="">Seleccione un activo</option>
              {loadingActivos ? (
                <option disabled>Cargando activos...</option>
              ) : activos.length === 0 ? (
                <option disabled>No hay activos disponibles</option>
              ) : (
                activos.map((activo) => (
                  <option key={activo.id || activo._id} value={activo.id || activo._id}>
                    {activo.asset_id || activo.assetId}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Fecha de asignación */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de asignación <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fechaAsignacion}
              onChange={(e) => setFormData(prev => ({ ...prev, fechaAsignacion: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Motivo de la asignación <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.motivo}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ej: Usuario requiere equipo para home office"
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              required
              minLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 10 caracteres</p>
          </div>

          {/* Observación */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Observación adicional (opcional)
            </label>
            <textarea
              value={formData.observacion}
              onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
              placeholder="Ej: Equipo asignado para trabajo remoto"
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Info box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-start gap-2">
              <span className="text-lg">📌</span>
              <span>
                <strong>Al cambiar activo:</strong><br />
                • Se guarda historial automáticamente<br />
                • Los tickets históricos mostrarán el activo correcto de ese momento
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
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>💾 Guardar asignación</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
