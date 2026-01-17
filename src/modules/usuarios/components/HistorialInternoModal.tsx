import { useEffect, useState } from 'react';
import { usuariosInternosService } from '../services/usuariosInternosService';
import type { HistorialUsuarioInterno } from '../types/usuariosInternos.types';

interface HistorialInternoModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioId: number;
  usuarioNombre: string;
}

const tipoEventoLabels: Record<string, { label: string; icon: string; color: string }> = {
  creacion: { label: 'Creación', icon: '✨', color: 'bg-green-100 text-green-800' },
  edicion: { label: 'Edición', icon: '✏️', color: 'bg-blue-100 text-blue-800' },
  cambio_rol: { label: 'Cambio de Rol', icon: '👑', color: 'bg-purple-100 text-purple-800' },
  restablecer_password: { label: 'Restablecer Contraseña', icon: '🔑', color: 'bg-orange-100 text-orange-800' },
  activacion: { label: 'Activación', icon: '✅', color: 'bg-green-100 text-green-800' },
  desactivacion: { label: 'Desactivación', icon: '🚫', color: 'bg-red-100 text-red-800' },
  cambio_correo_principal: { label: 'Cambio Correo Principal', icon: '📧', color: 'bg-cyan-100 text-cyan-800' },
  cambio_telefono_principal: { label: 'Cambio Teléfono Principal', icon: '📱', color: 'bg-indigo-100 text-indigo-800' },
  agregar_correo: { label: 'Agregar Correo', icon: '➕📧', color: 'bg-teal-100 text-teal-800' },
  eliminar_correo: { label: 'Eliminar Correo', icon: '➖📧', color: 'bg-rose-100 text-rose-800' },
  agregar_telefono: { label: 'Agregar Teléfono', icon: '➕📞', color: 'bg-sky-100 text-sky-800' },
  eliminar_telefono: { label: 'Eliminar Teléfono', icon: '➖📞', color: 'bg-pink-100 text-pink-800' }
};

export default function HistorialInternoModal({
  isOpen,
  onClose,
  usuarioId,
  usuarioNombre
}: HistorialInternoModalProps) {
  const [historial, setHistorial] = useState<HistorialUsuarioInterno[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistorial();
    }
  }, [isOpen, usuarioId]);

  const loadHistorial = async () => {
    setLoading(true);
    try {
      const data = await usuariosInternosService.getHistorial(usuarioId);
      setHistorial(data);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-600 text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historial de Cambios
              </h3>
              <p className="text-sm opacity-90 mt-1">Usuario: {usuarioNombre}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 font-medium">No hay historial disponible</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent"></div>

              {/* Timeline items */}
              <div className="space-y-6">
                {historial.map((evento) => {
                  const tipoInfo = tipoEventoLabels[evento.tipoEvento] || {
                    label: evento.tipoEvento,
                    icon: '📝',
                    color: 'bg-slate-100 text-slate-800'
                  };

                  return (
                    <div key={evento.id} className="relative pl-20">
                      {/* Timeline dot */}
                      <div className="absolute left-6 top-2 w-5 h-5 rounded-full bg-white border-4 border-primary shadow-lg"></div>

                      {/* Event card */}
                      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tipoInfo.color}`}>
                              {tipoInfo.icon} {tipoInfo.label}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {formatFecha(evento.fecha)}
                          </span>
                        </div>

                        {evento.campoModificado && (
                          <div className="mb-2">
                            <span className="text-sm font-semibold text-slate-700">
                              Campo: <span className="text-primary">{evento.campoModificado}</span>
                            </span>
                          </div>
                        )}

                        {evento.valorAnterior && (
                          <div className="grid grid-cols-2 gap-4 mb-2 text-sm">
                            <div>
                              <span className="text-slate-500 font-medium">Valor anterior:</span>
                              <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-800 break-all">
                                {evento.valorAnterior}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium">Valor nuevo:</span>
                              <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-green-800 break-all">
                                {evento.valorNuevo}
                              </div>
                            </div>
                          </div>
                        )}

                        {evento.motivoCambio && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm">
                            <span className="font-semibold text-blue-800">Motivo:</span>
                            <p className="text-blue-700 mt-1">{evento.motivoCambio}</p>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Realizado por: <span className="font-medium text-slate-700">{evento.realizadoPorNombre}</span>
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
        <div className="border-t px-6 py-4 flex justify-between items-center bg-slate-50 rounded-b-xl">
          <p className="text-sm text-slate-600">
            Total de eventos: <span className="font-bold text-primary">{historial.length}</span>
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
