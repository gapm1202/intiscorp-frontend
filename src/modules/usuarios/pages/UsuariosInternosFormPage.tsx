import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usuariosInternosService } from '../services/usuariosInternosService';
import { plataformasService } from '@/modules/catalogo/services/plataformasService';
import { tiposCorreoService } from '@/modules/catalogo/services/tiposCorreoService';
import { protocolosService } from '@/modules/catalogo/services/protocolosService';
import { tiposLicenciaService } from '@/modules/catalogo/services/tiposLicenciaService';
import type { CrearUsuarioInternoData } from '../types/usuariosInternos.types';
import type { Plataforma, TipoCorreo, Protocolo, TipoLicencia } from '@/modules/catalogo/types';

export default function UsuariosInternosFormPage() {
  const navigate = useNavigate();
  const params = useParams();
  const usuarioIdParam = params.id ? parseInt(params.id) : undefined;
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [motivoEdicion, setMotivoEdicion] = useState('');
  const location = useLocation();
  const isResetMode = location.pathname.includes('/restablecer');
  const [initialCorreos, setInitialCorreos] = useState<any[]>([]);
  const [initialTelefonos, setInitialTelefonos] = useState<any[]>([]);
  const [deletedCorreosIds, setDeletedCorreosIds] = useState<number[]>([]);
  const [deletedTelefonosIds, setDeletedTelefonosIds] = useState<number[]>([]);

  // Catálogos
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [tiposCorreo, setTiposCorreo] = useState<TipoCorreo[]>([]);
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [tiposLicencia, setTiposLicencia] = useState<TipoLicencia[]>([]);

  // Datos del formulario
  const [formData, setFormData] = useState<CrearUsuarioInternoData>({
    nombreCompleto: '',
    correoPrincipal: '',
    correoPrincipalConfig: {
      descripcionUso: '',
      plataformaId: 0,
      tipoCorreoId: 0,
      protocoloId: 0,
      tipoLicenciaId: 0
    },
    correosAdicionales: [],
    telefonos: [],
    rol: 'tecnico',
    usuario: '',
    contrasena: '',
    forzarCambioPassword: false,
    activo: true
  });

  // Cargar catálogos
  useState(() => {
    const loadCatalogos = async () => {
      try {
        const [plats, tipos, prots, lics] = await Promise.all([
          plataformasService.getAll(),
          tiposCorreoService.getAll(),
          protocolosService.getAll(),
          tiposLicenciaService.getAll()
        ]);
        setPlataformas(plats.filter(p => p.activo));
        setTiposCorreo(tipos.filter(t => t.activo));
        setProtocolos(prots.filter(p => p.activo));
        setTiposLicencia(lics.filter(l => l.activo));
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    loadCatalogos();
  });

  useEffect(() => {
    if (usuarioIdParam) {
      // Modo edición
      setIsEdit(true);
      const loadUsuario = async () => {
        setLoading(true);
        try {
          const u = await usuariosInternosService.getById(usuarioIdParam);
          // Mapear al formato del formulario (CrearUsuarioInternoData)
          // Normalizar correos y teléfonos para asegurar campos esperados por el formulario
          const correos = (u.correosAdicionales || []).map((c: any) => ({
            id: c.id,
            correo: c.correo || c.email || '',
            descripcion: c.descripcion || c.description || c.descripcionUso || '',
            plataformaId: c.plataformaId || 0,
            tipoCorreoId: c.tipoCorreoId || 0,
            protocoloId: c.protocoloId || 0,
            tipoLicenciaId: c.tipoLicenciaId || 0,
            esPrincipal: !!c.esPrincipal,
            activo: typeof c.activo === 'boolean' ? c.activo : true
          })).filter((c: any) => c.correo !== (u.correoPrincipal || ''));

          const telefonos = (u.telefonos || []).map((t: any) => ({
            id: t.id,
            numero: t.numero || t.numeroTelefono || t.phone || '',
            tipo: t.tipo || 'movil',
            descripcion: t.descripcion || t.description || '',
            esPrincipal: !!t.esPrincipal
          }));

          setFormData({
            nombreCompleto: u.nombreCompleto || '',
            nombre: u.nombreCompleto || '',
            correoPrincipal: u.correoPrincipal || '',
            correoPrincipalConfig: {
              descripcionUso: u.correoPrincipalConfig?.descripcionUso || '',
              plataformaId: u.correoPrincipalConfig?.plataformaId || 0,
              tipoCorreoId: u.correoPrincipalConfig?.tipoCorreoId || 0,
              protocoloId: u.correoPrincipalConfig?.protocoloId || 0,
              tipoLicenciaId: u.correoPrincipalConfig?.tipoLicenciaId || 0
            },
            correosAdicionales: correos,
            telefonos: telefonos,
            rol: u.rol || 'tecnico',
            usuario: u.usuario || '',
            contrasena: '',
            forzarCambioPassword: u.forzarCambioPassword || false,
            activo: typeof u.activo === 'boolean' ? u.activo : true
          });
          setInitialCorreos(u.correosAdicionales || []);
          setInitialTelefonos(u.telefonos || []);
          // Si venimos de restablecer, abrir la pestaña de Acceso al Sistema (índice 0 en modo restablecer)
          if (isResetMode) {
            setCurrentTab(0);
          }
        } catch (error) {
          console.error('Error cargando usuario para edición:', error);
          alert('No se pudo cargar el usuario para edición');
          navigate('/admin/usuarios/internos');
        } finally {
          setLoading(false);
        }
      };
      loadUsuario();
    }
  }, [usuarioIdParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombreCompleto.trim()) {
      alert('El nombre completo es requerido');
      return;
    }
    if (!formData.correoPrincipal.trim()) {
      alert('El correo principal es requerido');
      return;
    }
    // Validar campos de acceso sólo en creación o en modo restablecer
    if (!isEdit || isResetMode) {
      if (!formData.usuario.trim()) {
        alert('El usuario es requerido');
        return;
      }
      if (!formData.contrasena || formData.contrasena.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres');
        return;
      }
    }

    setLoading(true);
    try {
      // En modo edición usamos el endpoint de actualización (solo algunos campos soportados por backend)
      if (isEdit && usuarioIdParam) {
        // Pedir motivo de edición si no está provisto
        // Si estamos en modo restablecer, usamos el endpoint de restablecer contraseña
        if (isResetMode) {
          // Validar contraseña y motivo
          if (!formData.contrasena || formData.contrasena.length < 8) {
            alert('La contraseña debe tener al menos 8 caracteres');
            setLoading(false);
            return;
          }
          const motivo = prompt('Motivo del restablecimiento (mínimo 10 caracteres):') || '';
          if (!motivo || motivo.trim().length < 10) {
            alert('Por favor ingrese el motivo del restablecimiento (mínimo 10 caracteres)');
            setLoading(false);
            return;
          }

          await usuariosInternosService.resetPassword(usuarioIdParam, { nuevaPassword: formData.contrasena, motivoCambio: motivo });
          alert('Contraseña restablecida correctamente');
          navigate('/admin/usuarios/internos');
          return;
        }

        // Edición normal: solicitar motivo y actualizar campos permitidos
        let motivo = motivoEdicion;
        if (!motivo || motivo.trim().length < 10) {
          motivo = prompt('Motivo de la edición (mínimo 10 caracteres):') || '';
        }
        if (!motivo || motivo.trim().length < 10) {
          alert('Por favor ingrese el motivo de la edición (mínimo 10 caracteres)');
          setLoading(false);
          return;
        }

        const updatePayload = {
          nombreCompleto: formData.nombreCompleto,
          rol: formData.rol,
          activo: formData.activo,
          motivoCambio: motivo,
          correoPrincipal: formData.correoPrincipal,
          correoPrincipalConfig: formData.correoPrincipalConfig,
          correosAdicionales: formData.correosAdicionales || [],
          telefonos: formData.telefonos || [],
          deletedCorreosIds: deletedCorreosIds || [],
          deletedTelefonosIds: deletedTelefonosIds || []
        };

        await usuariosInternosService.update(usuarioIdParam, updatePayload as any);
        alert('Usuario actualizado correctamente');
        navigate('/admin/usuarios/internos');
        return;
      }

      // Creación (comportamiento existente)
      const payload = {
        ...formData,
        nombre: formData.nombreCompleto // ← Fix temporal
      };
      
      await usuariosInternosService.create(payload);
      alert('Usuario creado correctamente. Se ha enviado el correo de bienvenida.');
      navigate('/admin/usuarios/internos');
    } catch (error: any) {
      console.error('Error creando/actualizando usuario:', error);
      alert(error.response?.data?.message || 'Error procesando usuario');
    } finally {
      setLoading(false);
    }
  };

  const allTabs = ['Datos Generales', 'Correo Principal', 'Correos Adicionales', 'Teléfonos', 'Acceso al Sistema'];
  // En modo edición normal no permitimos editar "Acceso al Sistema"; en modo restablecer solo mostramos esa pestaña
  const tabs = isResetMode ? [allTabs[4]] : (isEdit ? allTabs.slice(0, 4) : allTabs);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/usuarios/internos')}
            className="flex items-center gap-2 text-slate-600 hover:text-primary mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Usuarios Internos
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
            {isResetMode ? 'Restablecer contraseña' : (isEdit ? 'Editar Usuario Interno' : 'Nuevo Usuario Interno')}
          </h1>
          <p className="text-slate-600 mt-2">{isResetMode ? 'Ingrese la nueva contraseña para el acceso al sistema.' : (isEdit ? 'Modifique los campos y confirme para actualizar.' : 'Se enviará un correo de bienvenida automáticamente al crear el usuario')}</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50">
            {tabs.map((tab, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentTab(index)}
                className={`flex-1 py-4 px-6 text-sm font-semibold transition-all duration-200 relative ${
                  currentTab === index
                    ? 'bg-white text-primary border-b-3 border-primary shadow-sm'
                    : 'text-slate-600 hover:text-primary hover:bg-white/50'
                }`}
              >
                {currentTab === index && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-600"></div>
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Tab 0: Datos Generales */}
            {(!isResetMode && currentTab === 0) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombreCompleto}
                    onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ej: Juan Pérez García"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as any })}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                  >
                    <option value="tecnico">🔧 Técnico</option>
                    <option value="administrador">👑 Administrador</option>
                    <option value="cliente">👤 Cliente</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor="activo" className="text-sm text-slate-700">
                    Usuario activo
                  </label>
                </div>
              </div>
            )}

            {/* Tab 2: Correos Adicionales */}
            {(!isResetMode && currentTab === 2) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">Agrega correos adicionales para el usuario</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        correosAdicionales: [
                          ...formData.correosAdicionales,
                          { correo: '', descripcion: '', plataformaId: 0, tipoCorreoId: 0, protocoloId: 0, tipoLicenciaId: 0, esPrincipal: false, activo: true }
                        ]
                      });
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md hover:shadow-lg font-semibold text-base"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Correo
                  </button>
                </div>

                {formData.correosAdicionales.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                    <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-500 font-medium">No hay correos adicionales</p>
                    <p className="text-sm text-slate-400 mt-1">Haz clic en "Agregar Correo" para añadir uno</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.correosAdicionales.map((correo, index) => (
                      <div key={index} className="border-2 border-slate-200 rounded-lg p-5 bg-gradient-to-br from-white to-slate-50 hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-primary flex items-center gap-2">Correo Adicional {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const toDelete = formData.correosAdicionales[index];
                              const newCorreos = formData.correosAdicionales.filter((_, i) => i !== index);
                              if (toDelete && (toDelete as any).id) {
                                setDeletedCorreosIds(prev => [...prev, (toDelete as any).id]);
                              }
                              setFormData({ ...formData, correosAdicionales: newCorreos });
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico <span className="text-red-500">*</span></label>
                            <input
                              type="email"
                              value={correo.correo}
                              onChange={(e) => {
                                const newCorreos = [...formData.correosAdicionales];
                                newCorreos[index].correo = e.target.value;
                                setFormData({ ...formData, correosAdicionales: newCorreos });
                              }}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="adicional@ejemplo.com"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción</label>
                            <input
                              type="text"
                              value={correo.descripcion}
                              onChange={(e) => {
                                const newCorreos = [...formData.correosAdicionales];
                                newCorreos[index].descripcion = e.target.value;
                                setFormData({ ...formData, correosAdicionales: newCorreos });
                              }}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Ej: Correo personal, Correo de respaldo, etc."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Plataforma</label>
                              <select
                                value={correo.plataformaId}
                                onChange={(e) => {
                                  const newCorreos = [...formData.correosAdicionales];
                                  newCorreos[index].plataformaId = parseInt(e.target.value);
                                  setFormData({ ...formData, correosAdicionales: newCorreos });
                                }}
                                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                              >
                                <option value={0}>Seleccione...</option>
                                {plataformas.map(p => (
                                  <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Correo</label>
                              <select
                                value={correo.tipoCorreoId}
                                onChange={(e) => {
                                  const newCorreos = [...formData.correosAdicionales];
                                  newCorreos[index].tipoCorreoId = parseInt(e.target.value);
                                  setFormData({ ...formData, correosAdicionales: newCorreos });
                                }}
                                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                              >
                                <option value={0}>Seleccione...</option>
                                {tiposCorreo.map(t => (
                                  <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Protocolo</label>
                              <select
                                value={correo.protocoloId}
                                onChange={(e) => {
                                  const newCorreos = [...formData.correosAdicionales];
                                  newCorreos[index].protocoloId = parseInt(e.target.value);
                                  setFormData({ ...formData, correosAdicionales: newCorreos });
                                }}
                                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                              >
                                <option value={0}>Seleccione...</option>
                                {protocolos.map(p => (
                                  <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Licencia</label>
                              <select
                                value={correo.tipoLicenciaId}
                                onChange={(e) => {
                                  const newCorreos = [...formData.correosAdicionales];
                                  newCorreos[index].tipoLicenciaId = parseInt(e.target.value);
                                  setFormData({ ...formData, correosAdicionales: newCorreos });
                                }}
                                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                              >
                                <option value={0}>Seleccione...</option>
                                {tiposLicencia.map(l => (
                                  <option key={l.id} value={l.id}>{l.nombre}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                              <input
                                type="checkbox"
                                checked={correo.esPrincipal}
                                onChange={(e) => {
                                  const newCorreos = formData.correosAdicionales.map((c, i) => ({ ...c, esPrincipal: i === index ? e.target.checked : false }));
                                  setFormData({ ...formData, correosAdicionales: newCorreos });
                                }}
                                className="w-4 h-4 text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-slate-700">Marcar como principal</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 1: Correo Principal */}
            {(!isResetMode && currentTab === 1) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Correo Principal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.correoPrincipal}
                    onChange={(e) => setFormData({ ...formData, correoPrincipal: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="usuario@intiscorp.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Descripción de Uso
                  </label>
                  <input
                    type="text"
                    value={formData.correoPrincipalConfig.descripcionUso}
                    onChange={(e) => setFormData({
                      ...formData,
                      correoPrincipalConfig: { ...formData.correoPrincipalConfig, descripcionUso: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ej: Correo corporativo principal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Plataforma de Correo
                    </label>
                    <select
                      value={formData.correoPrincipalConfig.plataformaId}
                      onChange={(e) => setFormData({
                        ...formData,
                        correoPrincipalConfig: { ...formData.correoPrincipalConfig, plataformaId: parseInt(e.target.value) }
                      })}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                    >
                      <option value={0}>Seleccione...</option>
                      {plataformas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tipo de Correo
                    </label>
                    <select
                      value={formData.correoPrincipalConfig.tipoCorreoId}
                      onChange={(e) => setFormData({
                        ...formData,
                        correoPrincipalConfig: { ...formData.correoPrincipalConfig, tipoCorreoId: parseInt(e.target.value) }
                      })}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                    >
                      <option value={0}>Seleccione...</option>
                      {tiposCorreo.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Protocolo
                    </label>
                    <select
                      value={formData.correoPrincipalConfig.protocoloId}
                      onChange={(e) => setFormData({
                        ...formData,
                        correoPrincipalConfig: { ...formData.correoPrincipalConfig, protocoloId: parseInt(e.target.value) }
                      })}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                    >
                      <option value={0}>Seleccione...</option>
                      {protocolos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tipo de Licencia
                    </label>
                    <select
                      value={formData.correoPrincipalConfig.tipoLicenciaId}
                      onChange={(e) => setFormData({
                        ...formData,
                        correoPrincipalConfig: { ...formData.correoPrincipalConfig, tipoLicenciaId: parseInt(e.target.value) }
                      })}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                    >
                      <option value={0}>Seleccione...</option>
                      {tiposLicencia.map(l => (
                        <option key={l.id} value={l.id}>{l.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            

            {/* Tab 3: Teléfonos */}
            {(!isResetMode && currentTab === 3) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Agrega números telefónicos del usuario
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        telefonos: [...formData.telefonos, { numero: '', tipo: 'movil', descripcion: '', esPrincipal: formData.telefonos.length === 0 }]
                      });
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md hover:shadow-lg font-semibold text-base"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                      Agregar Teléfono
                  </button>
                </div>

                {formData.telefonos.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                    <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <p className="text-slate-500 font-medium">No hay teléfonos agregados</p>
                    <p className="text-sm text-slate-400 mt-1">Haz clic en "Agregar Teléfono" para añadir uno</p>
                  </div>
                ) : (
                  formData.telefonos.map((tel, index) => (
                    <div key={index} className="border-2 border-slate-200 rounded-lg p-5 bg-gradient-to-br from-white to-slate-50 hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-primary flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Teléfono {index + 1}
                          {tel.esPrincipal && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                              Principal
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const toDelete = formData.telefonos[index];
                            const newTels = formData.telefonos.filter((_, i) => i !== index);
                            if (toDelete && (toDelete as any).id) {
                              setDeletedTelefonosIds(prev => [...prev, (toDelete as any).id]);
                            }
                            setFormData({ ...formData, telefonos: newTels });
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Número <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={tel.numero}
                            onChange={(e) => {
                              const newTels = [...formData.telefonos];
                              newTels[index].numero = e.target.value;
                              setFormData({ ...formData, telefonos: newTels });
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="+51999888777"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo</label>
                          <select
                            value={tel.tipo}
                            onChange={(e) => {
                              const newTels = [...formData.telefonos];
                              newTels[index].tipo = e.target.value as any;
                              setFormData({ ...formData, telefonos: newTels });
                            }}
                            className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-semibold text-base"
                          >
                            <option value="movil">📱 Móvil</option>
                            <option value="fijo">📞 Fijo</option>
                            <option value="whatsapp">💬 WhatsApp</option>
                            <option value="emergencia">🚨 Emergencia</option>
                            <option value="otro">🔧 Otro</option>
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción</label>
                          <input
                            type="text"
                            value={tel.descripcion}
                            onChange={(e) => {
                              const newTels = [...formData.telefonos];
                              newTels[index].descripcion = e.target.value;
                              setFormData({ ...formData, telefonos: newTels });
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Ej: Celular corporativo"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                            <input
                              type="checkbox"
                              checked={tel.esPrincipal}
                              onChange={(e) => {
                                const newTels = formData.telefonos.map((t, i) => ({
                                  ...t,
                                  esPrincipal: i === index ? e.target.checked : false
                                }));
                                setFormData({ ...formData, telefonos: newTels });
                              }}
                              className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-slate-700">Marcar como principal</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Acceso al Sistema */}
            {((isResetMode && currentTab === 0) || (!isResetMode && currentTab === 4)) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Usuario <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.usuario.replace('@intisoft.com', '')}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').toLowerCase();
                        setFormData({ ...formData, usuario: value + '@intisoft.com' });
                      }}
                      className="w-full px-4 py-2 pr-32 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="ej. user123"
                      autoComplete="off"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium pointer-events-none">
                      @intisoft.com
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Sin espacios, único en el sistema. Terminará en @intisoft.com</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.contrasena}
                    onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Se enviará al usuario por correo</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="forzarCambio"
                    checked={formData.forzarCambioPassword}
                    onChange={(e) => setFormData({ ...formData, forzarCambioPassword: e.target.checked })}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <label htmlFor="forzarCambio" className="text-sm text-slate-700 cursor-pointer">
                    Forzar cambio de contraseña en el primer inicio de sesión
                  </label>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 p-4 rounded-lg mt-4">
                  <div className="flex gap-3">
                    <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 mb-1">
                        ⚠️ Importante: Correo de Bienvenida Automático
                      </p>
                      <p className="text-sm text-yellow-700">
                        Al crear el usuario, se enviará automáticamente un correo de bienvenida a <strong>{formData.correoPrincipal || 'la dirección especificada'}</strong> con las credenciales de acceso (usuario y contraseña).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de navegación */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
              {isResetMode ? (
                <button
                  type="button"
                  onClick={() => navigate('/admin/usuarios/internos')}
                  className="px-8 py-3 text-base font-semibold border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentTab(Math.max(0, currentTab - 1))}
                  disabled={currentTab === 0}
                  className="px-8 py-3 text-base font-semibold border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  ← Anterior
                </button>
              )}

              <div className="flex gap-3">
                {currentTab < tabs.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentTab(currentTab + 1)}
                    className="px-8 py-3 text-base font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-10 py-3 text-base font-bold bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    {(() => {
                      if (loading) return isEdit || isResetMode ? '⏳ Guardando...' : '⏳ Creando...';
                      if (isEdit || isResetMode) return 'Guardar cambios';
                      return '✓ Crear Usuario';
                    })()}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
