import axiosClient from '@/api/axiosClient';

export interface CredencialesPortal {
  id: number;
  empresaId: number;
  usuario: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistorialCredencial {
  id: number;
  credencialId: number;
  campoModificado: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  modificadoPor: number;
  modificadoPorNombre: string;
  motivo: string;
  fechaModificacion: string;
}

export interface ActualizarCredencialesData {
  usuario?: string;
  contrasena?: string;
  motivo: string;
}

export const credencialesService = {
  // Obtener credenciales de una empresa
  getCredenciales: async (empresaId: string): Promise<CredencialesPortal> => {
    const response = await axiosClient.get(`/api/empresas/${empresaId}/credenciales-portal`);
    return response.data;
  },

  // Actualizar credenciales
  actualizarCredenciales: async (
    empresaId: string,
    data: ActualizarCredencialesData
  ): Promise<{ message: string; credenciales: CredencialesPortal }> => {
    const response = await axiosClient.put(`/api/empresas/${empresaId}/credenciales-portal`, data);
    return response.data;
  },

  // Obtener historial de cambios
  getHistorial: async (empresaId: string): Promise<HistorialCredencial[]> => {
    const response = await axiosClient.get(`/api/empresas/${empresaId}/credenciales-portal/historial`);
    return response.data;
  },

  // Ver contraseña (con permisos de admin)
  verContrasena: async (empresaId: string): Promise<{ message: string; puedeModificar: boolean }> => {
    const response = await axiosClient.post(`/api/empresas/${empresaId}/credenciales-portal/ver-contrasena`);
    return response.data;
  },
};
