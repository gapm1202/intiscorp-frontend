import axiosClient from '@/api/axiosClient';

export type ChecklistQuestion = {
  id: string;
  pregunta: string;
  tipo: 'si_no' | 'texto' | 'seleccion' | string;
  categorias: number[];
  opciones: string[];
  created_at?: string;
  updated_at?: string;
};

type ListParams = { categoriaId?: number };

export const listPreguntas = async (params?: ListParams): Promise<ChecklistQuestion[]> => {
  const q = params?.categoriaId ? `?categoriaId=${encodeURIComponent(String(params.categoriaId))}` : '';
  const res = await axiosClient.get(`/api/checklist/preguntas${q}`);
  return res.data;
};

export const createPregunta = async (payload: { pregunta: string; tipo: string; categorias: number[]; opciones: string[] }): Promise<ChecklistQuestion> => {
  const res = await axiosClient.post('/api/checklist/preguntas', payload);
  return res.data;
};

export const updatePregunta = async (id: string, payload: { pregunta: string; tipo: string; categorias: number[]; opciones: string[] }): Promise<ChecklistQuestion> => {
  const res = await axiosClient.put(`/api/checklist/preguntas/${encodeURIComponent(id)}`, payload);
  return res.data;
};

export const deletePregunta = async (id: string): Promise<void> => {
  await axiosClient.delete(`/api/checklist/preguntas/${encodeURIComponent(id)}`);
};

export default {
  listPreguntas,
  createPregunta,
  updatePregunta,
  deletePregunta,
};
