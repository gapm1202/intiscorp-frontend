import axiosClient from '@/api/axiosClient';

export type ComponentField = {
  id?: number;
  nombre: string;
  tipo: 'text' | 'number' | 'select' | 'textarea';
  requerido?: boolean;
  opciones?: string[];
};

export type Componente = {
  id?: number;
  nombre: string;
  icono?: string;
  categorias?: number[];
  campos?: ComponentField[];
  createdAt?: string;
};

const unwrap = (res: any) => {
  const body = res?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
};

export const getComponentes = async (): Promise<Componente[]> => {
  const res = await axiosClient.get('/api/componentes');
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
};

export const getComponenteById = async (id: number): Promise<Componente | null> => {
  const res = await axiosClient.get(`/api/componentes/${id}`);
  return unwrap(res) ?? null;
};

export const getFormularioByCategoria = async (categoriaId: string | number) => {
  const res = await axiosClient.get(`/api/componentes/formulario/categoria/${categoriaId}`);
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
};

export const createComponente = async (payload: Omit<Componente, 'id'>): Promise<Componente> => {
  const res = await axiosClient.post('/api/componentes', payload);
  return unwrap(res);
};

export const updateComponente = async (id: number, payload: Partial<Componente>): Promise<Componente> => {
  const res = await axiosClient.put(`/api/componentes/${id}`, payload);
  return unwrap(res);
};

export const deleteComponente = async (id: number): Promise<void> => {
  await axiosClient.delete(`/api/componentes/${id}`);
};

export default {
  getComponentes,
  getComponenteById,
  createComponente,
  updateComponente,
  deleteComponente,
};
