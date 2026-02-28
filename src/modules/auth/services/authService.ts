import axiosClient from '@/api/axiosClient';

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Realiza el login contra POST /api/auth/login
 * El backend puede devolver { require2FA: true, userId, message, user }
 * o puede devolver directamente { user, token } si no se requiere 2FA.
 */
export const loginUser = async (email: string, password: string): Promise<any> => {
  try {
    const response = await axiosClient.post('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
    const message = err.response?.data?.message || err.message || 'Error al iniciar sesión';
    const ex = new Error(message);
    (ex as any).status = err.response?.status;
    throw ex;
  }
};

/**
 * Verifica el código 2FA para un usuario y devuelve el JWT final.
 * POST /api/auth/verify-2fa { userId, code }
 */
export const verify2FACode = async (userId: number | string, code: string): Promise<any> => {
  try {
    // Backend expects payload: { usuario_id: <number>, codigo: "<string>" }
    const response = await axiosClient.post('/api/auth/verify-2fa', {
      usuario_id: userId,
      codigo: code,
    });
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
    const message = err.response?.data?.message || err.message || 'Error verificando código 2FA';
    const ex = new Error(message);
    (ex as any).status = err.response?.status;
    throw ex;
  }
};
