import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Usuario, AsignarActivoData, DesactivarUsuarioData, UsuarioHistorial } from '../services/usuariosService';
import { 
  getUsuariosByEmpresa,
  updateUsuario,
  asignarActivo,
  desactivarUsuario,
  getHistorialUsuario
} from '../services/usuariosService';
import { getEmpresaById } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { UsuarioForm } from '../components/UsuarioForm';
import { AsignarActivoModal } from '../components/AsignarActivoModal';
import { CambiarActivoModal } from '../components/CambiarActivoModal';
import { DesactivarUsuarioModal } from '../components/DesactivarUsuarioModal';

// Componente para el contenido del historial
function HistorialContent({ empresaId, usuarioId }: { empresaId: string; usuarioId: string }) {
  const [historial, setHistorial] = useState<UsuarioHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ACCION_LABELS: Record<string, { label: string; color: string; bgColor: string; icon: JSX.Element }> = {
    creacion: { 
      label: 'Creación', 
      color: 'text-green-700', 
      bgColor: 'bg-green-50 border-green-200',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
    },
    edicion: { 
      label: 'Edición', 
      color: 'text-blue-700', 
      bgColor: 'bg-blue-50 border-blue-200',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
    },
    asignacion_activo: { 
      label: 'Asignación de activo', 
      color: 'text-purple-700', 
      bgColor: 'bg-purple-50 border-purple-200',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
    },
    cambio_activo: { 
      label: 'Cambio de activo', 
      color: 'text-yellow-700', 
      bgColor: 'bg-yellow-50 border-yellow-200',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
    },
    desactivacion: { 
      label: 'Desactivación', 
      color: 'text-red-700', 
      bgColor: 'bg-red-50 border-red-200',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
    },
  };

  useEffect(() => {
    const loadHistorial = async () => {
      try {
        setLoading(true);
        const data = await getHistorialUsuario(empresaId, usuarioId);
        
        const normalized = data.map(item => {
          const fechaNormalizada = item.fechaCambio || item.fecha_cambio || item.fecha;
          
          return {
            ...item,
            id: item.historialId || item.id,
            accion: (item.accion || '').toLowerCase(),
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

  const formatearValor = (valor: string | null) => {
    if (!valor) return null;
    
    try {
      const parsed = JSON.parse(valor);
      if (parsed.assetId || parsed.codigo || parsed.activoId) {
        return parsed.assetId || parsed.codigo || `Activo ID: ${parsed.activoId}`;
      }
      return valor;
    } catch {
      return valor;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-12">
        <div className="flex flex-col items-center justify-center">
          <svg className="animate-spin h-12 w-12 text-[#5061f7] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600 font-medium">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (historial.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-12">
        <div className="text-center">
          <svg className="w-20 h-20 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500 text-lg font-semibold">No hay registros en el historial</p>
          <p className="text-slate-400 text-sm mt-2">Las acciones realizadas sobre este usuario aparecerán aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-[#5061f7]/20">
        <div className="p-2.5 bg-gradient-to-br from-[#5061f7]/10 to-indigo-50 rounded-lg">
          <svg className="w-5 h-5 text-[#5061f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Historial de Cambios</h2>
          <p className="text-sm text-slate-500 mt-0.5">Registro completo de todas las acciones</p>
        </div>
      </div>

      <div className="space-y-4">
        {historial.map((item, index) => {
          const accionInfo = ACCION_LABELS[item.accion] || { 
            label: item.accion, 
            color: 'text-gray-700', 
            bgColor: 'bg-gray-50 border-gray-200',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          };

          const valorAnteriorFormateado = formatearValor(item.valorAnterior);
          const valorNuevoFormateado = formatearValor(item.valorNuevo);

          return (
            <div
              key={item.id || index}
              className="border-2 border-slate-200 rounded-xl hover:border-[#5061f7] hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50"
            >
              <div className={`px-6 py-4 border-b-2 ${accionInfo.bgColor} rounded-t-xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white border-2 ${accionInfo.color}`}>
                      {accionInfo.icon}
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${accionInfo.color}`}>
                        {accionInfo.label}
                      </span>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
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
                    <p className="text-xs text-slate-500 font-semibold">Realizado por</p>
                    <p className="text-sm font-bold text-slate-800">{item.realizadoPor}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {(item.accion === 'asignacion_activo' || item.accion === 'cambio_activo') && (
                  <div className="bg-gradient-to-r from-[#5061f7]/5 to-indigo-50 border-l-4 border-[#5061f7] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#5061f7] rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#5061f7] mb-1">
                          {item.accion === 'cambio_activo' ? 'Activo cambiado a' : 'Activo asignado'}
                        </p>
                        <p className="text-xl font-mono font-bold text-slate-900">
                          {valorNuevoFormateado || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {item.motivo && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Motivo
                    </p>
                    <p className="text-sm text-blue-900 font-medium">{item.motivo}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UsuarioDetailPage() {
  const { empresaId, usuarioId } = useParams<{ empresaId: string; usuarioId: string }>();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [sedeNombre, setSedeNombre] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para pestañas
  const [activeTab, setActiveTab] = useState<'general' | 'activos' | 'historial' | 'correos'>('general');

  // Estados de modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAsignarActivoModal, setShowAsignarActivoModal] = useState(false);
  const [showCambiarActivoModal, setShowCambiarActivoModal] = useState(false);
  const [showDesactivarModal, setShowDesactivarModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Cargar datos del usuario
  useEffect(() => {
    if (!empresaId || !usuarioId) {
      setError('No se proporcionó ID de empresa o usuario');
      setLoading(false);
      return;
    }
    cargarUsuario();
  }, [empresaId, usuarioId]);

  const cargarUsuario = async () => {
    if (!empresaId || !usuarioId) return;
    try {
      setLoading(true);
      const data = await getUsuariosByEmpresa(empresaId);
      console.log('🔍 [CARGAR USUARIO] Total usuarios recibidos:', data.length);
      console.log('🔍 [CARGAR USUARIO] Buscando usuario con ID:', usuarioId);
      
      const usuarioEncontrado = data.find((u: Usuario) => 
        (u.id === usuarioId || u._id === usuarioId || String(u.id) === String(usuarioId) || String(u._id) === String(usuarioId))
      );
      
      if (usuarioEncontrado) {
        console.log('✅ Usuario encontrado:', usuarioEncontrado);
        console.log('✅ Usuario encontrado JSON:', JSON.stringify(usuarioEncontrado, null, 2));
        console.log('📍 SedeId del usuario:', usuarioEncontrado.sedeId);
        console.log('🔍 activosAsignados del usuario:', usuarioEncontrado.activosAsignados);
        console.log('🔍 activoAsignadoId (legacy):', usuarioEncontrado.activoAsignadoId);
        
        setUsuario(usuarioEncontrado);
        setError(null);
        
        // Cargar información de empresa
        try {
          const empresaData = await getEmpresaById(empresaId);
          const nombre = empresaData.nombre || empresaData.razonSocial || '';
          console.log('🏢 Empresa cargada:', nombre);
          setEmpresaNombre(nombre);
        } catch (err) {
          console.error('❌ Error al cargar empresa:', err);
        }
        
        // Cargar información de sede si existe
        if (usuarioEncontrado.sedeId) {
          try {
            const sedesData = await getSedesByEmpresa(empresaId);
            console.log('🏪 Sedes disponibles:', sedesData);
            console.log('🔍 Buscando sede con ID:', usuarioEncontrado.sedeId, 'Tipo:', typeof usuarioEncontrado.sedeId);
            
            const sede = sedesData.find((s: any) => {
              // Convertir ambos a string para comparar
              const match = String(s.id) === String(usuarioEncontrado.sedeId) || 
                           String(s._id) === String(usuarioEncontrado.sedeId);
              console.log(`  Comparando sede ${s.nombre}: s.id=${s.id} (${typeof s.id}), sedeId=${usuarioEncontrado.sedeId} (${typeof usuarioEncontrado.sedeId}), match=${match}`);
              return match;
            });
            
            if (sede) {
              console.log('✅ Sede encontrada:', sede.nombre);
              setSedeNombre(sede.nombre || '');
            } else {
              console.log('❌ No se encontró sede con ese ID');
            }
          } catch (err) {
            console.error('❌ Error al cargar sede:', err);
          }
        } else {
          console.log('⚠️ Usuario no tiene sedeId asignado');
        }
      } else {
        setError('Usuario no encontrado');
      }
    } catch (err) {
      console.error('Error al cargar usuario:', err);
      setError('Error al cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  };

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
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleEditarUsuario = async (data: Partial<Usuario>) => {
    if (!usuario?.id && !usuario?._id) return;
    try {
      setIsSaving(true);
      await updateUsuario(empresaId!, usuario.id || usuario._id!, data);
      showSuccessToast('✅ Usuario actualizado correctamente');
      setShowFormModal(false);
      await cargarUsuario();
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      showErrorToast('❌ Error al actualizar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAsignarActivo = async (data: AsignarActivoData) => {
    if (!usuario?.id && !usuario?._id) return;
    try {
      setIsSaving(true);
      console.log('📤 Enviando datos al backend:', {
        empresaId: empresaId,
        usuarioId: usuario.id || usuario._id,
        data: data
      });
      await asignarActivo(empresaId!, usuario.id || usuario._id!, data);
      showSuccessToast('✅ Activo asignado correctamente');
      setShowAsignarActivoModal(false);
      await cargarUsuario();
    } catch (err) {
      console.error('Error al asignar activo:', err);
      showErrorToast('❌ Error al asignar activo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDesactivarUsuario = async (data: DesactivarUsuarioData) => {
    if (!usuario?.id && !usuario?._id) return;
    try {
      setIsSaving(true);
      console.log('📤 Enviando datos de desactivación:', JSON.stringify({
        empresaId: empresaId,
        usuarioId: usuario.id || usuario._id,
        data: data
      }, null, 2));
      
      const resultado = await desactivarUsuario(empresaId!, usuario.id || usuario._id!, data);
      console.log('✅ Desactivación exitosa - Respuesta:', resultado);
      
      showSuccessToast('✅ Usuario desactivado correctamente');
      setShowDesactivarModal(false);
      await cargarUsuario();
    } catch (err: any) {
      console.error('❌ Error al desactivar usuario:', err);
      console.error('❌ Respuesta del servidor:', err.response?.data);
      console.error('❌ Status code:', err.response?.status);
      console.error('❌ Mensaje de error:', err.response?.data?.message || err.message);
      
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al desactivar usuario';
      showErrorToast(`❌ ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  if (error || !usuario) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Usuario no encontrado'}</p>
          <button
            onClick={() => navigate(`/empresas/${empresaId}/usuarios`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  const activos = usuario.activosAsignados || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-subtle to-surface p-6">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className={`px-6 py-4 rounded-xl shadow-card border ${
            toastType === 'success' ? 'bg-accent-green border-green-300 text-white' : 'bg-red-500 border-red-600 text-white'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{toastType === 'success' ? '✓' : '✕'}</span>
              <span className="font-semibold">{toastMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/empresas/${empresaId}/usuarios`)}
            className="group px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-[#5061f7] hover:text-[#5061f7] hover:shadow-md font-medium flex items-center gap-2 transition-all duration-200"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Detalle del Usuario</h1>
            <p className="text-muted font-medium mt-1">{usuario.nombreCompleto}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {usuario.activo && (
            <>
              <button
                onClick={() => setShowFormModal(true)}
                className="group px-5 py-2.5 bg-gradient-to-r from-[#5061f7] to-[#4453e6] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
              <button
                onClick={() => setShowAsignarActivoModal(true)}
                className="group px-5 py-2.5 bg-gradient-to-r from-[#10b981] to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {(!activos || activos.length === 0) ? 'Asignar Activo' : 'Asignar Otro Activo'}
              </button>
              {activos && activos.length > 0 && (
                <button
                  onClick={() => setShowCambiarActivoModal(true)}
                  className="group px-5 py-2.5 bg-gradient-to-r from-[#f59e0b] to-orange-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Cambiar Activo
                </button>
              )}
              <button
                onClick={() => setShowDesactivarModal(true)}
                className="group px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Desactivar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 inline-flex gap-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'general'
                ? 'bg-gradient-to-r from-[#5061f7] to-[#4453e6] text-white shadow-md'
                : 'text-slate-600 hover:text-[#5061f7] hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Datos Generales
          </button>
          <button
            onClick={() => setActiveTab('activos')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'activos'
                ? 'bg-gradient-to-r from-[#5061f7] to-[#4453e6] text-white shadow-md'
                : 'text-slate-600 hover:text-[#5061f7] hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Activos
            {activos.length > 0 && (
              <span className="min-w-[24px] h-6 px-2 bg-white text-[#5061f7] rounded-full text-xs font-bold flex items-center justify-center">
                {activos.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'historial'
                ? 'bg-gradient-to-r from-[#5061f7] to-[#4453e6] text-white shadow-md'
                : 'text-slate-600 hover:text-[#5061f7] hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Historial
          </button>
          <button
            onClick={() => setActiveTab('correos')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'correos'
                ? 'bg-gradient-to-r from-[#5061f7] to-[#4453e6] text-white shadow-md'
                : 'text-slate-600 hover:text-[#5061f7] hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Gestión de Correos
          </button>
        </div>
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === 'general' && (
        <>
        {/* Datos Personales */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/20">
            <div className="p-2.5 bg-gradient-to-br from-[#5061f7]/10 to-indigo-50 rounded-lg">
              <svg className="w-5 h-5 text-[#5061f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Datos Personales</h2>
          </div>
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nombre Completo</label>
              <p className="text-slate-900 font-bold text-lg mt-1">{usuario.nombreCompleto}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Correo Electrónico</label>
              <p className="text-slate-900 font-semibold mt-1 break-all">{usuario.correo}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Cargo</label>
              <p className="text-slate-900 font-semibold mt-1">{usuario.cargo || <span className="text-muted">—</span>}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Teléfono</label>
              <p className="text-slate-900 font-semibold mt-1">{usuario.telefono || <span className="text-muted">—</span>}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">Estado</label>
              {usuario.activo ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-sm font-bold">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  ACTIVO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm font-bold">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  INACTIVO
                </span>
              )}
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 border border-indigo-200">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Fecha de Alta</label>
              <p className="text-slate-900 font-semibold mt-1">
                {(() => {
                  const fecha = usuario.fechaAlta || usuario.createdAt;
                  return fecha ? new Date(fecha).toLocaleDateString('es-PE') : <span className="text-muted">—</span>;
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Información de Empresa */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-green-500/20">
            <div className="p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Información de Empresa</h2>
          </div>
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Empresa</label>
              <p className="text-slate-900 font-bold text-lg mt-1">{empresaNombre || <span className="text-muted">—</span>}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Sede</label>
              <p className="text-slate-900 font-semibold mt-1">{sedeNombre || <span className="text-muted">—</span>}</p>
            </div>
            {usuario.observaciones && (
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Observaciones</label>
                <p className="text-slate-700 mt-2 leading-relaxed">{usuario.observaciones}</p>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Pesta\u00f1a de Activos */}
      {activeTab === 'activos' && (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-blue-500/20">
          <div className="p-2.5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Activos Asignados
            {activos.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#5061f7] to-indigo-600 rounded-lg shadow-sm">
                {activos.length}
              </span>
            )}
          </h2>
        </div>

        {activos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 text-slate-200">📦</div>
            <p className="text-slate-500 font-semibold text-lg mb-2">No hay activos asignados a este usuario</p>
            <p className="text-muted text-sm mb-6">Asigna un activo para comenzar</p>
            <button
              onClick={() => setShowAsignarActivoModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#5061f7] to-[#4453e6] text-white rounded-xl hover:shadow-lg font-semibold inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Asignar Activo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activos.map((activo, index) => (
              <div 
                key={activo.id || index}
                className="border-2 border-slate-200 rounded-xl p-5 hover:border-[#5061f7] hover:shadow-lg transition-all bg-gradient-to-br from-white to-slate-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#5061f7] to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg font-semibold text-slate-700">
                    {activo.asset_id || activo.assetId || activo.codigo}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg">
                  {activo.asset_id || activo.assetId || activo.codigo || 'Sin código'}
                </h3>
                {activo.categoria && (
                  <p className="text-sm text-slate-600 font-medium flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {activo.categoria}
                  </p>
                )}
                {activo.fechaAsignacion && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-muted font-semibold">
                      Asignado: {new Date(activo.fechaAsignacion).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })} {new Date(activo.fechaAsignacion).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Pesta\u00f1a de Historial */}
      {activeTab === 'historial' && (
        <HistorialContent empresaId={empresaId!} usuarioId={usuario.id || usuario._id!} />
      )}
      {/* Pestaña de Gestión de Correos */}
      {activeTab === 'correos' && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-[#5061f7]/20">
            <div className="p-2.5 bg-gradient-to-br from-[#5061f7]/10 to-indigo-50 rounded-lg">
              <svg className="w-5 h-5 text-[#5061f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gestión de Correos</h2>
              <p className="text-sm text-slate-500 mt-0.5">Administre los correos enviados al usuario</p>
            </div>
          </div>

          {/* Contenido temporal */}
          <div className="text-center py-12">
            <svg className="w-20 h-20 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-500 text-lg font-semibold">Sección de Gestión de Correos</p>
            <p className="text-slate-400 text-sm mt-2">Pendiente de implementación</p>
          </div>
        </div>
      )}
      {/* Modales */}
      {showFormModal && usuario && (
        <UsuarioForm
          usuario={usuario}
          empresaId={empresaId!}
          empresaNombre={empresaNombre}
          onSave={handleEditarUsuario}
          onCancel={() => setShowFormModal(false)}
          isSaving={isSaving}
        />
      )}

      {showAsignarActivoModal && usuario && (
        <AsignarActivoModal
          empresaId={empresaId!}
          sedeId={usuario.sedeId}
          usuarioNombre={usuario.nombreCompleto}
          activosAsignados={activos}
          onSave={handleAsignarActivo}
          onCancel={() => setShowAsignarActivoModal(false)}
          isSaving={isSaving}
        />
      )}

      {showCambiarActivoModal && usuario && (
        <CambiarActivoModal
          empresaId={empresaId!}
          sedeId={usuario.sedeId}
          usuarioNombre={usuario.nombreCompleto}
          activosAsignados={activos}
          onSave={handleAsignarActivo}
          onCancel={() => setShowCambiarActivoModal(false)}
          isSaving={isSaving}
        />
      )}

      {showDesactivarModal && usuario && (
        <DesactivarUsuarioModal
          usuarioNombre={usuario.nombreCompleto}
          onConfirm={handleDesactivarUsuario}
          onCancel={() => setShowDesactivarModal(false)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
