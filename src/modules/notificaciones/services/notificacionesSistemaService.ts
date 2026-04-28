import axiosClient from '@/api/axiosClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificacionSistema {
  id: number;
  tipo: string;
  empresaId: string;
  empresaNombre: string;
  atendida: boolean;
  atendidaPor: number | null;
  atendidaAt: string | null;
  datos: Record<string, unknown>;
  creadoAt: string;
  /** Mensaje legible para mostrar en la campanita */
  mensaje: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalize raw backend row → NotificacionSistema
// The backend may return camelCase or snake_case; we handle both.
// empresa_nombre / empresaNombre can come from a JOIN or from datos.
// ─────────────────────────────────────────────────────────────────────────────

function buildMensaje(tipo: string, empresaNombre: string, datos: Record<string, unknown>): string {
  if (datos.mensaje && typeof datos.mensaje === 'string') return datos.mensaje;

  if (tipo === 'primer_mantenimiento_pendiente') {
    return `Empresa ${empresaNombre} aun no generas el primer mantenimiento, plantea la fecha`;
  }

  return `Notificación pendiente para ${empresaNombre}`;
}

function normalizeNotificacion(raw: unknown): NotificacionSistema | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = Number(r.id ?? 0);
  if (!id) return null;

  const empresaId = String(r.empresa_id ?? r.empresaId ?? '');
  const datos =
    r.datos && typeof r.datos === 'object' && !Array.isArray(r.datos)
      ? (r.datos as Record<string, unknown>)
      : {};

  const empresaNombre = String(
    r.empresa_nombre ?? r.empresaNombre ?? datos.empresaNombre ?? 'Empresa'
  ).trim() || 'Empresa';

  const tipo = String(r.tipo ?? '');

  return {
    id,
    tipo,
    empresaId,
    empresaNombre,
    atendida: Boolean(r.atendida),
    atendidaPor: r.atendida_por != null ? Number(r.atendida_por) : r.atendidaPor != null ? Number(r.atendidaPor) : null,
    atendidaAt: String(r.atendida_at ?? r.atendidaAt ?? '') || null,
    datos,
    creadoAt: String(r.creado_at ?? r.creadoAt ?? ''),
    mensaje: buildMensaje(tipo, empresaNombre, datos),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/notificaciones/pendientes
 *
 * El backend hace un sync automático en cada llamada:
 *   - Crea la notificación si: contrato activo + preventivo habilitado + 0 mantenimientos.
 *   - La elimina si la condición ya no se cumple.
 *
 * Por defecto solo retorna las no atendidas (atendida = false).
 * Pasar `todas=true` para incluir también las ya atendidas.
 */
export async function getNotificacionesPendientes(todas = false): Promise<NotificacionSistema[]> {
  try {
    const response = await axiosClient.get('/api/notificaciones/pendientes', {
      params: todas ? { todas: 'true' } : undefined,
    });

    console.log('[notificacionesSistema] RAW response:', response.status, response.data);
    console.log('[notificacionesSistema] RAW keys:', response.data && typeof response.data === 'object' ? Object.keys(response.data) : 'no es objeto');

    const data = response.data as unknown;
    const list: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.data)
        ? ((data as Record<string, unknown>).data as unknown[])
        : [];

    console.log('[notificacionesSistema] list parsed:', list.length, 'items');

    const normalized = list
      .map(normalizeNotificacion)
      .filter((n): n is NotificacionSistema => n !== null);

    console.log('[notificacionesSistema] normalized:', normalized);

    return normalized;
  } catch (err) {
    console.error('[notificacionesSistema] ERROR al llamar /api/notificaciones/pendientes:', err);
    return [];
  }
}

/**
 * PATCH /api/notificaciones/:id/atender
 *
 * Marca la notificación como atendida en el servidor.
 * atendida = true persiste hasta que la condición desaparezca;
 * si el ciclo vuelve a cumplirse, el backend genera una nueva notificación limpia.
 */
export async function atenderNotificacion(id: number): Promise<void> {
  await axiosClient.patch(`/api/notificaciones/${id}/atender`);
}
