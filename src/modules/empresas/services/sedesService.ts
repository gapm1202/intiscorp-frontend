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
}) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes`;
  
  const token = getToken();
  console.log("➕ Creando sede:", sedeData);

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(sedeData),
  });

  console.log("📊 Respuesta status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error creating sede: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  console.log("✅ Sede creada:", data);
  return data;
}

// Obtener sedes de una empresa
export async function getSedesByEmpresa(empresaId: string | number) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes`;
  
  const token = getToken();
  console.log("🔍 Obteniendo sedes de empresa:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
  });

  console.log("📊 Respuesta status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error fetching sedes: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  console.log("✅ Sedes obtenidas:", data);
  return data;
}

// Actualizar sede
export async function updateSede(empresaId: string | number, sedeId: string | number, sedeData: {
  nombre?: string;
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
}, motivo?: string) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes/${sedeId}`;
  
  const token = getToken();
  console.log("✏️ Actualizando sede:", sedeData, motivo ? `(motivo: ${motivo})` : "");

  const body = motivo ? { ...sedeData, motivo } : sedeData;

  const res = await fetch(url, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(body),
  });

  console.log("📊 Respuesta status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error updating sede: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  console.log("✅ Sede actualizada:", data);
  return data;
}

// Eliminar sede
export async function deleteSede(empresaId: string | number, sedeId: string | number, motivo?: string) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes/${sedeId}`;
  
  const token = getToken();
  console.log("🗑️ Eliminando sede:", sedeId, motivo ? `(motivo: ${motivo})` : "");

  const body = motivo ? { motivo } : {};

  const res = await fetch(url, {
    method: "DELETE",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(body),
  });

  console.log("📊 Respuesta status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error deleting sede: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  console.log("✅ Sede eliminada:", data);
  return data;
}
