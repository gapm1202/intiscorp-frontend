// Vite exposes env via import.meta.env in the browser
const importMeta = import.meta as { env: { VITE_API_URL?: string } };
export const API_BASE = importMeta.env?.VITE_API_URL || "http://localhost:4000";

// Obtener token del localStorage
function getToken(): string | null {
  return localStorage.getItem("token");
}

// Crear sede
export async function createSede(empresaId: string | number, sedeData: {
  nombre: string;
  codigoInterno?: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  responsable?: string;
  cargoResponsable?: string;
  telefonoResponsable?: string;
  emailResponsable?: string;
  tipo?: string;
  horarioAtencion?: string;
  observaciones?: string;
  responsables?: Array<{ nombre: string; cargo: string; telefono: string; email: string }>;
  autorizaIngresoTecnico?: boolean;
  autorizaMantenimientoFueraHorario?: boolean;
}) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes`;
  
  const token = getToken();

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(sedeData),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error creating sede: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data;
}

// Obtener sedes de una empresa
export async function getSedesByEmpresa(empresaId: string | number, incluirInactivas?: boolean) {
  const qs = incluirInactivas ? "?incluirInactivas=true" : "";
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes${qs}`;
  
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error fetching sedes: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  
  // Normalizar datos: agregar valores por defecto para campos que puedan no existir en el backend
  const normalizedData = Array.isArray(data) 
    ? data.map((sede: any) => ({
        ...sede,
        autorizaSupervisionCoordinacion: sede.autorizaSupervisionCoordinacion ?? true
      }))
    : {
        ...data,
        data: Array.isArray(data.data)
          ? data.data.map((sede: any) => ({
              ...sede,
              autorizaSupervisionCoordinacion: sede.autorizaSupervisionCoordinacion ?? true
            }))
          : data.data
      };
  
  return normalizedData;
}

// Actualizar sede
export async function updateSede(empresaId: string | number, sedeId: string | number, sedeData: {
  nombre?: string;
  codigoInterno?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  responsable?: string;
  cargoResponsable?: string;
  telefonoResponsable?: string;
  emailResponsable?: string;
  tipo?: string;
  horarioAtencion?: string;
  observaciones?: string;
  responsables?: Array<{ nombre: string; cargo: string; telefono: string; email: string }>;
  autorizaIngresoTecnico?: boolean;
  autorizaMantenimientoFueraHorario?: boolean;
}, motivo?: string) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes/${sedeId}`;
  
  const token = getToken();

  const body = motivo ? { ...sedeData, motivo } : sedeData;

  const res = await fetch(url, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error updating sede: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data;
}

// Eliminar sede
export async function toggleSedeActivo(empresaId: string | number, sedeId: string | number, activo: boolean, motivo: string) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes/${sedeId}`;
  
  const token = getToken();

  const body = { activo, motivo };

  const res = await fetch(url, {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error toggling sede: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data;
}
