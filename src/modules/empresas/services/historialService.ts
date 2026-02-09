const importMeta = import.meta as { env: { VITE_API_URL?: string } };
export const API_BASE = importMeta.env?.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export interface HistorialEntry {
  id?: string | number;
  _id?: string | number;
  fecha?: string;
  motivo?: string;
  usuario?: string;
  nombreUsuario?: string;
  userName?: string;
  accion?: string;
  tipo?: string;
  destino?: string;
  sedeId?: string | number;
  [key: string]: unknown;
}

export interface HistorialCreatePayload {
  accion: string;
  motivo?: string;
  tipo?: string;
  destino?: string;
  sedeId?: string | number;
  [key: string]: unknown;
}

export async function getHistorialEmpresa(empresaId: string | number): Promise<HistorialEntry[]> {
  const url = `${API_BASE}/api/empresas/${empresaId}/historial`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error fetching historial: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.data || [];
}

export async function addHistorialEmpresa(empresaId: string | number, payload: HistorialCreatePayload): Promise<HistorialEntry | null> {
  const url = `${API_BASE}/api/empresas/${empresaId}/historial`;
  const token = getToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error al registrar historial:", text);
    return null;
  }

  const data = await res.json();
  return (data as { data?: HistorialEntry }).data ?? (data as HistorialEntry);
}
