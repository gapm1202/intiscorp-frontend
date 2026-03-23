import { useState } from 'react';
import NuevoMantenimientoModal from '../components/NuevoMantenimientoModal';
import MantenimientoPreventivoCalendar from '../components/MantenimientoPreventivoCalendar';
import EjecucionMantenimientoView from '../components/EjecucionMantenimientoView';

type EjecucionContext = {
  mantenimientoId?: string;
  empresaId: string;
  empresaNombre: string;
  sedeId: string;
  sedeNombre: string;
  fecha: string;
  tecnicos: Array<{ id: string; nombre: string }>;
};

export default function MantenimientoPreventivoPage() {
  const [showNuevoMantenimiento, setShowNuevoMantenimiento] = useState(false);
  const [executionContext, setExecutionContext] = useState<EjecucionContext | null>(null);

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'linear-gradient(to bottom, rgb(248 250 252), rgb(239 246 255), rgb(238 242 255))' }}
    >
      <div className="max-w-6xl mx-auto">
        <div
          className="rounded-2xl shadow-2xl px-8 py-6 mb-6 text-white"
          style={{ background: 'linear-gradient(to right, rgb(30 58 138), rgb(30 64 175), rgb(29 78 216))' }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-[0.2em]">Mantenimiento</p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">Mantenimiento Preventivo</h1>
              <p className="text-blue-100 mt-2 text-sm">Programa y organiza mantenimientos preventivos por empresa y sede.</p>
            </div>
            <button
              onClick={() => setShowNuevoMantenimiento(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo mantenimiento
            </button>
          </div>
        </div>

        {executionContext ? (
          <EjecucionMantenimientoView
            context={executionContext}
            onBack={() => setExecutionContext(null)}
          />
        ) : (
          <MantenimientoPreventivoCalendar
            onStartMantenimiento={(payload) => {
              setExecutionContext(payload);
            }}
          />
        )}
      </div>

      {showNuevoMantenimiento && (
        <NuevoMantenimientoModal
          onClose={() => setShowNuevoMantenimiento(false)}
          onStart={(payload) => {
            setExecutionContext(payload);
          }}
        />
      )}
    </div>
  );
}
