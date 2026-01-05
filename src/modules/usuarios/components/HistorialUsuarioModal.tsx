import { useEffect, useState } from 'react';
import type { UsuarioHistorial } from '../services/usuariosService';
import { getHistorialUsuario } from '../services/usuariosService';

interface HistorialUsuarioModalProps {
  empresaId: string;
  usuarioId: string;
  usuarioNombre: string;
  onClose: () => void;
}

const ACCION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  creacion: { label: 'Creación', color: 'bg-green-100 text-green-800', icon: '✨' },
  edicion: { label: 'Edición', color: 'bg-blue-100 text-blue-800', icon: '✏️' },
  asignacion_activo: { label: 'Asignación de activo', color: 'bg-purple-100 text-purple-800', icon: '🖥️' },
  cambio_activo: { label: 'Cambio de activo', color: 'bg-yellow-100 text-yellow-800', icon: '🔄' },
  desactivacion: { label: 'Desactivación', color: 'bg-red-100 text-red-800', icon: '🚫' },
};

export function HistorialUsuarioModal({ empresaId, usuarioId, usuarioNombre, onClose }: HistorialUsuarioModalProps) {
  const [historial, setHistorial] = useState<UsuarioHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistorial = async () => {
      try {
        setLoading(true);
        const data = await getHistorialUsuario(empresaId, usuarioId);
        
        // Normalizar datos del backend (ya viene en camelCase)
        const normalized = data.map(item => {
          const fechaNormalizada = item.fechaCambio || item.fecha_cambio || item.fecha;
          
          return {
            ...item,
            id: item.historialId || item.id,
            accion: (item.accion || '').toLowerCase(), // Normalizar a minúsculas
            fecha: fechaNormalizada,
            realizadoPor: item.nombreQuienRealizo || item.nombre_quien_realizo || item.realizadoPor || item.realizado_por || 'Sistema',
            campo: item.campoModificado || item.campo_modificado || item.campo,
            valorAnterior: item.valorAnterior || item.valor_anterior,
            valorNuevo: item.valorNuevo || item.valor_nuevo,
            detalleAdicional: item.observacionAdicional || item.observacion_adicional || item.detalleAdicional,
          };
        });
        
        setHistorial(normalized);
      } catch (err) {
        console.error('Error cargando historial:', err);
        setError('Error al cargar el historial del usuario');
      } finally {
        setLoading(false);
      }
    };

    loadHistorial();
  }, [empresaId, usuarioId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-8 py-6 border-b border-indigo-500">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📜</span>
            Historial de Usuario
          </h2>
          <p className="text-indigo-100 text-sm mt-1">Usuario: <strong>{usuarioNombre}</strong></p>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-800">{error}</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">📭 No hay registros en el historial</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historial.map((item, index) => {
                const accionInfo = ACCION_LABELS[item.accion] || { 
                  label: item.accion, 
                  color: 'bg-gray-100 text-gray-800', 
                  icon: '📝' 
                };

                // Función para parsear y formatear valores de activos
                const formatearValor = (valor: string | null) => {
                  if (!valor) return null;
                  
                  // Intentar parsear JSON de activos
                  try {
                    const parsed = JSON.parse(valor);
                    console.log('🔍 JSON parseado:', parsed);
                    if (parsed.assetId || parsed.codigo || parsed.activoId) {
                      const codigo = parsed.assetId || parsed.codigo || `Activo ID: ${parsed.activoId}`;
                      console.log('✅ Código extraído:', codigo);
                      return codigo;
                    }
                    return valor;
                  } catch {
                    console.log('⚠️ No es JSON, valor directo:', valor);
                    return valor;
                  }
                };

                const valorAnteriorFormateado = formatearValor(item.valorAnterior);
                const valorNuevoFormateado = formatearValor(item.valorNuevo);
                
                console.log('📦 Valores formateados - Anterior:', valorAnteriorFormateado, 'Nuevo:', valorNuevoFormateado);

                return (
                  <div
                    key={item.id || index}
                    className="border-l-4 border-indigo-500 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{accionInfo.icon}</span>
                          <div>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${accionInfo.color}`}>
                              {accionInfo.label}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.fecha).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Realizado por</p>
                          <p className="text-sm font-semibold text-gray-800">{item.realizadoPor}</p>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 space-y-4">
                      {/* Activo asignado/cambiado */}
                      {(item.accion === 'asignacion_activo' || item.accion === 'cambio_activo') && (
                        <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">🖥️</span>
                            <div>
                              <p className="text-xs font-semibold text-indigo-700 mb-1">
                                {item.accion === 'cambio_activo' ? 'Activo cambiado a' : 'Activo asignado'}
                              </p>
                              <p className="text-xl font-mono font-bold text-indigo-900">
                                {valorNuevoFormateado || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Motivo */}
                      {item.motivo && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                            <span>💬</span> Motivo
                          </p>
                          <p className="text-sm text-blue-900">{item.motivo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
