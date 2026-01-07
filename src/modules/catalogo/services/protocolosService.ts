import axiosClient from '../../../api/axiosClient';

export interface Protocolo {
  id?: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export const protocolosService = {
  // Obtener todos los protocolos
  getAll: async (): Promise<Protocolo[]> => {
    const response = await axiosClient.get('/api/catalogo/protocolos?includeInactive=true');
    return response.data;
  },

  // Obtener un protocolo por ID
  getById: async (id: number): Promise<Protocolo> => {
    const response = await axiosClient.get(`/api/catalogo/protocolos/${id}`);
    return response.data;
  },

  // Crear nuevo protocolo
  create: async (data: Partial<Protocolo>): Promise<Protocolo> => {
    const response = await axiosClient.post('/api/catalogo/protocolos', data);
    return response.data;
  },

  // Actualizar protocolo
  update: async (id: number, data: Partial<Protocolo>): Promise<Protocolo> => {
    const response = await axiosClient.put(`/api/catalogo/protocolos/${id}`, data);
    return response.data;
  },

  // Desactivar protocolo (soft delete)
  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/api/catalogo/protocolos/${id}`);
  }
};
