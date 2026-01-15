import { useState, useEffect } from 'react';
import { credencialesService, type CredencialesPortal, type HistorialCredencial } from '../services/credencialesService';

interface CredencialesPortalModalProps {
  isOpen: boolean;
  empresaId: string;
  empresaNombre: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CredencialesPortalModal({
  isOpen,
  empresaId,
  empresaNombre,
  onClose,
  onSuccess
}: CredencialesPortalModalProps) {
  const [loading, setLoading] = useState(false);
  const [credenciales, setCredenciales] = useState<CredencialesPortal | null>(null);
  const [historial, setHistorial] = useState<HistorialCredencial[]>([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Formulario
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Cargar credenciales
  useEffect(() => {
    if (isOpen && empresaId) {
      loadCredenciales();
    }
  }, [isOpen, empresaId]);

  const loadCredenciales = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await credencialesService.getCredenciales(empresaId);
      setCredenciales(data);
      setUsuario(data.usuario);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar credenciales');
    } finally {
      setLoading(false);
    }
  };

  const loadHistorial = async () => {
    try {
      const data = await credencialesService.getHistorial(empresaId);
      setHistorial(data);
      setShowHistorial(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar historial');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      const updateData: any = { motivo };
      
      if (usuario !== credenciales?.usuario) {
        updateData.usuario = usuario;
      }
      
      if (contrasena.trim()) {
        updateData.contrasena = contrasena;
      }
      
      if (!updateData.usuario && !updateData.contrasena) {
        setError('No hay cambios para guardar');
        setSaving(false);
        return;
      }
      
      await credencialesService.actualizarCredenciales(empresaId, updateData);
      
      // Recargar credenciales
      await loadCredenciales();
      
      setEditMode(false);
      setContrasena('');
      setMotivo('');
      setMostrarContrasena(false);
      onSuccess?.();
      
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al actualizar credenciales');
    } finally {
      setSaving(false);
    }
  };

  const generarContrasena = () => {
    const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const numeros = '0123456789';
    const simbolos = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const todos = mayusculas + minusculas + numeros + simbolos;
    
    let password = '';
    password += mayusculas[Math.floor(Math.random() * mayusculas.length)];
    password += minusculas[Math.floor(Math.random() * minusculas.length)];
    password += numeros[Math.floor(Math.random() * numeros.length)];
    password += simbolos[Math.floor(Math.random() * simbolos.length)];
    
    for (let i = 4; i < 16; i++) {
      password += todos[Math.floor(Math.random() * todos.length)];
    }
    
    setContrasena(password.split('').sort(() => Math.random() - 0.5).join(''));
    setMostrarContrasena(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Credenciales Portal Soporte
              </h3>
              <p className="text-indigo-100 text-sm mt-1">{empresaNombre}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-indigo-800 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : showHistorial ? (
            /* Historial */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900">Historial de Cambios</h4>
                <button
                  onClick={() => setShowHistorial(false)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  ← Volver
                </button>
              </div>
              
              {historial.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay cambios registrados</p>
              ) : (
                <div className="space-y-3">
                  {historial.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {item.campoModificado === 'usuario' ? 'Usuario modificado' : 
                             item.campoModificado === 'contrasena' ? 'Contraseña modificada' : 
                             item.campoModificado}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Por:</span> {item.modificadoPorNombre}
                          </p>
                          {item.motivo && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Motivo:</span> {item.motivo}
                            </p>
                          )}
                          {item.campoModificado === 'usuario' && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-500">De:</span> <code className="bg-gray-100 px-2 py-0.5 rounded">{item.valorAnterior}</code>
                              <span className="text-gray-500 mx-2">→</span>
                              <span className="text-gray-500">A:</span> <code className="bg-gray-100 px-2 py-0.5 rounded">{item.valorNuevo}</code>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(item.fechaModificacion).toLocaleString('es-ES')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Formulario */
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Usuario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  disabled={!editMode}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                  placeholder="Usuario del portal"
                />
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Contraseña
                  </label>
                  {editMode && (
                    <button
                      type="button"
                      onClick={generarContrasena}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generar
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={mostrarContrasena ? "text" : "password"}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    disabled={!editMode}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono pr-10"
                    placeholder={editMode ? "Nueva contraseña (dejar vacío para no cambiar)" : "••••••••••••••"}
                  />
                  {editMode && contrasena && (
                    <button
                      type="button"
                      onClick={() => setMostrarContrasena(!mostrarContrasena)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {mostrarContrasena ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                {!editMode && (
                  <p className="text-xs text-gray-500 mt-1">Por seguridad, no se puede ver la contraseña actual. Solo puede modificarla.</p>
                )}
              </div>

              {/* Motivo (solo en modo edición) */}
              {editMode && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Motivo del cambio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    placeholder="Explica por qué estás modificando las credenciales..."
                    required
                  />
                </div>
              )}

              {/* Info de actualización */}
              {credenciales && !editMode && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Última actualización:</span>{' '}
                    {new Date(credenciales.updatedAt).toLocaleString('es-ES')}
                  </p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!showHistorial && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
            <button
              onClick={loadHistorial}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ver Historial
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50"
                type="button"
              >
                {editMode ? 'Cancelar' : 'Cerrar'}
              </button>
              
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Editar
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center gap-2"
                  type="submit"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Cambios
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
