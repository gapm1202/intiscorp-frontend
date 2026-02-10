// Types para el módulo de Tickets

export type EstadoTicket = 'ESPERA' | 'EN_TRIAGE' | 'ABIERTO' | 'EN_PROCESO' | 'PAUSADO' | 'PENDIENTE_CLIENTE' | 'RESUELTO' | 'CERRADO' | 'CANCELADO';
export type PrioridadTicket = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type ImpactoTicket = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
export type UrgenciaTicket = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type ModalidadTicket = 'PRESENCIAL' | 'REMOTO' | 'HIBRIDO';
export type EstadoSLA = 'EN_TIEMPO' | 'PROXIMO_VENCER' | 'VENCIDO' | 'NO_APLICA';

export interface Ticket {
  id: number;
  codigo_ticket: string;  // TCK-OBR-2026-000001
  empresa_id: number;
  empresa_nombre: string;
  sede_id: number;
  sede_nombre: string;
  titulo: string;
  asunto?: string;  // Alias de titulo
  descripcion: string;
  tipo_ticket: string;
  tipo_soporte?: 'activos' | 'gestion-ti';
  categoria_id?: number;
  categoria_nombre?: string;
  subcategoria_id?: number;
  subcategoria_nombre?: string;
  servicio_id?: number;
  servicio_nombre?: string;
  tipo_servicio?: string;
  modalidad?: ModalidadTicket;
  modalidad_servicio?: string;
  prioridad: PrioridadTicket;
  prioridad_calculada?: string;
  impacto?: ImpactoTicket;
  urgencia?: UrgenciaTicket;
  estado: EstadoTicket;
  tecnico_asignado?: {
    id: number;
    nombre: string;
    email?: string;
  };
  creado_por?: {
    id: number;
    nombre: string;
  };
  configurado_por?: {
    id: number;
    nombre: string;
  };
  configurado_at?: string;
  // Activos y usuarios relacionados
  activos_codigos?: string[];
  activos?: Array<{
    codigo: string;
    nombre: string;
  }>;
  usuarios_reporta?: Array<{
    id: string;
    nombre: string;
    email?: string;
  }>;
  usuario_dni?: string;
  usuario_dni_data?: {
    nombre: string;
    email?: string;
  };
  // Adjuntos
  adjuntos?: string[];
  // Fechas
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_inicio_atencion?: string;  // Cuando pasa a EN_PROCESO
  fecha_resolucion?: string;
  fecha_cierre?: string;
  fecha_limite_sla?: string;
  // SLA
  aplica_sla: boolean;  // Indica si el ticket tiene SLA activo
  tiempo_transcurrido_minutos?: number;
  tiempo_restante_minutos?: number;
  tiempo_total_sla_minutos?: number;
  estado_sla: EstadoSLA;
  origen: 'INTERNO' | 'PORTAL_CLIENTE' | 'PORTAL_PUBLICO' | 'QR' | 'EMAIL' | 'TELEFONO';
  // SLA additional fields from backend
  porcentaje_tiempo_respuesta?: number;
  porcentaje_tiempo_resolucion?: number;
  pausado?: boolean;
  fecha_limite_respuesta?: string;
  fecha_limite_resolucion?: string;
  tecnico_asignado_id?: number | null;
  sla_alertas?: number[];
  // SLA - Sistema de Fases (Respuesta y Resolución)
  fase_sla_actual?: 'RESPUESTA' | 'RESOLUCION' | 'COMPLETADO' | 'SIN_SLA';
  tiempo_respuesta_transcurrido_minutos?: number;
  tiempo_resolucion_transcurrido_minutos?: number;
  tiempo_respuesta_minutos?: number;
  tiempo_resolucion_minutos?: number;
  tiempo_respuesta_restante_minutos?: number;
  tiempo_resolucion_restante_minutos?: number;
}

export interface TicketFilter {
  busqueda?: string;
  empresaId?: number;
  sedeId?: number;
  estado?: EstadoTicket;
  prioridad?: PrioridadTicket;
  tipoTicket?: string;
  categoriaId?: number;
  estadoSLA?: EstadoSLA;
  tecnicoId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
}
