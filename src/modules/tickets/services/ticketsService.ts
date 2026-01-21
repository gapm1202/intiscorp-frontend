import axiosClient from "@/api/axiosClient";
import type { Ticket, TicketFilter, TicketListResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

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
    const response = await axiosClient.post('/api/tickets', ticket);
    return response.data;
  } catch (error) {
    console.error('Error al crear ticket:', error);
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
export async function cambiarEstado(ticketId: number, nuevoEstado: string, motivo?: string): Promise<Ticket> {
  try {
    const response = await axiosClient.put(`/api/tickets/gestion/${ticketId}/estado`, { 
      nuevo_estado: nuevoEstado,
      motivo 
    });
    return response.data;
  } catch (error) {
    console.error('Error al cambiar estado:', error);
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
