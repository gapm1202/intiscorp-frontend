import axiosClient from "@/api/axiosClient";

export interface SubField {
  nombre: string;
  tipo: 'text' | 'number' | 'select';
  opciones?: string[];
}

export interface CategoryField {
  nombre: string;
  tipo: 'text' | 'number' | 'select' | 'textarea' | 'group';
  opciones?: string[];
  requerido: boolean;
  subcampos?: SubField[];
}

export interface Category {
  id?: string;
  nombre: string;
  subcategorias?: string[];
  campos?: CategoryField[];
}

// Obtener todas las categorías
export const getCategorias = async (): Promise<Category[]> => {
  try {
    const response = await axiosClient.get('/api/categorias');
    const data = response.data;
    
    // Si el backend devuelve { data: [...] }
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      return data.data;
    }
    
    // Si el backend devuelve directamente el array
    if (Array.isArray(data)) {
      return data;
    }
    
    // Fallback: array vacío
    console.warn('Unexpected categories response format:', data);
    return [];
  } catch (error) {
    console.error('Error in getCategorias service:', error);
    return [];
  }
};

// Crear una nueva categoría
export const createCategoria = async (categoria: Omit<Category, 'id'>): Promise<Category> => {
  try {
    const response = await axiosClient.post('/api/categorias', categoria);
    const data = response.data;
    
    // Si el backend devuelve { ok: true, data: {...} }
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data;
    }
    
    // Si devuelve directamente el objeto
    return data;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } } };
    // Manejar error 409 Conflict (categoría duplicada)
    if (err.response?.status === 409) {
      const errorMsg = err.response.data?.message || 'Ya existe una categoría con ese nombre';
      throw new Error(errorMsg);
    }
    // Otros errores
    const errorMsg = err.response?.data?.message || 'Error al crear la categoría';
    throw new Error(errorMsg);
  }
};

// Actualizar una categoría
export const updateCategoria = async (id: string, categoria: Partial<Category>): Promise<Category> => {
  try {
    const response = await axiosClient.put(`/api/categorias/${id}`, categoria);
    const data = response.data;
    
    // Si el backend devuelve { ok: true, data: {...} }
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data;
    }
    
    return data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    // Manejar errores del backend
    const errorMsg = err.response?.data?.message || 'Error al actualizar la categoría';
    throw new Error(errorMsg);
  }
};

// Eliminar una categoría
export const deleteCategoria = async (id: string): Promise<void> => {
  await axiosClient.delete(`/api/categorias/${id}`);
};
