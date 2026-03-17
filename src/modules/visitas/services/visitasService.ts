import type { 
  Visita, 
  CrearVisitaPayload, 
  ActualizarVisitaPayload, 
  FinalizarVisitaPayload,
  ResumenContractualVisitas,
  FiltrosVisitas
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function safeParseJson(text: string) {
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// Obtener token del localStorage
function getToken(): string | null {
  return localStorage.getItem('token');
}

// GET todas las visitas con filtros
export async function getVisitas(parametros?: FiltrosVisitas & { limite?: number; pagina?: number }) {
  const params = new URLSearchParams();
  
  if (parametros?.empresaId) params.append('empresaId', parametros.empresaId);
  if (parametros?.sedeId) params.append('sedeId', parametros.sedeId);
  if (parametros?.ticketId) params.append('ticketId', parametros.ticketId);
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
// PATCH finalizar visita con soporte opcional de imágenes (imagenes_visita[])
export async function finalizarVisita(visitaId: string, payload: FinalizarVisitaPayload | Record<string, any>, images?: File[]) {
  const visitaIdNum = Number(visitaId);
  if (!Number.isInteger(visitaIdNum) || visitaIdNum <= 0) {
    throw new Error('No se encontró el ID de la visita a finalizar');
  }

  const url = `${API_BASE}/api/visitas/${visitaIdNum}/finalizar`;
  const token = getToken();

  // Si vienen imágenes, enviar multipart/form-data
  if (Array.isArray(images) && images.length > 0) {
    const form = new FormData();
    // Append explicitly the fields expected by backend to avoid undefined body
    if ((payload as any)?.fechaFinalizacion) form.append('fechaFinalizacion', String((payload as any).fechaFinalizacion));
    if ((payload as any)?.diagnostico) form.append('diagnostico', String((payload as any).diagnostico));
    if ((payload as any)?.resolucion) form.append('resolucion', String((payload as any).resolucion));
    if ((payload as any)?.recomendacion) form.append('recomendacion', String((payload as any).recomendacion));
    // Append remaining payload keys generically if any
    Object.keys(payload || {}).forEach((k) => {
      if (['fechaFinalizacion', 'diagnostico', 'resolucion', 'recomendacion'].includes(k)) return;
      const v = (payload as any)[k];
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) {
        v.forEach((item) => form.append(`${k}[]`, typeof item === 'object' ? JSON.stringify(item) : String(item)));
      } else if (typeof v === 'object') {
        form.append(k, JSON.stringify(v));
      } else {
        form.append(k, String(v));
      }
    });

    images.forEach((f) => {
      // Multer expects the field name without brackets
      form.append('imagenes_visita', f, f.name);
    });

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error finalizing visita (multipart): ${res.status} - ${text}`);
    }

    return await res.json();
  }

  // Default: enviar JSON
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

export interface EnviarResumenVisitaCorreoPayload {
  destinatarios: string[];
  pdfBase64: string;
  pdfFileName: string;
  resumen: {
    fechaVisita: string;
    tecnicoEncargado: string;
    observacionesClausura: string;
    cuentaComoVisitaContractual: 'Si' | 'No';
    huboCambioComponente: 'Si' | 'No';
  };
}

export interface FirmaConformidadEstadoResponse {
  [key: string]: any;
}

export interface RegistrarFirmaConformidadPayload {
  token: string;
  firma_cliente_base64: string;
  nombre_cliente: string;
  calificacion: number;
}

// POST enviar correo de cierre de visita con PDF adjunto
export async function enviarResumenVisitaCorreo(
  visitaId: string,
  payload: EnviarResumenVisitaCorreoPayload,
) {
  const token = getToken();
  const candidates = [
    `${API_BASE}/api/visitas/${visitaId}/notificar-cierre`,
    `${API_BASE}/api/visitas/${visitaId}/enviar-correo-cierre`,
  ];

  let lastStatus = 0;
  let lastBody = '';

  for (const url of candidates) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return await res.json();
    }

    lastStatus = res.status;
    lastBody = await res.text();
    if (res.status !== 404) break;
  }

  throw new Error(`Error sending visita closure email: ${lastStatus} - ${lastBody}`);
}

// GET estado público del enlace de firma de conformidad
export async function consultarFirmaConformidad(token: string): Promise<FirmaConformidadEstadoResponse> {
  const url = `${API_BASE}/api/visitas/firma-conformidad/${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const text = await res.text();
  const json = safeParseJson(text);

  if (!res.ok) {
    const error = new Error(
      typeof json?.message === 'string'
        ? json.message
        : `Error fetching firma conformidad: ${res.status}`,
    ) as Error & { status?: number; payload?: unknown };
    error.status = res.status;
    error.payload = json;
    throw error;
  }

  return json;
}

// POST registrar firma pública del cliente
export async function registrarFirmaConformidad(
  payload: RegistrarFirmaConformidadPayload,
): Promise<FirmaConformidadEstadoResponse> {
  const url = `${API_BASE}/api/visitas/firma-conformidad`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const json = safeParseJson(text);

  if (!res.ok) {
    const error = new Error(
      typeof json?.message === 'string'
        ? json.message
        : `Error registering firma conformidad: ${res.status}`,
    ) as Error & { status?: number; payload?: unknown };
    error.status = res.status;
    error.payload = json;
    throw error;
  }

  return json;
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
