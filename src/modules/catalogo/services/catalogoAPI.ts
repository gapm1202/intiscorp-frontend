import axiosClient from "@/api/axiosClient";

const BASE_URL = "/catalogo/servicios";

// Interfaces exportadas
export interface CatalogServicio {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoServicio: string;
  activo: boolean;
  visibleEnTickets: boolean;
  creadoPor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServicioStats {
  total: number;
  activos: number;
  inactivos: number;
  visiblesEnTickets: number;
}

// Servicio principal
export const catalogoServiciosService = {
  getServicios: async (): Promise<CatalogServicio[]> => {
    const response = await axiosClient.get(BASE_URL);
    return response.data;
  },

  getServicioById: async (id: number): Promise<CatalogServicio> => {
    const response = await axiosClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  createServicio: async (data: Omit<CatalogServicio, 'id'>): Promise<CatalogServicio> => {
    const response = await axiosClient.post(BASE_URL, data);
    return response.data;
  },

  updateServicio: async (id: number, data: Partial<CatalogServicio>): Promise<CatalogServicio> => {
    const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  getStats: async (): Promise<ServicioStats> => {
    const response = await axiosClient.get(`${BASE_URL}/stats`);
    return response.data;
  },

  getTiposServicio: async (): Promise<string[]> => {
    const response = await axiosClient.get(`${BASE_URL}/tipos`);
    return response.data;
  },

  addTipoServicio: async (tipo: string): Promise<void> => {
    await axiosClient.post(`${BASE_URL}/tipos`, { tipo });
  }
};
