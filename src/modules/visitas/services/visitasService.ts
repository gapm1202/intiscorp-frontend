import type { 
  Visita, 
  CrearVisitaPayload, 
  ActualizarVisitaPayload, 
  FinalizarVisitaPayload,
  ResumenContractualVisitas,
  FiltrosVisitas
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Obtener token del localStorage
function getToken(): string | null {
  return localStorage.getItem('token');
}

// GET todas las visitas con filtros
export async function getVisitas(parametros?: FiltrosVisitas & { limite?: number; pagina?: number }) {
  const params = new URLSearchParams();
  
  if (parametros?.empresaId) params.append('empresaId', parametros.empresaId);
  if (parametros?.sedeId) params.append('sedeId', parametros.sedeId);
  if (parametros?.mes) params.append('mes', parametros.mes);
  if (parametros?.tecnicoEncargado) params.append('tecnicoEncargado', parametros.tecnicoEncargado);
  if (parametros?.estado) params.append('estado', parametros.estado);
  if (parametros?.tipoVisita) params.append('tipoVisita', parametros.tipoVisita);
  if (parametros?.limite) params.append('limite', String(parametros.limite));
  if (parametros?.pagina) params.append('pagina', String(parametros.pagina));

  const url = `${API_BASE}/api/visitas?${params.toString()}`;
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
    throw new Error(`Error fetching visitas: ${res.status} - ${text}`);
  }

  return await res.json();
}

// GET visita por ID
export async function getVisitaById(visitaId: string) {
  const url = `${API_BASE}/api/visitas/${visitaId}`;
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
    throw new Error(`Error fetching visita: ${res.status} - ${text}`);
  }

  return await res.json();
}

// GET resumen contractual de visitas para un contrato
export async function getResumenContractualVisitas(contratoId: string): Promise<ResumenContractualVisitas> {
  const url = `${API_BASE}/api/visitas/resumen/${contratoId}`;
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
    throw new Error(`Error fetching resumen visitas: ${res.status} - ${text}`);
  }

  return await res.json();
}

// POST crear nueva visita
export async function crearVisita(payload: CrearVisitaPayload) {
  const url = `${API_BASE}/api/visitas`;
  const token = getToken();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error creating visita: ${res.status} - ${text}`);
  }

  return await res.json();
}

// PATCH actualizar visita
export async function actualizarVisita(visitaId: string, payload: ActualizarVisitaPayload) {
  const url = `${API_BASE}/api/visitas/${visitaId}`;
  const token = getToken();

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error updating visita: ${res.status} - ${text}`);
  }

  return await res.json();
}

// PATCH iniciar visita (cambiar estado a EN_PROCESO)
export async function iniciarVisita(visitaId: string) {
  const url = `${API_BASE}/api/visitas/${visitaId}/iniciar`;
  const token = getToken();

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error starting visita: ${res.status} - ${text}`);
  }

  return await res.json();
}

// PATCH finalizar visita con registro de clausura
export async function finalizarVisita(visitaId: string, payload: FinalizarVisitaPayload) {
  const url = `${API_BASE}/api/visitas/${visitaId}/finalizar`;
  const token = getToken();

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error finalizing visita: ${res.status} - ${text}`);
  }

  return await res.json();
}

// PATCH cancelar visita
export async function cancelarVisita(visitaId: string, motivo?: string) {
  const url = `${API_BASE}/api/visitas/${visitaId}/cancelar`;
  const token = getToken();

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ motivo }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error canceling visita: ${res.status} - ${text}`);
  }

  return await res.json();
}

// GET visitas de un técnico en una fecha específica
export async function getVisitasTecnicoEnFecha(tecnicoId: string, fecha: string) {
  const url = `${API_BASE}/api/visitas/tecnico/${tecnicoId}/fecha/${fecha}`;
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
    throw new Error(`Error fetching visitas tecnico: ${res.status} - ${text}`);
  }

  return await res.json();
}

// GET validar límite contractual
export async function validarLimiteContractual(empresaId: string, mes: string): Promise<{ 
  puedeAgregarVisitas: boolean; 
  visitasRealizadas: number;
  visitasRequeridas: number;
  mensaje?: string;
}> {
  const url = `${API_BASE}/api/visitas/validar-limite/${empresaId}/${mes}`;
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
    throw new Error(`Error validating limite: ${res.status} - ${text}`);
  }

  return await res.json();
}
