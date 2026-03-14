import axiosClient from "@/api/axiosClient";
import type { Ticket, TicketFilter, TicketListResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function getTickets(
  filters: TicketFilter,
  page: number = 1,
  pageSize: number = 20
): Promise<TicketListResponse> {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', pageSize.toString());

    if (filters.empresaId) params.append('empresaId', filters.empresaId.toString());
    if (filters.sedeId) params.append('sedeId', filters.sedeId.toString());
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.prioridad) params.append('prioridad', filters.prioridad);
    if (filters.tipoTicket) params.append('tipoTicket', filters.tipoTicket);
    if (filters.categoriaId) params.append('categoriaId', filters.categoriaId.toString());
    if (filters.estadoSLA) params.append('estadoSLA', filters.estadoSLA);
    if (filters.tecnicoId) params.append('tecnicoId', filters.tecnicoId.toString());
    if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
    if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
    if (filters.busqueda) params.append('busqueda', filters.busqueda);

    // Intentar primero el nuevo endpoint de gestión
    console.log('🔍 Consultando tickets:', `/api/tickets/gestion/lista?${params.toString()}`);
    
    try {
      const response = await axiosClient.get(`/api/tickets/gestion/lista?${params.toString()}`);
      console.log('✅ Respuesta exitosa del nuevo endpoint:', response.data);
      
      return {
        tickets: response.data.data?.tickets || [],
        total: response.data.data?.pagination?.total || 0
      };
    } catch (gestionError: any) {
      // Si el nuevo endpoint falla, intentar con el endpoint antiguo
      console.warn('⚠️ Endpoint /gestion/lista falló, intentando endpoint antiguo...');
      console.error('📋 Error del endpoint nuevo:', {
        status: gestionError.response?.status,
        message: gestionError.response?.data?.message,
        error: gestionError.response?.data?.error,
        fullData: gestionError.response?.data
      });
      
      // Construir params desde cero para el endpoint antiguo
      const oldParams = new URLSearchParams();
      oldParams.append('page', page.toString());
      oldParams.append('pageSize', pageSize.toString());
      
      if (filters.empresaId) oldParams.append('empresa_id', filters.empresaId.toString());
      if (filters.sedeId) oldParams.append('sede_id', filters.sedeId.toString());
      if (filters.estado) oldParams.append('estado', filters.estado);
      if (filters.prioridad) oldParams.append('prioridad', filters.prioridad);
      if (filters.tipoTicket) oldParams.append('tipo_ticket', filters.tipoTicket);
      
      console.log('🔄 Intentando endpoint antiguo:', `/api/tickets?${oldParams.toString()}`);
      
      try {
        const fallbackResponse = await axiosClient.get(`/api/tickets?${oldParams.toString()}`);
        console.log('✅ Respuesta del endpoint antiguo:', fallbackResponse.data);
        
        return {
          tickets: fallbackResponse.data.tickets || fallbackResponse.data.data || [],
          total: fallbackResponse.data.total || fallbackResponse.data.pagination?.total || 0
        };
      } catch (fallbackError: any) {
        console.error('❌ Endpoint antiguo también falló:', fallbackError.response?.data);
        // Si ambos endpoints fallan, retornar array vacío en lugar de error
        return {
          tickets: [],
          total: 0
        };
      }
    }
  } catch (error: any) {
    console.error('❌ Error general al obtener tickets:', error);
    // Retornar array vacío en lugar de lanzar error
    return {
      tickets: [],
      total: 0
    };
  }
}

export async function getTicketById(id: number): Promise<Ticket> {
  try {
    console.log(`🔍 Obteniendo detalle del ticket ID: ${id}`);
    console.log(`📡 Endpoint: /api/tickets/gestion/${id}/detalle`);
    
    // Intentar primero el nuevo endpoint de gestión
    try {
      const response = await axiosClient.get(`/api/tickets/gestion/${id}/detalle`);
      
      console.log('📦 Respuesta completa del backend:', response);
      console.log('📋 Estructura de data:', response.data);
      
      // Intentar extraer el ticket de diferentes estructuras posibles
      let ticket = null;
      
      if (response.data.data?.ticket) {
        ticket = response.data.data.ticket;
        console.log('✅ Ticket extraído de response.data.data.ticket');
      } else if (response.data.data) {
        ticket = response.data.data;
        console.log('✅ Ticket extraído de response.data.data');
      } else if (response.data.ticket) {
        ticket = response.data.ticket;
        console.log('✅ Ticket extraído de response.data.ticket');
      } else if (response.data) {
        ticket = response.data;
        console.log('✅ Ticket extraído de response.data');
      }
      
      if (!ticket) {
        console.error('❌ No se pudo extraer el ticket de la respuesta');
        throw new Error('Estructura de respuesta inesperada');
      }
      
      console.log('📋 Ticket final:', ticket);
      return ticket;
    } catch (gestionError: any) {
      // Si el nuevo endpoint falla, intentar con el endpoint antiguo
      console.warn('⚠️ Endpoint /gestion/:id/detalle falló, intentando endpoint antiguo /api/tickets/:id');
      console.error('📋 Error del endpoint nuevo:', {
        status: gestionError.response?.status,
        message: gestionError.response?.data?.message,
        error: gestionError.response?.data?.error
      });
      
      // Intentar endpoint antiguo
      const fallbackResponse = await axiosClient.get(`/api/tickets/${id}`);
      console.log('✅ Respuesta del endpoint antiguo:', fallbackResponse.data);
      
      return fallbackResponse.data.ticket || fallbackResponse.data.data || fallbackResponse.data;
    }
  } catch (error: any) {
    console.error('❌ Error al obtener ticket (ambos endpoints fallaron):', error);
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Mensaje:', error.response?.data?.message);
    console.error('📋 Error completo:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Error al obtener ticket');
  }
}

// Obtener ticket por código (seguimiento público)
export async function getTicketByCodigo(codigo: string): Promise<Ticket | null> {
  try {
    const response = await axiosClient.get(`/api/tickets?codigo=${encodeURIComponent(codigo)}`);
    // Backend returns: { success: true, data: [ { ...ticket } ] }
    const ticket = response.data?.data && Array.isArray(response.data.data) ? response.data.data[0] : null;
    return ticket || null;
  } catch (error) {
    console.error('Error al obtener ticket por código:', error);
    throw error;
  }
}

export async function createTicket(ticket: Partial<Ticket>): Promise<Ticket> {
  try {
    console.log('[ticketsService] 📤 Creando ticket - payload:', ticket);

    // Sanitize payload: remove undefined fields
    const sanitized: Record<string, any> = {};
    Object.keys(ticket || {}).forEach((k) => {
      const v: any = (ticket as any)[k];
      if (v === undefined) return;
      sanitized[k] = v;
    });

    console.log('[ticketsService] sanitized payload before send:', sanitized);

    // If there are File attachments, send as multipart/form-data
    if (Array.isArray(sanitized.archivos) && sanitized.archivos.length > 0) {
      const form = new FormData();
      // Append files
      (sanitized.archivos as any[]).forEach((f, i) => {
        if (f instanceof File) form.append('archivos', f);
        else if (typeof f === 'string') form.append('archivos', f);
      });
      // Append other fields as strings
      Object.keys(sanitized).forEach((k) => {
        if (k === 'archivos') return;
        const val = sanitized[k];
        if (val === null) return;
        if (Array.isArray(val)) {
          // append arrays as repeated fields
          val.forEach((item) => form.append(`${k}[]`, typeof item === 'object' ? JSON.stringify(item) : String(item)));
        } else if (typeof val === 'object') {
          form.append(k, JSON.stringify(val));
        } else {
          form.append(k, String(val));
        }
      });

      // Log FormData entries for debugging
      try {
        console.log('[ticketsService] FormData entries:');
        for (const pair of (form as any).entries()) {
          console.log(' -', pair[0], pair[1]);
        }
      } catch (e) {
        console.warn('[ticketsService] No se pudo enumerar FormData entries', e);
      }

      console.log('[ticketsService] Enviando multipart/form-data con archivos');
      const response = await axiosClient.post('/api/tickets', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('[ticketsService] ✅ Ticket creado (multipart), respuesta:', response.data);
      return response.data;
    }

    // Otherwise send JSON
    console.log('[ticketsService] enviando JSON payload prioridad:', sanitized.prioridad, 'typeof:', typeof sanitized.prioridad);
    const response = await axiosClient.post('/api/tickets', sanitized);
    console.log('[ticketsService] ✅ Ticket creado, respuesta:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al crear ticket:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      config: error?.config && { url: error.config.url, method: error.config.method, data: error.config.data }
    });
    throw error;
  }
}

export async function updateTicket(id: number, data: Partial<Ticket>): Promise<Ticket> {
  try {
    const response = await axiosClient.patch(`/api/tickets/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
    throw error;
  }
}

// Asignar técnico usando el nuevo endpoint de gestión
export async function asignarTecnico(ticketId: number, tecnicoId: number, motivo?: string): Promise<Ticket> {
  try {
    const response = await axiosClient.put(`/api/tickets/gestion/${ticketId}/asignar`, { 
      tecnico_id: tecnicoId,
      motivo 
    });
    return response.data;
  } catch (error) {
    console.error('Error al asignar técnico:', error);
    throw error;
  }
}

// Coger ticket (auto-asignación)
export async function cogerTicket(ticketId: number): Promise<Ticket> {
  try {
    const response = await axiosClient.put(`/api/tickets/gestion/${ticketId}/coger`);
    return response.data;
  } catch (error) {
    console.error('Error al coger ticket:', error);
    throw error;
  }
}

// Cambiar estado usando el endpoint de gestión
export async function cambiarEstado(
  ticketId: number,
  nuevoEstado: string,
  motivo?: string | { motivo?: string; diagnostico?: string; resolucion?: string; recomendacion?: string }
): Promise<Ticket> {
  try {
    const body: Record<string, any> = { nuevo_estado: nuevoEstado };

    if (typeof motivo === 'string') {
      body.motivo = motivo;
    } else if (motivo && typeof motivo === 'object') {
      if (motivo.motivo) body.motivo = motivo.motivo;
      if (motivo.diagnostico) body.diagnostico = motivo.diagnostico;
      if (motivo.resolucion) body.resolucion = motivo.resolucion;
      if (motivo.recomendacion) body.recomendacion = motivo.recomendacion;
    }

    // Soporte opcional para enviar kb_entry_id cuando viene en el payload
    if (motivo && typeof motivo === 'object' && (motivo as any).kb_entry_id) {
      body.kb_entry_id = (motivo as any).kb_entry_id;
    }

    const response = await axiosClient.put(`/api/tickets/gestion/${ticketId}/estado`, body);
    return response.data;
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    throw error;
  }
}

// Cambiar estado pero permitiendo enviar imágenes de cierre mediante multipart/form-data
export async function cambiarEstadoConImagenes(
  ticketId: number,
  nuevoEstado: string,
  motivoObj?: Record<string, any>,
  images?: File[]
): Promise<Ticket> {
  try {
    const form = new FormData();
    form.append('nuevo_estado', nuevoEstado);

    if (motivoObj) {
      if (motivoObj.motivo) form.append('motivo', motivoObj.motivo);
      if (motivoObj.diagnostico) form.append('diagnostico', motivoObj.diagnostico);
      if (motivoObj.resolucion) form.append('resolucion', motivoObj.resolucion);
      if (motivoObj.recomendacion) form.append('recomendacion', motivoObj.recomendacion);
      if (motivoObj.kb_entry_id) form.append('kb_entry_id', String(motivoObj.kb_entry_id));
    }

    if (images && images.length > 0) {
      images.forEach((f) => {
        // Enviar como 'imagenes' (sin corchetes) para que multer reciba los files correctamente
        form.append('imagenes', f, f.name);
      });
    }

    // DEBUG: Enumerar FormData entries para depuración local
    try {
      console.log('[ticketsService] cambiarEstadoConImagenes - FormData entries:');
      for (const pair of (form as any).entries()) {
        console.log(' -', pair[0], pair[1]);
      }
    } catch (e) {
      console.warn('[ticketsService] No se pudo enumerar FormData entries', e);
    }

    // Let axios/browser set the Content-Type with correct boundary
    const response = await axiosClient.put(`/api/tickets/gestion/${ticketId}/estado`, form, {
      headers: { 'Content-Type': undefined as any }
    });
    return response.data;
  } catch (error) {
    console.error('Error al cambiar estado con imágenes:', error);
    throw error;
  }
}

// Pausar SLA
export async function pausarSLA(ticketId: number, motivo: string): Promise<Ticket> {
  try {
    const response = await axiosClient.post(`/api/tickets/gestion/${ticketId}/sla/pausar`, { motivo });
    return response.data;
  } catch (error) {
    console.error('Error al pausar SLA:', error);
    throw error;
  }
}

// Reanudar SLA
export async function reanudarSLA(ticketId: number, observacion?: string): Promise<Ticket> {
  try {
    const response = await axiosClient.post(`/api/tickets/gestion/${ticketId}/sla/reanudar`, { observacion });
    return response.data;
  } catch (error) {
    console.error('Error al reanudar SLA:', error);
    throw error;
  }
}

// Obtener historial
export async function getHistorial(ticketId: number, tipoEvento?: string): Promise<any[]> {
  try {
    const params = tipoEvento ? `?tipo_evento=${tipoEvento}` : '';
    const response = await axiosClient.get(`/api/tickets/gestion/${ticketId}/historial${params}`);
    return response.data.data?.historial || [];
  } catch (error) {
    console.error('Error al obtener historial:', error);
    throw error;
  }
}

// Obtener lista de técnicos
export async function getTecnicos(disponible?: boolean, especialidad?: string): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (disponible !== undefined) params.append('disponible', String(disponible));
    if (especialidad) params.append('especialidad', especialidad);
    
    const queryString = params.toString();
    const response = await axiosClient.get(`/api/usuarios-internos/tecnicos/lista${queryString ? '?' + queryString : ''}`);
    return response.data.data?.tecnicos || [];
  } catch (error) {
    console.error('Error al obtener técnicos:', error);
    throw error;
  }
}

// Editar ticket (con registro de cambios)
export async function editarTicket(ticketId: number, cambios: Record<string, { valorAnterior: any; valorNuevo: any }>, motivo: string): Promise<Ticket> {
  try {
    const response = await axiosClient.put(`/api/tickets/gestion/${ticketId}/editar`, { 
      cambios,
      motivo 
    });
    return response.data;
  } catch (error) {
    console.error('Error al editar ticket:', error);
    throw error;
  }
}

// Configurar ticket público: completar campos NULL provenientes del portal
export async function configurarTicket(ticketId: number, data: Partial<Ticket>): Promise<Ticket> {
  try {
    const response = await axiosClient.put(`/api/tickets/gestion/${ticketId}/configurar`, data);
    return response.data;
  } catch (error) {
    console.error('Error al configurar ticket:', error);
    throw error;
  }
}

// Mensajes del ticket (chat)
export async function getMensajes(ticketId: number): Promise<Array<any>> {
  try {
    const response = await axiosClient.get(`/api/tickets/${ticketId}/mensajes`);
    // Expect array of mensajes in response.data.data or response.data
    const msgs = response.data?.data || response.data || [];
    return Array.isArray(msgs) ? msgs : [];
  } catch (error) {
    console.error('Error al obtener mensajes del ticket:', error);
    throw error;
  }
}

// Obtener imágenes de cierre desde endpoint dedicado (fallback si no vienen en el detalle)
// NOTE: El backend incluye `imagenes_cierre` dentro del objeto `ticket` retornado
// por el endpoint de detalle. No existe un endpoint GET dedicado; por eso
// eliminamos la función que intentaba múltiples rutas y evitamos requests adicionales.

export async function postMensaje(ticketId: number, payload: { mensaje: string }): Promise<any> {
  try {
    const response = await axiosClient.post(`/api/tickets/${ticketId}/mensajes`, payload);
    return response.data;
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    throw error;
  }
}

// Enviar mensaje desde portal (cliente) - no requiere auth
export async function postMensajePortal(ticketId: number, payload: { mensaje: string }): Promise<any> {
  try {
    const response = await axiosClient.post(`/api/portal/tickets/${ticketId}/mensajes`, payload);
    return response.data;
  } catch (error) {
    console.error('Error al enviar mensaje desde portal:', error);
    throw error;
  }
}
