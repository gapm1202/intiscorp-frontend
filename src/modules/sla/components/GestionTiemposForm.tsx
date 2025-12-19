import { useState } from 'react';

export type Prioridad = 'critica' | 'alta' | 'media' | 'baja';

interface TiempoPorPrioridad {
  prioridad: Prioridad;
  tiempoRespuesta: string;
  tiempoResolucion: string;
  modalidad: 'remoto' | 'presencial' | 'mixto';
  escalamiento: boolean;
  tiempoEscalamiento?: string;
}

interface TiemposData {
  tiemposPorPrioridad: TiempoPorPrioridad[];
  medicionSLA: 'horasHabiles' | 'horasCalendario';
}

interface GestionTiemposFormProps {
  initialData?: TiemposData;
  onSave?: (data: TiemposData) => void;
  onCancel?: () => void;
}

const defaultRows: TiempoPorPrioridad[] = [
  { prioridad: 'critica', tiempoRespuesta: '1 hora', tiempoResolucion: '4 horas', modalidad: 'mixto', escalamiento: true, tiempoEscalamiento: '1 hora' },
  { prioridad: 'alta', tiempoRespuesta: '2 horas', tiempoResolucion: '8 horas', modalidad: 'mixto', escalamiento: true, tiempoEscalamiento: '2 horas' },
  { prioridad: 'media', tiempoRespuesta: '4 horas', tiempoResolucion: '24 horas', modalidad: 'remoto', escalamiento: false, tiempoEscalamiento: '' },
  { prioridad: 'baja', tiempoRespuesta: '8 horas', tiempoResolucion: '48 horas', modalidad: 'remoto', escalamiento: false, tiempoEscalamiento: '' },
];

const etiquetas: Record<Prioridad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export function GestionTiemposForm({ initialData, onSave, onCancel }: GestionTiemposFormProps) {
  const [rows, setRows] = useState<TiempoPorPrioridad[]>(
    (initialData?.tiemposPorPrioridad && initialData.tiemposPorPrioridad.length > 0) ? initialData.tiemposPorPrioridad : defaultRows
  );
  const [medicionSLA, setMedicionSLA] = useState<'horasHabiles' | 'horasCalendario'>(
    initialData?.medicionSLA || 'horasHabiles'
  );

  const updateRow = (index: number, updates: Partial<TiempoPorPrioridad>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const handleSave = () => {
    if (onSave) onSave({ tiemposPorPrioridad: rows, medicionSLA });
  };

  const handleReset = () => {
    setRows(initialData?.tiemposPorPrioridad || defaultRows);
    setMedicionSLA(initialData?.medicionSLA || 'horasHabiles');
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100">
      <div className="bg-linear-to-r from-blue-50 to-cyan-50 border-b border-slate-200 px-8 py-6 flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-lg border border-cyan-200">⏱️</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Tiempos de Respuesta y Resolución</h3>
          <p className="text-sm text-slate-600 mt-1">Define los ANS por prioridad.</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Medición SLA */}
        <div className="border-b pb-6">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-900">🔹 ¿Medir SLA en horas hábiles o calendario?</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setMedicionSLA('horasHabiles')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
                medicionSLA === 'horasHabiles'
                  ? 'bg-cyan-100 text-cyan-800 border-cyan-300 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Horas hábiles (recomendado)
            </button>
            <button
              onClick={() => setMedicionSLA('horasCalendario')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
                medicionSLA === 'horasCalendario'
                  ? 'bg-cyan-100 text-cyan-800 border-cyan-300 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Horas calendario (24/7)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Prioridad</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Tiempo de respuesta</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Tiempo de resolución</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Modalidad permitida</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">¿Escalamiento?</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Tiempo para escalar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.prioridad} className="border-b border-slate-200 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{etiquetas[row.prioridad]}</td>
                  <td className="px-4 py-3">
                    <input
                      value={row.tiempoRespuesta}
                      onChange={(e) => updateRow(index, { tiempoRespuesta: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.tiempoResolucion}
                      onChange={(e) => updateRow(index, { tiempoResolucion: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'remoto', label: 'Remoto' },
                        { value: 'presencial', label: 'Presencial' },
                        { value: 'mixto', label: 'Mixto' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => updateRow(index, { modalidad: item.value as TiempoPorPrioridad['modalidad'] })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            row.modalidad === item.value
                              ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => updateRow(index, { escalamiento: !row.escalamiento, tiempoEscalamiento: row.escalamiento ? '' : row.tiempoEscalamiento })}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        row.escalamiento
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {row.escalamiento ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.tiempoEscalamiento || ''}
                      onChange={(e) => updateRow(index, { tiempoEscalamiento: e.target.value })}
                      disabled={!row.escalamiento}
                      placeholder="Ej: 1 hora"
                      className={`w-full px-3 py-2 border rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                        row.escalamiento ? 'border-slate-300' : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-linear-to-r from-emerald-50 to-slate-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl">📌</div>
          <div className="flex-1 space-y-1 text-sm text-emerald-800">
            <p><strong>Respuesta</strong> = primer contacto técnico.</p>
            <p><strong>Resolución</strong> = ticket solucionado.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end px-8 pb-8 border-t border-slate-100">
        <button
          onClick={handleReset}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Limpiar
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-slate-400 text-white rounded-lg hover:bg-slate-500 font-medium transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
