import { useState } from 'react';

export type Prioridad = 'critica' | 'alta' | 'media' | 'baja';

interface TiempoPorPrioridad {
  prioridad: Prioridad;
  tiempoRespuesta: string;
  tiempoResolucion: string;
  escalamiento: boolean;
  tiempoEscalamiento?: string;
}

interface TiemposData {
  tiemposPorPrioridad: TiempoPorPrioridad[];
}

interface TiempoInterno {
  valor: number;
  unidad: 'horas' | 'minutos';
}

interface RowInterno {
  prioridad: Prioridad;
  tiempoRespuesta: TiempoInterno;
  tiempoResolucion: TiempoInterno;
  escalamiento: boolean;
  tiempoEscalamiento?: TiempoInterno;
}

interface GestionTiemposFormProps {
  initialData?: TiemposData;
  onSave?: (data: TiemposData) => void;
  onCancel?: () => void;
}

// Función auxiliar para parsear string a estructura interna
const parseTiempo = (str: string): TiempoInterno => {
  const match = str.match(/(\d+)\s*(hora|horas|minuto|minutos)/i);
  if (match) {
    const valor = parseInt(match[1], 10);
    const unidad = match[2].toLowerCase().includes('hora') ? 'horas' : 'minutos';
    return { valor, unidad };
  }
  return { valor: 1, unidad: 'horas' };
};

// Función auxiliar para convertir estructura interna a string
const formatTiempo = (tiempo: TiempoInterno): string => {
  const unidadTexto = tiempo.unidad === 'horas' 
    ? (tiempo.valor === 1 ? 'hora' : 'horas')
    : (tiempo.valor === 1 ? 'minuto' : 'minutos');
  return `${tiempo.valor} ${unidadTexto}`;
};

// Convertir de datos externos a formato interno
const toRowInterno = (row: TiempoPorPrioridad): RowInterno => ({
  prioridad: row.prioridad,
  tiempoRespuesta: parseTiempo(row.tiempoRespuesta),
  tiempoResolucion: parseTiempo(row.tiempoResolucion),
  escalamiento: row.escalamiento,
  tiempoEscalamiento: row.tiempoEscalamiento ? parseTiempo(row.tiempoEscalamiento) : undefined,
});

// Convertir de formato interno a datos externos
const toTiempoPorPrioridad = (row: RowInterno): TiempoPorPrioridad => ({
  prioridad: row.prioridad,
  tiempoRespuesta: formatTiempo(row.tiempoRespuesta),
  tiempoResolucion: formatTiempo(row.tiempoResolucion),
  escalamiento: row.escalamiento,
  tiempoEscalamiento: row.tiempoEscalamiento ? formatTiempo(row.tiempoEscalamiento) : undefined,
});

const defaultRows: RowInterno[] = [
  { prioridad: 'critica', tiempoRespuesta: { valor: 1, unidad: 'horas' }, tiempoResolucion: { valor: 4, unidad: 'horas' }, escalamiento: true, tiempoEscalamiento: { valor: 1, unidad: 'horas' } },
  { prioridad: 'alta', tiempoRespuesta: { valor: 2, unidad: 'horas' }, tiempoResolucion: { valor: 8, unidad: 'horas' }, escalamiento: true, tiempoEscalamiento: { valor: 2, unidad: 'horas' } },
  { prioridad: 'media', tiempoRespuesta: { valor: 4, unidad: 'horas' }, tiempoResolucion: { valor: 24, unidad: 'horas' }, escalamiento: false },
  { prioridad: 'baja', tiempoRespuesta: { valor: 8, unidad: 'horas' }, tiempoResolucion: { valor: 48, unidad: 'horas' }, escalamiento: false },
];

const etiquetas: Record<Prioridad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export function GestionTiemposForm({ initialData, onSave, onCancel }: GestionTiemposFormProps) {
  const [rows, setRows] = useState<RowInterno[]>(() => {
    if (initialData?.tiemposPorPrioridad && initialData.tiemposPorPrioridad.length > 0) {
      return initialData.tiemposPorPrioridad.map(toRowInterno);
    }
    return defaultRows;
  });

  const updateRow = (index: number, updates: Partial<RowInterno>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const handleSave = () => {
    if (onSave) {
      const dataToSave: TiemposData = {
        tiemposPorPrioridad: rows.map(toTiempoPorPrioridad),
      };
      onSave(dataToSave);
    }
  };

  const handleReset = () => {
    if (initialData?.tiemposPorPrioridad) {
      setRows(initialData.tiemposPorPrioridad.map(toRowInterno));
    } else {
      setRows(defaultRows);
    }
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
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Prioridad</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Tiempo de respuesta</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Tiempo de resolución</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">¿Escalamiento?</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Tiempo para escalar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.prioridad} className="border-b border-slate-200 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{etiquetas[row.prioridad]}</td>
                  
                  {/* Tiempo de respuesta */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={row.tiempoRespuesta.valor}
                        onChange={(e) => updateRow(index, { 
                          tiempoRespuesta: { ...row.tiempoRespuesta, valor: parseInt(e.target.value) || 1 }
                        })}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select
                        value={row.tiempoRespuesta.unidad}
                        onChange={(e) => updateRow(index, { 
                          tiempoRespuesta: { ...row.tiempoRespuesta, unidad: e.target.value as 'horas' | 'minutos' }
                        })}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="minutos">min</option>
                        <option value="horas">hrs</option>
                      </select>
                    </div>
                  </td>
                  
                  {/* Tiempo de resolución */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={row.tiempoResolucion.valor}
                        onChange={(e) => updateRow(index, { 
                          tiempoResolucion: { ...row.tiempoResolucion, valor: parseInt(e.target.value) || 1 }
                        })}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select
                        value={row.tiempoResolucion.unidad}
                        onChange={(e) => updateRow(index, { 
                          tiempoResolucion: { ...row.tiempoResolucion, unidad: e.target.value as 'horas' | 'minutos' }
                        })}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="minutos">min</option>
                        <option value="horas">hrs</option>
                      </select>
                    </div>
                  </td>
                  
                  {/* Escalamiento */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => updateRow(index, { 
                        escalamiento: !row.escalamiento, 
                        tiempoEscalamiento: row.escalamiento ? undefined : { valor: 1, unidad: 'horas' }
                      })}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        row.escalamiento
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {row.escalamiento ? 'Sí' : 'No'}
                    </button>
                  </td>
                  
                  {/* Tiempo para escalar */}
                  <td className="px-4 py-3">
                    {row.escalamiento && row.tiempoEscalamiento ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={row.tiempoEscalamiento.valor}
                          onChange={(e) => updateRow(index, { 
                            tiempoEscalamiento: { ...row.tiempoEscalamiento!, valor: parseInt(e.target.value) || 1 }
                          })}
                          className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                        <select
                          value={row.tiempoEscalamiento.unidad}
                          onChange={(e) => updateRow(index, { 
                            tiempoEscalamiento: { ...row.tiempoEscalamiento!, unidad: e.target.value as 'horas' | 'minutos' }
                          })}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          <option value="minutos">min</option>
                          <option value="horas">hrs</option>
                        </select>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">N/A</span>
                    )}
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
