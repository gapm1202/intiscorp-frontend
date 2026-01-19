import axiosClient from '@/api/axiosClient';
import { authEmpresaService } from './authEmpresaService';

export interface CrearIncidenciaData {
  tipoIncidencia: string;
  titulo: string;
  descripcion: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  prioridad: string;
  sedeId?: number;
  asset_id?: string;  // ✅ String (código del activo) no number
  dni?: string;
  archivos?: File[];
}

export const incidenciaService = {
  async crearIncidencia(data: CrearIncidenciaData) {
    const session = authEmpresaService.getSession();
    
    if (!session) {
      throw new Error('No hay sesión activa');
    }
    
    console.log('🔧 Preparando FormData con:', {
      empresa_id: session.id,
      tipoIncidencia: data.tipoIncidencia,
      titulo: data.titulo,
      sedeId: data.sedeId,
      asset_id: data.asset_id,
      dni: data.dni,
      archivos: data.archivos?.length || 0
    });

    // Crear FormData para enviar archivos
    const formData = new FormData();
    formData.append('empresa_id', session.id.toString());
    formData.append('tipoIncidencia', data.tipoIncidencia);
    formData.append('titulo', data.titulo);
    formData.append('descripcion', data.descripcion);
    formData.append('contactoNombre', data.contactoNombre);
    formData.append('contactoEmail', data.contactoEmail);
    formData.append('contactoTelefono', data.contactoTelefono);
    formData.append('prioridad', data.prioridad);
    
    if (data.sedeId) {
      formData.append('sedeId', data.sedeId.toString());
    }
    
    if (data.asset_id) {
      console.log('➕ Agregando asset_id:', data.asset_id, 'tipo:', typeof data.asset_id);
      formData.append('asset_id', data.asset_id);  // ✅ Ya es string, no convertir
    } else {
      console.log('⚠️ NO se envía asset_id (es undefined/null)');
    }

    if (data.dni) {
      console.log('➕ Agregando dni:', data.dni);
      formData.append('dni', data.dni);
    } else {
      console.log('⚠️ NO se envía dni (es undefined/null)');
    }
    
    // Agregar archivos si existen (validar que sean File)
    if (data.archivos && data.archivos.length > 0) {
      data.archivos.forEach((archivo, index) => {
        if (archivo instanceof File) {
          console.log(`📎 Archivo ${index + 1}:`, archivo.name, archivo.size, 'bytes');
          formData.append('archivos', archivo);
        } else {
          console.warn(`⚠️ Archivo ${index + 1} no es una instancia de File:`, archivo);
        }
      });
    }
    
    console.log('🚀 Enviando petición a /api/portal/reportes...');
    
    // Log del FormData completo
    console.log('📋 FormData completo:');
    for (let pair of formData.entries()) {
      if (pair[1] instanceof File) {
        console.log(`  ${pair[0]}: [File] ${pair[1].name}`);
      } else {
        console.log(`  ${pair[0]}: ${pair[1]}`);
      }
    }
    
    const response = await axiosClient.post('/api/portal/reportes', formData, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  }
};
