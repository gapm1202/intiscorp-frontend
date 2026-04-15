const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ContractualVisitNotification {
  empresaId: string;
  empresaNombre: string;
  visitaFrecuencia: string;
  periodoInicio?: string;
  periodoFin?: string;
  cantidadVisitas: number;
  visitasRegistradas: number;
  visitasFaltantes: number;
  periodoEtiqueta: string;
  mensaje: string;
}

const normalizeFrequency = (frequency?: string) => String(frequency || '').trim().toLowerCase();

const getPeriodoEtiqueta = (frequency?: string) => {
  const normalizedFrequency = normalizeFrequency(frequency);

  if (normalizedFrequency.includes('diar')) {
    return 'del dia';
  }

  if (normalizedFrequency.includes('quinc')) {
    return 'de la quincena';
  }

  if (normalizedFrequency.includes('seman')) {
    return 'de la semana';
  }

  return 'del mes';
};

const formatDateEs = (value?: string) => {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

const getPeriodoEtiquetaFromBackend = (periodoInicio?: string, periodoFin?: string) => {
  const inicio = formatDateEs(periodoInicio);
  const fin = formatDateEs(periodoFin);

  if (!inicio || !fin) return '';
  return `del ${inicio} al ${fin}`;
};

function getToken(): string | null {
  return localStorage.getItem('token');
}

interface BackendContractualNotificationItem {
  contratoId?: string | number;
  empresaId?: string | number;
  empresaNombre?: string;
  visitaFrecuencia?: string;
  periodoInicio?: string;
  periodoFin?: string;
  visitasRequeridas?: number | string;
  visitasValidas?: number | string;
  visitasFaltantes?: number | string;
}

interface BackendContractualNotificationsResponse {
  generatedAt?: string;
  totalContratosEvaluados?: number;
  totalContratosPendientes?: number;
  items?: BackendContractualNotificationItem[];
}

const buildMensaje = (
  empresaNombre: string,
  cantidadVisitas: number,
  visitasRegistradas: number,
  visitasFaltantes: number,
  periodoEtiqueta: string,
) => {
  if (visitasRegistradas === 0) {
    return `Empresa ${empresaNombre} aun no generas las ${cantidadVisitas} visitas ${periodoEtiqueta}`;
  }

  return `Empresa ${empresaNombre} falta generar ${visitasFaltantes} visita${visitasFaltantes === 1 ? '' : 's'} ${periodoEtiqueta}`;
};

export async function getContractualVisitNotifications(): Promise<ContractualVisitNotification[]> {
  const token = getToken();
  const url = `${API_BASE}/api/visitas/notificaciones/contractuales-pendientes`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error fetching contractual notifications: ${res.status} - ${text}`);
  }

  const payload = (await res.json()) as BackendContractualNotificationsResponse;
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return items
    .map((item) => {
      const empresaId = String(item?.empresaId ?? '');
      const empresaNombre = String(item?.empresaNombre || 'Empresa');
      const visitaFrecuencia = String(item?.visitaFrecuencia || '');
      const periodoInicio = item?.periodoInicio ? String(item.periodoInicio) : undefined;
      const periodoFin = item?.periodoFin ? String(item.periodoFin) : undefined;
      const cantidadVisitas = Number(item?.visitasRequeridas ?? 0);
      const visitasRegistradas = Number(item?.visitasValidas ?? 0);
      const visitasFaltantes = Number(item?.visitasFaltantes ?? 0);

      if (!empresaId || !cantidadVisitas || visitasFaltantes <= 0) {
        return null;
      }

      const periodoEtiqueta =
        getPeriodoEtiquetaFromBackend(periodoInicio, periodoFin) ||
        getPeriodoEtiqueta(visitaFrecuencia);

      return {
        empresaId,
        empresaNombre,
        visitaFrecuencia,
        periodoInicio,
        periodoFin,
        cantidadVisitas,
        visitasRegistradas,
        visitasFaltantes,
        periodoEtiqueta,
        mensaje: buildMensaje(empresaNombre, cantidadVisitas, visitasRegistradas, visitasFaltantes, periodoEtiqueta),
      } as ContractualVisitNotification;
    })
    .filter((item): item is ContractualVisitNotification => Boolean(item));
}

// ─── Visitas próximas (PROGRAMADA dentro de los próximos N días) ───────────

export interface UpcomingVisitNotification {
  visitaId: string;
  empresaId: string;
  empresaNombre: string;
  sedeNombre?: string;
  fechaProgramada: string;
  diasRestantes: number;
  mensaje: string;
}

function calcDiasRestantes(fechaProgramada: string): number {
  const dateStr = String(fechaProgramada).substring(0, 10); // "YYYY-MM-DD"
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return NaN;

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const visitMidnight = new Date(year, month - 1, day);

  const diffMs = visitMidnight.getTime() - todayMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export async function getUpcomingVisitNotifications(diasAnticipacion = 3): Promise<UpcomingVisitNotification[]> {
  const token = getToken();
  const params = new URLSearchParams();
  params.append('estado', 'PROGRAMADA');
  params.append('limite', '500');

  const url = `${API_BASE}/api/visitas?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error fetching upcoming visits: ${res.status} - ${text}`);
  }

  const data = await res.json();
  const visitas: any[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

  return visitas
    .filter(v => {
      if (!v?.fechaProgramada) return false;
      const dias = calcDiasRestantes(String(v.fechaProgramada));
      return !Number.isNaN(dias) && dias >= 0 && dias <= diasAnticipacion;
    })
    .map(v => {
      const diasRestantes = calcDiasRestantes(String(v.fechaProgramada));
      const empresaNombre = String(v?.empresaNombre || 'Empresa');

      const mensaje =
        diasRestantes === 0
          ? `Hoy es la visita en la empresa ${empresaNombre}`
          : diasRestantes === 1
          ? `Falta 1 día para la visita en la empresa ${empresaNombre}`
          : `Faltan ${diasRestantes} días para la visita en la empresa ${empresaNombre}`;

      return {
        visitaId: String(v?._id || ''),
        empresaId: String(v?.empresaId || ''),
        empresaNombre,
        sedeNombre: v?.sedeNombre ? String(v.sedeNombre) : undefined,
        fechaProgramada: String(v.fechaProgramada),
        diasRestantes,
        mensaje,
      } as UpcomingVisitNotification;
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}