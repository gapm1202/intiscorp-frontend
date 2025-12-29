// Types para el módulo de Tickets

export type EstadoTicket = 'ABIERTO' | 'EN_PROCESO' | 'PAUSADO' | 'RESUELTO' | 'CERRADO' | 'CANCELADO';
export type PrioridadTicket = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type EstadoSLA = 'EN_TIEMPO' | 'PROXIMO_VENCER' | 'VENCIDO' | 'NO_APLICA';

export interface Ticket {
  ticket_id: number;
  ticket_codigo: string;
  empresa_id: number;
  empresa_nombre: string;
  sede_id: number;
  sede_nombre: string;
  usuario_reporta_id: number;
  usuario_reporta_nombre: string;
  titulo: string;
  descripcion: string;
  tipo_ticket: string;
  categoria_id?: number;
  categoria_nombre?: string;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  tecnico_asignado_id?: number;
  tecnico_asignado_nombre?: string;
  activo_codigo?: string;
  ubicacion?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_resolucion?: string;
  sla_vencimiento?: string;
  estado_sla: EstadoSLA;
  tiempo_respuesta_horas?: number;
  tiempo_resolucion_horas?: number;
}

export interface TicketFilter {
  busqueda?: string;
  empresa_id?: number;
  sede_id?: number;
  estado?: EstadoTicket;
  prioridad?: PrioridadTicket;
  tipo_ticket?: string;
  categoria_id?: number;
  estado_sla?: EstadoSLA;
  tecnico_asignado_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}
