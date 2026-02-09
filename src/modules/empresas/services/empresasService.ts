// Vite exposes env via import.meta.env in the browser
const _metaEnvEmp = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const API_BASE = _metaEnvEmp?.VITE_API_URL || "";

// Obtener token del localStorage
function getToken(): string | null {
  return localStorage.getItem("token");
}

// getEmpresas accepts optional filters which are sent as query params to the backend
export async function getEmpresas(filters?: Record<string, string | number | undefined>) {
  const qs = filters
    ? Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  const url = `${API_BASE}/api/empresas/${qs ? `?${qs}` : ""}`;
  
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
    throw new Error(`Error fetching empresas: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data;
}

// createEmpresa - POST /api/empresas/
export async function createEmpresa(empresaData: {
  nombre: string;
  ruc?: string;
  direccionFiscal?: string;
  direccionOperativa?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  paginaWeb?: string;
  estadoContrato?: string;
  adminNombre?: string;
  adminCargo?: string;
  adminTelefono?: string;
  adminEmail?: string;
  observaciones?: string;
  tecNombre?: string;
  tecCargo?: string;
  tecTelefono1?: string;
  tecTelefono2?: string;
  tecEmail?: string;
  nivelAutorizacion?: string;
}) {
  const url = `${API_BASE}/api/empresas/`;
  
  const token = getToken();

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(empresaData),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error creating empresa: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data;
}

// getEmpresaById - GET /api/empresas/:id
export async function getEmpresaById(empresaId: string | number) {
  const url = `${API_BASE}/api/empresas/${empresaId}`;
  
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
    throw new Error(`Error fetching empresa: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data;
}

// updateEmpresa - PUT /api/empresas/:id
export async function updateEmpresa(empresaId: string | number, empresaData: {
  nombre?: string;
  ruc?: string;
  direccionFiscal?: string;
  direccionOperativa?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  paginaWeb?: string;
  estadoContrato?: string;
  adminNombre?: string;
  adminCargo?: string;
  adminTelefono?: string;
  adminEmail?: string;
  observaciones?: string;
  tecNombre?: string;
  tecCargo?: string;
  tecTelefono1?: string;
  tecTelefono2?: string;
  tecEmail?: string;
  nivelAutorizacion?: string;
}, motivo?: string) {
  const url = `${API_BASE}/api/empresas/${empresaId}`;
  const token = getToken();

  const body = motivo ? { ...empresaData, motivo } : empresaData;

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
    throw new Error(`Error updating empresa: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data;
}
