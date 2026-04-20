import { useState, useCallback, useRef } from 'react';
import { useContratoSla } from './ContratoSlaContext';
import { WIZARD_STEPS, WIZARD_STEPS_RENEWAL } from './types';
import type { WizardContratoSlaState } from './types';
import Step1DatosContrato from './steps/Step1DatosContrato';
import Step2Servicios from './steps/Step2Servicios';
import Step3Mantenimiento from './steps/Step3Mantenimiento';
import Step4Economicas from './steps/Step4Economicas';
import Step5AlcanceSla from './steps/Step5AlcanceSla';
import Step6TiemposSla from './steps/Step6TiemposSla';
import Step7Horarios from './steps/Step7Horarios';
import Step8MotivoRenovacion from './steps/Step8MotivoRenovacion';

interface Props {
  empresaId: string;
  sedes?: Array<{ id: string; nombre: string }>;
  usuariosAdmin?: Array<{ id: string; nombre: string }>;
  onSave: (state: WizardContratoSlaState) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

// Step validation helpers
function validateStep(step: number, state: WizardContratoSlaState): string | null {
  switch (step) {
    case 1: {
      const d = state.datosContrato;
      if (!d.tipoContrato) return 'Seleccione el tipo de contrato.';
      if (!d.fechaInicio) return 'Ingrese la fecha de inicio.';
      if (!d.fechaFin) return 'Ingrese la fecha de fin.';
      if (new Date(d.fechaFin) <= new Date(d.fechaInicio)) return 'La fecha de fin debe ser posterior a la de inicio.';
      return null;
    }
    case 4: {
      const e = state.economicas;
      if (!e.tipoFacturacion) return 'Seleccione el tipo de facturación.';
      if (!e.moneda) return 'Seleccione la moneda.';
      if (!e.montoReferencial || parseFloat(e.montoReferencial) <= 0) return 'Ingrese el monto referencial.';
      return null;
    }
    case 8: {
      if (!state.motivoRenovacion?.trim()) return 'Ingrese el motivo de renovación.';
      return null;
    }
    default:
      return null;
  }
}

const GROUP_COLORS: Record<string, string> = {
  contrato: 'blue',
  sla: 'violet',
  renovacion: 'emerald',
};

export default function ContratoSlaWizard({ empresaId, sedes = [], usuariosAdmin = [], onSave, onCancel, isSaving = false }: Props) {
  const { state, nextStep, prevStep, goToStep, setDatosContrato, setServicios, setMantenimiento, setEconomicas, setAlcanceSla, setTiemposSla, setHorariosSla, setMotivoRenovacion } = useContratoSla();
  const [stepError, setStepError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Track which steps had their SLA form "saved" internally
  const slaStep5Saved = useRef(false);
  const slaStep6Saved = useRef(false);
  const slaStep7Saved = useRef(false);
  // Guard against double/triple submit — lives in the wizard, survives parent re-renders
  const isSubmittingRef = useRef(false);

  const steps = state.isRenewal ? WIZARD_STEPS_RENEWAL : WIZARD_STEPS;
  const current = state.currentStep;
  const total = state.totalSteps;
  const currentStepInfo = steps.find(s => s.step === current);
  const group = currentStepInfo?.group || 'contrato';
  const colorMap = { blue: 'blue', violet: 'violet', emerald: 'emerald' } as const;
  const color = colorMap[GROUP_COLORS[group] as keyof typeof colorMap] || 'blue';

  const handleNext = useCallback(() => {
    // Prevent double/triple click before React re-renders with isSaving=true
    if (isSubmittingRef.current || isSaving) return;
    const err = validateStep(current, state);
    if (err) { setStepError(err); return; }
    setStepError(null);
    if (current === total) {
      isSubmittingRef.current = true;
      onSave(state).finally(() => { isSubmittingRef.current = false; });
    } else {
      nextStep();
    }
  }, [current, total, state, nextStep, onSave, isSaving]);

  const handlePrev = useCallback(() => {
    setStepError(null);
    prevStep();
  }, [prevStep]);

  const isLastStep = current === total;

  // Ring colors per group
  const ringColor = group === 'sla' ? 'ring-violet-500' : group === 'renovacion' ? 'ring-emerald-500' : 'ring-blue-500';
  const progressBg = group === 'sla' ? 'bg-violet-500' : group === 'renovacion' ? 'bg-emerald-500' : 'bg-blue-600';
  const activeDot = group === 'sla' ? 'bg-violet-500 ring-violet-200' : group === 'renovacion' ? 'bg-emerald-500 ring-emerald-200' : 'bg-blue-600 ring-blue-200';
  const doneDot = group === 'sla' ? 'bg-violet-400' : group === 'renovacion' ? 'bg-emerald-400' : 'bg-blue-400';

  return (
    <div className="flex flex-col gap-0 min-h-0">
      {/* ── Stepper header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
        {/* Title */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {state.isRenewal ? '🔁 Renovar Contrato' : '📋 Nuevo Contrato + SLA'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paso {current} de {total} — {currentStepInfo?.label}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-200">{current}<span className="text-sm">/{total}</span></span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${progressBg}`}
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>

        {/* Steps dots + labels */}
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {steps.map((s, idx) => {
            const isDone = current > s.step;
            const isActive = current === s.step;
            const g = s.group;
            const dotClass = isDone
              ? doneDot + ' w-7 h-7'
              : isActive
              ? activeDot + ' w-8 h-8 ring-2'
              : 'bg-slate-200 w-7 h-7';
            const connectorColor = isDone ? progressBg : 'bg-slate-200';

            return (
              <div key={s.step} className="flex flex-col items-center" style={{ minWidth: 0, flex: 1 }}>
                <div className="flex items-center w-full">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      type="button"
                      onClick={() => isDone && goToStep(s.step)}
                      title={s.label}
                      className={`rounded-full flex items-center justify-center font-bold text-white text-xs transition-all ${dotClass} ${isDone ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                    >
                      {isDone ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{s.step}</span>
                      )}
                    </button>
                    <span className={`text-[9px] font-medium mt-1 text-center leading-tight hidden md:block ${isActive ? 'text-slate-700' : isDone ? 'text-slate-400' : 'text-slate-300'}`} style={{ maxWidth: 60 }}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 transition-colors ${isDone ? connectorColor : 'bg-slate-200'}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Group badge */}
        <div className="mt-4 flex gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            group === 'sla' ? 'bg-violet-100 text-violet-700' :
            group === 'renovacion' ? 'bg-emerald-100 text-emerald-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {group === 'contrato' ? '📄 Sección: Contrato' : group === 'sla' ? '⚡ Sección: SLA' : '🔁 Renovación'}
          </span>
        </div>
      </div>

      {/* ── Step content ── */}
      <div className={`bg-white rounded-2xl border shadow-sm p-7 flex-1 ${ringColor} ring-1`}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <span className="text-2xl">{currentStepInfo?.icon}</span>
          <div>
            <h4 className="text-base font-bold text-slate-900">{currentStepInfo?.label}</h4>
          </div>
        </div>

        {/* Step component */}
        {current === 1 && (
          <Step1DatosContrato data={state.datosContrato} onChange={setDatosContrato} usuariosAdmin={usuariosAdmin} />
        )}
        {current === 2 && (
          <Step2Servicios data={state.servicios} onChange={setServicios} />
        )}
        {current === 3 && (
          <Step3Mantenimiento data={state.mantenimiento} onChange={setMantenimiento} />
        )}
        {current === 4 && (
          <Step4Economicas data={state.economicas} onChange={setEconomicas} />
        )}
        {current === 5 && (
          <Step5AlcanceSla
            data={state.alcanceSla}
            onChange={(d) => { slaStep5Saved.current = true; setAlcanceSla(d); }}
            sedes={sedes}
            estadoContrato={state.datosContrato.estadoContrato || 'activo'}
          />
        )}
        {current === 6 && (
          <Step6TiemposSla
            data={state.tiemposSla}
            onChange={(d) => { slaStep6Saved.current = true; setTiemposSla(d); }}
          />
        )}
        {current === 7 && (
          <Step7Horarios
            data={state.horariosSla}
            onChange={(d) => { slaStep7Saved.current = true; setHorariosSla(d); }}
          />
        )}
        {current === 8 && state.isRenewal && (
          <Step8MotivoRenovacion
            motivo={state.motivoRenovacion || ''}
            onChange={setMotivoRenovacion}
          />
        )}

        {/* Step error */}
        {stepError && (
          <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm text-red-700">{stepError}</p>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
          disabled={isSaving}
        >
          Cancelar
        </button>

        <div className="flex items-center gap-3">
          {current > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              ← Anterior
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={isSaving}
            className={`px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-sm disabled:opacity-60 flex items-center gap-2 ${
              isLastStep
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : group === 'sla' ? 'bg-violet-600 hover:bg-violet-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving && (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isLastStep ? '💾 Guardar todo' : 'Siguiente →'}
          </button>
        </div>
      </div>

      {/* ── Cancel confirm modal ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full mx-4">
            <h4 className="text-lg font-bold text-slate-900 mb-2">¿Cancelar el proceso?</h4>
            <p className="text-sm text-slate-500 mb-6">
              Se perderán todos los datos ingresados en este wizard. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => { setShowCancelConfirm(false); onCancel(); }}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
