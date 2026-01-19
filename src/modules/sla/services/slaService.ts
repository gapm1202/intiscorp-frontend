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
      // Normalizar datos según la sección para cumplir con estructura mínima del backend
      let normalizedData = data;
      
      if (seccion === 'incidentes' || seccion === 'gestionIncidentes' || seccion === 'gestion_incidentes') {
        // Asegurar estructura mínima para Gestión de Incidentes
        normalizedData = {
          tipos: [],
          ...(typeof data === 'object' && data !== null ? data : {})
        };
      }
      
      const payload = {
        seccion,
        data: normalizedData,
        ...(motivo ? { motivo } : {}),
      };
      
      console.log('[slaService] 📤 Enviando a backend:', {
        empresaId,
        url: `${BASE_URL}/seccion/${empresaId}`,
        payload: JSON.stringify(payload, null, 2)
      });
      
      const response = await axiosClient.post(`${BASE_URL}/seccion/${empresaId}`, payload);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] guardarSeccion error:', {
        status: error?.response?.status,
        message: error?.response?.data?.message,
        data: error?.response?.data,
        fullError: error
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

// Función helper para obtener SLA por empresa
export async function getSLAByEmpresa(empresaId: number) {
  try {
    const response = await axiosClient.get(`${BASE_URL}/configuracion/${empresaId}`);
    return response.data;
  } catch (error: any) {
    console.error('[getSLAByEmpresa] error:', error?.response?.data || error?.message);
    return null;
  }
}
