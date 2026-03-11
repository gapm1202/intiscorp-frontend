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

// crearWizard - POST /api/empresas/crear-wizard (transactional full-create)
export async function crearWizard(payload: {
  nombre: string;
  ruc?: string;
  codigoCliente?: string;
  direccionFiscal?: string;
  direccionOperativa?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  paginaWeb?: string;
  observaciones?: string;
  contrasenaPortalSoporte?: string;
  sedes?: Array<Record<string, any>>; // includes tempId
  usuarios?: Array<Record<string, any>>; // includes tempId and temp sedeId
  contactosAdmin?: Array<Record<string, any>>;
  contactosTecnicos?: Array<Record<string, any>>;
  responsablesSede?: Array<Record<string, any>>;
}) {
  const url = `${API_BASE}/api/empresas/crear-wizard`;
  const token = getToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error crear-wizard:", text);
    throw new Error(`Error crear-wizard: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data;
}

// createEmpresa - POST /api/empresas/
export async function createEmpresa(empresaData: {
  nombre: string;
  ruc?: string;
  codigoCliente?: string;
  direccionFiscal?: string;
  direccionOperativa?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  paginaWeb?: string;
  estadoContrato?: string;
  contrasenaPortalSoporte?: string;
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
  codigoCliente?: string;
  direccionFiscal?: string;
  direccionOperativa?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  paginaWeb?: string;
  estadoContrato?: string;
  contrasenaPortalSoporte?: string;
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
  contactosAdmin?: Array<{ usuarioId?: string; nombre?: string; autorizacionFacturacion?: boolean }>;
  contactosTecnicos?: Array<{ usuarioId?: string; nombre?: string; horarioDisponible?: string; contactoPrincipal?: boolean; autorizaCambiosCriticos?: boolean; supervisionCoordinacion?: boolean; nivelAutorizacion?: string }>;
  responsablesSede?: Array<{ usuarioId?: string; sedeId?: string; autorizaIngresoTecnico?: boolean; autorizaMantenimientoFueraHorario?: boolean; supervisionCoordinacion?: boolean }>;
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
