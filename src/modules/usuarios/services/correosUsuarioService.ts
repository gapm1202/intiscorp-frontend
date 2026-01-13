import axiosClient from '@/api/axiosClient';

export interface CorreoUsuario {
  id?: string;
  usuarioId: string;
  correoElectronico: string;
  plataformaId?: number;
  plataformaNombre?: string;
  tipoCorreoId?: number;
  tipoCorreoNombre?: string;
  protocoloId?: number;
  protocoloNombre?: string;
  estado: 'pendiente' | 'activo' | 'inactivo' | 'reasignado' | 'alias';
  observaciones?: string;
  esCorreoPrincipal: boolean;
  configuradoPor?: string;
  configuradoPorNombre?: string;
  fechaConfiguracion?: string;
  createdAt?: string;
  updatedAt?: string;
  // Para mostrar si permite reasignar
  permiteReasignar?: boolean;
  // Credenciales
  usuarioLogin?: string;
  contrasena?: string;
  // Campo del backend para saber si el usuario es el dueño actual del correo
  esDuenoActual?: boolean;
  // Campos para correos compartidos
  esCompartido?: boolean;
  propietarioId?: number;
  propietarioNombre?: string;
  soloLectura?: boolean;
  // Compatibilidad con diferentes formatos de backend
  correo?: string;
  password?: string;
  esPrincipal?: boolean;
}

export interface ConfigurarCorreoData {
  plataformaId: number;
  tipoCorreoId: number;
  protocoloId: number;
  estado: 'activo' | 'inactivo' | 'reasignado';
  observaciones?: string;
  usuarioLogin?: string;
  contrasena?: string;
}

export interface DesactivarCorreoData {
  motivoDesactivacion: string;
  observaciones?: string;
  ticketRelacionado?: string;
  fechaDesactivacion?: string;
}

export interface UsuarioActivo {
  id: number;
  nombre: string;
  correo: string;
  sede: string;
  cargo: string;
  area: string;
  telefono: string;
}

export interface UsuarioCompartido {
  id: number;
  usuarioId: number;
  nombre: string;
  correo: string;
  sede: string;
  cargo: string;
  area: string;
  telefono: string;
  fechaCompartido: string;
}

export interface CompartirCorreoData {
  usuariosIds: number[];
  motivo: string;
}

export interface HistorialCorreo {
  id: number;
  correoId: number;
  accion: string;
  fechaAccion: string;
  realizadoPor: string;
  realizadoPorNombre?: string;
  motivo?: string;
  datosAnteriores?: Record<string, any>;
  datosNuevos?: Record<string, any>;
  usuarioAfectadoId?: number;
  usuarioAfectadoNombre?: string;
}

export interface ReasignarCorreoData {
  nuevoUsuarioId: string;
  nombreBuzon: string;
  nuevoCorreoPrincipal: string;
  mantenerCorreoAnterior: boolean; // Usar el mismo nombre de correo del origen
  mantenerCopiaParaOrigen: boolean; // Crear copia/alias para el usuario origen
  tipoPase: 'principal' | 'secundario';
  motivoReasignacion: string;
  observaciones?: string;
  ticketRelacionado?: string;
}

export const correosUsuarioService = {
  // Obtener todos los correos de un usuario
  getCorreosByUsuario: async (empresaId: string, usuarioId: string): Promise<CorreoUsuario[]> => {
    const response = await axiosClient.get(`/api/empresas/${empresaId}/usuarios/${usuarioId}/correos`);
    return response.data;
  },

  // Obtener el correo principal del usuario
  getCorreoPrincipal: async (empresaId: string, usuarioId: string): Promise<CorreoUsuario | null> => {
    const response = await axiosClient.get(`/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/principal`);
    return response.data;
  },

  // Configurar el correo principal (primera vez o actualización)
  configurarCorreoPrincipal: async (
    empresaId: string, 
    usuarioId: string, 
    data: ConfigurarCorreoData
  ): Promise<CorreoUsuario> => {
    const response = await axiosClient.post(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/configurar-principal`,
      data
    );
    return response.data;
  },

  // Actualizar configuración de correo
  actualizarCorreo: async (
    empresaId: string,
    usuarioId: string,
    correoId: string,
    data: Partial<ConfigurarCorreoData> & { correo?: string; esPrincipal?: boolean; motivoEdicion?: string }
  ): Promise<CorreoUsuario> => {
    const response = await axiosClient.put(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/${correoId}`,
      data
    );
    return response.data;
  },

  // Agregar un correo adicional
  agregarCorreo: async (
    empresaId: string,
    usuarioId: string,
    correoElectronico: string,
    data: ConfigurarCorreoData & { esCorreoPrincipal?: boolean; origenAccion?: string; ticketRelacionado?: string }
  ): Promise<CorreoUsuario> => {
    const response = await axiosClient.post(
      `/api/correos-usuario`,
      {
        usuarioId: parseInt(usuarioId),
        correo: correoElectronico,
        esPrincipal: data.esCorreoPrincipal || false,
        password: data.contrasena || '',
        plataformaId: data.plataformaId,
        tipoCorreoId: data.tipoCorreoId,
        protocoloId: data.protocoloId,
        observaciones: data.observaciones || '',
        origenAccion: data.origenAccion || 'manual',
        ticketRelacionado: data.ticketRelacionado || null
      }
    );
    return response.data;
  },

  // Eliminar un correo (solo si no es principal)
  eliminarCorreo: async (
    empresaId: string,
    usuarioId: string,
    correoId: string
  ): Promise<void> => {
    await axiosClient.delete(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/${correoId}`
    );
  },

  // Desactivar un correo
  desactivarCorreo: async (
    empresaId: string,
    usuarioId: string,
    correoId: string,
    data: DesactivarCorreoData
  ): Promise<CorreoUsuario> => {
    const response = await axiosClient.post(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/${correoId}/desactivar`,
      data
    );
    return response.data;
  },

  // Obtener usuarios activos de la empresa
  getUsuariosActivos: async (empresaId: string): Promise<UsuarioActivo[]> => {
    const response = await axiosClient.get(
      `/api/empresas/${empresaId}/usuarios/activos`
    );
    return response.data;
  },

  // Obtener usuarios con los que está compartido el correo
  getCorreosCompartidos: async (
    empresaId: string,
    usuarioId: string,
    correoId: string
  ): Promise<UsuarioCompartido[]> => {
    const response = await axiosClient.get(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/${correoId}/compartidos`
    );
    return response.data;
  },

  // Compartir correo con usuarios
  compartirCorreo: async (
    empresaId: string,
    usuarioId: string,
    correoId: string,
    data: CompartirCorreoData
  ): Promise<void> => {
    await axiosClient.post(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/${correoId}/compartir`,
      data
    );
  },

  // Dejar de compartir correo
  descompartirCorreo: async (
    empresaId: string,
    usuarioId: string,
    correoId: string,
    data: CompartirCorreoData
  ): Promise<void> => {
    await axiosClient.delete(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/${correoId}/compartir`,
      { data }
    );
  },

  // Reasignar un correo
  reasignarCorreo: async (
    empresaId: string,
    usuarioId: string,
    correoId: string,
    data: ReasignarCorreoData
  ): Promise<CorreoUsuario> => {
    const response = await axiosClient.post(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/${correoId}/reasignar`,
      data
    );
    return response.data;
  },

  // Obtener historial de un correo
  getHistorialCorreo: async (
    empresaId: string,
    usuarioId: string,
    correoId: string
  ): Promise<HistorialCorreo[]> => {
    const response = await axiosClient.get(
      `/api/empresas/${empresaId}/usuarios/${usuarioId}/correos/${correoId}/historial`
    );
    return response.data;
  }
};
