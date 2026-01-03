export interface CatalogServicio {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoServicio: string;
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
