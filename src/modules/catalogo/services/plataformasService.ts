import axiosClient from '../../../api/axiosClient';

export interface PlataformaCorreo {
  id?: number;
  codigo?: string;
  nombre: string;
  tipoPlataforma: string;
  tipoPlataformaPersonalizado?: string;
  permiteReasignar: boolean;
  permiteConservar: boolean;
  observaciones?: string;
  activo: boolean;
}

export const plataformasService = {
  // Obtener todas las plataformas
  getAll: async (): Promise<PlataformaCorreo[]> => {
    const response = await axiosClient.get('/api/catalogo/plataformas?includeInactive=true');
    return response.data;
  },

  // Obtener una plataforma por ID
  getById: async (id: number): Promise<PlataformaCorreo> => {
    const response = await axiosClient.get(`/api/catalogo/plataformas/${id}`);
    return response.data;
  },

  // Crear nueva plataforma
  create: async (data: Partial<PlataformaCorreo>): Promise<PlataformaCorreo> => {
    const response = await axiosClient.post('/api/catalogo/plataformas', data);
    return response.data;
  },

  // Actualizar plataforma
  update: async (id: number, data: Partial<PlataformaCorreo>): Promise<PlataformaCorreo> => {
    const response = await axiosClient.put(`/api/catalogo/plataformas/${id}`, data);
    return response.data;
  },

  // Desactivar plataforma (soft delete)
  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/api/catalogo/plataformas/${id}`);
  }
};
