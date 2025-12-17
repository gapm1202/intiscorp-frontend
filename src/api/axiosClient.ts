import axios from 'axios';

// Crear instancia de axios con URL base
const axiosClient = axios.create({
  baseURL: 'http://localhost:4000', // URL del backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token en cada petición
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores globales
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl: string = error.config?.url ?? "";
    const isLoginRequest = requestUrl.includes("/api/auth/login");

    // Solo forzamos logout/redirección en 401 que no sea del login
    if (status === 401 && !isLoginRequest) {
      localStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
