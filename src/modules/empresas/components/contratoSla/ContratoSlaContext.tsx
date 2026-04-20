import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  WizardContratoSlaState,
  DatosContratoForm,
  ServiciosForm,
  MantenimientoForm,
  EconomicasForm,
  AlcanceSlaForm,
  TiemposSlaForm,
  HorariosSlaForm,
} from './types';
import {
  defaultDatosContrato,
  defaultServicios,
  defaultMantenimiento,
  defaultEconomicas,
  defaultAlcanceSla,
  defaultTiemposSla,
  defaultHorariosSla,
} from './types';

// ──────────────── Estado inicial ────────────────
const buildInitial = (isRenewal = false): WizardContratoSlaState => ({
  currentStep: 1,
  totalSteps: isRenewal ? 8 : 7,
  isRenewal,
  datosContrato: { ...defaultDatosContrato },
  servicios: { ...defaultServicios, serviciosPersonalizados: [] },
  mantenimiento: { ...defaultMantenimiento },
  economicas: { ...defaultEconomicas },
  alcanceSla: { ...defaultAlcanceSla },
  tiemposSla: { ...defaultTiemposSla },
  horariosSla: { ...defaultHorariosSla },
  motivoRenovacion: undefined,
});

// ──────────────── Acciones ────────────────
type Action =
  | { type: 'SET_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_DATOS_CONTRATO'; data: DatosContratoForm }
  | { type: 'SET_SERVICIOS'; data: ServiciosForm }
  | { type: 'SET_MANTENIMIENTO'; data: MantenimientoForm }
  | { type: 'SET_ECONOMICAS'; data: EconomicasForm }
  | { type: 'SET_ALCANCE_SLA'; data: AlcanceSlaForm }
  | { type: 'SET_TIEMPOS_SLA'; data: TiemposSlaForm }
  | { type: 'SET_HORARIOS_SLA'; data: HorariosSlaForm }
  | { type: 'SET_MOTIVO_RENOVACION'; motivo: string }
  | { type: 'INIT_RENEWAL'; prefilledData?: Partial<WizardContratoSlaState> }
  | { type: 'RESET' };

// ──────────────── Reducer ────────────────
function reducer(state: WizardContratoSlaState, action: Action): WizardContratoSlaState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, state.totalSteps) };
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };
    case 'SET_DATOS_CONTRATO':
      return { ...state, datosContrato: action.data };
    case 'SET_SERVICIOS':
      return { ...state, servicios: action.data };
    case 'SET_MANTENIMIENTO':
      return { ...state, mantenimiento: action.data };
    case 'SET_ECONOMICAS':
      return { ...state, economicas: action.data };
    case 'SET_ALCANCE_SLA':
      return { ...state, alcanceSla: action.data };
    case 'SET_TIEMPOS_SLA':
      return { ...state, tiemposSla: action.data };
    case 'SET_HORARIOS_SLA':
      return { ...state, horariosSla: action.data };
    case 'SET_MOTIVO_RENOVACION':
      return { ...state, motivoRenovacion: action.motivo };
    case 'INIT_RENEWAL':
      return {
        ...buildInitial(true),
        ...(action.prefilledData || {}),
        currentStep: 1,
        isRenewal: true,
        totalSteps: 8,
      };
    case 'RESET':
      return buildInitial(false);
    default:
      return state;
  }
}

// ──────────────── Context ────────────────
interface ContratoSlaContextValue {
  state: WizardContratoSlaState;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setDatosContrato: (data: DatosContratoForm) => void;
  setServicios: (data: ServiciosForm) => void;
  setMantenimiento: (data: MantenimientoForm) => void;
  setEconomicas: (data: EconomicasForm) => void;
  setAlcanceSla: (data: AlcanceSlaForm) => void;
  setTiemposSla: (data: TiemposSlaForm) => void;
  setHorariosSla: (data: HorariosSlaForm) => void;
  setMotivoRenovacion: (motivo: string) => void;
  initRenewal: (prefilledData?: Partial<WizardContratoSlaState>) => void;
  reset: () => void;
}

const ContratoSlaContext = createContext<ContratoSlaContextValue | null>(null);

export function ContratoSlaProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, buildInitial(false));

  const goToStep = useCallback((step: number) => dispatch({ type: 'SET_STEP', step }), []);
  const nextStep = useCallback(() => dispatch({ type: 'NEXT_STEP' }), []);
  const prevStep = useCallback(() => dispatch({ type: 'PREV_STEP' }), []);
  const setDatosContrato = useCallback((data: DatosContratoForm) => dispatch({ type: 'SET_DATOS_CONTRATO', data }), []);
  const setServicios = useCallback((data: ServiciosForm) => dispatch({ type: 'SET_SERVICIOS', data }), []);
  const setMantenimiento = useCallback((data: MantenimientoForm) => dispatch({ type: 'SET_MANTENIMIENTO', data }), []);
  const setEconomicas = useCallback((data: EconomicasForm) => dispatch({ type: 'SET_ECONOMICAS', data }), []);
  const setAlcanceSla = useCallback((data: AlcanceSlaForm) => dispatch({ type: 'SET_ALCANCE_SLA', data }), []);
  const setTiemposSla = useCallback((data: TiemposSlaForm) => dispatch({ type: 'SET_TIEMPOS_SLA', data }), []);
  const setHorariosSla = useCallback((data: HorariosSlaForm) => dispatch({ type: 'SET_HORARIOS_SLA', data }), []);
  const setMotivoRenovacion = useCallback((motivo: string) => dispatch({ type: 'SET_MOTIVO_RENOVACION', motivo }), []);
  const initRenewal = useCallback((prefilledData?: Partial<WizardContratoSlaState>) =>
    dispatch({ type: 'INIT_RENEWAL', prefilledData }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <ContratoSlaContext.Provider value={{
      state, goToStep, nextStep, prevStep,
      setDatosContrato, setServicios, setMantenimiento, setEconomicas,
      setAlcanceSla, setTiemposSla, setHorariosSla, setMotivoRenovacion,
      initRenewal, reset,
    }}>
      {children}
    </ContratoSlaContext.Provider>
  );
}

export function useContratoSla(): ContratoSlaContextValue {
  const ctx = useContext(ContratoSlaContext);
  if (!ctx) throw new Error('useContratoSla must be used within ContratoSlaProvider');
  return ctx;
}
