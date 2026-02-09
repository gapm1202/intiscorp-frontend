import axiosClient from '../../../api/axiosClient';

const BASE_URL = '/api/sla';

// ==========================================
// TIPOS DE DATOS
// ==========================================

export interface AlcanceData {
  tiposTicket: string[];  // UUID[] - OBLIGATORIO
  servicios?: number[];
  categorias?: number[];
  sedes?: number[];
  aplica_todos_servicios: boolean;
  aplica_todas_categorias: boolean;
  aplica_todas_sedes: boolean;
  observaciones?: string;
}

export interface TiempoData {
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  tiempo_respuesta_minutos: number;
  tiempo_resolucion_minutos: number;
  escalamiento: boolean;
  tiempo_escalamiento_minutos?: number;  // Requerido si escalamiento = true
}

export interface TiemposData {
  tiempos: TiempoData[];
}

export interface HorarioData {
  day_of_week: number;  // 0-6 (0 = Domingo, 6 = Sábado)
  atiende: boolean;
  hora_inicio?: string;  // 'HH:MM:SS' - requerido si atiende = true
  hora_fin?: string;     // 'HH:MM:SS' - requerido si atiende = true
  es_feriado: boolean;
}

export interface HorariosData {
  horarios: HorarioData[];
}

export interface ResumenSLA {
  configurado: boolean;
  activo: boolean;
  nombre: string;
  alcance_configurado: boolean;
  tiempos_configurados: number;
  horarios_configurados: number;
}

// ==========================================
// SERVICIO SLA
// ==========================================

export const slaService = {
  // ========== ALCANCE ==========
  async getAlcance(empresaId: string): Promise<AlcanceData | null> {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${empresaId}/alcance`);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] getAlcance error:', error?.response?.data || error?.message);
      return null;
    }
  },

  async guardarAlcance(empresaId: string, data: AlcanceData) {
    try {
      console.log('[slaService] 📤 Guardando alcance:', { empresaId, data });
      const response = await axiosClient.post(`${BASE_URL}/${empresaId}/alcance`, data);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] guardarAlcance error:', error?.response?.data || error?.message);
      throw error;
    }
  },

  // ========== TIEMPOS ==========
  async getTiempos(empresaId: string): Promise<TiemposData | null> {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${empresaId}/tiempos`);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] getTiempos error:', error?.response?.data || error?.message);
      return null;
    }
  },

  async guardarTiempos(empresaId: string, data: TiemposData) {
    try {
      console.log('[slaService] 📤 Guardando tiempos:', { empresaId, data });
      const response = await axiosClient.post(`${BASE_URL}/${empresaId}/tiempos`, data);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] guardarTiempos error:', error?.response?.data || error?.message);
      throw error;
    }
  },

  // ========== HORARIOS ==========
  async getHorarios(empresaId: string): Promise<HorariosData | null> {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${empresaId}/horarios`);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] getHorarios error:', error?.response?.data || error?.message);
      return null;
    }
  },

  async guardarHorarios(empresaId: string, data: HorariosData) {
    try {
      console.log('[slaService] 📤 Guardando horarios:', { empresaId, data });
      const response = await axiosClient.post(`${BASE_URL}/${empresaId}/horarios`, data);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] guardarHorarios error:', error?.response?.data || error?.message);
      throw error;
    }
  },

  // ========== RESUMEN ==========
  async getResumen(empresaId: string): Promise<ResumenSLA | null> {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${empresaId}/resumen`);
      return response.data;
    } catch (error: any) {
      console.error('[slaService] getResumen error:', error?.response?.data || error?.message);
      return null;
    }
  },

  // ========== ACTIVAR/DESACTIVAR ==========
  async toggleActivo(empresaId: string, activo: boolean) {
    try {
      console.log('[slaService] 🔄 Toggle SLA:', { empresaId, activo });
      const response = await axiosClient.patch(`${BASE_URL}/${empresaId}/toggle`, { activo });
      return response.data;
    } catch (error: any) {
      console.error('[slaService] toggleActivo error:', error?.response?.data || error?.message);
      throw error;
    }
  },

  // ========== HISTORIAL (si sigue siendo compatible) ==========
  async getHistorial(empresaId: string, params?: { limit?: number; skip?: number; seccion?: string }) {
    try {
      const response = await axiosClient.get(`${BASE_URL}/historial/${empresaId}`, { params });
      return response.data;
    } catch (error: any) {
      console.error('[slaService] getHistorial error:', error?.response?.data || error?.message);
      return [];
    }
  },

  // ========== MÉTODOS LEGACY (deprecados - mantener temporalmente para compatibilidad) ==========
  
  /** @deprecated Usar getResumen() en su lugar */
  async getConfiguracion(empresaId: string) {
    console.warn('[slaService] ⚠️ getConfiguracion está deprecado. Usar getResumen(), getAlcance(), getTiempos() o getHorarios()');
    return this.getResumen(empresaId);
  },

  /** @deprecated Los formularios ahora se guardan en endpoints independientes */
  async guardarSeccion(empresaId: string, seccion: string, data: unknown, motivo?: string) {
    console.warn('[slaService] ⚠️ guardarSeccion está deprecado. Usar guardarAlcance(), guardarTiempos() o guardarHorarios()');
    
    // Intentar mapear a nuevo sistema
    if (seccion === 'alcance') {
      return this.guardarAlcance(empresaId, data as AlcanceData);
    } else if (seccion === 'tiempos') {
      return this.guardarTiempos(empresaId, data as TiemposData);
    } else if (seccion === 'horarios') {
      return this.guardarHorarios(empresaId, data as HorariosData);
    }
    
    throw new Error(`Sección "${seccion}" no soportada en nuevo sistema`);
  },

  /** @deprecated Ya no hay endpoint de limpieza general */
  async limpiarSeccion(empresaId: string, seccion: string) {
    console.warn('[slaService] ⚠️ limpiarSeccion está deprecado. Eliminar datos manualmente o usar endpoints específicos');
    throw new Error('Método no soportado en nuevo sistema');
  },

  /** @deprecated Ya no hay endpoint de limpieza general */
  async limpiarSecciones(empresaId: string, secciones: string[]) {
    console.warn('[slaService] ⚠️ limpiarSecciones está deprecado');
    throw new Error('Método no soportado en nuevo sistema');
  },
};

// ==========================================
// FUNCIONES HELPER
// ==========================================

/** @deprecated Usar slaService.getResumen() */
export async function getSLAByEmpresa(empresaId: number) {
  console.warn('[getSLAByEmpresa] ⚠️ Función deprecada. Usar slaService.getResumen()');
  return slaService.getResumen(String(empresaId));
}

