import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Usuario, AsignarActivoData, DesactivarUsuarioData } from '../services/usuariosService';
import { 
  getUsuariosByEmpresa,
  updateUsuario,
  asignarActivo,
  desactivarUsuario
} from '../services/usuariosService';
import { getEmpresaById } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { UsuarioForm } from '../components/UsuarioForm';
import { AsignarActivoModal } from '../components/AsignarActivoModal';
import { CambiarActivoModal } from '../components/CambiarActivoModal';
import { DesactivarUsuarioModal } from '../components/DesactivarUsuarioModal';
import { HistorialUsuarioModal } from '../components/HistorialUsuarioModal';

export default function UsuarioDetailPage() {
  const { empresaId, usuarioId } = useParams<{ empresaId: string; usuarioId: string }>();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [sedeNombre, setSedeNombre] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAsignarActivoModal, setShowAsignarActivoModal] = useState(false);
  const [showCambiarActivoModal, setShowCambiarActivoModal] = useState(false);
  const [showDesactivarModal, setShowDesactivarModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
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
      const usuarioEncontrado = data.find((u: Usuario) => 
        (u.id === usuarioId || u._id === usuarioId)
      );
      
      if (usuarioEncontrado) {
        console.log('✅ Usuario encontrado:', usuarioEncontrado);
        console.log('📍 SedeId del usuario:', usuarioEncontrado.sedeId);
        
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className={`px-6 py-3 rounded-lg shadow-lg ${
            toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white font-medium`}>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/empresas/${empresaId}/usuarios`)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Detalle del Usuario</h1>
            <p className="text-gray-600 mt-1">{usuario.nombreCompleto}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {usuario.activo && (
            <>
              <button
                onClick={() => setShowFormModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => setShowAsignarActivoModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                📌 {(!activos || activos.length === 0) ? 'Asignar Activo' : 'Asignar Otro Activo'}
              </button>
              {activos && activos.length > 0 && (
                <button
                  onClick={() => setShowCambiarActivoModal(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                >
                  🔄 Cambiar Activo
                </button>
              )}
              <button
                onClick={() => setShowDesactivarModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                🔴 Desactivar
              </button>
            </>
          )}
          <button
            onClick={() => setShowHistorialModal(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            📋 Ver Historial
          </button>
        </div>
      </div>

      {/* Información Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Datos Personales */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            👤 Datos Personales
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Nombre Completo</label>
              <p className="text-gray-900 font-medium mt-1">{usuario.nombreCompleto}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Correo Electrónico</label>
              <p className="text-gray-900 font-medium mt-1">{usuario.correo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Cargo</label>
              <p className="text-gray-900 font-medium mt-1">{usuario.cargo || '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Teléfono</label>
              <p className="text-gray-900 font-medium mt-1">{usuario.telefono || '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Estado</label>
              <div className="mt-1">
                {usuario.activo ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    🟢 Activo
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                    🔴 Inactivo
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Fecha de Alta</label>
              <p className="text-gray-900 font-medium mt-1">
                {(() => {
                  const fecha = usuario.fechaAlta || usuario.createdAt;
                  return fecha ? new Date(fecha).toLocaleDateString('es-PE') : '—';
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Información de Empresa */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            🏢 Información de Empresa
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Empresa</label>
              <p className="text-gray-900 font-medium mt-1">{empresaNombre || '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Sede</label>
              <p className="text-gray-900 font-medium mt-1">{sedeNombre || '—'}</p>
            </div>
            {usuario.observaciones && (
              <div>
                <label className="text-sm font-medium text-gray-600">Observaciones</label>
                <p className="text-gray-900 mt-1">{usuario.observaciones}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activos Asignados */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          💼 Activos Asignados
          {activos.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full">
              {activos.length}
            </span>
          )}
        </h2>

        {activos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>No hay activos asignados a este usuario</p>
            <button
              onClick={() => setShowAsignarActivoModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Asignar Activo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activos.map((activo, index) => (
              <div 
                key={activo.id || index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {activo.asset_id || activo.assetId || activo.codigo}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {activo.asset_id || activo.assetId || activo.codigo || 'Sin código'}
                </h3>
                {activo.categoria && (
                  <p className="text-sm text-gray-600">
                    📁 {activo.categoria}
                  </p>
                )}
                {activo.fechaAsignacion && (
                  <p className="text-xs text-gray-500 mt-2">
                    Asignado: {new Date(activo.fechaAsignacion).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric'
                    })} {new Date(activo.fechaAsignacion).toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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

      {showHistorialModal && usuario && (
        <HistorialUsuarioModal
          empresaId={empresaId!}
          usuarioId={usuario.id || usuario._id!}
          usuarioNombre={usuario.nombreCompleto}
          onClose={() => setShowHistorialModal(false)}
        />
      )}
    </div>
  );
}
