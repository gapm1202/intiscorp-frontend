const importMeta = import.meta as { env: { VITE_API_URL?: string } };
export const API_BASE = importMeta.env?.VITE_API_URL || "http://localhost:4000";

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
  [key: string]: unknown;
}

export async function getHistorialEmpresa(empresaId: string | number): Promise<HistorialEntry[]> {
  const url = `${API_BASE}/api/empresas/${empresaId}/historial`;
  const token = getToken();

  console.log("📋 Obteniendo historial de empresa:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` }),
    },
  });

  console.log("📊 Respuesta status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    throw new Error(`Error fetching historial: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  console.log("✅ Historial obtenido:", data);
  return Array.isArray(data) ? data : data.data || [];
}
