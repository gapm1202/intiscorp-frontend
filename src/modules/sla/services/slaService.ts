import axiosClient from '../../../api/axiosClient';

const BASE_URL = '/api/sla';

export interface SLASeccionPayload {
  seccion: string;
  data: unknown;
  motivo?: string;
}

export const slaService = {
  // Obtener configuración SLA
  async getConfiguracion(empresaId: string) {
    try {
      const response = await axiosClient.get(`${BASE_URL}/configuracion/${empresaId}`);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] getConfiguracion error:', error?.response?.data || error?.message);
      throw error;
    }
  },

  // Guardar sección específica
  async guardarSeccion(empresaId: string, seccion: string, data: unknown, motivo?: string) {
    try {
      console.log('[slaService] guardarSeccion request:', { seccion, dataType: typeof data, data, motivo });
      const response = await axiosClient.post(`${BASE_URL}/seccion/${empresaId}`, {
        seccion,
        data,
        ...(motivo ? { motivo } : {}),
      });
      console.log('[slaService] guardarSeccion response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] guardarSeccion error:', {
        status: error?.response?.status,
        message: error?.response?.data?.message,
        data: error?.response?.data,
      });
      throw error;
    }
  },

  // Registrar edición (motivo)
  async registrarEdicion(empresaId: string, seccion: string, motivo: string) {
    const response = await axiosClient.post(`${BASE_URL}/editar/${empresaId}`, {
      seccion,
      motivo,
    });
    return response.data;
  },

  // Limpiar sección
  async limpiarSeccion(empresaId: string, seccion: string) {
    const response = await axiosClient.post(`${BASE_URL}/limpiar/${empresaId}`, {
      seccion,
    });
    return response.data;
  },

  // Limpiar múltiples secciones
  async limpiarSecciones(empresaId: string, secciones: string[]) {
    const response = await axiosClient.post(`${BASE_URL}/limpiar/${empresaId}`, {
      secciones,
    });
    return response.data;
  },

  // Obtener historial
  async getHistorial(empresaId: string, params?: { limit?: number; skip?: number; seccion?: string }) {
    const response = await axiosClient.get(`${BASE_URL}/historial/${empresaId}`, { params });
    return response.data;
  },
};
