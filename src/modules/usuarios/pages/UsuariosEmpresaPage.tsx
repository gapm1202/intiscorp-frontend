import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { Usuario, AsignarActivoData, DesactivarUsuarioData } from '../services/usuariosService';
import { 
  getUsuariosByEmpresa,
  createUsuario,
  updateUsuario,
  asignarActivo,
  desactivarUsuario,
  exportarUsuarios,
  enviarCorreoBienvenida,
  enviarCorreoActualizacion
} from '../services/usuariosService';
import { getEmpresaById } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { UsuarioForm } from '../components/UsuarioForm';
import { AsignarActivoModal } from '../components/AsignarActivoModal';
import { DesactivarUsuarioModal } from '../components/DesactivarUsuarioModal';
import { HistorialUsuarioModal } from '../components/HistorialUsuarioModal';
import CredencialesPortalModal from '../components/CredencialesPortalModal';

export default function UsuariosEmpresaPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'con_activo' | 'sin_activo'>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados de modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAsignarActivoModal, setShowAsignarActivoModal] = useState(false);
  const [showDesactivarModal, setShowDesactivarModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showCredencialesModal, setShowCredencialesModal] = useState(false);
  const [showEnviarCorreoModal, setShowEnviarCorreoModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Cargar datos iniciales
  useEffect(() => {
    if (!empresaId) {
      setError('No se proporcionó ID de empresa');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar empresa primero
        const empresaData = await getEmpresaById(empresaId);
        setEmpresaNombre(empresaData.nombre || 'Empresa');
        
        // Luego cargar usuarios
        try {
          const usuariosData = await getUsuariosByEmpresa(empresaId);
          
          // Debug: ver campos de fecha
          if (usuariosData.length > 0) {
            console.log('📅 Campos de fecha del primer usuario:', {
              fechaAlta: usuariosData[0].fechaAlta,
              createdAt: usuariosData[0].createdAt,
              fecha_alta: usuariosData[0].fecha_alta,
              todosLosCampos: Object.keys(usuariosData[0])
            });
          }
          
          // Cargar sedes para mapear los nombres
          try {
            const sedesData = await getSedesByEmpresa(empresaId);
            console.log('🏪 Sedes cargadas:', sedesData);
            
            // Mapear nombres de sedes a cada usuario
            const usuariosConSede = usuariosData.map((usuario: Usuario) => {
              if (usuario.sedeId) {
                const sede = sedesData.find((s: any) => 
                  String(s.id) === String(usuario.sedeId) || 
                  String(s._id) === String(usuario.sedeId)
                );
                return {
                  ...usuario,
                  sedeNombre: sede?.nombre || usuario.sedeNombre
                };
              }
              return usuario;
            });
            
            setUsuarios(Array.isArray(usuariosConSede) ? usuariosConSede : []);
          } catch (sedesErr) {
            console.warn('No se pudieron cargar sedes:', sedesErr);
            // Si falla la carga de sedes, usar los datos sin mapear
            setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
          }
        } catch (usuariosErr) {
          // Si falla cargar usuarios, mostrar array vacío pero no error
          console.warn('No se pudieron cargar usuarios:', usuariosErr);
          setUsuarios([]);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar los datos de la empresa';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [empresaId]);

  // Recargar usuarios cuando se vuelve a esta página desde una página de detalle
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && empresaId) {
        console.log('🔄 Página visible de nuevo - recargando usuarios');
        try {
          const data = await getUsuariosByEmpresa(empresaId);
          console.log('🔄 [RELOAD] Datos recibidos:', data);
          console.log('🔄 [RELOAD] Cantidad:', Array.isArray(data) ? data.length : 0);
          console.log('🔄 [RELOAD] Activos:', Array.isArray(data) ? data.filter(u => u.activo).length : 0);
          console.log('🔄 [RELOAD] Inactivos:', Array.isArray(data) ? data.filter(u => !u.activo).length : 0);
          
          // Cargar sedes para mapear los nombres
          try {
            const sedesData = await getSedesByEmpresa(empresaId);
            const usuariosConSede = data.map((usuario: Usuario) => {
              if (usuario.sedeId) {
                const sede = sedesData.find((s: any) => 
                  String(s.id) === String(usuario.sedeId) || 
                  String(s._id) === String(usuario.sedeId)
                );
                return {
                  ...usuario,
                  sedeNombre: sede?.nombre || usuario.sedeNombre
                };
              }
              return usuario;
            });
            setUsuarios(Array.isArray(usuariosConSede) ? usuariosConSede : []);
          } catch (err) {
            setUsuarios(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          console.error('❌ Error al recargar:', err);
        }
      }
    };

    // Escuchar cambios de visibilidad de la página
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Recargar también cuando cambie la ruta (al volver con el botón)
    if (empresaId && location.pathname.includes(`/empresas/${empresaId}/usuarios`) && !location.pathname.includes('/usuarios/')) {
      console.log('🔄 Detectado retorno a lista de usuarios - recargando');
      handleVisibilityChange();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, empresaId]);

  // Filtrar usuarios - Protección contra datos no válidos
  const usuariosFiltrados = (Array.isArray(usuarios) ? usuarios : []).filter((usuario) => {
    // Filtro por búsqueda (nombre o correo)
    const matchBusqueda = !busqueda || 
      usuario.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      usuario.correo.toLowerCase().includes(busqueda.toLowerCase());

    // Filtro por cargo
    const matchCargo = !filtroCargo || usuario.cargo?.toLowerCase().includes(filtroCargo.toLowerCase());

    // Filtro por estado
    const matchEstado = filtroEstado === 'todos' ||
      (filtroEstado === 'activo' && usuario.activo) ||
      (filtroEstado === 'inactivo' && !usuario.activo);

    // Filtro por activo asignado - revisar tanto activoAsignadoId como activosAsignados (M:N)
    const tieneActivoAsignado = usuario.activoAsignadoId || 
                                (usuario.activosAsignados && usuario.activosAsignados.length > 0);
    const matchActivo = filtroActivo === 'todos' ||
      (filtroActivo === 'con_activo' && tieneActivoAsignado) ||
      (filtroActivo === 'sin_activo' && !tieneActivoAsignado);

    return matchBusqueda && matchCargo && matchEstado && matchActivo;
  });

  // Obtener cargos únicos para el filtro
  const cargosUnicos = Array.from(new Set(
    (Array.isArray(usuarios) ? usuarios : []).map(u => u.cargo).filter(Boolean)
  ));

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // Handlers
  const handleActualizar = async () => {
    if (!empresaId) return;
    try {
      setLoading(true);
      const data = await getUsuariosByEmpresa(empresaId);
      console.log('🔄 [ACTUALIZAR] Datos recibidos del backend:', data);
      console.log('🔄 [ACTUALIZAR] Cantidad de usuarios:', Array.isArray(data) ? data.length : 'No es array');
      console.log('🔄 [ACTUALIZAR] Usuarios activos:', Array.isArray(data) ? data.filter(u => u.activo).length : 0);
      console.log('🔄 [ACTUALIZAR] Usuarios inactivos:', Array.isArray(data) ? data.filter(u => !u.activo).length : 0);
      
      // Cargar sedes para mapear los nombres
      try {
        const sedesData = await getSedesByEmpresa(empresaId);
        console.log('🏪 Sedes cargadas:', sedesData);
        
        // Mapear nombres de sedes a cada usuario
        const usuariosConSede = data.map((usuario: Usuario) => {
          if (usuario.sedeId) {
            const sede = sedesData.find((s: any) => 
              String(s.id) === String(usuario.sedeId) || 
              String(s._id) === String(usuario.sedeId)
            );
            return {
              ...usuario,
              sedeNombre: sede?.nombre || usuario.sedeNombre
            };
          }
          return usuario;
        });
        
        setUsuarios(Array.isArray(usuariosConSede) ? usuariosConSede : []);
      } catch (err) {
        console.error('❌ Error al cargar sedes:', err);
        // Si falla la carga de sedes, usar los datos sin mapear
        setUsuarios(Array.isArray(data) ? data : []);
      }
      
      showSuccessToast('✅ Lista actualizada');
    } catch (err) {
      console.error('❌ [ACTUALIZAR] Error al actualizar:', err);
      showErrorToast('❌ Error al actualizar');
      setUsuarios([]); // Asegurar que siempre sea un array
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async (formato: 'excel' | 'pdf') => {
    if (!empresaId) return;
    try {
      const blob = await exportarUsuarios(empresaId, formato);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios_${empresaNombre}_${new Date().toISOString().split('T')[0]}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showSuccessToast(`✅ Archivo ${formato.toUpperCase()} descargado`);
    } catch (err) {
      showErrorToast(`❌ Error al exportar a ${formato.toUpperCase()}`);
    }
  };

  const handleSaveUsuario = async (data: Partial<Usuario>) => {
    if (!empresaId) return;
    
    console.log('🚀 [SAVE USUARIO] Iniciando guardado...');
    console.log('📋 [SAVE USUARIO] Datos recibidos del formulario:', data);
    console.log('🏢 [SAVE USUARIO] Empresa ID:', empresaId);
    
    try {
      setIsSaving(true);
      if (usuarioSeleccionado?.id || usuarioSeleccionado?._id) {
        // Editar
        console.log('✏️ [SAVE USUARIO] Modo EDICIÓN - Usuario ID:', usuarioSeleccionado.id || usuarioSeleccionado._id);
        await updateUsuario(empresaId, usuarioSeleccionado.id || usuarioSeleccionado._id!, data);
        showSuccessToast('✅ Usuario actualizado correctamente');
      } else {
        // Crear
        const payload = { ...data, empresaId };
        console.log('➕ [SAVE USUARIO] Modo CREACIÓN - Payload completo a enviar:', JSON.stringify(payload, null, 2));
        
        const result = await createUsuario(empresaId, payload);
        console.log('✅ [SAVE USUARIO] Respuesta del backend:', result);
        
        showSuccessToast('✅ Usuario creado correctamente');
      }
      setShowFormModal(false);
      setUsuarioSeleccionado(null);
      await handleActualizar();
    } catch (err: any) {
      console.error('❌ [SAVE USUARIO] Error completo:', err);
      console.error('❌ [SAVE USUARIO] Error response:', err?.response);
      console.error('❌ [SAVE USUARIO] Error response data:', err?.response?.data);
      console.error('❌ [SAVE USUARIO] Error status:', err?.response?.status);
      
      // Backend puede devolver el error en .message o .error
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al guardar usuario';
      showErrorToast(`❌ ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAsignarActivo = async (data: AsignarActivoData) => {
    if (!usuarioSeleccionado || !empresaId) return;
    try {
      setIsSaving(true);
      await asignarActivo(empresaId, usuarioSeleccionado.id || usuarioSeleccionado._id!, data);
      showSuccessToast('✅ Activo asignado correctamente');
      setShowAsignarActivoModal(false);
      setUsuarioSeleccionado(null);
      await handleActualizar();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al asignar activo';
      showErrorToast(`❌ ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDesactivar = async (data: DesactivarUsuarioData) => {
    if (!usuarioSeleccionado || !empresaId) return;
    try {
      setIsSaving(true);
      await desactivarUsuario(empresaId, usuarioSeleccionado.id || usuarioSeleccionado._id!, data);
      showSuccessToast('✅ Usuario desactivado correctamente');
      setShowDesactivarModal(false);
      setUsuarioSeleccionado(null);
      await handleActualizar();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al desactivar usuario';
      showErrorToast(`❌ ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && usuarios.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 mt-4">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <span className="text-5xl">⚠️</span>
              <h2 className="text-xl font-bold text-red-800 mt-4">Error al cargar el módulo</h2>
            </div>
            <p className="text-red-700 text-center mb-4">{error}</p>
            {!empresaId && (
              <p className="text-sm text-red-600 text-center mb-4">
                💡 Debe acceder a este módulo desde una empresa específica
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/admin/empresas')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📋 Ver Empresas
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-subtle to-surface p-4 md:p-8">
      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-card animate-fadeIn ${toastType === 'success' ? 'bg-accent-green text-white' : 'bg-red-500 text-white'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{toastType === 'success' ? '✓' : '✕'}</span>
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-primary hover:text-primary-600 font-medium transition-all hover:gap-3"
        >
          ← Volver
        </button>
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-6 border border-slate-100">
          <div className="h-24 bg-gradient-to-r from-primary via-[#6875f8] to-indigo-600"></div>
          <div className="px-8 pb-8 -mt-12 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-xl bg-white shadow-lg flex items-center justify-center ring-4 ring-white shrink-0">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center text-2xl font-bold">
                  👥
                </div>
              </div>
              <div className="pt-4">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Usuarios - {empresaNombre}</h1>
                <p className="text-muted font-medium">Gestión y control de usuarios de la empresa</p>
              </div>
            </div>
            <div className="pt-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-6 py-3">
                <p className="text-sm font-semibold text-slate-600 mb-1">Total de usuarios</p>
                <p className="text-3xl font-bold text-primary">{usuarios.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 mb-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setUsuarioSeleccionado(null);
              setShowFormModal(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-[#5061f7] to-[#4453e6] text-white rounded-xl hover:shadow-lg font-semibold transition-all flex items-center gap-2 hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
          <button
            onClick={() => setShowCredencialesModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all flex items-center gap-2 hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Credenciales Portal Soporte
          </button>
          <button
            onClick={handleActualizar}
            className="px-6 py-3 bg-white border-2 border-accent-green text-accent-green rounded-xl hover:bg-accent-green hover:text-white font-semibold transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl hover:border-[#5061f7] hover:text-[#5061f7] font-semibold transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros {mostrarFiltros ? '▲' : '▼'}
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleExportar('excel')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
            <button
              onClick={() => handleExportar('pdf')}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 mb-6 space-y-4">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/20">
            <div className="p-2.5 bg-gradient-to-br from-primary/10 to-indigo-50 rounded-lg">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Filtros de búsqueda</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Buscar por nombre o correo */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                🔎 Buscar por nombre o correo
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escriba para buscar..."
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-slate-50 hover:bg-white font-medium"
              />
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                💼 Cargo
              </label>
              <select
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-slate-50 hover:bg-white font-medium"
              >
                <option value="">Todos los cargos</option>
                {cargosUnicos.map((cargo) => (
                  <option key={cargo} value={cargo}>{cargo}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                📊 Estado del usuario
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-slate-50 hover:bg-white font-medium"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">✓ Activo</option>
                <option value="inactivo">✕ Inactivo</option>
              </select>
            </div>

            {/* Activo asignado */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                🖥️ Activo asignado
              </label>
              <select
                value={filtroActivo}
                onChange={(e) => setFiltroActivo(e.target.value as any)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-slate-50 hover:bg-white font-medium"
              >
                <option value="todos">Todos</option>
                <option value="con_activo">Con activo asignado</option>
                <option value="sin_activo">Sin activo asignado</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-primary via-[#6875f8] to-indigo-600">
                <th className="px-6 py-4 text-left text-sm font-bold text-white">Nombre Completo</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white">Correo Electrónico</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white">Cargo</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white">Sede</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white">Fecha de Alta</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-white">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-6xl text-slate-200">📭</div>
                      <p className="text-slate-500 font-semibold">No hay usuarios que coincidan con los filtros</p>
                      <p className="text-sm text-muted">Intenta ajustar tus criterios de búsqueda</p>
                    </div>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr 
                    key={usuario.id || usuario._id} 
                    className={`transition-all ${!usuario.activo ? 'bg-slate-50/50' : 'hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent'}`}
                  >
                    <td className={`px-6 py-4 text-sm font-bold ${usuario.activo ? 'text-slate-900' : 'text-slate-400'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${usuario.activo ? 'bg-accent-green' : 'bg-slate-300'}`}></div>
                        {usuario.nombreCompleto}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${usuario.activo ? 'text-slate-600' : 'text-slate-400'}`}>
                      {usuario.correo}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${usuario.activo ? 'text-slate-600' : 'text-slate-400'}`}>
                      {usuario.cargo || <span className="text-muted">—</span>}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${usuario.activo ? 'text-slate-600' : 'text-slate-400'}`}>
                      {usuario.sedeNombre || <span className="text-muted">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {usuario.activo ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          ACTIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                          </svg>
                          INACTIVO
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${usuario.activo ? 'text-slate-600' : 'text-slate-400'}`}>
                      {(() => {
                        const fecha = usuario.fechaAlta || usuario.createdAt;
                        return fecha ? new Date(fecha).toLocaleDateString('es-PE') : <span className="text-muted">—</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/empresas/${empresaId}/usuarios/${usuario.id || usuario._id}`)}
                          className="px-4 py-2 bg-[#5061f7] text-white rounded-xl hover:bg-[#4453e6] hover:shadow-lg text-sm font-semibold transition-all inline-flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </button>
                        {usuario.correoPrincipal && (
                          <button
                            onClick={() => {
                              setUsuarioSeleccionado(usuario);
                              setShowEnviarCorreoModal(true);
                            }}
                            disabled={usuario.correoEnviado && !usuario.tieneCambiosPendientes}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 ${
                              usuario.correoEnviado && !usuario.tieneCambiosPendientes
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 hover:shadow-lg'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {usuario.correoEnviado ? 'Enviar Actualización' : 'Enviar correo'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total de registros */}
      <div className="mt-6 flex items-center justify-end gap-2">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl px-6 py-3">
          <p className="text-sm font-bold text-slate-700">
            Mostrando <span className="text-[#5061f7] text-lg">{usuariosFiltrados.length}</span> de <span className="text-lg">{usuarios.length}</span> usuarios
          </p>
        </div>
      </div>

      {/* Modales */}
      {showFormModal && empresaId && (
        <UsuarioForm
          empresaId={empresaId}
          empresaNombre={empresaNombre}
          usuario={usuarioSeleccionado}
          onSave={handleSaveUsuario}
          onCancel={() => {
            setShowFormModal(false);
            setUsuarioSeleccionado(null);
          }}
          isSaving={isSaving}
        />
      )}

      {showAsignarActivoModal && usuarioSeleccionado && empresaId && (
        <AsignarActivoModal
          empresaId={empresaId}
          usuarioNombre={usuarioSeleccionado.nombreCompleto}
          activoActualId={usuarioSeleccionado.activoAsignadoId}
          activoActualCodigo={usuarioSeleccionado.activoAsignadoCodigo}
          onSave={handleAsignarActivo}
          onCancel={() => {
            setShowAsignarActivoModal(false);
            setUsuarioSeleccionado(null);
          }}
          isSaving={isSaving}
        />
      )}

      {showDesactivarModal && usuarioSeleccionado && (
        <DesactivarUsuarioModal
          usuarioNombre={usuarioSeleccionado.nombreCompleto}
          onConfirm={handleDesactivar}
          onCancel={() => {
            setShowDesactivarModal(false);
            setUsuarioSeleccionado(null);
          }}
          isSaving={isSaving}
        />
      )}

      {showHistorialModal && usuarioSeleccionado && empresaId && (
        <HistorialUsuarioModal
          empresaId={empresaId}
          usuarioId={usuarioSeleccionado.id || usuarioSeleccionado._id!}
          usuarioNombre={usuarioSeleccionado.nombreCompleto}
          onClose={() => {
            setShowHistorialModal(false);
            setUsuarioSeleccionado(null);
          }}
        />
      )}

      {/* Modal de confirmación para enviar correo */}
      {showEnviarCorreoModal && usuarioSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {usuarioSeleccionado.correoEnviado ? 'Enviar Actualización' : 'Enviar Correo de Bienvenida'}
                  </h3>
                  <p className="text-blue-100 text-sm mt-0.5">{usuarioSeleccionado.nombreCompleto}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">¿Completaste toda la información del usuario?</p>
                    <p className="text-sm text-blue-700">
                      {usuarioSeleccionado.correoEnviado 
                        ? 'Se enviará un correo con los cambios realizados desde la última notificación.'
                        : 'Verifica que todos los datos estén correctos antes de enviar el correo de bienvenida.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEnviarCorreoModal(false);
                    setUsuarioSeleccionado(null);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all duration-200 border-2 border-slate-200"
                >
                  No
                </button>
                <button
                  onClick={async () => {
                    if (!empresaId || !usuarioSeleccionado) return;
                    
                    try {
                      setEnviandoCorreo(true);
                      
                      if (usuarioSeleccionado.correoEnviado) {
                        await enviarCorreoActualizacion(empresaId, usuarioSeleccionado.id || usuarioSeleccionado._id!);
                      } else {
                        await enviarCorreoBienvenida(empresaId, usuarioSeleccionado.id || usuarioSeleccionado._id!);
                      }
                      
                      // Actualizar lista de usuarios
                      const usuariosActualizados = await getUsuariosByEmpresa(empresaId);
                      setUsuarios(usuariosActualizados);
                      
                      setToastMessage(
                        usuarioSeleccionado.correoEnviado 
                          ? 'Correo de actualización enviado correctamente'
                          : 'Correo de bienvenida enviado correctamente'
                      );
                      setToastType('success');
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                      
                      setShowEnviarCorreoModal(false);
                      setUsuarioSeleccionado(null);
                    } catch (err: any) {
                      setToastMessage(err?.response?.data?.message || 'Error al enviar el correo');
                      setToastType('error');
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                    } finally {
                      setEnviandoCorreo(false);
                    }
                  }}
                  disabled={enviandoCorreo}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {enviandoCorreo ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    'Sí, enviar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCredencialesModal && empresaId && (
        <CredencialesPortalModal
          isOpen={showCredencialesModal}
          empresaId={empresaId}
          empresaNombre={empresaNombre}
          onClose={() => setShowCredencialesModal(false)}
          onSuccess={() => {
            showSuccessToast('Credenciales actualizadas exitosamente');
          }}
        />
      )}
    </div>
  );
}
