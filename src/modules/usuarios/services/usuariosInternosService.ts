import axiosClient from '@/api/axiosClient';
import type {
  UsuarioInterno,
  CrearUsuarioInternoData,
  ActualizarUsuarioInternoData,
  HistorialUsuarioInterno,
  RestablecerPasswordData
} from '../types/usuariosInternos.types';

export const usuariosInternosService = {
  // Obtener todos los usuarios internos
  getAll: async (): Promise<UsuarioInterno[]> => {
    const response = await axiosClient.get('/api/usuarios-internos');
    return response.data.data || response.data;
  },

  // Obtener un usuario interno por ID
  getById: async (id: number): Promise<UsuarioInterno> => {
    const response = await axiosClient.get(`/api/usuarios-internos/${id}`);
    return response.data.data || response.data;
  },

  // Crear usuario interno (envía correo automático)
  create: async (data: CrearUsuarioInternoData): Promise<UsuarioInterno> => {
    const response = await axiosClient.post('/api/usuarios-internos', data);
    return response.data.data || response.data;
  },

  // Actualizar usuario interno
  update: async (id: number, data: ActualizarUsuarioInternoData): Promise<UsuarioInterno> => {
    const response = await axiosClient.put(`/api/usuarios-internos/${id}`, data);
    return response.data.data || response.data;
  },

  // Restablecer contraseña
  resetPassword: async (id: number, data: RestablecerPasswordData): Promise<void> => {
    await axiosClient.post(`/api/usuarios-internos/${id}/restablecer-password`, data);
  },

  // Desactivar usuario
  desactivar: async (id: number, motivo: string): Promise<void> => {
    await axiosClient.post(`/api/usuarios-internos/${id}/desactivar`, { motivo });
  },

  // Activar usuario
  activar: async (id: number, motivo: string): Promise<void> => {
    await axiosClient.post(`/api/usuarios-internos/${id}/activar`, { motivo });
  },

  // Obtener historial
  getHistorial: async (id: number): Promise<HistorialUsuarioInterno[]> => {
    const response = await axiosClient.get(`/api/usuarios-internos/${id}/historial`);
    return response.data.data || response.data;
  },

  // Agregar correo adicional
  agregarCorreo: async (id: number, correoData: any): Promise<void> => {
    await axiosClient.post(`/api/usuarios-internos/${id}/correos`, correoData);
  },

  // Eliminar correo adicional
  eliminarCorreo: async (usuarioId: number, correoId: number, motivo: string): Promise<void> => {
    await axiosClient.delete(`/api/usuarios-internos/${usuarioId}/correos/${correoId}`, {
      data: { motivo }
    });
  },

  // Cambiar correo principal
  cambiarCorreoPrincipal: async (usuarioId: number, correoId: number, motivo: string): Promise<void> => {
    await axiosClient.post(`/api/usuarios-internos/${usuarioId}/correos/${correoId}/marcar-principal`, {
      motivo
    });
  },

  // Agregar teléfono
  agregarTelefono: async (id: number, telefonoData: any): Promise<void> => {
    await axiosClient.post(`/api/usuarios-internos/${id}/telefonos`, telefonoData);
  },

  // Eliminar teléfono
  eliminarTelefono: async (usuarioId: number, telefonoId: number, motivo: string): Promise<void> => {
    await axiosClient.delete(`/api/usuarios-internos/${usuarioId}/telefonos/${telefonoId}`, {
      data: { motivo }
    });
  },

  // Cambiar teléfono principal
  cambiarTelefonoPrincipal: async (usuarioId: number, telefonoId: number, motivo: string): Promise<void> => {
    await axiosClient.post(`/api/usuarios-internos/${usuarioId}/telefonos/${telefonoId}/marcar-principal`, {
      motivo
    });
  }
};
