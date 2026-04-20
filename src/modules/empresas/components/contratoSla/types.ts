// ============================================================
// Tipos unificados para el wizard Contrato + SLA
// ============================================================

// ──────────────── PASO 1: Datos del Contrato ────────────────
export interface DatosContratoForm {
  tipoContrato: string;
  estadoContrato: string;
  fechaInicio: string;
  fechaFin: string;
  renovacionAutomatica: boolean;
  responsableComercial: string;
  observacionesContractuales: string;
  visitaFrecuencia: string;
  cantidadVisitas: string;
}

// ──────────────── PASO 2: Servicios Incluidos ────────────────
export interface ServicioPersonalizado {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface ServiciosForm {
  soporteRemoto: boolean;
  soportePresencial: boolean;
  mantenimientoPreventivo: boolean;
  gestionInventario: boolean;
  gestionCredenciales: boolean;
  monitoreo: boolean;
  informesMensuales: boolean;
  gestionAccesos: boolean;
  horasMensualesIncluidas: string;
  excesoHorasFacturable: boolean;
  serviciosPersonalizados: ServicioPersonalizado[];
}

// ──────────────── PASO 3: Mantenimientos Preventivos ────────────────
export interface MantenimientoForm {
  incluyePreventivo: boolean;
  frecuencia: string;
  modalidad: string;
  aplica: string; // 'todos' | 'por_categoria'
  categoriasAplica: string[]; // IDs de categorías seleccionadas
  observaciones: string;
}

// ──────────────── PASO 4: Condiciones Económicas ────────────────
export interface EconomicasForm {
  tipoFacturacion: string;
  montoReferencial: string;
  moneda: string;
  diaFacturacion: string;
  observaciones: string;
}

// ──────────────── PASO 5: Alcance del SLA ────────────────
export interface AlcanceSlaForm {
  slaActivo: boolean;
  aplicaA: 'incidentes';
  tiposTicket: string[];
  serviciosCatalogoSLA: {
    tipo: 'todos' | 'seleccionados';
    servicios?: string[];
  };
  activosCubiertos: {
    tipo: 'todos' | 'porCategoria';
    categorias?: string[];
    categoriasPersonalizadas?: string[];
  };
  sedesCubiertas: {
    tipo: 'todas' | 'seleccionadas';
    sedes?: string[];
  };
  observaciones: string;
}

// ──────────────── PASO 6: Tiempos del SLA ────────────────
export type PrioridadSLA = 'critica' | 'alta' | 'media' | 'baja';

export interface TiempoPrioridad {
  prioridad: PrioridadSLA;
  tiempoRespuesta: string;
  tiempoResolucion: string;
  escalamiento: boolean;
  tiempoEscalamiento?: string;
}

export interface TiemposSlaForm {
  tiemposPorPrioridad: TiempoPrioridad[];
}

// ──────────────── PASO 7: Horarios de Atención ────────────────
export type DiaSemana = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado' | 'Domingo';

export interface DiaConfig {
  atiende: boolean;
  horaInicio: string;
  horaFin: string;
}

export interface HorariosSlaForm {
  dias: Record<DiaSemana, DiaConfig>;
  excluirFeriados: boolean;
  calendarioFeriados: string[];
  atencionFueraHorario?: boolean;
  aplicaSLAFueraHorario?: boolean;
}

// ──────────────── Estado completo del wizard ────────────────
export interface WizardContratoSlaState {
  // Paso actual (1-7 para creación, 1-8 para renovación con motivo)
  currentStep: number;
  totalSteps: number;
  isRenewal: boolean;

  // Datos por paso
  datosContrato: DatosContratoForm;
  servicios: ServiciosForm;
  mantenimiento: MantenimientoForm;
  economicas: EconomicasForm;
  alcanceSla: AlcanceSlaForm;
  tiemposSla: TiemposSlaForm;
  horariosSla: HorariosSlaForm;

  // Solo en renovación
  motivoRenovacion?: string;
}

// ──────────────── Entidad Contrato guardada ────────────────
export interface ContratoVersion {
  id: string;
  version: number;
  estado: 'activo' | 'historico' | 'vencido' | 'suspendido';
  fechaInicio: string;
  fechaFin: string;
  tipoContrato: string;
  motivoRenovacion?: string;
  aprobadoPor?: string;
  creadoPor?: string;
  creadoEn?: string;
  monto?: number;
  moneda?: string;
  // Datos completos del contrato
  datosContrato?: DatosContratoForm;
  servicios?: ServiciosForm;
  mantenimiento?: MantenimientoForm;
  economicas?: EconomicasForm;
  alcanceSla?: AlcanceSlaForm;
  tiemposSla?: TiemposSlaForm;
  horariosSla?: HorariosSlaForm;
}

// ──────────────── Documento del contrato ────────────────
export interface DocumentoContrato {
  id?: string;
  _id?: string;
  nombre: string;
  url?: string;
  archivo?: string;
  fecha: string;
  hora?: string;
  usuario?: string;
  tipo: 'auto' | 'manual';
  hash?: string;
}

// ──────────────── Defaults ────────────────
export const defaultDatosContrato: DatosContratoForm = {
  tipoContrato: '',
  estadoContrato: '',
  fechaInicio: '',
  fechaFin: '',
  renovacionAutomatica: true,
  responsableComercial: '',
  observacionesContractuales: '',
  visitaFrecuencia: '',
  cantidadVisitas: '',
};

export const defaultServicios: ServiciosForm = {
  soporteRemoto: false,
  soportePresencial: false,
  mantenimientoPreventivo: false,
  gestionInventario: false,
  gestionCredenciales: false,
  monitoreo: false,
  informesMensuales: false,
  gestionAccesos: false,
  horasMensualesIncluidas: '',
  excesoHorasFacturable: false,
  serviciosPersonalizados: [],
};

export const defaultMantenimiento: MantenimientoForm = {
  incluyePreventivo: false,
  frecuencia: '',
  modalidad: '',
  aplica: '',
  categoriasAplica: [],
  observaciones: '',
};

export const defaultEconomicas: EconomicasForm = {
  tipoFacturacion: '',
  montoReferencial: '',
  moneda: '',
  diaFacturacion: '',
  observaciones: '',
};

export const defaultAlcanceSla: AlcanceSlaForm = {
  slaActivo: false,
  aplicaA: 'incidentes',
  tiposTicket: [],
  serviciosCatalogoSLA: { tipo: 'todos', servicios: [] },
  activosCubiertos: { tipo: 'todos', categorias: [], categoriasPersonalizadas: [] },
  sedesCubiertas: { tipo: 'todas', sedes: [] },
  observaciones: '',
};

const DIAS_ORDER: DiaSemana[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

export const defaultHorariosSla: HorariosSlaForm = {
  dias: Object.fromEntries(
    DIAS_ORDER.map((d, i) => [d, { atiende: i < 5, horaInicio: '08:00', horaFin: '18:00' }])
  ) as Record<DiaSemana, DiaConfig>,
  excluirFeriados: true,
  calendarioFeriados: [],
  atencionFueraHorario: false,
  aplicaSLAFueraHorario: false,
};

export const defaultTiemposSla: TiemposSlaForm = {
  tiemposPorPrioridad: [
    { prioridad: 'critica', tiempoRespuesta: '1 hora', tiempoResolucion: '4 horas', escalamiento: true, tiempoEscalamiento: '2 horas' },
    { prioridad: 'alta', tiempoRespuesta: '2 horas', tiempoResolucion: '8 horas', escalamiento: true, tiempoEscalamiento: '4 horas' },
    { prioridad: 'media', tiempoRespuesta: '4 horas', tiempoResolucion: '24 horas', escalamiento: false },
    { prioridad: 'baja', tiempoRespuesta: '8 horas', tiempoResolucion: '48 horas', escalamiento: false },
  ],
};

export const WIZARD_STEPS = [
  { step: 1, label: 'Datos del Contrato', icon: '📋', group: 'contrato' },
  { step: 2, label: 'Servicios Incluidos', icon: '📦', group: 'contrato' },
  { step: 3, label: 'Mantenimientos Preventivos', icon: '🔧', group: 'contrato' },
  { step: 4, label: 'Condiciones Económicas', icon: '💰', group: 'contrato' },
  { step: 5, label: 'Alcance del SLA', icon: '🎯', group: 'sla' },
  { step: 6, label: 'Tiempos del SLA', icon: '⏱️', group: 'sla' },
  { step: 7, label: 'Horarios de Atención', icon: '🕐', group: 'sla' },
] as const;

export const WIZARD_STEPS_RENEWAL = [
  ...WIZARD_STEPS,
  { step: 8, label: 'Motivo de Renovación', icon: '🔁', group: 'renovacion' },
] as const;
