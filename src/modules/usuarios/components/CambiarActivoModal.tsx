import { useState, useEffect } from 'react';
import type { AsignarActivoData } from '../services/usuariosService';
import { getInventarioByEmpresa, getInventarioBySede } from '@/modules/inventario/services/inventarioService';

interface CambiarActivoModalProps {
  empresaId: string;
  sedeId?: string;
  usuarioNombre: string;
  activosAsignados?: Array<{
    id: string;
    assetId: string;
    codigo: string;
    nombre?: string;
  }>;
  onSave: (data: AsignarActivoData) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function CambiarActivoModal({
  empresaId,
  sedeId,
  usuarioNombre,
  activosAsignados = [],
  onSave,
  onCancel,
  isSaving
}: CambiarActivoModalProps) {
  const [activoSeleccionado, setActivoSeleccionado] = useState<string>('');
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
          console.log('🏭️ Cargando activos de toda la empresa:', empresaId);
          data = await getInventarioByEmpresa(empresaId);
        }
        
        const activosArray = Array.isArray(data) ? data : data?.data || [];
        console.log('📦 Activos cargados:', activosArray.length);
        
        // En sistema M:N, mostrar TODOS los activos de la sede
        setActivos(activosArray);
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
    
    if (!activoSeleccionado) {
      alert('Por favor seleccione el activo que desea cambiar');
      return;
    }
    
    if (!formData.activoId) {
      alert('Por favor seleccione el nuevo activo');
      return;
    }

    if (!formData.motivo || formData.motivo.trim().length < 10) {
      alert('Por favor ingrese el motivo del cambio (mínimo 10 caracteres)');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="bg-linear-to-r from-orange-600 to-amber-600 px-8 py-6 border-b border-orange-500 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🔄</span>
            Cambiar Activo
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Seleccionar activo a cambiar */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seleccione el activo que desea cambiar <span className="text-red-500">*</span>
            </label>
            <select
              value={activoSeleccionado}
              onChange={(e) => setActivoSeleccionado(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">Seleccione un activo</option>
              {activosAsignados.length === 0 ? (
                <option disabled>No hay activos asignados</option>
              ) : (
                activosAsignados.map((activo) => (
                  <option key={activo.id} value={activo.id}>
                    {activo.codigo || activo.assetId}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Nuevo activo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nuevo activo <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.activoId}
              onChange={(e) => setFormData(prev => ({ ...prev, activoId: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">Seleccione un activo</option>
              {loadingActivos ? (
                <option disabled>Cargando activos...</option>
              ) : activos.length === 0 ? (
                <option disabled>No hay activos disponibles</option>
              ) : (
                activos
                  .filter(activo => {
                    // Filtrar el activo que se está cambiando
                    const activoId = String(activo.id || activo._id);
                    return activoId !== activoSeleccionado;
                  })
                  .map((activo) => (
                    <option key={activo.id || activo._id} value={activo.id || activo._id}>
                      {activo.asset_id || activo.assetId}
                    </option>
                  ))
              )}
            </select>
          </div>

          {/* Fecha de cambio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de cambio <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fechaAsignacion}
              onChange={(e) => setFormData(prev => ({ ...prev, fechaAsignacion: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          {/* Motivo del cambio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Motivo del cambio <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.motivo}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Ej: Activo anterior dañado, se asigna reemplazo"
              required
              minLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 10 caracteres</p>
          </div>

          {/* Observación adicional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Observación adicional (opcional)
            </label>
            <textarea
              value={formData.observacion}
              onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Información adicional sobre el cambio..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-linear-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Cambiando...
                </span>
              ) : (
                '🔄 Cambiar Activo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
