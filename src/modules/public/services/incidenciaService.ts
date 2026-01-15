import axiosClient from '@/api/axiosClient';
import { authEmpresaService } from './authEmpresaService';

export interface CrearIncidenciaData {
  tipoIncidencia: string;
  descripcion: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  prioridad: string;
  sedeId?: number;
  activoAfectado?: string;
  archivos?: File[];
}

export const incidenciaService = {
  async crearIncidencia(data: CrearIncidenciaData) {
    const session = authEmpresaService.getSession();
    
    if (!session) {
      throw new Error('No hay sesión activa');
    }
    
    // Crear FormData para enviar archivos
    const formData = new FormData();
    formData.append('tipoIncidencia', data.tipoIncidencia);
    formData.append('descripcion', data.descripcion);
    formData.append('contactoNombre', data.contactoNombre);
    formData.append('contactoEmail', data.contactoEmail);
    formData.append('contactoTelefono', data.contactoTelefono);
    formData.append('prioridad', data.prioridad);
    
    if (data.sedeId) {
      formData.append('sedeId', data.sedeId.toString());
    }
    
    if (data.activoAfectado) {
      formData.append('activoAfectado', data.activoAfectado);
    }
    
    // Agregar archivos si existen
    if (data.archivos && data.archivos.length > 0) {
      data.archivos.forEach((archivo) => {
        formData.append('archivos', archivo);
      });
    }
    
    const response = await axiosClient.post('/api/public/incidencias', formData, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  }
};
