// Interfaces para categorias
export interface CatalogCategory {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  visibleEnTickets: boolean;
  createdAt?: string;
}

export interface CatalogSubcategory {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  requiereValidacion: boolean;
  activo: boolean;
  categoriaId: string;
  createdAt?: string;
}

export interface CatalogFilters {
  estado: "todos" | "activos" | "inactivos";
  categoriaId: "todas" | string;
}

// Tipos e interfaces para servicios
export type TipoServicio = string;

export interface CatalogServicio {
  _id?: string;
  id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoServicio: TipoServicio;
  activo: boolean;
  visibleEnTickets: boolean;
  creadoPor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServicioStats {
  total: number;
  activos: number;
  inactivos: number;
  visiblesEnTickets: number;
}

export interface ServicioFilters {
  estado: "todos" | "activos" | "inactivos";
  tipoServicio: "todos" | TipoServicio;
  visibleEnTickets: "todos" | "si" | "no";
  busqueda: string;
}
