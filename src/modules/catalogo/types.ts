export type TicketType = "incidente" | "solicitud" | string;

export interface CatalogCategory {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoTicket: TicketType;
  activo: boolean;
  visibleEnTickets: boolean;
  createdAt?: string;
}

export interface CatalogSubcategory {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoTicket: TicketType;
  requiereValidacion: boolean;
  activo: boolean;
  categoriaId: string;
  heredaTipo?: boolean;
  createdAt?: string;
}

export interface CatalogFilters {
  estado: "todos" | "activos" | "inactivos";
  tipo: "todos" | TicketType;
  categoriaId: "todas" | string;
}
