const _metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const API_BASE = _metaEnv?.VITE_API_URL || "http://localhost:4000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

// GET usuarios con rol administrador
export async function getUsuariosAdministrativos() {
  const url = `${API_BASE}/api/usuarios/administrativos`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    console.warn('Error al obtener usuarios administrativos:', res.status);
    const errorText = await res.text();
    console.warn('Error response:', errorText);
    return [];
  }

  const data = await res.json();
  return data;
}

// GET usuarios internos (todos los roles)
export async function getUsuariosInternos() {
  const url = `${API_BASE}/api/usuarios-internos`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    console.warn('Error al obtener usuarios internos:', res.status);
    const errorText = await res.text();
    console.warn('Error response:', errorText);
    // Si falla, intentar con el endpoint de administrativos como fallback
    return getUsuariosAdministrativos();
  }

  const data = await res.json();
  return data;
}
