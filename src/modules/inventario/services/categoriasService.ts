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
    console.log('[categoriasService] 📤 POST /api/categorias con payload:', JSON.stringify(categoria, null, 2));
    const response = await axiosClient.post('/api/categorias', categoria);
    const data = response.data;
    
    console.log('[categoriasService] ✅ Respuesta exitosa:', data);
    
    // Si el backend devuelve { ok: true, data: {...} }
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data;
    }
    
    // Si devuelve directamente el objeto
    return data;
  } catch (error: any) {
    console.error('[categoriasService] ❌ Error bruto:', error);
    console.error('[categoriasService] ❌ Error config:', error?.config);
    console.error('[categoriasService] ❌ Error response:', error?.response);
    console.error('[categoriasService] ❌ Response status:', error?.response?.status);
    console.error('[categoriasService] ❌ Response statusText:', error?.response?.statusText);
    console.error('[categoriasService] ❌ Response headers:', error?.response?.headers);
    console.error('[categoriasService] ❌ Response data (completo):', error?.response?.data);
    console.error('[categoriasService] ❌ Response data string:', JSON.stringify(error?.response?.data, null, 2));
    
    const err = error as { response?: { status?: number; statusText?: string; data?: any } };
    
    // Extraer mensaje del servidor - intentar múltiples formas
    let serverMessage = 'Error desconocido';
    
    if (err.response?.data) {
      console.log('[categoriasService] 📋 Tipo de response.data:', typeof err.response.data);
      
      if (typeof err.response.data === 'string') {
        serverMessage = err.response.data;
        console.log('[categoriasService] ✓ Es string:', serverMessage);
      } else if (err.response.data instanceof Blob) {
        console.log('[categoriasService] ⚠️ Es Blob, intentando leerlo...');
        // Esto no funcionará en este contexto de catch, solo para documentar
        serverMessage = 'Respuesta en formato Blob (ver logs detallados)';
      } else if (typeof err.response.data === 'object') {
        console.log('[categoriasService] 📦 Es objeto, claves:', Object.keys(err.response.data));
        serverMessage = 
          err.response.data?.message ||
          err.response.data?.error ||
          err.response.data?.msg ||
          err.response.data?.detail ||
          JSON.stringify(err.response.data);
      }
    }
    
    console.error('[categoriasService] 🔍 Mensaje final del servidor:', serverMessage);
    console.error('[categoriasService] 📊 Resumen del error:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      mensaje: serverMessage
    });
    
    // Manejar error 409 Conflict (categoría duplicada)
    if (err.response?.status === 409) {
      const errorMsg = err.response.data?.message || 'Ya existe una categoría con ese nombre';
      throw new Error(errorMsg);
    }
    
    // Manejar error 500
    if (err.response?.status === 500) {
      const errorMsg = serverMessage || 'Error en el servidor al crear la categoría. Verifica que los datos sean válidos.';
      throw new Error(`🚨 Error 500 del servidor: ${errorMsg}`);
    }
    
    // Otros errores
    const errorMsg = serverMessage || 'Error al crear la categoría';
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
