import axiosClient from '@/api/axiosClient';

// Tipos de Usuario
export interface Usuario {
  id?: string;
  _id?: string;
  empresaId: string;
  empresaNombre?: string;
  sedeId: string;
  sedeNombre?: string;
  nombreCompleto: string;
  correo: string;
  cargo?: string;
  telefono?: string;
  observaciones?: string;
  // Campos antiguos (1:1 - mantener por compatibilidad)
  activoAsignadoId?: string;
  activoAsignadoCodigo?: string;
  activoAsignadoNombre?: string;
  fechaAsignacionActivo?: string;
  // Nuevos campos (M:N - múltiples activos)
  activosAsignados?: Array<{
    id: string;
    assetId: string;
    codigo: string;
    nombre?: string;
    categoria?: string;
    fechaAsignacion?: string;
  }>;
  activo: boolean;
  motivoDesactivacion?: string;
  fechaAlta: string;
  fechaDesactivacion?: string;
  creadoPor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsuarioHistorial {
  id?: string;
  historial_id?: string;
  usuarioId: string;
  usuario_id?: string;
  accion: 'creacion' | 'edicion' | 'asignacion_activo' | 'cambio_activo' | 'desactivacion';
  campo?: string;
  campo_modificado?: string;
  valorAnterior?: string;
  valor_anterior?: string;
  valorNuevo?: string;
  valor_nuevo?: string;
  motivo?: string;
  detalleAdicional?: string;
  observacion_adicional?: string;
  realizadoPor: string;
  realizado_por?: string;
  nombre_quien_realizo?: string;
  fecha: string;
  fecha_cambio?: string;
}

export interface AsignarActivoData {
  activoId: string;
  fechaAsignacion: string;
  motivo: string;
  observacion?: string;
}

export interface DesactivarUsuarioData {
  motivo: string;
  observacionAdicional?: string;
}

// Servicios API
// Rutas según implementación del backend en /api/empresas/:empresaId/usuarios

export const getUsuariosByEmpresa = async (empresaId: string, sedeId?: string): Promise<Usuario[]> => {
  const params: any = { incluirInactivos: true }; // Incluir usuarios inactivos
  if (sedeId) params.sedeId = sedeId;
  
  const response = await axiosClient.get(`/api/empresas/${empresaId}/usuarios`, { params });
  console.log('📡 [SERVICE] Respuesta de getUsuariosByEmpresa:', response.data);
  console.log('📡 [SERVICE] Usuarios recibidos:', Array.isArray(response.data) ? response.data.length : 'no es array');
  
  // Log detallado de TODOS los usuarios para debug
  const data = Array.isArray(response.data) ? response.data : response.data.data || [];
  if (data.length > 0) {
    console.log('📡 [SERVICE - PRIMER USUARIO COMPLETO]:', JSON.stringify(data[0], null, 2));
    console.log('📡 [SERVICE - TODOS LOS USUARIOS]:');
    data.forEach((user: any, index: number) => {
      console.log(`  Usuario ${index + 1} (ID: ${user.id}):`, {
        nombre: user.nombreCompleto,
        activosAsignados: user.activosAsignados?.length || 0,
        tieneActivos: Array.isArray(user.activosAsignados) && user.activosAsignados.length > 0
      });
    });
  }
  
  // Backend devuelve { data: [...], success: true }, extraer el array
  return data;
};

export const getUsuarioById = async (empresaId: string, usuarioId: string): Promise<Usuario> => {
  const response = await axiosClient.get(`/api/empresas/${empresaId}/usuarios/${usuarioId}`);
  return response.data.data || response.data;
};

export const createUsuario = async (empresaId: string, data: Partial<Usuario>): Promise<Usuario> => {
  const response = await axiosClient.post(`/api/empresas/${empresaId}/usuarios`, data);
  return response.data.data || response.data;
};

export const updateUsuario = async (empresaId: string, usuarioId: string, data: Partial<Usuario>): Promise<Usuario> => {
  const response = await axiosClient.put(`/api/empresas/${empresaId}/usuarios/${usuarioId}`, data);
  return response.data.data || response.data;
};

export const deleteUsuario = async (empresaId: string, usuarioId: string): Promise<void> => {
  await axiosClient.delete(`/api/empresas/${empresaId}/usuarios/${usuarioId}`);
};

export const asignarActivo = async (empresaId: string, usuarioId: string, data: AsignarActivoData): Promise<Usuario> => {
  const response = await axiosClient.post(`/api/empresas/${empresaId}/usuarios/${usuarioId}/asignar-activo`, data);
  return response.data.data || response.data;
};

export const desactivarUsuario = async (empresaId: string, usuarioId: string, data: DesactivarUsuarioData): Promise<Usuario> => {
  const response = await axiosClient.post(`/api/empresas/${empresaId}/usuarios/${usuarioId}/desactivar`, data);
  return response.data.data || response.data;
};

export const getHistorialUsuario = async (empresaId: string, usuarioId: string): Promise<UsuarioHistorial[]> => {
  const response = await axiosClient.get(`/api/empresas/${empresaId}/usuarios/${usuarioId}/historial`);
  return Array.isArray(response.data) ? response.data : response.data.data || [];
};

export const exportarUsuarios = async (empresaId: string, formato: 'excel' | 'pdf'): Promise<Blob> => {
  const response = await axiosClient.get(`/api/empresas/${empresaId}/usuarios/exportar`, {
    params: { formato },
    responseType: 'blob',
  });
  return response.data;
};
