import axiosClient from '../../../api/axiosClient';

export interface TipoCorreo {
  id?: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export const tiposCorreoService = {
  // Obtener todos los tipos
  getAll: async (): Promise<TipoCorreo[]> => {
    const response = await axiosClient.get('/api/catalogo/tipos-correo?includeInactive=true');
    return response.data;
  },

  // Obtener un tipo por ID
  getById: async (id: number): Promise<TipoCorreo> => {
    const response = await axiosClient.get(`/api/catalogo/tipos-correo/${id}`);
    return response.data;
  },

  // Crear nuevo tipo
  create: async (data: Partial<TipoCorreo>): Promise<TipoCorreo> => {
    const response = await axiosClient.post('/api/catalogo/tipos-correo', data);
    return response.data;
  },

  // Actualizar tipo
  update: async (id: number, data: Partial<TipoCorreo>): Promise<TipoCorreo> => {
    const response = await axiosClient.put(`/api/catalogo/tipos-correo/${id}`, data);
    return response.data;
  },

  // Desactivar tipo (soft delete)
  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/api/catalogo/tipos-correo/${id}`);
  }
};
