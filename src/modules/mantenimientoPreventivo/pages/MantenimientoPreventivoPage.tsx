import { useState } from 'react';
import NuevoMantenimientoModal from '../components/NuevoMantenimientoModal';
import MantenimientoPreventivoCalendar from '../components/MantenimientoPreventivoCalendar';

export default function MantenimientoPreventivoPage() {
  const [showNuevoMantenimiento, setShowNuevoMantenimiento] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 rounded-2xl shadow-2xl px-8 py-6 mb-6 text-white">
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

        <MantenimientoPreventivoCalendar />
      </div>

      {showNuevoMantenimiento && (
        <NuevoMantenimientoModal onClose={() => setShowNuevoMantenimiento(false)} />
      )}
    </div>
  );
}
