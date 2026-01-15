import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authEmpresaService } from '../services/authEmpresaService';
import { incidenciaService } from '../services/incidenciaService';
import { portalService, type ActivoDetalle, type UsuarioDetalle } from '../services/portalService';

export default function ReporteIncidenciaPage() {
  const navigate = useNavigate();
  const [empresaSession, setEmpresaSession] = useState(authEmpresaService.getSession());
  const [formData, setFormData] = useState({
    descripcion: '',
    activoAfectado: '',
    dni: ''
  });
  const [noEsActivo, setNoEsActivo] = useState(false);
  const [activoDetalle, setActivoDetalle] = useState<ActivoDetalle | null>(null);
  const [usuarioDetalle, setUsuarioDetalle] = useState<UsuarioDetalle | null>(null);
  const [loadingActivo, setLoadingActivo] = useState(false);
  const [loadingUsuario, setLoadingUsuario] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!empresaSession) {
      navigate('/portal-soporte/login');
    }
  }, [empresaSession, navigate]);

  const handleLogout = () => {
    authEmpresaService.logout();
    navigate('/portal-soporte/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const incidenciaData: any = {
        tipoIncidencia: 'Incidente',
        descripcion: formData.descripcion,
        prioridad: 'normal',
        archivos
      };

      // Si es un activo
      if (!noEsActivo && activoDetalle) {
        incidenciaData.activoAfectado = formData.activoAfectado;
        incidenciaData.contactoNombre = activoDetalle.usuariosAsignados[0]?.nombre || 'N/A';
        incidenciaData.contactoEmail = activoDetalle.usuariosAsignados[0]?.correoPrincipal || '';
        incidenciaData.contactoTelefono = '000000000';
      }
      
      // Si es un usuario
      if (noEsActivo && usuarioDetalle) {
        incidenciaData.contactoNombre = usuarioDetalle.nombre;
        incidenciaData.contactoEmail = usuarioDetalle.correoPrincipal;
        incidenciaData.contactoTelefono = usuarioDetalle.telefono;
      }

      await incidenciaService.crearIncidencia(incidenciaData);
      
      setSuccess(true);
      setFormData({
        descripcion: '',
        activoAfectado: '',
        dni: ''
      });
      setArchivos([]);
      setActivoDetalle(null);
      setUsuarioDetalle(null);
      setNoEsActivo(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al reportar incidencia');
    } finally {
      setLoading(false);
    }
  };

  const buscarActivo = async () => {
    if (!formData.activoAfectado.trim()) return;
    
    setLoadingActivo(true);
    setError('');
    try {
      const detalle = await portalService.buscarActivoPorCodigo(formData.activoAfectado);
      console.log('📦 DATOS DEL ACTIVO RECIBIDOS:', JSON.stringify(detalle, null, 2));
      setActivoDetalle(detalle);
    } catch (err: any) {
      console.error('❌ Error buscando activo:', err);
      setError('No se encontró el activo con ese código');
      setActivoDetalle(null);
    } finally {
      setLoadingActivo(false);
    }
  };

  const buscarUsuario = async () => {
    if (!formData.dni.trim() || !empresaSession) return;
    
    setLoadingUsuario(true);
    setError('');
    try {
      const detalle = await portalService.buscarUsuarioPorDNI(empresaSession.id, formData.dni);
      setUsuarioDetalle(detalle);
    } catch (err: any) {
      setError('No se encontró usuario con ese DNI en la empresa');
      setUsuarioDetalle(null);
    } finally {
      setLoadingUsuario(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 5) {
        setError('Máximo 5 archivos permitidos');
        return;
      }
      setArchivos(files);
    }
  };

  if (!empresaSession) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{empresaSession.nombre}</h1>
                <p className="text-sm text-gray-600">RUC: {empresaSession.ruc}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Reportar Nueva Incidencia
            </h2>
            <p className="text-indigo-100 mt-2">Complete el formulario para reportar un problema o solicitar soporte técnico</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-green-800">¡Incidencia reportada exitosamente!</p>
                    <p className="text-sm text-green-700 mt-1">Nuestro equipo la atenderá a la brevedad posible.</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Checkbox: No es respecto a un activo */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noEsActivo}
                    onChange={(e) => {
                      setNoEsActivo(e.target.checked);
                      setActivoDetalle(null);
                      setUsuarioDetalle(null);
                      setFormData({ descripcion: formData.descripcion, activoAfectado: '', dni: '' });
                    }}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-gray-700">No es respecto a un activo específico</span>
                </label>
              </div>

              {/* Si NO es activo: Pedir DNI */}
              {noEsActivo ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ¿Quién eres? Ingresa tu DNI <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.dni}
                      onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                      placeholder="Ej: 12345678"
                      required
                      maxLength={8}
                    />
                    <button
                      type="button"
                      onClick={buscarUsuario}
                      disabled={loadingUsuario || !formData.dni.trim()}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingUsuario ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>

                  {/* Resumen del Usuario */}
                  {usuarioDetalle && (
                    <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Datos del Usuario
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Nombre:</p>
                          <p className="font-semibold text-gray-900">{usuarioDetalle.nombre}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cargo:</p>
                          <p className="font-semibold text-gray-900">{usuarioDetalle.cargo}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Correo:</p>
                          <p className="font-semibold text-blue-700">{usuarioDetalle.correoPrincipal}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Teléfono:</p>
                          <p className="font-semibold text-gray-900">{usuarioDetalle.telefono || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Sede:</p>
                          <p className="font-semibold text-gray-900">{usuarioDetalle.sede?.nombre || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Área:</p>
                          <p className="font-semibold text-gray-900">{usuarioDetalle.area?.nombre || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Si ES activo: Pedir código */
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Código de Activo Afectado <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.activoAfectado}
                      onChange={(e) => setFormData(prev => ({ ...prev, activoAfectado: e.target.value.toUpperCase() }))}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                      placeholder="Ej: ACT-001"
                      required
                    />
                    <button
                      type="button"
                      onClick={buscarActivo}
                      disabled={loadingActivo || !formData.activoAfectado.trim()}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingActivo ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>

                  {/* Resumen del Activo */}
                  {activoDetalle && (
                    <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-sm">
                      <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2 text-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Activo Encontrado
                      </h4>
                      
                      {/* Información Principal */}
                      <div className="bg-white rounded-lg p-4 mb-3 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Equipo</p>
                            <p className="font-bold text-gray-900 text-lg">{activoDetalle.nombre}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Código</p>
                            <p className="font-mono font-bold text-indigo-600 text-sm">{activoDetalle.codigo}</p>
                          </div>
                        </div>
                      </div>

                      {/* Ubicación */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sede</p>
                          <p className="font-semibold text-gray-900">{activoDetalle.sede?.nombre || 'N/A'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Área</p>
                          <p className="font-semibold text-gray-900">{activoDetalle.area?.nombre || 'N/A'}</p>
                        </div>
                      </div>

                      {/* AnyDesk */}
                      {activoDetalle.anydesk && (
                        <div className="bg-white rounded-lg p-3 mb-3 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">AnyDesk</p>
                          <p className="font-mono font-bold text-gray-900 text-lg">{activoDetalle.anydesk}</p>
                        </div>
                      )}

                      {/* Componentes */}
                      {activoDetalle.camposPersonalizados && Object.keys(activoDetalle.camposPersonalizados).length > 0 && (
                        <div className="bg-white rounded-lg p-4 mb-3 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Especificaciones Técnicas</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(activoDetalle.camposPersonalizados).map(([componentName, componentData]) => {
                              const items = Array.isArray(componentData) ? componentData : [componentData];
                              return items.map((item, idx) => {
                                const specs = Object.entries(item).filter(([k]) => k !== '');
                                const hasSpecs = specs.length > 0;
                                const fallbackValue = Object.values(item).find(v => v) || '';
                                
                                return (
                                  <div key={`${componentName}-${idx}`} className="border-2 border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                      <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">{componentName}</p>
                                    </div>
                                    {hasSpecs ? (
                                      <div className="space-y-1.5 pl-4">
                                        {specs.map(([key, value]) => (
                                          <div key={key} className="flex items-baseline gap-2">
                                            <span className="text-xs text-gray-500 font-medium min-w-[80px]">{key}:</span>
                                            <span className="text-sm text-gray-900 font-semibold">{value as string}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-900 font-semibold pl-4">{fallbackValue}</p>
                                    )}
                                  </div>
                                );
                              });
                            })}
                          </div>
                        </div>
                      )}

                      {/* Usuarios Asignados */}
                      {activoDetalle.usuariosAsignados && activoDetalle.usuariosAsignados.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Usuarios Asignados ({activoDetalle.usuariosAsignados.length})</p>
                          <div className="space-y-2">
                            {activoDetalle.usuariosAsignados.map((user) => (
                              <div key={user.id} className="border-l-4 border-indigo-500 bg-gray-50 rounded-r px-3 py-2">
                                <p className="font-bold text-gray-900">{user.nombre}</p>
                                <p className="text-sm text-indigo-600">{user.correoPrincipal}</p>
                                <p className="text-xs text-gray-600 mt-1">{user.cargo} • {user.area}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción del Problema <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="Describa detalladamente el problema o incidencia..."
                  required
                />
              </div>

              {/* Archivos Adjuntos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Archivos Adjuntos (opcional - máx. 5)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  accept="image/*,.pdf,.doc,.docx"
                />
                {archivos.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {archivos.length} archivo(s) seleccionado(s)
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Enviar Reporte
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
