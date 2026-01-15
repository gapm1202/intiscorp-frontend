import axiosClient from '@/api/axiosClient';

export interface ActivoDetalle {
  id: number;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  sede: {
    nombre: string;
  };
  area: {
    nombre: string;
  };
  camposPersonalizados: Record<string, any>;
  anydesk: string;
  usuariosAsignados: {
    id: number;
    nombre: string;
    correoPrincipal: string;
    cargo: string;
    area: string;
  }[];
}

export interface UsuarioDetalle {
  id: number;
  nombre: string;
  dni: string;
  cargo: string;
  telefono: string;
  correoPrincipal: string;
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
