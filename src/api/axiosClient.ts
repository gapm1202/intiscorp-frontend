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
    if (error.response?.status === 401) {
      // Si recibimos 401, limpiar token y redirigir a login
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
