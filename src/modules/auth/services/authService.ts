import axiosClient from '@/api/axiosClient';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
  };
  token: string;
}

/**
 * Realiza el login contra POST /api/auth/login
 * @param email Email del usuario
 * @param password Contraseña del usuario
 * @returns Promise con user y token
 */
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await axiosClient.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  } catch (error: unknown) {
    // Propagar el error con mensaje legible
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    const message = err.response?.data?.message || err.message || 'Error al iniciar sesión';
    throw new Error(message);
  }
};
