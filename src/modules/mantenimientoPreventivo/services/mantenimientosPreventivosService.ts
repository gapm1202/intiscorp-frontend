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

export type SaveActivoExecutionPayload = {
  mantenimientoId: string;
  activoId: string;
  fechaInicio: string;
  fechaFin: string;
  diagnostico: string;
  trabajoRealizado: string;
  recomendaciones: string;
  observaciones: string;
  tecnicoNombre: string;
  tecnicoEmail: string;
  usuarioNombre: string;
  usuarioEmail: string;
  firmaTecnicoTipo: 'AUTO' | 'TRAZAR';
  firmaTecnicoValor: string;
  firmaUsuarioTipo: 'AUTO' | 'TRAZAR';
  firmaUsuarioValor: string;
  checklist: Array<{
    key: string;
    label: string;
    estado: 'SI' | 'NO';
    comentario: string;
  }>;
  evidenciaAntes: string; // base64 o URL
  evidenciaDespues: string; // base64 o URL
};

export type SaveActivoExecutionResponse = {
  ejecucionId: string;
  estado: string;
  pdf?: {
    url: string;
    estado: string;
  };
};

export type GetActivoExecutionResponse = {
  ejecucionId: string;
  estado: string;
  pdf?: {
    url?: string;
    estado?: string;
  };
};

export async function getActivoExecution(
  mantenimientoId: string,
  activoId: string
): Promise<GetActivoExecutionResponse | null> {
  const url = `/api/mantenimientos/${mantenimientoId}/activos/${activoId}/ejecucion`;

  try {
    const response = await axiosClient.get(url);
    const result = response?.data?.data || response?.data || {};
    return result as GetActivoExecutionResponse;
  } catch (error: unknown) {
    const err = error as AxiosErrorLike;
    if (err.response?.status === 404) return null;
    if (err.response?.status && err.response.status >= 500) {
      console.warn('[getActivoExecution] Backend 5xx, se omite precarga de ejecucion:', err.response?.data);
      return null;
    }

    const serverMessage =
      extractBackendErrorMessage(err.response?.data) ||
      err.message ||
      'No se pudo consultar la ejecución del activo.';
    throw new Error(serverMessage);
  }
}

function normalizeSignatureType(raw: unknown): 'AUTO' | 'TRAZAR' {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!value) return 'AUTO';

  const autoValues = new Set(['auto', 'automatica', 'autogenerada']);
  const trazarValues = new Set(['trazar', 'draw', 'manual', 'sign', 'firma']);

  if (autoValues.has(value)) return 'AUTO';
  if (trazarValues.has(value)) return 'TRAZAR';

  return value === 'trazar' ? 'TRAZAR' : 'AUTO';
}

export async function saveActivoExecution(
  payload: SaveActivoExecutionPayload
): Promise<SaveActivoExecutionResponse> {
  const { mantenimientoId, activoId, ...body } = payload;

  const firmaTecnicoTipo = normalizeSignatureType(body.firmaTecnicoTipo);
  const firmaUsuarioTipo = normalizeSignatureType(body.firmaUsuarioTipo);
  const firmaTecnicoValor = String(body.firmaTecnicoValor || '').trim();
  const firmaUsuarioValor = String(body.firmaUsuarioValor || '').trim();

  if (!firmaTecnicoValor || !firmaUsuarioValor) {
    throw new Error('Las firmas de tecnico y usuario deben incluir valor.');
  }

  const firmas = {
    firmaTecnico: {
      tipo: firmaTecnicoTipo,
      valor: firmaTecnicoValor,
    },
    firmaUsuario: {
      tipo: firmaUsuarioTipo,
      valor: firmaUsuarioValor,
    },
  };

  const signatures = [
    {
      role: 'TECNICO',
      rol: 'TECNICO',
      target: 'tecnico',
      tipo: firmaTecnicoTipo,
      type: firmaTecnicoTipo,
      valor: firmaTecnicoValor,
      value: firmaTecnicoValor,
    },
    {
      role: 'USUARIO',
      rol: 'USUARIO',
      target: 'usuario',
      tipo: firmaUsuarioTipo,
      type: firmaUsuarioTipo,
      valor: firmaUsuarioValor,
      value: firmaUsuarioValor,
    },
  ];

  // Backend requiere específicamente itemKey + estado + comentario
  const enrichedChecklist = body.checklist.map((item) => ({
    itemKey: item.key,
    estado: item.estado || 'SI',
    comentario: item.comentario || '',
  }));

  const bodyCamel = {
    fechaInicio: body.fechaInicio,
    fechaFin: body.fechaFin,
    diagnostico: body.diagnostico,
    trabajoRealizado: body.trabajoRealizado,
    recomendaciones: body.recomendaciones,
    observaciones: body.observaciones,
    tecnicoNombre: body.tecnicoNombre,
    tecnicoEmail: body.tecnicoEmail,
    usuarioNombre: body.usuarioNombre,
    usuarioEmail: body.usuarioEmail,
    firmaTecnicoTipo,
    firmaTecnicoValor,
    firmaUsuarioTipo,
    firmaUsuarioValor,
    firmas,
    signatures,
    checklist: enrichedChecklist,
    evidenciaAntes: body.evidenciaAntes,
    evidenciaDespues: body.evidenciaDespues,
  };

  const bodySnake = {
    fecha_inicio: body.fechaInicio,
    fecha_fin: body.fechaFin,
    diagnostico: body.diagnostico,
    trabajo_realizado: body.trabajoRealizado,
    recomendaciones: body.recomendaciones,
    observaciones: body.observaciones,
    tecnico_nombre: body.tecnicoNombre,
    tecnico_email: body.tecnicoEmail,
    usuario_nombre: body.usuarioNombre,
    usuario_email: body.usuarioEmail,
    firma_tecnico_tipo: firmaTecnicoTipo,
    firma_tecnico_valor: firmaTecnicoValor,
    firma_usuario_tipo: firmaUsuarioTipo,
    firma_usuario_valor: firmaUsuarioValor,
    firmas,
    signatures,
    checklist: enrichedChecklist,
    evidencia_antes: body.evidenciaAntes,
    evidencia_despues: body.evidenciaDespues,
  };

  const url = `/api/mantenimientos/${mantenimientoId}/activos/${activoId}/ejecucion`;

  console.log('📤 [saveActivoExecution] Enviando payload camelCase:', {
    url,
    evidenciaAntes: bodyCamel.evidenciaAntes ? `${bodyCamel.evidenciaAntes.substring(0, 50)}...` : 'VACIO',
    evidenciaDespues: bodyCamel.evidenciaDespues ? `${bodyCamel.evidenciaDespues.substring(0, 50)}...` : 'VACIO',
    checklistItems: bodyCamel.checklist.length,
    checklistSample: bodyCamel.checklist.slice(0, 1),
    firmas: bodyCamel.firmas,
    signatures: bodyCamel.signatures,
  });

  try {
    // Backend devuelve 201 Created
    const response = await axiosClient.post(url, bodyCamel);
    const result = response?.data?.data || response?.data || {};
    console.log('🟢 [saveActivoExecution] Respuesta 201 exitosa:', {
      ejecucionId: result.ejecucionId,
      estado: result.estado,
      pdf: result.pdf,
    });
    return result as SaveActivoExecutionResponse;
  } catch (error: unknown) {
    const firstErr = error as AxiosErrorLike;
    const status = firstErr.response?.status;
    
    console.log(`🔴 [saveActivoExecution] Error camelCase (${status}):`, firstErr.response?.data);

    const firstMessage = extractBackendErrorMessage(firstErr.response?.data)?.toLowerCase() || '';
    const shouldRetryAsSnakeCase =
      status === 422 ||
      (status === 400 &&
        (firstMessage.includes('itemkey') ||
          firstMessage.includes('snake') ||
          firstMessage.includes('camel') ||
          firstMessage.includes('campo') ||
          firstMessage.includes('formato')));

    // Reintentar con snake_case solo cuando parece un mismatch de naming/formato
    if (shouldRetryAsSnakeCase) {
      console.log('🔄 [saveActivoExecution] Reintentando con snake_case:', {
        url,
        evidencia_antes: bodySnake.evidencia_antes ? `${bodySnake.evidencia_antes.substring(0, 50)}...` : 'VACIO',
        evidencia_despues: bodySnake.evidencia_despues ? `${bodySnake.evidencia_despues.substring(0, 50)}...` : 'VACIO',
      });
      
      try {
        const fallbackResponse = await axiosClient.post(url, bodySnake);
        const fallbackResult = fallbackResponse?.data?.data || fallbackResponse?.data || {};
        console.log('🟢 [saveActivoExecution] Respuesta 201 exitosa (snake_case):', {
          ejecucionId: fallbackResult.ejecucionId,
          estado: fallbackResult.estado,
          pdf: fallbackResult.pdf,
        });
        return fallbackResult as SaveActivoExecutionResponse;
      } catch (fallbackError: unknown) {
        const fallbackErr = fallbackError as AxiosErrorLike;
        const fallbackStatus = fallbackErr.response?.status;
        const fallbackData = fallbackErr.response?.data;
        console.log(`🔴 [saveActivoExecution] Error snake_case (${fallbackStatus}):`, fallbackData);
        const fallbackMessage =
          extractBackendErrorMessage(fallbackData) ||
          fallbackErr.message ||
          'No se pudo guardar la ejecución del activo.';

        throw new Error(fallbackMessage);
      }
    }

    // Error diferente de 400/422
    const firstData = firstErr.response?.data;
    const backendMessage = extractBackendErrorMessage(firstData) || '';
    if (status && status >= 500) {
      throw new Error(
        backendMessage ||
          'Error interno del backend al guardar la ejecución. Revisa el servicio de mantenimientos (SQL/API).'
      );
    }

    const serverMessage =
      backendMessage ||
      firstErr.message ||
      'No se pudo guardar la ejecución del activo.';

    throw new Error(serverMessage);
  }
}
