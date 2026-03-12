import axiosClient from '@/api/axiosClient';

// NOTE: backend contract uses base path /api/basecono
export const getCategorias = async () => {
  const resp = await axiosClient.get('/api/basecono/categorias');
  return resp.data;
};

export const createCategoria = async (nombre: string) => {
  const resp = await axiosClient.post('/api/basecono/categorias', { nombre });
  return resp.data;
};

export const updateCategoria = async (id: string, nombre: string) => {
  const resp = await axiosClient.put(`/api/basecono/categorias/${id}`, { nombre });
  return resp.data;
};

export const deleteCategoria = async (id: string) => {
  const resp = await axiosClient.delete(`/api/basecono/categorias/${id}`);
  return resp.data;
};

export const createSubcategoria = async (categoriaId: string, nombre: string) => {
  const resp = await axiosClient.post(`/api/basecono/categorias/${categoriaId}/subcategorias`, { nombre });
  return resp.data;
};

export const updateSubcategoria = async (id: string, nombre: string) => {
  const resp = await axiosClient.put(`/api/basecono/subcategorias/${id}`, { nombre });
  return resp.data;
};

export const deleteSubcategoria = async (id: string) => {
  const resp = await axiosClient.delete(`/api/basecono/subcategorias/${id}`);
  return resp.data;
};

export const createEntrada = async (payload: { categoriaId: string; subcategoriaId?: string | null; titulo: string; contenidoHtml: string; contenidoTexto?: string; status?: string }) => {
  const body = {
    categoria_id: payload.categoriaId,
    subcategoria_id: payload.subcategoriaId ?? null,
    titulo: payload.titulo,
    contenido_html: payload.contenidoHtml,
    contenido_texto: payload.contenidoTexto ?? '',
    status: payload.status ?? 'DRAFT'
  };
  const resp = await axiosClient.post('/api/basecono/entradas', body);
  return resp.data;
};

export const updateEntrada = async (id: string, payload: any) => {
  const resp = await axiosClient.put(`/api/basecono/entradas/${id}`, payload);
  return resp.data;
};

export const getEntradas = async (params?: any) => {
  const resp = await axiosClient.get('/api/basecono/entradas', { params });
  return resp.data;
};

export const getEntrada = async (id: string) => {
  const resp = await axiosClient.get(`/api/basecono/entradas/${id}`);
  return resp.data;
};

export const getCategoria = async (id: string) => {
  const resp = await axiosClient.get(`/api/basecono/categorias/${id}`);
  return resp.data;
};

export const searchEntradas = async (q: string, params?: any) => {
  const resp = await axiosClient.get('/api/basecono/entradas', { params: { q, ...params } });
  return resp.data;
};
