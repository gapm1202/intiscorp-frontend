export interface UsuarioInterno {
  id: number;
  nombreCompleto: string;
  correoPrincipal: string;
  correoPrincipalConfig?: {
    descripcionUso?: string;
    plataformaId?: number;
    plataformaNombre?: string;
    tipoCorreoId?: number;
    tipoCorreoNombre?: string;
    protocoloId?: number;
    protocoloNombre?: string;
    tipoLicenciaId?: number;
    tipoLicenciaNombre?: string;
  };
  correosAdicionales?: CorreoAdicional[];
  telefonos?: TelefonoUsuario[];
  rol: 'administrador' | 'tecnico' | 'cliente';
  usuario: string;
  forzarCambioPassword: boolean;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
  creadoPor?: string;
  creadoPorNombre?: string;
}

export interface CorreoAdicional {
  id?: number;
  correo: string;
  descripcion?: string;
  plataformaId?: number;
  plataformaNombre?: string;
  tipoCorreoId?: number;
  tipoCorreoNombre?: string;
  protocoloId?: number;
  protocoloNombre?: string;
  tipoLicenciaId?: number;
  tipoLicenciaNombre?: string;
  esPrincipal: boolean;
  activo: boolean;
}

export interface TelefonoUsuario {
  id?: number;
  numero: string;
  tipo: 'movil' | 'fijo' | 'whatsapp' | 'emergencia' | 'otro';
  tipoOtro?: string;
  descripcion?: string;
  esPrincipal: boolean;
  activo: boolean;
}

export interface CrearUsuarioInternoData {
  nombreCompleto: string;  nombre?: string; // Temporal: para compatibilidad con backend  correoPrincipal: string;
  correoPrincipalConfig?: {
    descripcionUso?: string;
    plataformaId?: number;
    tipoCorreoId?: number;
    protocoloId?: number;
    tipoLicenciaId?: number;
  };
  correosAdicionales?: CorreoAdicional[];
  telefonos?: TelefonoUsuario[];
  rol: 'administrador' | 'tecnico' | 'cliente';
  usuario: string;
  contrasena: string;
  forzarCambioPassword: boolean;
  activo: boolean;
}

export interface ActualizarUsuarioInternoData {
  nombreCompleto?: string;
  rol?: 'administrador' | 'tecnico' | 'cliente';
  activo?: boolean;
  motivoCambio: string;
}

export interface HistorialUsuarioInterno {
  id: number;
  usuarioInternoId: number;
  tipoEvento: 'creacion' | 'edicion' | 'cambio_rol' | 'restablecer_password' | 
               'activacion' | 'desactivacion' | 'cambio_correo_principal' | 
               'cambio_telefono_principal' | 'agregar_correo' | 'eliminar_correo' |
               'agregar_telefono' | 'eliminar_telefono';
  campoModificado?: string;
  valorAnterior?: string;
  valorNuevo?: string;
  motivoCambio?: string;
  realizadoPor: number;
  realizadoPorNombre: string;
  fecha: string;
}

export interface RestablecerPasswordData {
  nuevaPassword: string;
  motivoCambio: string;
}
