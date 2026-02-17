const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Obtener token del localStorage
function getToken(): string | null {
  return localStorage.getItem('token');
}

export async function getEmpresas() {
  const url = `${API_BASE}/api/empresas`;
  const token = getToken();

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error fetching empresas: ${res.status} - ${text}`);
  }

  return await res.json();
}

export async function getEmpresaById(empresaId: string) {
  const url = `${API_BASE}/api/empresas/${empresaId}`;
  const token = getToken();

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error fetching empresa: ${res.status} - ${text}`);
  }

  return await res.json();
}
