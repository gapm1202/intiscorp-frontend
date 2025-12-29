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
    params.append('pageSize', pageSize.toString());

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

    const response = await axiosClient.get(`/api/tickets?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    throw error;
  }
}

export async function getTicketById(id: number): Promise<Ticket> {
  try {
    const response = await axiosClient.get(`/api/tickets/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener ticket:', error);
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

export async function asignarTecnico(ticketId: number, tecnicoId: number): Promise<Ticket> {
  try {
    const response = await axiosClient.patch(`/api/tickets/${ticketId}/asignar`, { tecnicoId });
    return response.data;
  } catch (error) {
    console.error('Error al asignar técnico:', error);
    throw error;
  }
}

export async function cambiarEstado(ticketId: number, estado: string, comentario?: string): Promise<Ticket> {
  try {
    const response = await axiosClient.patch(`/api/tickets/${ticketId}/estado`, { estado, comentario });
    return response.data;
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    throw error;
  }
}
