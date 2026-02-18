export type EstadoVisita = "PENDIENTE_PROGRAMACION" | "PROGRAMADA" | "EN_PROCESO" | "FINALIZADA" | "CANCELADA";

export type TipoVisita = "PROGRAMADA" | "POR_TICKET" | "PREVENTIVO";

export interface TecnicoAsignado {
  tecnicoId: string;
  tecnicoNombre: string;
  esEncargado: boolean;
}

export interface Visita {
  _id: string;
  empresaId: string;
  empresaNombre?: string;
  sedeId: string;
  sedeNombre?: string;
  tipoVisita: TipoVisita;
  ticketId?: string;
  ticketNumero?: string;
  activoId?: string;
  activoNombre?: string;
  usuarioTicketId?: string;
  usuarioTicketNombre?: string;
  fechaProgramada: string;
  horaProgramada?: string;
  tecnicosAsignados: TecnicoAsignado[];
  observaciones?: string;
  estado: EstadoVisita;
  cuentaComoVisitaContractual?: boolean;
  fechaInicioReal?: string;
  fechaFinReal?: string;
  registroClausura?: {
    observacionesClausura?: string;
    cuentaComoVisita: boolean;
    fechaRegistro?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ResumenContractualVisitas {
  contratoId: string;
  visitaFrecuencia: string;
  cantidadVisitas: number;
  pendienteProgramacion: number;
  programadas: number;
  enCurso: number;
  finalizadas: number;
  canceladas: number;
  total: number;
}

export interface FiltrosVisitas {
  empresaId?: string;
  sedeId?: string;
  mes?: string;
  tecnicoEncargado?: string;
  estado?: EstadoVisita;
  tipoVisita?: TipoVisita;
}

export interface CrearVisitaPayload {
  empresaId: string;
  contratoId: string;
  sedeId: string;
  tipoVisita: TipoVisita;
  ticketId?: string;
  activoId?: string;
  fechaProgramada: string;
  mes: string;
  anio: string;
  tecnicosAsignados: TecnicoAsignado[];
  observaciones?: string;
}

export interface ActualizarVisitaPayload {
  tipoVisita?: TipoVisita;
  ticketId?: string;
  fechaProgramada?: string;
  tecnicosAsignados?: TecnicoAsignado[];
  observaciones?: string;
  estado?: EstadoVisita;
}

export interface FinalizarVisitaPayload {
  cuentaComoVisitaContractual: boolean;
  observacionesClausura?: string;
}
