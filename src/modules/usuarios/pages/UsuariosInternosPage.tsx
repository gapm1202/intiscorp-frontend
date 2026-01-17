import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuariosInternosService } from '../services/usuariosInternosService';
import type { UsuarioInterno } from '../types/usuariosInternos.types';
import RestablecerPasswordModal from '../components/RestablecerPasswordModal';
import HistorialInternoModal from '../components/HistorialInternoModal';

export function UsuariosInternosPage() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UsuarioInterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('');

  // Modales
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean; usuarioId: number; usuarioNombre: string }>({
    isOpen: false,
    usuarioId: 0,
    usuarioNombre: ''
  });
  const [historialModal, setHistorialModal] = useState<{ isOpen: boolean; usuarioId: number; usuarioNombre: string }>({
    isOpen: false,
    usuarioId: 0,
    usuarioNombre: ''
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuariosInternosService.getAll();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios internos:', error);
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const coincideBusqueda = 
      usuario.nombreCompleto?.toLowerCase().includes(filtro.toLowerCase()) ||
      usuario.correoPrincipal?.toLowerCase().includes(filtro.toLowerCase()) ||
      usuario.usuario?.toLowerCase().includes(filtro.toLowerCase());
    
    const coincideRol = !filtroRol || usuario.rol === filtroRol;
    
    return coincideBusqueda && coincideRol;
  });

  const getRolBadge = (rol: string) => {
    const badges = {
      administrador: 'bg-purple-100 text-purple-700',
      tecnico: 'bg-blue-100 text-blue-700',
      cliente: 'bg-green-100 text-green-700'
    };
    return badges[rol as keyof typeof badges] || 'bg-gray-100 text-gray-700';
  };

  const getRolIcon = (rol: string) => {
    switch(rol) {
      case 'administrador':
        return '👑';
      case 'tecnico':
        return '🔧';
      case 'cliente':
        return '👤';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 rounded-2xl shadow-2xl p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Usuarios Internos</h1>
            <p className="text-indigo-100">Gestión de administradores, técnicos y personal interno</p>
          </div>
          <button
            onClick={() => navigate('/admin/usuarios/internos/nuevo')}
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario Interno
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por nombre, correo o usuario..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Rol</label>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Todos los roles</option>
              <option value="administrador">Administrador</option>
              <option value="tecnico">Técnico</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {usuariosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="w-24 h-24 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No hay usuarios internos</h3>
            <p className="text-slate-400">Crea el primer usuario interno haciendo clic en "Nuevo Usuario Interno"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{usuario.nombreCompleto}</div>
                        <div className="text-sm text-slate-500">@{usuario.usuario}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getRolBadge(usuario.rol)}`}>
                        <span>{getRolIcon(usuario.rol)}</span>
                        {usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-slate-900">{usuario.correoPrincipal}</div>
                        {usuario.telefonos && usuario.telefonos.length > 0 && (
                          <div className="text-slate-500">
                            {usuario.telefonos.find(t => t.esPrincipal)?.numero || usuario.telefonos[0].numero}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {usuario.activo ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/usuarios/internos/${usuario.id}/editar`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setResetPasswordModal({ isOpen: true, usuarioId: usuario.id, usuarioNombre: usuario.nombreCompleto })}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Restablecer contraseña"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setHistorialModal({ isOpen: true, usuarioId: usuario.id, usuarioNombre: usuario.nombreCompleto })}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Ver historial"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`¿Estás seguro de ${usuario.activo ? 'desactivar' : 'activar'} a ${usuario.nombreCompleto}?`)) {
                              const motivo = prompt('Motivo:');
                              if (motivo) {
                                try {
                                  if (usuario.activo) {
                                    await usuariosInternosService.desactivar(usuario.id, motivo);
                                  } else {
                                    await usuariosInternosService.activar(usuario.id, motivo);
                                  }
                                  await cargarUsuarios();
                                } catch (error) {
                                  console.error('Error:', error);
                                  alert('Error al cambiar el estado del usuario');
                                }
                              }
                            }
                          }}
                          className={`p-2 ${usuario.activo ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'} rounded-lg transition-colors`}
                          title={usuario.activo ? 'Desactivar' : 'Activar'}
                        >
                          {usuario.activo ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
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

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-slate-500">
        Mostrando {usuariosFiltrados.length} de {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
      </div>

      {/* Modales */}
      <RestablecerPasswordModal
        isOpen={resetPasswordModal.isOpen}
        onClose={() => setResetPasswordModal({ isOpen: false, usuarioId: 0, usuarioNombre: '' })}
        onConfirm={async (nuevaPassword, motivo) => {
          await usuariosInternosService.resetPassword(resetPasswordModal.usuarioId, { nuevaPassword, motivoCambio: motivo });
          alert('Contraseña restablecida correctamente');
          await cargarUsuarios();
        }}
        usuarioNombre={resetPasswordModal.usuarioNombre}
      />

      <HistorialInternoModal
        isOpen={historialModal.isOpen}
        onClose={() => setHistorialModal({ isOpen: false, usuarioId: 0, usuarioNombre: '' })}
        usuarioId={historialModal.usuarioId}
        usuarioNombre={historialModal.usuarioNombre}
      />
    </div>
  );
}
