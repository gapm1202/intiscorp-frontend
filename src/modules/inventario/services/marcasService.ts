import axiosClient from '@/api/axiosClient';

export interface MarcaPayload {
  nombre: string;
  activo?: boolean;
  // El backend espera `categoriaIds` como array de enteros
  categoriaIds?: number[];
}

export interface MarcaItemAPI {
  id: string;
  nombre: string;
  activo: boolean;
  categorias?: string[];
  creado_en?: string;
  actualizado_en?: string;
}

export const getMarcas = async (): Promise<MarcaItemAPI[]> => {
  const res = await axiosClient.get('/api/gestion-marcas');
  const data = res.data;
  if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

export const createMarca = async (payload: MarcaPayload): Promise<MarcaItemAPI> => {
  const res = await axiosClient.post('/api/gestion-marcas', payload);
  const data = res.data;
  if (data && typeof data === 'object' && 'data' in data) return data.data;
  return data;
};

export const updateMarca = async (id: string, payload: Partial<MarcaPayload>): Promise<MarcaItemAPI> => {
  const res = await axiosClient.put(`/api/gestion-marcas/${id}`, payload);
  const data = res.data;
  if (data && typeof data === 'object' && 'data' in data) return data.data;
  return data;
};

// Intento de sincronizar categorías para una marca (fallback frontend)
export const syncCategorias = async (id: string, categoriaIds: Array<string | number>): Promise<void> => {
  // Convertir a enteros y filtrar valores inválidos
  const ids = (categoriaIds || []).map((v) => Number(v)).filter((n) => Number.isInteger(n));
  // Se intenta POST a /api/gestion-marcas/:id/categorias con { categoriaIds: [...] }
  try {
    await axiosClient.post(`/api/gestion-marcas/${id}/categorias`, { categoriaIds: ids });
    return;
  } catch (err) {
    // Si 404 o no soportado, intentar PUT como alternativa
    try {
      await axiosClient.put(`/api/gestion-marcas/${id}/categorias`, { categoriaIds: ids });
      return;
    } catch (err2) {
      // Re-lanzar el último error para que el caller lo gestione
      throw err2;
    }
  }
};

export default {
  getMarcas,
  createMarca,
  updateMarca,
};
