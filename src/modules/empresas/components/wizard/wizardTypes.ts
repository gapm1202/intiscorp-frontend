// Shared types for the Empresa Creation Wizard

export interface EmpresaGeneralData {
  nombre: string;
  ruc: string;
  codigoCliente: string;
  direccionFiscal: string; // nombre comercial
  direccionOperativa: string;
  ciudad: string;
  provincia: string;
  sector: string;
  paginaWeb: string;
  observacionesGenerales: string;
}

export interface SedeData {
  _id?: string;
  id?: string;
  nombre: string;
  codigoInterno: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  email: string;
  tipo: string;
  horarioAtencion: string;
  observaciones: string;
  activo?: boolean;
}

export interface UsuarioData {
  _id?: string;
  id?: string;
  empresaId: string;
  sedeId: string;
  sedeNombre?: string;
  nombreCompleto: string;
  correo: string;
  cargo: string;
  telefono: string;
  observaciones: string;
  tipoDocumento: string;
  numeroDocumento: string;
  areaId: string;
}

export interface ContactoAdminConfig {
  usuarioId: string;
  nombreCompleto: string;
  autorizacionFacturacion: boolean;
}

export interface ContactoTecnicoConfig {
  usuarioId: string;
  nombreCompleto: string;
  horarioDisponible: string;
  contactoPrincipal: boolean;
  autorizaCambiosCriticos: boolean;
  supervisionCoordinacion: boolean;
  nivelAutorizacion: string;
}

export interface ResponsableSedeConfig {
  usuarioId: string;
  nombreCompleto: string;
  sedeId: string;
  sedeNombre: string;
  autorizaIngresoTecnico: boolean;
  autorizaMantenimientoFueraHorario: boolean;
  supervisionCoordinacion: boolean;
}

export interface WizardData {
  general: EmpresaGeneralData;
  sedes: SedeData[];
  usuarios: UsuarioData[];
  contactosAdmin: ContactoAdminConfig[];
  contactosTecnicos: ContactoTecnicoConfig[];
  responsablesSede: ResponsableSedeConfig[];
  contrasenaPortalSoporte: string;
}
