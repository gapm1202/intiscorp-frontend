import { useState, useEffect } from 'react';
import { getUsuariosInternos } from '@/modules/auth/services/userService';
import { useAuth } from '@/hooks/useAuth';

interface Tecnico {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string;
  tickets_activos?: number;
}

interface AsignarTecnicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tecnicoId: number) => void;
  ticketId: number;
  tecnicoActual?: { id: number; nombre: string } | null;
}

export default function AsignarTecnicoModal({
  isOpen,
  onClose,
  onConfirm,
  ticketId,
  tecnicoActual
}: AsignarTecnicoModalProps) {
  const { user } = useAuth();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<number | null>(null);
  // motivo eliminado: no se solicitará motivo en asignación
  const [loading, setLoading] = useState(false);
  const [loadingTecnicos, setLoadingTecnicos] = useState(true);

  const esReasignacion = !!tecnicoActual;

  useEffect(() => {
    if (isOpen) {
      loadTecnicos();
      setTecnicoSeleccionado(null);
    }
  }, [isOpen]);

  const loadTecnicos = async () => {
    try {
      setLoadingTecnicos(true);
      // Obtener usuarios internos y filtrar por rol 'tecnico' o 'administrador'
      const data = await getUsuariosInternos();
      
      console.log('📊 Usuarios cargados (raw):', data);
      console.log('📊 Tipo de datos usuarios:', typeof data);
      
      // Normalizar respuesta - puede venir como array o como objeto con propiedad
      let usuariosArray = [];
      if (Array.isArray(data)) {
        usuariosArray = data;
      } else if (data?.usuarios && Array.isArray(data.usuarios)) {
        usuariosArray = data.usuarios;
      } else if (data?.data && Array.isArray(data.data)) {
        usuariosArray = data.data;
      } else if (typeof data === 'object' && data !== null) {
        // Si es un objeto, intentar extraer el primer array que encontremos
        const valores = Object.values(data);
        const primerArray = valores.find(v => Array.isArray(v));
        if (primerArray) {
          usuariosArray = primerArray as any[];
        }
      }
      
      console.log('📊 Usuarios normalizados:', usuariosArray);
      console.log('📊 Cantidad total de usuarios:', usuariosArray.length);
      if (usuariosArray.length > 0) {
        console.log('📊 Primer usuario ejemplo:', usuariosArray[0]);
        console.log('📊 Campos del usuario:', Object.keys(usuariosArray[0]));
      }
      
      // Filtrar por rol (incluir al usuario actual para que pueda auto-asignarse)
      const filtered = usuariosArray.filter((u: any) => {
        const rol = String(u.rol || u.role || '').toLowerCase().trim();
        const esRolValido = rol === 'tecnico' || rol === 'técnico' || rol === 'administrador';
        return esRolValido;
      });
      
      console.log('📊 Técnicos filtrados:', filtered);
      
      // Log detallado de cada técnico filtrado
      filtered.forEach((tec: any, index: number) => {
        console.log(`📊 Técnico ${index + 1}:`, {
          id: tec.id,
          nombreCompleto: tec.nombreCompleto,
          correoPrincipal: tec.correoPrincipal,
          usuario: tec.usuario,
          rol: tec.rol
        });
      });
      
      // Normalizar los campos de los usuarios para asegurar que tengan nombre y email
      const tecnicosNormalizados = filtered.map((u: any) => {
        const nombre = u.nombreCompleto || u.nombre || u.name || u.usuario || u.username || 'Usuario sin nombre';
        const esUsuarioActual = user && u.id === user.id;
        
        return {
          id: u.id,
          nombre: esUsuarioActual ? `Yo - ${nombre}` : nombre,
          email: u.correoPrincipal || u.email || u.correo || u.correo_principal || 'Sin email',
          especialidad: u.especialidad || u.specialty,
          tickets_activos: u.tickets_activos
        };
      });
      
      console.log('📊 Técnicos normalizados:', tecnicosNormalizados);
      
      setTecnicos(tecnicosNormalizados);
    } catch (error) {
      console.error('Error cargando técnicos:', error);
      setTecnicos([]);
    } finally {
      setLoadingTecnicos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tecnicoSeleccionado) {
      alert('Debe seleccionar un técnico');
      return;
    }
    setLoading(true);
    try {
      // No enviar motivo: backend deberá registrar la reasignación en el historial automáticamente
      await onConfirm(tecnicoSeleccionado);
      onClose();
    } catch (error) {
      console.error('Error al asignar técnico:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {esReasignacion ? 'Reasignar Técnico' : 'Asignar Técnico'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {tecnicoActual && (
            <p className="text-sm text-gray-600 mt-2">
              Técnico actual: <span className="font-medium text-gray-900">{tecnicoActual.nombre}</span>
            </p>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Selección de técnico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Seleccionar Técnico {esReasignacion && '(nuevo)'}
                <span className="text-red-500 ml-1">*</span>
              </label>

              {loadingTecnicos ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : tecnicos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay técnicos disponibles
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2">
                  {tecnicos.map((tecnico) => (
                    <label
                      key={tecnico.id}
                      className={`
                        flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${tecnicoSeleccionado === tecnico.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                        }
                        ${tecnicoActual?.id === tecnico.id ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <input
                        type="radio"
                        name="tecnico"
                        value={tecnico.id}
                        checked={tecnicoSeleccionado === tecnico.id}
                        onChange={() => setTecnicoSeleccionado(tecnico.id)}
                        disabled={tecnicoActual?.id === tecnico.id}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm">
                              {(tecnico.nombre || 'T').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{tecnico.nombre || 'Usuario sin nombre'}</p>
                            <p className="text-sm text-gray-600">{tecnico.email || 'Sin email'}</p>
                            {tecnico.especialidad && (
                              <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                {tecnico.especialidad}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Motivo eliminado: la reasignación se registrará en el historial sin pedir motivo */}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !tecnicoSeleccionado}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {esReasignacion ? 'Reasignar' : 'Asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
