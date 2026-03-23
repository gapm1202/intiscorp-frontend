import axiosClient from '@/api/axiosClient';

type CreateMantenimientoPayload = {
  empresaId: string;
  sedeId: string;
  fecha: string;
  tecnicoIds: string[];
  encargadoId: string;
  observaciones?: string;
};

type CreatedMantenimiento = {
  id?: number | string;
  _id?: number | string;
};

export type MantenimientoPreventivoRecord = {
  id: string;
  empresaId: string;
  sedeId: string;
  empresaNombre: string;
  sedeNombre: string;
  fechaCreacion: string;
  fechaProgramada: string;
  estado: 'PENDIENTE' | 'PROGRAMADO' | 'EJECUTADO' | 'ATRASADO';
};

type AxiosErrorLike = {
  response?: { data?: unknown; status?: number };
  message?: string;
};

function extractBackendErrorMessage(data: unknown): string | undefined {
  if (!data) return undefined;

  if (typeof data === 'string') return data;

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error;

    if (Array.isArray(obj.message) && obj.message.length > 0) {
      return obj.message.map((item) => String(item)).join(' | ');
    }

    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0] as Record<string, unknown>;
      const path = Array.isArray(first.path) ? first.path.join('.') : undefined;
      const msg = typeof first.message === 'string' ? first.message : undefined;
      if (path && msg) return `${path}: ${msg}`;
      if (msg) return msg;
      return JSON.stringify(obj.errors);
    }

    return JSON.stringify(obj);
  }

  return undefined;
}

function toNumberOrUndefined(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getCurrentUserId(): number | undefined {
  try {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return undefined;
    const user = JSON.parse(userRaw) as Record<string, unknown>;
    const id = user.id ?? user.userId ?? user.usuarioId ?? user._id;
    if (id === null || id === undefined) return undefined;
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function uniqueNumericIds(ids: string[]): number[] {
  const unique = new Set<number>();
  ids.forEach((id) => {
    const parsed = Number(id);
    if (Number.isFinite(parsed)) unique.add(parsed);
  });
  return Array.from(unique);
}

function normalizeEstado(value: unknown): MantenimientoPreventivoRecord['estado'] {
  const estado = String(value || 'PENDIENTE').toUpperCase();
  if (estado === 'PROGRAMADO' || estado === 'EJECUTADO' || estado === 'ATRASADO') return estado;
  return 'PENDIENTE';
}

function mapMantenimientoRecord(raw: Record<string, unknown>): MantenimientoPreventivoRecord | null {
  const empresaObj = (typeof raw.empresa === 'object' && raw.empresa !== null
    ? (raw.empresa as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const sedeObj = (typeof raw.sede === 'object' && raw.sede !== null
    ? (raw.sede as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const id = String(raw.id ?? raw._id ?? '');
  const empresaId = String(raw.empresaId ?? raw.empresa_id ?? empresaObj.id ?? empresaObj._id ?? '');
  const sedeId = String(raw.sedeId ?? raw.sede_id ?? sedeObj.id ?? sedeObj._id ?? '');

  if (!id || !empresaId || !sedeId) return null;

  const fechaProgramada = String(raw.fechaProgramada ?? raw.fecha_programada ?? '').slice(0, 10);
  const fechaCreacion = String(
    raw.fechaCreacion ?? raw.fecha_creacion ?? raw.creado_at ?? raw.createdAt ?? raw.creadoAt ?? ''
  ).slice(0, 10);
  const empresaNombre = String(raw.empresaNombre ?? raw.empresa_nombre ?? empresaObj.nombre ?? '').trim();
  const sedeNombre = String(raw.sedeNombre ?? raw.sede_nombre ?? sedeObj.nombre ?? '').trim();

  return {
    id,
    empresaId,
    sedeId,
    empresaNombre,
    sedeNombre,
    fechaCreacion,
    fechaProgramada,
    estado: normalizeEstado(raw.estado),
  };
}

function toArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Array.isArray((response as { data?: unknown }).data)
  ) {
    return (response as { data: T[] }).data;
  }
  return [];
}

export async function listMantenimientosPreventivos(filters?: {
  empresaId?: string;
  sedeId?: string;
  mes?: number;
  anio?: number;
}): Promise<MantenimientoPreventivoRecord[]> {
  try {
    const response = await axiosClient.get('/api/mantenimientos', {
      params: {
        empresaId: filters?.empresaId || undefined,
        sedeId: filters?.sedeId || undefined,
        mes: filters?.mes || undefined,
        anio: filters?.anio || undefined,
        empresa_id: filters?.empresaId || undefined,
        sede_id: filters?.sedeId || undefined,
      },
    });

    const list = toArray<Record<string, unknown>>(response?.data)
      .map(mapMantenimientoRecord)
      .filter((item): item is MantenimientoPreventivoRecord => item !== null);

    return list;
  } catch {
    return [];
  }
}

export async function createMantenimientoPreventivo(payload: CreateMantenimientoPayload): Promise<CreatedMantenimiento> {
  const tecnicoIds = uniqueNumericIds(payload.tecnicoIds);
  const encargadoId = toNumberOrUndefined(payload.encargadoId);
  const empresaId = toNumberOrUndefined(payload.empresaId);
  const sedeId = toNumberOrUndefined(payload.sedeId);
  const creadoPor = getCurrentUserId();

  if (!empresaId || !sedeId || !payload.fecha || tecnicoIds.length === 0 || !encargadoId) {
    throw new Error('Faltan campos obligatorios para crear mantenimiento.');
  }

  const observaciones = payload.observaciones?.trim() || undefined;

  const tecnicosAsignados = tecnicoIds.map((id) => ({
    tecnicoId: id,
    esEncargado: id === encargadoId,
  }));

  const bodyCamel = {
    empresaId,
    sedeId,
    fechaProgramada: payload.fecha,
    tecnicosAsignados,
    encargadoId,
    creadoPor,
    observaciones,
  };

  const bodySnake = {
    empresa_id: empresaId,
    sede_id: sedeId,
    fecha_programada: payload.fecha,
    tecnico_ids: tecnicoIds,
    tecnicos: tecnicoIds,
    encargado_id: encargadoId,
    creado_por: creadoPor,
    observaciones,
  };

  try {
    const response = await axiosClient.post('/api/mantenimientos', bodyCamel);
    return response?.data?.data || response?.data || {};
  } catch (error: unknown) {
    const firstErr = error as AxiosErrorLike;

    if (firstErr.response?.status === 400) {
      try {
        const fallbackResponse = await axiosClient.post('/api/mantenimientos', bodySnake);
        return fallbackResponse?.data?.data || fallbackResponse?.data || {};
      } catch (fallbackError: unknown) {
        const fallbackErr = fallbackError as AxiosErrorLike;
        const fallbackData = fallbackErr.response?.data;
        const fallbackMessage =
          extractBackendErrorMessage(fallbackData) ||
          fallbackErr.message ||
          'No se pudo crear el mantenimiento.';

        throw new Error(fallbackMessage);
      }
    }

    const firstData = firstErr.response?.data;
    const serverMessage =
      extractBackendErrorMessage(firstData) ||
      firstErr.message ||
      'No se pudo crear el mantenimiento.';

    throw new Error(serverMessage);
  }
}
