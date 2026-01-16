import axiosClient from '@/api/axiosClient';

export interface TipoLicencia {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TipoLicenciaInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export const tiposLicenciaService = {
  getAll: async (): Promise<TipoLicencia[]> => {
    const response = await axiosClient.get('/api/catalogo/tipos-licencia');
    return response.data.data;
  },

  getById: async (id: number): Promise<TipoLicencia> => {
    const response = await axiosClient.get(`/api/catalogo/tipos-licencia/${id}`);
    return response.data.data;
  },

  create: async (data: TipoLicenciaInput): Promise<TipoLicencia> => {
    const response = await axiosClient.post('/api/catalogo/tipos-licencia', data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<TipoLicenciaInput>): Promise<TipoLicencia> => {
    const response = await axiosClient.put(`/api/catalogo/tipos-licencia/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<TipoLicencia> => {
    const response = await axiosClient.delete(`/api/catalogo/tipos-licencia/${id}`);
    return response.data.data;
  }
};
