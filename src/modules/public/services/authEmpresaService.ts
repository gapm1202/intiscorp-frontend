import axiosClient from '@/api/axiosClient';

export interface LoginEmpresaData {
  ruc: string;
  contrasena: string;
}

export interface EmpresaSession {
  id: number;
  nombre: string;
  ruc: string;
  token: string;
}

const AUTH_EMPRESA_KEY = 'empresa_auth';

export const authEmpresaService = {
  async login(data: LoginEmpresaData): Promise<EmpresaSession> {
    // Backend espera "usuario" en lugar de "ruc"
    const payload = {
      usuario: data.ruc,
      contrasena: data.contrasena
    };
    try {
      const response = await axiosClient.post('/api/public/empresas/login', payload, { withCredentials: true });

      // El backend responde con { ok, token, empresa }
      const sessionData = {
        id: response.data.empresa.id,
        nombre: response.data.empresa.nombre,
        ruc: response.data.empresa.ruc,
        token: response.data.token
      };

      // Guardar sesión en localStorage
      localStorage.setItem(AUTH_EMPRESA_KEY, JSON.stringify(sessionData));

      return sessionData;
    } catch (err: any) {
      // Normalizar y relanzar un Error legible para la UI
      const message = err?.response?.data?.message || err?.message || 'Error de autenticación';
      // Log detallado para debugging en desarrollo
      // eslint-disable-next-line no-console
      console.error('[authEmpresaService] login error:', {
        url: '/api/public/empresas/login',
        payload,
        status: err?.response?.status,
        data: err?.response?.data,
        message
      });
      throw new Error(message);
    }
  },

  logout() {
    localStorage.removeItem(AUTH_EMPRESA_KEY);
  },

  getSession(): EmpresaSession | null {
    const data = localStorage.getItem(AUTH_EMPRESA_KEY);
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  }
};
