import axiosClient from '@/api/axiosClient';

export interface ActivoDetalle {
  id: number;
  codigo: string;
  categoria: string;
  fabricante: string;
  modelo: string;
  serie: string;
  estadoActivo: string;
  estadoOperativo: string;
  sede: string;
  sedeId?: number;
  area?: string;
  camposPersonalizados: Record<string, any>;
  codigoAccesoRemoto?: string;
  usuariosAsignados: {
    id: number;
    nombre: string;
    email: string;
    cargo: string;
  }[];
}

export interface UsuarioDetalle {
  id: number;
  nombre: string;
  dni: string;
  cargo: string;
  telefono: string;
  correoPrincipal: string;
  sedeId?: number;
  sede?: {
    nombre: string;
  };
  area?: {
    nombre: string;
  };
}

export const portalService = {
  async buscarActivoPorCodigo(codigo: string): Promise<ActivoDetalle> {
    const session = localStorage.getItem('empresa_auth');
    const token = session ? JSON.parse(session).token : null;
    
    const response = await axiosClient.get(`/api/public/activos/${codigo}/detalle`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.activo;
  },

  async buscarUsuarioPorDNI(empresaId: number, dni: string): Promise<UsuarioDetalle> {
    const session = localStorage.getItem('empresa_auth');
    const token = session ? JSON.parse(session).token : null;
    
    const response = await axiosClient.get(`/api/public/empresas/${empresaId}/usuarios/dni/${dni}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.usuario;
  }
};
