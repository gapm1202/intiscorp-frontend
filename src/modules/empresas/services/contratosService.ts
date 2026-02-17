const _metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const API_BASE = _metaEnv?.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("token");
}

// GET contratos próximos a vencer
export async function getContratosProximosAVencer(diasAnticipacion: number = 30) {
  const url = `${API_BASE}/api/contratos/proximos-a-vencer?dias=${diasAnticipacion}`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    console.error('Error al obtener contratos próximos a vencer:', res.status);
    return [];
  }

  const data = await res.json();
  return data;
}

// Helper para agregar timeout a fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`La petición excedió el tiempo de espera (${timeout / 1000}s). El servidor no respondió.`);
    }
    throw error;
  }
}

// GET contrato activo
export async function getContratoActivo(empresaId: string | number) {
  const url = `${API_BASE}/api/empresas/${empresaId}/contratos/activo`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (res.status === 404) {
    return null; // No hay contrato activo
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error fetching contrato activo: ${res.status} - ${text}`);
  }

  return await res.json();
}

// GET contrato por ID específico
export async function getContratoById(contratoId: string | number) {
  const url = `${API_BASE}/api/contratos/${contratoId}`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error fetching contrato: ${res.status} - ${text}`);
  }

  return await res.json();
}

// POST crear contrato
export async function createContrato(empresaId: string | number, data: {
  tipoContrato: string;
  estadoContrato: string;
  fechaInicio: string;
  fechaFin: string;
  renovacionAutomatica?: boolean;
  responsableComercial?: string;
  observaciones?: string;
  visitaFrecuencia?: string;
  cantidadVisitas?: number;
  motivo: string;
}) {
  const url = `${API_BASE}/api/empresas/${empresaId}/contratos`;
  const token = getToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error creating contrato: ${res.status} - ${text}`);
  }

  return await res.json();
}

// PATCH datos generales del contrato
export async function updateContratoDatos(empresaId: string | number, contractId: string | number, data: {
  tipoContrato?: string;
  estadoContrato?: string;
  fechaInicio?: string;
  fechaFin?: string;
  renovacionAutomatica?: boolean;
  responsableComercial?: string;
  observaciones?: string;
  visitaFrecuencia?: string;
  cantidadVisitas?: number;
  motivo: string;
}) {
  const url = `${API_BASE}/api/empresas/${empresaId}/contratos/${contractId}`;
  const token = getToken();

  const res = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  }, 15000); // 15 segundos timeout

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error updating contrato datos: ${res.status} - ${text}`);
  }

  return await res.json();
}

// PATCH servicios incluidos
export async function updateContratoServicios(empresaId: string | number, contractId: string | number, data: {
  soporteRemoto?: boolean;
  soportePresencial?: boolean;
  mantenimientoPreventivo?: boolean;
  gestionInventario?: boolean;
  gestionCredenciales?: boolean;
  monitoreo?: boolean;
  informesMensuales?: boolean;
  gestionAccesos?: boolean;
  horasMensualesIncluidas?: number;
  excesoHorasFacturable?: boolean;
  motivo: string;
}) {
  const url = `${API_BASE}/api/empresas/${empresaId}/contratos/${contractId}/servicios`;
  const token = getToken();

  const res = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  }, 15000); // 15 segundos timeout

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error updating servicios: ${res.status} - ${text}`);
  }

  return await res.json();
}

// PATCH preventivo
export async function updateContratoPreventivo(empresaId: string | number, contractId: string | number, data: {
  incluyePreventivo?: boolean;
  frecuencia?: string;
  modalidad?: string;
  aplica?: string;
  observaciones?: string;
  motivo: string;
}) {
  const url = `${API_BASE}/api/empresas/${empresaId}/contratos/${contractId}/preventivo`;
  const token = getToken();

  const res = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  }, 15000); // 15 segundos timeout

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error updating preventivo: ${res.status} - ${text}`);
  }

  return await res.json();
}

// PATCH económicos
export async function updateContratoEconomicos(empresaId: string | number, contractId: string | number, data: {
  tipoFacturacion?: string;
  moneda?: string;
  montoReferencial?: number;
  diaFacturacion?: number;
  observaciones?: string;
  motivo: string;
}) {
  const url = `${API_BASE}/api/empresas/${empresaId}/contratos/${contractId}/economicos`;
  const token = getToken();

  const res = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  }, 15000); // 15 segundos timeout

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error updating economicos: ${res.status} - ${text}`);
  }

  return await res.json();
}

// POST documentos (multipart)
export async function uploadContratoDocumentos(
  empresaId: string | number,
  contractId: string | number,
  files: FileList | File[],
  tipo: string,
  motivo: string
) {
  const url = `${API_BASE}/api/empresas/${empresaId}/contratos/${contractId}/documentos`;
  const token = getToken();

  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));
  formData.append("tipo", tipo);
  formData.append("motivo", motivo);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error uploading documentos: ${res.status} - ${text}`);
  }

  return await res.json();
}

// DELETE documento
export async function deleteContratoDocumento(
  empresaId: string | number,
  contractId: string | number,
  docId: string | number,
  motivo: string
) {
  const url = `${API_BASE}/api/empresas/${empresaId}/contratos/${contractId}/documentos/${docId}`;
  const token = getToken();

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ motivo }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error deleting documento: ${res.status} - ${text}`);
  }

  return await res.json();
}
