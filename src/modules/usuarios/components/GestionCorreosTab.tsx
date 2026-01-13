import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { CorreoUsuario, ConfigurarCorreoData } from '../services/correosUsuarioService';
import { correosUsuarioService } from '../services/correosUsuarioService';
import type { PlataformaCorreo } from '@/modules/catalogo/services/plataformasService';
import type { TipoCorreo } from '@/modules/catalogo/services/tiposCorreoService';
import type { Protocolo } from '@/modules/catalogo/services/protocolosService';
import { plataformasService } from '@/modules/catalogo/services/plataformasService';
import { tiposCorreoService } from '@/modules/catalogo/services/tiposCorreoService';
import { protocolosService } from '@/modules/catalogo/services/protocolosService';
import { getUsuariosByEmpresa } from '../services/usuariosService';

interface GestionCorreosTabProps {
  empresaId: string;
  usuarioId: string;
  correoUsuario: string;
  usuarioNombre?: string;
  empresaNombre?: string;
  sedeNombre?: string;
  usuarioActivo?: boolean;
  onEditarUsuario?: (correosSecundarios?: string[]) => void;
}

export function GestionCorreosTab({ empresaId, usuarioId, correoUsuario, usuarioNombre, empresaNombre, sedeNombre, usuarioActivo = true, onEditarUsuario }: GestionCorreosTabProps) {
  const { user } = useAuth();
  const [correoPrincipal, setCorreoPrincipal] = useState<CorreoUsuario | null>(null);
  const [correosAdicionales, setCorreosAdicionales] = useState<CorreoUsuario[]>([]);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Modal agregar correo adicional
  const [showModalAgregar, setShowModalAgregar] = useState(false);
  const [savingAdicional, setSavingAdicional] = useState(false);
  const [showPasswordAdicional, setShowPasswordAdicional] = useState(false);
  const [nuevoCorreo, setNuevoCorreo] = useState({
    correoElectronico: '',
    plataformaId: 0,
    tipoCorreoId: 0,
    protocoloId: 0,
    esCorreoPrincipal: false,
    usuarioLogin: '',
    contrasena: '',
    estado: 'activo' as 'activo' | 'inactivo',
    observaciones: '',
    origenAccion: 'administrativa' as 'ticket' | 'administrativa',
    ticketRelacionado: '',
    motivoTicket: ''
  });
  
  // Modales de acciones
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalEditarConfiguracion, setShowModalEditarConfiguracion] = useState(false);
  const [showModalReasignar, setShowModalReasignar] = useState(false);
  const [showModalActualizarCredenciales, setShowModalActualizarCredenciales] = useState(false);
  const [showModalDesactivar, setShowModalDesactivar] = useState(false);
  const [showModalHistorial, setShowModalHistorial] = useState(false);
  const [showModalVerConfiguracion, setShowModalVerConfiguracion] = useState(false);
  const [correoSeleccionado, setCorreoSeleccionado] = useState<CorreoUsuario | null>(null);
  const [historialCorreo, setHistorialCorreo] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [showPasswordEditar, setShowPasswordEditar] = useState(false);
  const [showPasswordVerConfiguracion, setShowPasswordVerConfiguracion] = useState(false);
  
  // Estado para edición de correo
  const [datosEdicion, setDatosEdicion] = useState({
    correoElectronico: '',
    plataformaId: 0,
    tipoCorreoId: 0,
    protocoloId: 0,
    contrasena: '',
    observaciones: '',
    motivoEdicion: '',
    esPrincipal: false
  });
  
  // Estado para reasignación
  const [reasignacionData, setReasignacionData] = useState({
    nuevoUsuarioId: '',
    nombreBuzon: '',
    usarCorreoAnterior: false,
    nuevoCorreo: '',
    mantenerCopiaParaOrigen: true,
    tipoPase: 'secundario' as 'principal' | 'secundario',
    origenAccion: 'administrativa' as 'ticket' | 'administrativa',
    ticketRelacionado: '',
    motivoTicket: '',
    motivoReasignacion: '',
    observaciones: ''
  });
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<any[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any | null>(null);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [savingReasignacion, setSavingReasignacion] = useState(false);
  
  // Estado para desactivación
  const [desactivacionData, setDesactivacionData] = useState({
    motivoDesactivacion: '',
    observaciones: '',
    ticketRelacionado: ''
  });
  const [showConfirmDesactivar, setShowConfirmDesactivar] = useState(false);
  const [savingDesactivacion, setSavingDesactivacion] = useState(false);
  
  // Estado para actualizar credenciales
  const [credencialesData, setCredencialesData] = useState({
    usuarioLogin: '',
    contrasena: ''
  });

  // Catálogos
  const [plataformas, setPlataformas] = useState<PlataformaCorreo[]>([]);
  const [tiposCorreo, setTiposCorreo] = useState<TipoCorreo[]>([]);
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);

  // Formulario
  const [formData, setFormData] = useState<ConfigurarCorreoData>({
    plataformaId: 0,
    tipoCorreoId: 0,
    protocoloId: 0,
    estado: 'pendiente' as 'activo' | 'inactivo' | 'reasignado',
    observaciones: '',
    usuarioLogin: '',
    contrasena: ''
  });

  // Cargar catálogos
  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [plat, tipos, prot] = await Promise.all([
          plataformasService.getAll(),
          tiposCorreoService.getAll(),
          protocolosService.getAll()
        ]);

        setPlataformas(plat.filter(p => p.activo));
        setTiposCorreo(tipos.filter(t => t.activo));
        setProtocolos(prot.filter(p => p.activo));
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };

    loadCatalogos();
  }, []);

  // Función reutilizable para cargar correos
  const cargarCorreos = async () => {
    setLoading(true);
    try {
      // Cargar correo principal
      const correo = await correosUsuarioService.getCorreoPrincipal(empresaId, usuarioId);
      setCorreoPrincipal(correo);

      // Cargar todos los correos para obtener los adicionales
      const todosLosCorreos = await correosUsuarioService.getCorreosByUsuario(empresaId, usuarioId);
      
      // Filtrar adicionales:
      // - Incluir correos NO principales
      // - Si un correo tiene esDuenoActual=false, incluirlo (correo reasignado, no pertenece al usuario actual)
      const adicionales = todosLosCorreos.filter(c => 
        !c.esCorreoPrincipal || c.esDuenoActual === false
      );
      
      setCorreosAdicionales(adicionales);

      if (correo) {
        setFormData({
          plataformaId: correo.plataformaId || 0,
          tipoCorreoId: correo.tipoCorreoId || 0,
          protocoloId: correo.protocoloId || 0,
          estado: correo.estado === 'pendiente' 
            ? 'activo' 
            : (correo.estado === 'activo' || correo.estado === 'inactivo' || correo.estado === 'reasignado')
              ? correo.estado
              : 'activo',
          observaciones: correo.observaciones || '',
          usuarioLogin: correo.usuarioLogin || correoUsuario,
          contrasena: correo.contrasena || ''
        });
      } else {
        // Si no hay correo principal, inicializar con el correo del usuario
        setFormData(prev => ({
          ...prev,
          usuarioLogin: correoUsuario
        }));
      }
    } catch (error) {
      console.error('Error cargando correos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar correo principal del usuario
  useEffect(() => {
    cargarCorreos();
  }, [empresaId, usuarioId, correoUsuario]);

  // Cargar usuarios de la empresa cuando se abre el modal de reasignación
  useEffect(() => {
    const loadUsuarios = async () => {
      if (showModalReasignar) {
        setLoadingUsuarios(true);
        try {
          const usuarios = await getUsuariosByEmpresa(empresaId);
          // Filtrar solo usuarios activos y excluir el usuario actual
          const usuariosActivos = usuarios.filter(u => u.activo && u.id !== usuarioId && u._id !== usuarioId);
          setUsuariosEmpresa(usuariosActivos);
        } catch (error) {
          console.error('Error cargando usuarios:', error);
        } finally {
          setLoadingUsuarios(false);
        }
      }
    };

    loadUsuarios();
  }, [showModalReasignar, empresaId, usuarioId]);

  const handleSave = async () => {
    if (!formData.plataformaId || !formData.tipoCorreoId || !formData.protocoloId) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      await correosUsuarioService.configurarCorreoPrincipal(
        empresaId,
        usuarioId,
        formData
      );
      
      // Recargar el correo principal con todos los detalles
      const correoActualizado = await correosUsuarioService.getCorreoPrincipal(empresaId, usuarioId);
      setCorreoPrincipal(correoActualizado);
      setModoEdicion(false);
      alert('Correo configurado exitosamente');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('Error al guardar la configuración del correo');
    } finally {
      setSaving(false);
    }
  };

  const handleAgregarCorreo = async () => {
    if (!nuevoCorreo.correoElectronico || !nuevoCorreo.plataformaId || !nuevoCorreo.tipoCorreoId || !nuevoCorreo.protocoloId) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setSavingAdicional(true);
    try {
      const correoCreado = await correosUsuarioService.agregarCorreo(
        empresaId,
        usuarioId,
        nuevoCorreo.correoElectronico,
        {
          plataformaId: nuevoCorreo.plataformaId,
          tipoCorreoId: nuevoCorreo.tipoCorreoId,
          protocoloId: nuevoCorreo.protocoloId,
          estado: nuevoCorreo.estado,
          observaciones: nuevoCorreo.observaciones,
          contrasena: nuevoCorreo.contrasena,
          esCorreoPrincipal: nuevoCorreo.esCorreoPrincipal,
          origenAccion: nuevoCorreo.origenAccion,
          ticketRelacionado: nuevoCorreo.ticketRelacionado
        }
      );

      // Recargar todos los correos desde el backend para obtener los nombres completos
      await cargarCorreos();

      // Resetear formulario
      setNuevoCorreo({
        correoElectronico: '',
        plataformaId: 0,
        tipoCorreoId: 0,
        protocoloId: 0,
        esCorreoPrincipal: false,
        usuarioLogin: '',
        contrasena: '',
        estado: 'activo',
        observaciones: '',
        origenAccion: 'administrativa',
        ticketRelacionado: '',
        motivoTicket: ''
      });
      setShowModalAgregar(false);
      setShowPasswordAdicional(false);
      alert('Correo adicional agregado exitosamente');
    } catch (error) {
      console.error('Error agregando correo:', error);
      alert('Error al agregar el correo adicional');
    } finally {
      setSavingAdicional(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!correoSeleccionado || !datosEdicion.motivoEdicion.trim()) {
      alert('Por favor indique el motivo de la edición');
      return;
    }

    setSaving(true);
    try {
      await correosUsuarioService.actualizarCorreo(
        empresaId,
        usuarioId,
        correoSeleccionado.id!,
        {
          correo: datosEdicion.correoElectronico,
          plataformaId: datosEdicion.plataformaId,
          tipoCorreoId: datosEdicion.tipoCorreoId,
          protocoloId: datosEdicion.protocoloId,
          contrasena: datosEdicion.contrasena,
          observaciones: datosEdicion.observaciones,
          estado: correoSeleccionado.estado,
          esPrincipal: datosEdicion.esPrincipal,
          motivoEdicion: datosEdicion.motivoEdicion
        }
      );

      // Recargar datos - esperar un poco para asegurar que el backend completó todas las actualizaciones
      await new Promise(resolve => setTimeout(resolve, 300));
      await cargarCorreos();
      
      setShowModalEditarConfiguracion(false);
      setCorreoSeleccionado(null);
      setDatosEdicion({
        correoElectronico: '',
        plataformaId: 0,
        tipoCorreoId: 0,
        protocoloId: 0,
        contrasena: '',
        observaciones: '',
        motivoEdicion: '',
        esPrincipal: false
      });
      alert('✅ Configuración actualizada exitosamente');
    } catch (error) {
      console.error('Error actualizando correo:', error);
      alert('Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const cargarHistorialCorreo = async (correoId: string) => {
    setLoadingHistorial(true);
    try {
      const historial = await correosUsuarioService.getHistorialCorreo(empresaId, usuarioId, correoId);
      setHistorialCorreo(historial);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setHistorialCorreo([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleEliminarCorreo = async (correoId: string) => {
    if (!confirm('¿Está seguro de eliminar este correo?')) return;

    try {
      await correosUsuarioService.eliminarCorreo(empresaId, usuarioId, correoId);
      setCorreosAdicionales(prev => prev.filter(c => c.id !== correoId));
      alert('Correo eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando correo:', error);
      alert('Error al eliminar el correo');
    }
  };

  const getEstadoBadge = (estado: string) => {
    if (!estado) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
          ⚪ Sin estado
        </span>
      );
    }

    switch (estado.toLowerCase()) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            🟡 Pendiente
          </span>
        );
      case 'activo':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            🟢 Activo
          </span>
        );
      case 'inactivo':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            🔴 Inactivo
          </span>
        );
      case 'reasignado':
      case 'alias':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            🔄 Reasignado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
            ⚪ {estado}
          </span>
        );
    }
  };

  const plataformaSeleccionada = plataformas.find(p => p.id === formData.plataformaId);
  const muestraOpcionReasignado = plataformaSeleccionada?.permiteReasignar === true;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Cargando información del correo...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔄 Alerta: Usuario reasignó su correo principal */}
      {usuarioActivo && correoPrincipal && correoPrincipal.esDuenoActual === false && (
        <div className="bg-amber-50 rounded-lg border-2 border-amber-300 p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-2 flex items-center gap-2">
            ⚠️ Correo Principal Reasignado
          </h3>
          <p className="text-sm text-amber-800">
            El correo <strong>{correoUsuario}</strong> fue reasignado a otro usuario.
          </p>
          <p className="text-sm text-amber-700 mt-2">
            Debe establecer un nuevo correo principal para este usuario.
          </p>
        </div>
      )}

      {/* 🚨 Alerta: Correo Principal está Inactivo */}
      {usuarioActivo && correoPrincipal && correoPrincipal.estado === 'inactivo' && correoPrincipal.esPrincipal && (
        <div className="bg-red-50 rounded-lg border-2 border-red-300 p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                El correo principal está inactivo
              </h3>
              <p className="text-sm text-red-800 mb-3">
                El correo <strong>{correoPrincipal.correoElectronico}</strong> está marcado como inactivo pero sigue siendo el correo principal del usuario.
              </p>
              <p className="text-sm text-red-700">
                Se sugiere asignarle un correo activo. Por favor, ingrese al formulario <strong>"Agregar Correo Adicional"</strong> y márquelo como principal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 📝 CASO 2: Configurar correo cuando NO tiene o está pendiente */}
      {usuarioActivo && (!correoPrincipal || !correoPrincipal.estado || correoPrincipal.estado === 'pendiente') && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📧 Correo Principal del Usuario
            </h3>
            <p className="text-sm text-gray-600">
              Este correo se detectó automáticamente del formulario "Crear Usuario"
            </p>
          </div>

          {!modoEdicion ? (
            // Vista simple cuando NO está en modo edición
            <div className="space-y-4">
              {/* Correo Electrónico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                  {correoUsuario}
                </div>
              </div>

              {/* Estado del Correo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado del Correo
                </label>
                <div>
                  {getEstadoBadge(correoPrincipal?.estado || '')}
                </div>
              </div>

              {/* Botón Editar Configuración - solo si NO es reasignado */}
              {correoPrincipal?.estado !== 'reasignado' && (
                <div className="pt-2">
                  <button
                    onClick={() => setModoEdicion(true)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Configuración
                </button>
              </div>
              )}
            </div>
          ) : (
            // Formulario de edición cuando está en modo edición
            <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Configuración del Correo</h4>

            {/* Plataforma de Correo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plataforma de Correo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.plataformaId}
                onChange={(e) => setFormData({ ...formData, plataformaId: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Seleccione una plataforma...</option>
                {plataformas.map((plat) => (
                  <option key={plat.id} value={plat.id}>
                    {plat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Correo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Correo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipoCorreoId}
                onChange={(e) => setFormData({ ...formData, tipoCorreoId: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Seleccione un tipo...</option>
                {tiposCorreo.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Protocolo de Acceso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Protocolo de Acceso <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.protocoloId}
                onChange={(e) => setFormData({ ...formData, protocoloId: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Seleccione un protocolo...</option>
                {protocolos.map((prot) => (
                  <option key={prot.id} value={prot.id}>
                    {prot.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Usuario (automático) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configurado por
              </label>
              <input
                type="text"
                value={user?.nombre || user?.email || 'Usuario del sistema'}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado del Correo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.estado}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'activo' || value === 'inactivo' || value === 'reasignado') {
                    setFormData({ ...formData, estado: value });
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="activo">🟢 Activo</option>
                <option value="inactivo">🔴 Inactivo</option>
                {muestraOpcionReasignado && (
                  <option value="reasignado">🔄 Reasignado</option>
                )}
              </select>
              {muestraOpcionReasignado && (
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ Esta plataforma permite la opción "Reasignado"
                </p>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones (opcional)
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                placeholder="Ej. Cuenta corporativa laboral"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Sección: Credenciales */}
            <div className="border-t pt-6 mt-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🔐 Credenciales
              </h4>
              
              <div className="space-y-4">
                {/* Usuario / Login */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuario / Login
                  </label>
                  <input
                    type="text"
                    value={formData.usuarioLogin || correoUsuario}
                    onChange={(e) => setFormData({ ...formData, usuarioLogin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Por defecto se usa el correo electrónico del usuario
                  </p>
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.contrasena}
                      onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? (
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
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción - Solo Guardar y Cancelar */}
            <div className="flex gap-3 pt-6 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {saving ? 'Guardando...' : '💾 Guardar Configuración'}
              </button>
              
              <button
                onClick={() => {
                  setModoEdicion(false);
                  setShowPassword(false);
                }}
                disabled={saving}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
          )}
        </div>
      )}

    {/* Tabla: Correos del Usuario */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              📨 Correos del Usuario
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Gestione todos los correos electrónicos configurados
            </p>
          </div>
          {usuarioActivo && (
            <button
              onClick={() => {
                // Limpiar estado antes de abrir
                setNuevoCorreo({
                  correoElectronico: '',
                  plataformaId: 0,
                  tipoCorreoId: 0,
                  protocoloId: 0,
                  esCorreoPrincipal: false,
                  usuarioLogin: '',
                  contrasena: '',
                  estado: 'activo',
                  observaciones: '',
                  origenAccion: 'administrativa',
                  ticketRelacionado: '',
                  motivoTicket: ''
                });
                setShowModalAgregar(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              ➕ Agregar Correo Adicional
            </button>
          )}
        </div>

        {/* Tabla de correos */}
        {(!correoPrincipal || !correoPrincipal.estado || correoPrincipal.estado === 'pendiente' || correoPrincipal.estado === 'reasignado') && correosAdicionales.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">No hay correos configurados</p>
            <p className="text-sm text-gray-400 mt-1">Configure el correo principal o agregue correos adicionales</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Correo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Plataforma</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Protocolo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Principal</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Correo Principal - Mostrar solo si está configurado Y es el dueño actual */}
                {correoPrincipal && correoPrincipal.estado && correoPrincipal.estado !== 'pendiente' && correoPrincipal.esDuenoActual !== false && (
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3">
                      <a href={`mailto:${correoPrincipal.correo || correoPrincipal.correoElectronico || correoUsuario}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {correoPrincipal.correo || correoPrincipal.correoElectronico || correoUsuario}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{correoPrincipal.plataformaNombre || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{correoPrincipal.tipoCorreoNombre || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{correoPrincipal.protocoloNombre || '-'}</td>
                    <td className="px-4 py-3">
                      {getEstadoBadge(correoPrincipal.estado)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-2xl" title="Correo Principal">⭐</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setCorreoSeleccionado(correoPrincipal);
                            setShowModalEditar(true);
                          }}
                          className="text-gray-600 hover:text-blue-600 transition-colors p-1"
                          title="Acciones"
                        >
                          ⚙️
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Correos Adicionales */}
                {correosAdicionales.map((correo) => (
                  <tr 
                    key={correo.id} 
                    className={correo.esDuenoActual === false ? 'bg-amber-50 hover:bg-amber-100 transition-colors' : 'hover:bg-gray-50 transition-colors'}
                  >
                    <td className="px-4 py-3">
                      <a href={`mailto:${correo.correoElectronico}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {correo.correoElectronico}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{correo.plataformaNombre || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{correo.tipoCorreoNombre || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{correo.protocoloNombre || '-'}</td>
                    <td className="px-4 py-3">{getEstadoBadge(correo.estado)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-300">-</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setCorreoSeleccionado(correo);
                            setShowModalEditar(true);
                          }}
                          className="text-gray-600 hover:text-blue-600 transition-colors p-1"
                          title="Acciones"
                        >
                          ⚙️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Agregar Correo Adicional */}
      {showModalAgregar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">➕ Agregar Correo Adicional</h3>
            <button
              onClick={() => {
                setShowModalAgregar(false);
                setShowPasswordAdicional(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Correo Electrónico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={nuevoCorreo.correoElectronico}
                onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, correoElectronico: e.target.value })}
                placeholder="ejemplo@empresa.com"
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Plataforma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plataforma de Correo <span className="text-red-500">*</span>
              </label>
              <select
                value={nuevoCorreo.plataformaId}
                onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, plataformaId: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Seleccione una plataforma...</option>
                {plataformas.map((plat) => (
                  <option key={plat.id} value={plat.id}>
                    {plat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Correo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Correo <span className="text-red-500">*</span>
              </label>
              <select
                value={nuevoCorreo.tipoCorreoId}
                onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, tipoCorreoId: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Seleccione un tipo...</option>
                {tiposCorreo.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Protocolo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Protocolo de Acceso <span className="text-red-500">*</span>
              </label>
              <select
                value={nuevoCorreo.protocoloId}
                onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, protocoloId: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Seleccione un protocolo...</option>
                {protocolos.map((prot) => (
                  <option key={prot.id} value={prot.id}>
                    {prot.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* ¿Es correo principal? */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nuevoCorreo.esCorreoPrincipal}
                  onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, esCorreoPrincipal: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">¿Es correo principal?</span>
                  {nuevoCorreo.esCorreoPrincipal && correoPrincipal && correoPrincipal.esDuenoActual !== false && (
                    <p className="text-sm text-amber-700 mt-1">
                      ⚠️ El correo principal actual pasará a ser secundario
                    </p>
                  )}
                </div>
              </label>
            </div>

            {/* Creado por (Solo lectura) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creado por
              </label>
              <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                👤 {user?.nombre || 'Usuario actual'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Se guardará automáticamente al crear el correo
              </p>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswordAdicional ? 'text' : 'password'}
                  value={nuevoCorreo.contrasena}
                  onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, contrasena: e.target.value })}
                  placeholder="Contraseña del correo"
                  autoComplete="new-password"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordAdicional(!showPasswordAdicional)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswordAdicional ? (
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
              </div>
            </div>

            {/* Estado Inicial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado Inicial
              </label>
              <select
                value={nuevoCorreo.estadoCorreo}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'activo' || value === 'inactivo') {
                    setNuevoCorreo({ ...nuevoCorreo, estadoCorreo: value });
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="activo">🟢 Activo</option>
                <option value="inactivo">🔴 Inactivo</option>
              </select>
            </div>

            {/* Origen de la acción */}
            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Origen de la Acción (opcional)
              </label>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                  <input
                    type="radio"
                    name="origenAccion"
                    value="ticket"
                    checked={nuevoCorreo.origenAccion === 'ticket'}
                    onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, origenAccion: e.target.value as 'ticket' | 'administrativa' })}
                    className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      🎫 Esta acción proviene de una solicitud (ticket)
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Guarda historial completo con referencia al ticket</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                  <input
                    type="radio"
                    name="origenAccion"
                    value="administrativa"
                    checked={nuevoCorreo.origenAccion === 'administrativa'}
                    onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, origenAccion: e.target.value as 'ticket' | 'administrativa' })}
                    className="mt-0.5 w-4 h-4 text-gray-600 focus:ring-2 focus:ring-gray-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      ⚙️ Esta acción es administrativa
                    </div>
                    <p className="text-xs text-gray-600 mt-1">No guarda historial detallado</p>
                  </div>
                </label>
              </div>

              {/* Campos condicionales para ticket */}
              {nuevoCorreo.origenAccion === 'ticket' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ticket Relacionado
                    </label>
                    <select
                      value={nuevoCorreo.ticketRelacionado}
                      onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, ticketRelacionado: e.target.value })}
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Seleccione un ticket...</option>
                      <option value="TK-2026-000421">TK-2026-000421 - Alta por ingreso de nuevo colaborador</option>
                      <option value="TK-2026-000422">TK-2026-000422 - Solicitud de correo adicional</option>
                      <option value="TK-2026-000423">TK-2026-000423 - Configuración de buzón compartido</option>
                    </select>
                    <p className="text-xs text-blue-700 mt-1">
                      📌 Módulo de tickets aún no implementado - valores de ejemplo
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo (del ticket)
                    </label>
                    <textarea
                      value={nuevoCorreo.motivoTicket}
                      onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, motivoTicket: e.target.value })}
                      rows={2}
                      placeholder="Ej. Alta por ingreso de nuevo colaborador"
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                    />
                  </div>

                  <div className="bg-blue-100 border border-blue-300 rounded p-3 text-xs text-blue-800">
                    <p className="font-semibold mb-1">ℹ️ Vista previa del historial:</p>
                    <div className="space-y-1 text-blue-900">
                      <p><strong>Acción:</strong> Creación de correo adicional</p>
                      <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-PE')}</p>
                      <p><strong>Ticket:</strong> {nuevoCorreo.ticketRelacionado || 'No seleccionado'}</p>
                      <p><strong>Motivo:</strong> {nuevoCorreo.motivoTicket || 'Sin especificar'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones (opcional)
              </label>
              <textarea
                value={nuevoCorreo.observaciones}
                onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, observaciones: e.target.value })}
                rows={3}
                placeholder="Información adicional sobre este correo..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Botones del modal */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
            <button
              onClick={handleAgregarCorreo}
              disabled={savingAdicional}
              className="flex-1 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed font-medium"
            >
              {savingAdicional ? 'Agregando...' : '💾 Guardar Correo'}
            </button>
            <button
              onClick={() => {
                setShowModalAgregar(false);
                setShowPasswordAdicional(false);
              }}
              disabled={savingAdicional}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Modal: Menú de Acciones */}
      {showModalEditar && correoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                ⚙️ Acciones - {correoSeleccionado.correo}
              </h3>
              <button
                onClick={() => {
                  setShowModalEditar(false);
                  setCorreoSeleccionado(null);
                }}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-3">
              {/* Mensaje sobre reasignación si la plataforma lo permite */}
              {(() => {
                const plataforma = plataformas.find(p => p.id === correoSeleccionado.plataformaId);
                const permiteReasignar = plataforma?.permiteReasignar || (plataforma as any)?.permite_reasignar;
                return permiteReasignar && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800 flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        Para reasignar este correo, primero debe <strong>desactivarlo</strong>.
                      </span>
                    </p>
                  </div>
                );
              })()}
              {/* Si el usuario NO es el dueño actual, solo mostrar opciones de lectura */}
              {correoSeleccionado.esDuenoActual === false ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                      ⚠️ Este correo ha sido reasignado a otro usuario
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Solo puedes ver la configuración y el historial. Ya no puedes editar ni realizar acciones.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowModalEditar(false);
                      setShowModalVerConfiguracion(true);
                    }}
                    className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-3 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    👁️ Ver Configuración
                  </button>

                  <button
                    onClick={() => {
                      setShowModalEditar(false);
                      setShowModalHistorial(true);
                      if (correoSeleccionado?.id) {
                        cargarHistorialCorreo(correoSeleccionado.id);
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    📄 Ver Historial
                  </button>
                </>
              ) : (
                <>
                  {/* Opciones normales para correos activos/inactivos */}
                  <button
                    onClick={() => {
                      // Cargar TODOS los datos del correo seleccionado
                      setDatosEdicion({
                        correoElectronico: correoSeleccionado.correo || correoSeleccionado.correoElectronico || '',
                        plataformaId: correoSeleccionado.plataformaId || 0,
                        tipoCorreoId: correoSeleccionado.tipoCorreoId || 0,
                        protocoloId: correoSeleccionado.protocoloId || 0,
                        contrasena: correoSeleccionado.contrasena || correoSeleccionado.password || '',
                        observaciones: correoSeleccionado.observaciones || '',
                        motivoEdicion: '',
                        esPrincipal: correoSeleccionado.esPrincipal || correoSeleccionado.esCorreoPrincipal || false
                      });
                      setShowModalEditar(false);
                      setShowModalEditarConfiguracion(true);
                    }}
                    className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-3 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    ✏️ Editar
                  </button>

                  {correoSeleccionado.estado !== 'inactivo' && (
                    <button
                      onClick={() => {
                        setShowModalEditar(false);
                        setShowModalDesactivar(true);
                      }}
                      className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-3 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      🚫 Desactivar
                    </button>
                  )}

                  {/* Botón Reasignar - solo si está inactivo y la plataforma lo permite */}
                  {(() => {
                    const plataforma = plataformas.find(p => p.id === correoSeleccionado.plataformaId);
                    const permiteReasignar = plataforma?.permiteReasignar || (plataforma as any)?.permite_reasignar;
                    return correoSeleccionado.estado === 'inactivo' && permiteReasignar && (
                      <button
                        onClick={() => {
                          setShowModalEditar(false);
                          setShowModalReasignar(true);
                        }}
                        className="w-full px-4 py-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-3 font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        📩 Reasignar Buzón
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => {
                      setShowModalEditar(false);
                      setShowModalHistorial(true);
                      if (correoSeleccionado?.id) {
                        cargarHistorialCorreo(correoSeleccionado.id);
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    📄 Ver Historial
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reasignar Buzón */}
      {showModalReasignar && correoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-bold text-white">📩 Reasignar Buzón</h3>
              <button
                onClick={() => {
                  setShowModalReasignar(false);
                  setCorreoSeleccionado(null);
                  setUsuarioSeleccionado(null);
                  setReasignacionData({
                    nuevoUsuarioId: '',
                    nombreBuzon: '',
                    usarCorreoAnterior: false,
                    nuevoCorreo: '',
                    mantenerCopiaParaOrigen: true,
                    tipoPase: 'secundario',
                    origenAccion: 'administrativa',
                    ticketRelacionado: '',
                    motivoTicket: '',
                    motivoReasignacion: '',
                    observaciones: ''
                  });
                }}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* 🔒 Datos actuales (solo lectura) */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  🔒 Datos actuales (solo lectura)
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 text-sm">
                  <div><span className="text-gray-600">Correo actual:</span> <strong>{correoUsuario}</strong></div>
                  <div><span className="text-gray-600">Usuario actual:</span> <strong>{usuarioNombre || 'N/A'}</strong></div>
                  <div><span className="text-gray-600">Empresa:</span> <strong>{empresaNombre || 'N/A'}</strong></div>
                  <div><span className="text-gray-600">Sede:</span> <strong>{sedeNombre || 'N/A'}</strong></div>
                </div>
              </div>

              {/* 👤 Nuevo responsable */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  👤 Nuevo responsable
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Usuario destino (dropdown) <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Lista todos los usuarios activos de la misma empresa</p>
                    {loadingUsuarios ? (
                      <div className="text-sm text-gray-500 py-2">Cargando usuarios...</div>
                    ) : (
                      <select
                        value={reasignacionData.nuevoUsuarioId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const usuario = usuariosEmpresa.find(u => 
                            String(u.id) === selectedId || String(u._id) === selectedId
                          );
                          setUsuarioSeleccionado(usuario || null);
                          setReasignacionData({ 
                            ...reasignacionData, 
                            nuevoUsuarioId: selectedId,
                            nombreBuzon: usuario?.nombreCompleto || ''
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="">SELECCIONAR</option>
                        {usuariosEmpresa.map((usuario) => (
                          <option key={usuario.id || usuario._id} value={usuario.id || usuario._id}>
                            {usuario.nombreCompleto} - {usuario.cargo || 'Sin cargo'} ({usuario.sedeNombre})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Datos del usuario seleccionado */}
                  {usuarioSeleccionado && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-900 mb-2">✓ Al seleccionar un usuario, se cargan automáticamente sus datos generales:</p>
                      <div className="text-sm space-y-1 text-green-800">
                        <p><strong>Nombre:</strong> {usuarioSeleccionado.nombreCompleto}</p>
                        <p><strong>Correo:</strong> {usuarioSeleccionado.correo}</p>
                        <p><strong>Cargo:</strong> {usuarioSeleccionado.cargo || 'N/A'}</p>
                        <p><strong>Sede:</strong> {usuarioSeleccionado.sedeNombre || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OPCIÓN PARA SELECCIONAR */}
              {usuarioSeleccionado && (
                <>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">OPCIÓN PARA SELECCIONAR</h4>
                    <div className="space-y-4">
                      {/* Nuevo nombre de correo */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ borderColor: !reasignacionData.usarCorreoAnterior ? '#f59e0b' : '#d1d5db' }}>
                          <input
                            type="radio"
                            name="opcionCorreo"
                            checked={!reasignacionData.usarCorreoAnterior}
                            onChange={() => setReasignacionData({ ...reasignacionData, usarCorreoAnterior: false })}
                            className="w-4 h-4 text-amber-600"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">Nuevo nombre de correo</span>
                            <p className="text-xs text-gray-600">Campo editable</p>
                          </div>
                        </label>
                        {!reasignacionData.usarCorreoAnterior && (
                          <input
                            type="email"
                            value={reasignacionData.nuevoCorreo}
                            onChange={(e) => setReasignacionData({ ...reasignacionData, nuevoCorreo: e.target.value })}
                            placeholder="nombre_nuevo@empresa.com"
                            className="w-full mt-2 px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        )}
                      </div>

                      {/* Mantener nombre del correo anterior */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ borderColor: reasignacionData.usarCorreoAnterior ? '#f59e0b' : '#d1d5db' }}>
                          <input
                            type="radio"
                            name="opcionCorreo"
                            checked={reasignacionData.usarCorreoAnterior}
                            onChange={() => setReasignacionData({ ...reasignacionData, usarCorreoAnterior: true })}
                            className="w-4 h-4 text-amber-600"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">Mantener nombre del correo anterior</span>
                            <p className="text-xs text-gray-600">Carga el correo del usuario que está reasignando</p>
                            <p className="text-sm text-amber-700 mt-1">{correoUsuario}</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 📌 Este correo pasa a ser del nuevo usuario */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">📌 Este correo pasa a ser del nuevo usuario</h4>
                    <p className="text-sm text-gray-600 mb-3">Seleccionar tipo de correo:</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-blue-50 transition-colors"
                        style={{ borderColor: reasignacionData.tipoPase === 'principal' ? '#3b82f6' : '#d1d5db' }}>
                        <input
                          type="radio"
                          name="tipoPase"
                          value="principal"
                          checked={reasignacionData.tipoPase === 'principal'}
                          onChange={(e) => setReasignacionData({ ...reasignacionData, tipoPase: e.target.value as 'principal' | 'secundario' })}
                          className="mt-0.5 w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="font-medium text-gray-900">🔘 Principal</span>
                          <p className="text-xs text-gray-600 mt-1">⚠️ Solo puede existir un correo principal por usuario. Si el usuario destino ya tiene uno, pasará automáticamente a secundario</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                        style={{ borderColor: reasignacionData.tipoPase === 'secundario' ? '#6b7280' : '#d1d5db' }}>
                        <input
                          type="radio"
                          name="tipoPase"
                          value="secundario"
                          checked={reasignacionData.tipoPase === 'secundario'}
                          onChange={(e) => setReasignacionData({ ...reasignacionData, tipoPase: e.target.value as 'principal' | 'secundario' })}
                          className="mt-0.5 w-4 h-4 text-gray-600"
                        />
                        <div>
                          <span className="font-medium text-gray-900">🔘 Secundario</span>
                          <p className="text-xs text-gray-600 mt-1">Se agrega como correo adicional sin afectar el correo principal actual</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 🧭 Origen de la acción */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">🧭 Origen de la acción (opcional)</h4>
                    <p className="text-sm text-gray-600 mb-3">Seleccionar una de las siguientes opciones:</p>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-blue-50"
                        style={{ borderColor: reasignacionData.origenAccion === 'ticket' ? '#3b82f6' : '#d1d5db', backgroundColor: reasignacionData.origenAccion === 'ticket' ? '#eff6ff' : 'transparent' }}>
                        <input
                          type="radio"
                          name="origenAccion"
                          value="ticket"
                          checked={reasignacionData.origenAccion === 'ticket'}
                          onChange={(e) => setReasignacionData({ ...reasignacionData, origenAccion: e.target.value as 'ticket' | 'administrativa' })}
                          className="mt-0.5 w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">🎫 Esta acción proviene de una solicitud (ticket)</span>
                          <p className="text-xs text-gray-600 mt-1">Guarda historial completo con referencia al ticket</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50"
                        style={{ borderColor: reasignacionData.origenAccion === 'administrativa' ? '#6b7280' : '#d1d5db' }}>
                        <input
                          type="radio"
                          name="origenAccion"
                          value="administrativa"
                          checked={reasignacionData.origenAccion === 'administrativa'}
                          onChange={(e) => setReasignacionData({ ...reasignacionData, origenAccion: e.target.value as 'ticket' | 'administrativa' })}
                          className="mt-0.5 w-4 h-4 text-gray-600"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">⚙️ Esta acción es administrativa</span>
                          <p className="text-xs text-gray-600 mt-1">Acción interna sin ticket asociado</p>
                        </div>
                      </label>
                    </div>

                    {/* 🎟️ Ticket relacionado */}
                    {reasignacionData.origenAccion === 'ticket' && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🎟️ Ticket relacionado
                          </label>
                          <select
                            value={reasignacionData.ticketRelacionado}
                            onChange={(e) => setReasignacionData({ ...reasignacionData, ticketRelacionado: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Seleccionar ticket...</option>
                            <option value="TKT-2026-001">TKT-2026-001 - Solicitud de reasignación de buzón</option>
                            <option value="TKT-2026-002">TKT-2026-002 - Cambio de personal</option>
                          </select>
                          <p className="text-xs text-blue-600 mt-1">
                            📌 Nota: Módulo de tickets aún no implementado, usar valores de ejemplo
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo (del ticket)
                          </label>
                          <textarea
                            value={reasignacionData.motivoTicket}
                            onChange={(e) => setReasignacionData({ ...reasignacionData, motivoTicket: e.target.value })}
                            rows={2}
                            placeholder="Ejemplo: Alta por ingreso de nuevo colaborador"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                        </div>

                        {/* 🕒 Vista previa del historial */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-blue-900 mb-2">🕒 Vista previa del historial</p>
                          <div className="text-xs text-blue-800 space-y-1">
                            <p><strong>Acción:</strong> Reasignación de buzón</p>
                            <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                            <p><strong>Ticket:</strong> {reasignacionData.ticketRelacionado || 'No seleccionado'}</p>
                            <p><strong>Motivo:</strong> {reasignacionData.motivoTicket || 'Sin especificar'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ✏️ Motivo de la reasignación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ✏️ Motivo de la reasignación <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reasignacionData.motivoReasignacion}
                      onChange={(e) => setReasignacionData({ ...reasignacionData, motivoReasignacion: e.target.value })}
                      rows={3}
                      placeholder="Ejemplo: Cambio de personal"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* 📝 Observaciones */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📝 Observaciones
                    </label>
                    <textarea
                      value={reasignacionData.observaciones}
                      onChange={(e) => setReasignacionData({ ...reasignacionData, observaciones: e.target.value })}
                      rows={2}
                      placeholder="Campo de texto libre (opcional)..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Botones */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={async () => {
                  if (!reasignacionData.nuevoUsuarioId || !reasignacionData.motivoReasignacion) {
                    alert('Por favor complete todos los campos obligatorios:\n- Usuario destino\n- Motivo de reasignación');
                    return;
                  }

                  const nuevoCorreoPrincipal = reasignacionData.usarCorreoAnterior 
                    ? correoUsuario 
                    : reasignacionData.nuevoCorreo;

                  if (!nuevoCorreoPrincipal) {
                    alert('Por favor ingrese el nuevo correo o seleccione usar el correo anterior');
                    return;
                  }

                  setSavingReasignacion(true);
                  try {
                    if (!correoSeleccionado.id) {
                      alert('Error: No se pudo identificar el correo');
                      return;
                    }

                    await correosUsuarioService.reasignarCorreo(
                      empresaId,
                      usuarioId,
                      correoSeleccionado.id,
                      {
                        nuevoUsuarioId: reasignacionData.nuevoUsuarioId,
                        nombreBuzon: reasignacionData.nombreBuzon,
                        nuevoCorreoPrincipal: nuevoCorreoPrincipal,
                        mantenerCorreoAnterior: reasignacionData.usarCorreoAnterior,
                        mantenerCopiaParaOrigen: reasignacionData.mantenerCopiaParaOrigen,
                        tipoPase: reasignacionData.tipoPase,
                        motivoReasignacion: reasignacionData.motivoReasignacion,
                        observaciones: reasignacionData.observaciones,
                        ticketRelacionado: reasignacionData.origenAccion === 'ticket' ? reasignacionData.ticketRelacionado : undefined
                      }
                    );

                    // Recargar correo principal y todos los correos
                    const correoActualizado = await correosUsuarioService.getCorreoPrincipal(empresaId, usuarioId);

                    setCorreoPrincipal(correoActualizado);

                    // Recargar todos los correos para actualizar la tabla (incluyendo reasignados)
                    const todosLosCorreos = await correosUsuarioService.getCorreosByUsuario(empresaId, usuarioId);
                    const adicionales = todosLosCorreos.filter(c => 
                      !c.esCorreoPrincipal || c.esDuenoActual === false
                    );
                    setCorreosAdicionales(adicionales);

                    // Cerrar modal y resetear
                    setShowModalReasignar(false);
                    setCorreoSeleccionado(null);
                    setUsuarioSeleccionado(null);
                    setReasignacionData({
                      nuevoUsuarioId: '',
                      nombreBuzon: '',
                      usarCorreoAnterior: false,
                      nuevoCorreo: '',
                      mantenerCopiaParaOrigen: true,
                      tipoPase: 'secundario',
                      origenAccion: 'administrativa',
                      ticketRelacionado: '',
                      motivoTicket: '',
                      motivoReasignacion: '',
                      observaciones: ''
                    });

                    alert('✅ Correo reasignado exitosamente');
                    
                    // Recargar la página completa para actualizar todos los datos del usuario
                    window.location.reload();
                  } catch (error) {
                    console.error('Error reasignando correo:', error);
                    alert('Error al reasignar el correo');
                  } finally {
                    setSavingReasignacion(false);
                  }
                }}
                disabled={savingReasignacion || !usuarioSeleccionado}
                className="flex-1 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:bg-amber-300 disabled:cursor-not-allowed"
              >
                {savingReasignacion ? 'Reasignando...' : '🔄 Confirmar Reasignación'}
              </button>
              <button
                onClick={() => {
                  setShowModalReasignar(false);
                  setCorreoSeleccionado(null);
                  setUsuarioSeleccionado(null);
                  setReasignacionData({
                    nuevoUsuarioId: '',
                    nombreBuzon: '',
                    usarCorreoAnterior: false,
                    nuevoCorreo: '',
                    mantenerCopiaParaOrigen: true,
                    tipoPase: 'secundario',
                    origenAccion: 'administrativa',
                    ticketRelacionado: '',
                    motivoTicket: '',
                    motivoReasignacion: '',
                    observaciones: ''
                  });
                }}
                disabled={savingReasignacion}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Actualizar Credenciales */}
      {showModalActualizarCredenciales && correoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-bold text-white">🔑 Actualizar Credenciales</h3>
              <button
                onClick={() => {
                  setShowModalActualizarCredenciales(false);
                  setCorreoSeleccionado(null);
                  setShowPasswordEditar(false);
                }}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800 font-medium">
                  {correoSeleccionado.correoElectronico}
                </p>
              </div>

              {/* Usuario / Login */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuario / Login
                </label>
                <input
                  type="text"
                  value={credencialesData.usuarioLogin}
                  onChange={(e) => setCredencialesData({ ...credencialesData, usuarioLogin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswordEditar ? 'text' : 'password'}
                    value={credencialesData.contrasena}
                    onChange={(e) => setCredencialesData({ ...credencialesData, contrasena: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordEditar(!showPasswordEditar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPasswordEditar ? (
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
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  alert('Funcionalidad de actualizar credenciales en desarrollo');
                  setShowModalActualizarCredenciales(false);
                  setCorreoSeleccionado(null);
                  setShowPasswordEditar(false);
                }}
                className="flex-1 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                💾 Guardar Credenciales
              </button>
              <button
                onClick={() => {
                  setShowModalActualizarCredenciales(false);
                  setCorreoSeleccionado(null);
                  setShowPasswordEditar(false);
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Desactivar Correo */}
      {showModalDesactivar && correoSeleccionado && !showConfirmDesactivar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-bold text-white">🚫 Desactivar Correo</h3>
              <button
                onClick={() => {
                  setShowModalDesactivar(false);
                  setCorreoSeleccionado(null);
                  setDesactivacionData({ motivoDesactivacion: '', observaciones: '', ticketRelacionado: '' });
                }}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  {correoUsuario}
                </p>
                <p className="text-xs text-red-700">
                  ⚠️ Esta acción desactivará el correo electrónico
                </p>
              </div>

              {/* Motivo de desactivación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de desactivación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={desactivacionData.motivoDesactivacion}
                  onChange={(e) => setDesactivacionData({ ...desactivacionData, motivoDesactivacion: e.target.value })}
                  rows={3}
                  placeholder="Ej: Cambio de personal, renuncia, despido, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Observación adicional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observación adicional (opcional)
                </label>
                <textarea
                  value={desactivacionData.observaciones}
                  onChange={(e) => setDesactivacionData({ ...desactivacionData, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Información adicional..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Ticket relacionado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticket relacionado (opcional)
                </label>
                <input
                  type="text"
                  value={desactivacionData.ticketRelacionado}
                  onChange={(e) => setDesactivacionData({ ...desactivacionData, ticketRelacionado: e.target.value })}
                  placeholder="Ej: TKT-2024-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Fecha de desactivación (auto) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de desactivación
                </label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString('es-PE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  if (!desactivacionData.motivoDesactivacion.trim()) {
                    alert('Por favor ingrese el motivo de desactivación');
                    return;
                  }
                  setShowConfirmDesactivar(true);
                }}
                className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setShowModalDesactivar(false);
                  setCorreoSeleccionado(null);
                  setDesactivacionData({ motivoDesactivacion: '', observaciones: '', ticketRelacionado: '' });
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Desactivación */}
      {showConfirmDesactivar && correoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold text-white">⚠️ Confirmación</h3>
            </div>

            <div className="p-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                
                <p className="text-lg font-semibold text-gray-900">
                  Este correo quedará inactivo y no podrá usarse ni editarse
                </p>
                
                <p className="text-sm text-gray-600">
                  Podrá reasignarlo posteriormente si lo necesita
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={async () => {
                  setSavingDesactivacion(true);
                  try {
                    if (!correoSeleccionado.id) {
                      alert('Error: No se pudo identificar el correo');
                      return;
                    }

                    await correosUsuarioService.desactivarCorreo(
                      empresaId,
                      usuarioId,
                      correoSeleccionado.id,
                      {
                        motivoDesactivacion: desactivacionData.motivoDesactivacion,
                        observaciones: desactivacionData.observaciones,
                        ticketRelacionado: desactivacionData.ticketRelacionado
                      }
                    );

                    // Recargar correo principal
                    const correoActualizado = await correosUsuarioService.getCorreoPrincipal(empresaId, usuarioId);
                    setCorreoPrincipal(correoActualizado);

                    // Cerrar modales y resetear
                    setShowConfirmDesactivar(false);
                    setShowModalDesactivar(false);
                    setCorreoSeleccionado(null);
                    setDesactivacionData({ motivoDesactivacion: '', observaciones: '', ticketRelacionado: '' });

                    alert('✅ Correo desactivado exitosamente');
                  } catch (error) {
                    console.error('Error desactivando correo:', error);
                    alert('Error al desactivar el correo');
                  } finally {
                    setSavingDesactivacion(false);
                  }
                }}
                disabled={savingDesactivacion}
                className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {savingDesactivacion ? 'Desactivando...' : '🚫 Confirmar Desactivación'}
              </button>
              <button
                onClick={() => {
                  setShowConfirmDesactivar(false);
                }}
                disabled={savingDesactivacion}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                ↩️ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Historial del Correo */}
      {showModalHistorial && correoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial del Correo
                </h3>
                <p className="text-sm text-indigo-100 mt-1">{correoSeleccionado.correo}</p>
              </div>
              <button
                onClick={() => {
                  setShowModalHistorial(false);
                  setCorreoSeleccionado(null);
                  setHistorialCorreo([]);
                }}
                className="text-white hover:bg-indigo-800 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {loadingHistorial ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : historialCorreo.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No hay historial disponible para este correo</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Línea vertical del timeline */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200"></div>

                  {/* Timeline items */}
                  <div className="space-y-6">
                    {historialCorreo.map((item, index) => {
                      const isFirst = index === 0;
                      const isLast = index === historialCorreo.length - 1;
                      
                      // Función para formatear título de acción con ortografía correcta
                      const formatearTituloAccion = (accion: string) => {
                        const mapeo: Record<string, { icon: string; color: string; title: string }> = {
                          // Acciones principales
                          'creacion': { icon: '📧', color: 'green', title: 'Creación' },
                          'alta': { icon: '📧', color: 'green', title: 'Creación' },
                          'configuracion': { icon: '⚙️', color: 'blue', title: 'Configuración Inicial' },
                          'edicion': { icon: '✏️', color: 'yellow', title: 'Edición' },
                          'desactivacion': { icon: '🚫', color: 'red', title: 'Desactivación' },
                          // Reasignaciones
                          'reasignacion': { icon: '🔄', color: 'amber', title: 'Reasignación' },
                          'reasignacion_entrada': { icon: '📥', color: 'green', title: 'Reasignación (Entrada)' },
                          'reasignacion_salida': { icon: '📤', color: 'amber', title: 'Reasignación (Salida)' },
                          // Marcado principal
                          'marcado_principal': { icon: '⭐', color: 'purple', title: 'Marcado como Principal' },
                          'desmarcado_principal': { icon: '💫', color: 'gray', title: 'Desmarcado como Principal' },
                        };
                        
                        return mapeo[accion.toLowerCase()] || { 
                          icon: '📝', 
                          color: 'gray', 
                          title: accion.charAt(0).toUpperCase() + accion.slice(1).toLowerCase()
                        };
                      };
                      
                      const config = formatearTituloAccion(item.accion);

                      const bgColors = {
                        green: 'bg-green-500',
                        blue: 'bg-blue-500',
                        yellow: 'bg-yellow-500',
                        red: 'bg-red-500',
                        amber: 'bg-amber-500',
                        purple: 'bg-purple-500',
                        gray: 'bg-gray-500'
                      };

                      const borderColors = {
                        green: 'border-green-200 bg-green-50',
                        blue: 'border-blue-200 bg-blue-50',
                        yellow: 'border-yellow-200 bg-yellow-50',
                        red: 'border-red-200 bg-red-50',
                        amber: 'border-amber-200 bg-amber-50',
                        purple: 'border-purple-200 bg-purple-50',
                        gray: 'border-gray-200 bg-gray-50'
                      };

                      return (
                        <div key={item.id || index} className="flex gap-4 relative">
                          {/* Icono del timeline */}
                          <div className="flex flex-col items-center z-10">
                            <div className={`w-10 h-10 ${bgColors[config.color]} rounded-full flex items-center justify-center text-white font-bold shadow-lg ${isFirst ? 'animate-pulse' : ''}`}>
                              {config.icon}
                            </div>
                          </div>

                          {/* Contenido */}
                          <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                            <div className={`border-2 ${borderColors[config.color]} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
                              {/* Header */}
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-bold text-gray-900 text-lg">{config.title}</h4>
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(item.fechaCambio || item.fecha_cambio).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                {isFirst && (
                                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    MÁS RECIENTE
                                  </span>
                                )}
                              </div>

                              {/* Detalles */}
                              <div className="space-y-2 text-sm">
                                {/* Realizado por */}
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <div>
                                    <span className="text-gray-600">Realizado por:</span>
                                    <span className="font-semibold text-gray-900 ml-1">
                                      {item.realizadoPorNombre || item.realizado_por_nombre || 'N/A'}
                                    </span>
                                  </div>
                                </div>

                                {/* Usuario destino (solo para reasignaciones de salida) */}
                                {(item.accion === 'reasignacion_salida' || item.accion === 'reasignacion') && item.usuarioDestinoNombre && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                    <div>
                                      <span className="text-gray-600">Enviado a:</span>
                                      <span className="font-semibold text-green-700 ml-1">
                                        {item.usuarioDestinoNombre}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Usuario origen (solo para reasignaciones de entrada) */}
                                {item.accion === 'reasignacion_entrada' && item.usuarioOrigenNombre && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                                    </svg>
                                    <div>
                                      <span className="text-gray-600">Recibido de:</span>
                                      <span className="font-semibold text-blue-700 ml-1">
                                        {item.usuarioOrigenNombre}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Motivo */}
                                {item.motivo && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    <div>
                                      <span className="text-gray-600">Motivo:</span>
                                      <span className="text-gray-900 ml-1">{item.motivo}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Observaciones */}
                                {item.observaciones && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div>
                                      <span className="text-gray-600">Observaciones:</span>
                                      <span className="text-gray-900 ml-1">{item.observaciones}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Ticket relacionado */}
                                {item.ticketRelacionado && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                    </svg>
                                    <div>
                                      <span className="text-gray-600">Ticket:</span>
                                      <span className="font-mono text-blue-600 ml-1">{item.ticketRelacionado}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Origen de la acción */}
                                {item.origenAccion && (
                                  <div className="mt-2">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                      item.origenAccion === 'ticket' ? 'bg-blue-100 text-blue-800' :
                                      item.origenAccion === 'administrativa' ? 'bg-purple-100 text-purple-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {item.origenAccion === 'ticket' ? '🎫 Desde Ticket' :
                                       item.origenAccion === 'administrativa' ? '👔 Administrativa' :
                                       item.origenAccion === 'manual' ? '✋ Manual' :
                                       item.origenAccion}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <button
                onClick={() => {
                  setShowModalHistorial(false);
                  setCorreoSeleccionado(null);
                  setHistorialCorreo([]);
                }}
                className="w-full px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver Configuración (Solo lectura) */}
      {showModalVerConfiguracion && correoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <div className="flex items-center gap-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <div>
                  <h3 className="text-xl font-bold">Configuración del Correo</h3>
                  <p className="text-sm text-blue-100">Solo lectura - Correo reasignado</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModalVerConfiguracion(false);
                  setCorreoSeleccionado(null);
                  setShowPasswordVerConfiguracion(false);
                }}
                className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Alerta */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      Este correo ha sido reasignado a otro usuario
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Esta información es de solo lectura. El correo ya no pertenece a este usuario.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid de información */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Correo Electrónico */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-200">
                  <label className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Correo Electrónico
                  </label>
                  <p className="text-blue-900 font-bold text-lg mt-2 break-all">{correoSeleccionado.correo}</p>
                </div>

                {/* Estado */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4 border border-purple-200">
                  <label className="text-xs font-bold text-purple-800 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Estado
                  </label>
                  <p className="text-purple-900 font-semibold text-lg mt-2 capitalize">
                    {correoSeleccionado.estado === 'reasignado' && '🔄 Reasignado'}
                    {correoSeleccionado.estado === 'activo' && '✅ Activo'}
                    {correoSeleccionado.estado === 'inactivo' && '❌ Inactivo'}
                    {correoSeleccionado.estado === 'pendiente' && '⏳ Pendiente'}
                  </p>
                </div>

                {/* Plataforma */}
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 border border-green-200">
                  <label className="text-xs font-bold text-green-800 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    Plataforma
                  </label>
                  <p className="text-green-900 font-semibold text-lg mt-2">{correoSeleccionado.plataformaNombre || 'N/A'}</p>
                </div>

                {/* Tipo de Correo */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-4 border border-orange-200">
                  <label className="text-xs font-bold text-orange-800 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Tipo de Correo
                  </label>
                  <p className="text-orange-900 font-semibold text-lg mt-2">{correoSeleccionado.tipoCorreoNombre || 'N/A'}</p>
                </div>

                {/* Protocolo */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg p-4 border border-indigo-200">
                  <label className="text-xs font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Protocolo
                  </label>
                  <p className="text-indigo-900 font-semibold text-lg mt-2">{correoSeleccionado.protocoloNombre || 'N/A'}</p>
                </div>

                {/* Usuario/Login */}
                <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-lg p-4 border border-pink-200">
                  <label className="text-xs font-bold text-pink-800 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Usuario / Login
                  </label>
                  <p className="text-pink-900 font-semibold text-lg mt-2 break-all">{correoSeleccionado.usuarioLogin || 'N/A'}</p>
                </div>

                {/* Contraseña */}
                <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg p-4 border border-red-200">
                  <label className="text-xs font-bold text-red-800 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Contraseña
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-red-900 font-semibold text-lg break-all flex-1">
                      {(() => {
                        if (!correoSeleccionado.contrasena) return 'N/A';
                        
                        // Detectar si está hasheada (bcrypt)
                        const isHashed = correoSeleccionado.contrasena.startsWith('$2b$') || 
                                        correoSeleccionado.contrasena.startsWith('$2a$') ||
                                        correoSeleccionado.contrasena.length > 50;
                        
                        if (isHashed) {
                          return (
                            <span className="text-sm italic text-red-700">
                              🔒 Solo visible para el usuario que recibió este correo
                            </span>
                          );
                        }
                        
                        return showPasswordVerConfiguracion ? correoSeleccionado.contrasena : '••••••••';
                      })()}
                    </p>
                    {correoSeleccionado.contrasena && 
                     !correoSeleccionado.contrasena.startsWith('$2b$') && 
                     !correoSeleccionado.contrasena.startsWith('$2a$') &&
                     correoSeleccionado.contrasena.length <= 50 && (
                      <button
                        type="button"
                        onClick={() => setShowPasswordVerConfiguracion(!showPasswordVerConfiguracion)}
                        className="p-2 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                      >
                        {showPasswordVerConfiguracion ? (
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
                </div>
              </div>

              {/* Configurado por */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-lg p-4 border border-cyan-200">
                <label className="text-xs font-bold text-cyan-800 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Configurado Por
                </label>
                <p className="text-cyan-900 font-semibold text-lg mt-2">{correoSeleccionado.configuradoPorNombre || 'N/A'}</p>
              </div>

              {/* Observaciones */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-4 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Observaciones (Opcional)
                </label>
                <p className="text-slate-700 text-sm">{correoSeleccionado.observaciones || 'Sin observaciones'}</p>
              </div>

              {/* Fecha de Configuración */}
              {correoSeleccionado.fechaConfiguracion && (
                <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-4 border border-teal-200">
                  <label className="text-xs font-bold text-teal-800 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Fecha de Configuración
                  </label>
                  <p className="text-teal-900 font-semibold text-lg mt-2">
                    {new Date(correoSeleccionado.fechaConfiguracion).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl">
              <button
                onClick={() => {
                  setShowModalVerConfiguracion(false);
                  setCorreoSeleccionado(null);
                  setShowPasswordVerConfiguracion(false);
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Configuración del Correo */}
      {showModalEditarConfiguracion && correoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold">✏️ Editar Configuración del Correo</h3>
                <p className="text-sm text-blue-100 mt-1">{correoSeleccionado.correoElectronico}</p>
              </div>
              <button
                onClick={() => {
                  setShowModalEditarConfiguracion(false);
                  setCorreoSeleccionado(null);
                }}
                className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Correo Electrónico */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={datosEdicion.correoElectronico}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, correoElectronico: e.target.value })}
                  placeholder="ejemplo@empresa.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Puede cambiar el correo electrónico si es necesario
                </p>
              </div>

              {/* Plataforma */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Plataforma de Correo <span className="text-red-500">*</span>
                </label>
                <select
                  value={datosEdicion.plataformaId}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, plataformaId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Seleccione una plataforma...</option>
                  {plataformas.map((plat) => (
                    <option key={plat.id} value={plat.id}>
                      {plat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Correo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Correo <span className="text-red-500">*</span>
                </label>
                <select
                  value={datosEdicion.tipoCorreoId}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, tipoCorreoId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Seleccione un tipo...</option>
                  {tiposCorreo.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Protocolo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Protocolo de Acceso <span className="text-red-500">*</span>
                </label>
                <select
                  value={datosEdicion.protocoloId}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, protocoloId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Seleccione un protocolo...</option>
                  {protocolos.map((prot) => (
                    <option key={prot.id} value={prot.id}>
                      {prot.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswordEditar ? 'text' : 'password'}
                    value={datosEdicion.contrasena}
                    onChange={(e) => setDatosEdicion({ ...datosEdicion, contrasena: e.target.value })}
                    placeholder="Contraseña del correo"
                    autoComplete="new-password"
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordEditar(!showPasswordEditar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswordEditar ? (
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
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={datosEdicion.observaciones}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, observaciones: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Tipo de Correo: Principal / Secundario */}
              {/* Solo mostrar si el correo NO es principal actualmente */}
              {((correoSeleccionado?.esPrincipal ?? correoSeleccionado?.esCorreoPrincipal) === false) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Tipo de Correo
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="esPrincipal"
                        checked={datosEdicion.esPrincipal === true}
                        onChange={() => setDatosEdicion({ ...datosEdicion, esPrincipal: true })}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        ⭐ Principal
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="esPrincipal"
                        checked={datosEdicion.esPrincipal === false}
                        onChange={() => setDatosEdicion({ ...datosEdicion, esPrincipal: false })}
                        className="w-4 h-4 text-gray-600 focus:ring-gray-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                        📧 Secundario
                      </span>
                    </label>
                  </div>
                  {datosEdicion.esPrincipal && (
                    <div className="mt-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-amber-900 mb-1">Cambio de Correo Principal</p>
                          <p className="text-xs text-amber-800">
                            Al marcar este correo como principal, el correo principal actual del usuario pasará automáticamente a secundario. Esta acción se registrará en el historial.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo de la edición */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <label className="block text-sm font-bold text-amber-900 mb-2">
                  Motivo de la edición <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={datosEdicion.motivoEdicion}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, motivoEdicion: e.target.value })}
                  placeholder="Explique por qué está editando esta configuración..."
                  rows={2}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-amber-700 mt-1">
                  Este motivo se guardará en el historial del correo
                </p>
              </div>

              {/* Editado por (Solo lectura) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Editado por
                </label>
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                  👤 {user?.nombre || 'Usuario actual'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Se guardará automáticamente en el historial
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex gap-3">
              <button
                onClick={() => {
                  setShowModalEditarConfiguracion(false);
                  setCorreoSeleccionado(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarEdicion}
                disabled={saving || !datosEdicion.motivoEdicion.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
