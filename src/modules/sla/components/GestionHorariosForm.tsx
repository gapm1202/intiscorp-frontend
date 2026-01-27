import { useMemo, useState } from 'react';

type DiaSemana = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado' | 'Domingo';

interface DiaConfig {
  atiende: boolean;
  horaInicio: string;
  horaFin: string;
}

interface HorariosData {
  dias: Record<DiaSemana, DiaConfig>;
  excluirFeriados: boolean;
  calendarioFeriados: string[];
  atencionFueraHorario?: boolean;
  aplicaSLAFueraHorario?: boolean;
}

interface LegacyHorariosData {
  dias: string[];
  horaInicio: string;
  horaFin: string;
  atencionFueraHorario?: boolean;
  aplicaSLAFueraHorario?: boolean;
  excluirFeriados?: boolean;
  calendarioFeriados?: string[];
}

interface GestionHorariosFormProps {
  initialData?: HorariosData | LegacyHorariosData;
  onSave?: (data: HorariosData) => void;
  onCancel?: () => void;
  showFueraHorarioOptions?: boolean;
}

const DIAS: DiaSemana[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const defaultDias: Record<DiaSemana, DiaConfig> = {
  Lunes: { atiende: true, horaInicio: '08:00', horaFin: '18:00' },
  Martes: { atiende: true, horaInicio: '08:00', horaFin: '18:00' },
  Miercoles: { atiende: true, horaInicio: '08:00', horaFin: '18:00' },
  Jueves: { atiende: true, horaInicio: '08:00', horaFin: '18:00' },
  Viernes: { atiende: true, horaInicio: '08:00', horaFin: '18:00' },
  Sabado: { atiende: false, horaInicio: '08:00', horaFin: '18:00' },
  Domingo: { atiende: false, horaInicio: '08:00', horaFin: '18:00' },
};

const defaultData: HorariosData = {
  dias: defaultDias,
  excluirFeriados: true,
  calendarioFeriados: [],
  atencionFueraHorario: false,
  aplicaSLAFueraHorario: false,
};

function normalizeInitialData(data?: HorariosData | LegacyHorariosData): HorariosData {
  // Si no existe dato o es objeto vacío, usar default
  if (!data || Object.keys(data).length === 0) return defaultData;
  const maybeLegacy = data as LegacyHorariosData;
  // Legacy format: dias as array of day names
  if (Array.isArray(maybeLegacy.dias)) {
    const base = { ...defaultDias } as Record<DiaSemana, DiaConfig>;
    DIAS.forEach((d) => {
      const active = maybeLegacy.dias.includes(d);
      base[d] = {
        atiende: active,
        horaInicio: maybeLegacy.horaInicio || defaultDias[d].horaInicio,
        horaFin: maybeLegacy.horaFin || defaultDias[d].horaFin,
      };
    });
    return {
      dias: base,
      excluirFeriados: maybeLegacy.excluirFeriados ?? true,
      calendarioFeriados: maybeLegacy.calendarioFeriados ?? [],
      atencionFueraHorario: maybeLegacy.atencionFueraHorario ?? false,
      aplicaSLAFueraHorario: maybeLegacy.aplicaSLAFueraHorario ?? false,
    };
  }

  // Newer backend shape (EmpresaDetailPage): { inicio, fin, diasLaborables: "1,2,3" | number[] }
  const anyData = data as any;
  if (anyData && (anyData.diasLaborables !== undefined || (anyData.dias && typeof anyData.dias === 'string'))) {
    // Normalize diasLaborables to array of numbers or strings
    let diasArray: Array<number | string> = [];
    if (Array.isArray(anyData.diasLaborables)) diasArray = anyData.diasLaborables;
    else if (typeof anyData.diasLaborables === 'string') diasArray = anyData.diasLaborables.split(',').map((s: string) => s.trim());
    else if (typeof anyData.dias === 'string') diasArray = anyData.dias.split(',').map((s: string) => s.trim());

    // Map numeric day-of-week (1=Lunes .. 7=Domingo) to our DiaSemana names
    const numToDia: Record<string, DiaSemana> = {
      '1': 'Lunes',
      '2': 'Martes',
      '3': 'Miercoles',
      '4': 'Jueves',
      '5': 'Viernes',
      '6': 'Sabado',
      '7': 'Domingo',
    };

    const base = { ...defaultDias } as Record<DiaSemana, DiaConfig>;
    DIAS.forEach((d) => {
      // check if diasArray contains the name or the numeric mapping
      const includesName = diasArray.includes(d);
      const includesNum = Object.entries(numToDia).some(([num, name]) => name === d && diasArray.includes(num));
      const active = includesName || includesNum;
      base[d] = {
        atiende: active,
        horaInicio: anyData.inicio || anyData.horaInicio || defaultDias[d].horaInicio,
        horaFin: anyData.fin || anyData.horaFin || defaultDias[d].horaFin,
      };
    });

    return {
      dias: base,
      excluirFeriados: anyData.incluyeFestivos === false ? false : (anyData.excluirFeriados ?? true),
      calendarioFeriados: anyData.calendarioFeriados ?? [],
      atencionFueraHorario: anyData.atencionFueraHorario ?? false,
      aplicaSLAFueraHorario: anyData.aplicaSLAFueraHorario ?? false,
    };
  }
  return data as HorariosData;
}

export function GestionHorariosForm({ initialData, onSave, onCancel, showFueraHorarioOptions }: GestionHorariosFormProps) {
  const normalized = useMemo(() => {
    const result = normalizeInitialData(initialData);
    return result || defaultData;
  }, [initialData]);
  
  const [formData, setFormData] = useState<HorariosData>(normalized);
  const [nuevoFeriado, setNuevoFeriado] = useState('');

  const handleSave = () => {
    if (onSave) onSave(formData);
  };

  const handleReset = () => setFormData(normalized);

  const toggleAtiende = (dia: DiaSemana) => {
    setFormData((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: { ...prev.dias[dia], atiende: !prev.dias[dia].atiende },
      },
    }));
  };

  const updateHora = (dia: DiaSemana, field: 'horaInicio' | 'horaFin', value: string) => {
    setFormData((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: { ...prev.dias[dia], [field]: value },
      },
    }));
  };

  const agregarFeriado = () => {
    if (nuevoFeriado.trim()) {
      setFormData((prev) => ({
        ...prev,
        calendarioFeriados: [...prev.calendarioFeriados, nuevoFeriado.trim()],
      }));
      setNuevoFeriado('');
    }
  };

  const eliminarFeriado = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      calendarioFeriados: prev.calendarioFeriados.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100">
      <div className="bg-linear-to-r from-indigo-50 to-blue-50 border-b border-slate-200 px-8 py-6 flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-lg border border-indigo-200">🕒</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Horarios de Atención</h3>
          <p className="text-sm text-slate-600 mt-1">Define cuándo corre el SLA.</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Tabla por día */}
        <div className="border-b pb-6">
          <p className="text-sm font-semibold text-gray-900 mb-3">Día por día</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Día</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Atiende</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Hora inicio</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Hora fin</th>
                </tr>
              </thead>
              <tbody>
                {DIAS.map((dia) => (
                  <tr key={dia} className="border-b border-slate-200 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{dia}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAtiende(dia)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          formData.dias[dia].atiende
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {formData.dias[dia].atiende ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={formData.dias[dia].horaInicio}
                        onChange={(e) => updateHora(dia, 'horaInicio', e.target.value)}
                        disabled={!formData.dias[dia].atiende}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formData.dias[dia].atiende ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={formData.dias[dia].horaFin}
                        onChange={(e) => updateHora(dia, 'horaFin', e.target.value)}
                        disabled={!formData.dias[dia].atiende}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formData.dias[dia].atiende ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Atención fuera de horario (visible solo si 24/7) */}
        {showFueraHorarioOptions && (
          <div className="border-b pb-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Atención fuera de horario</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormData({ ...formData, atencionFueraHorario: true })}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    formData.atencionFueraHorario
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Sí
                </button>
                <button
                  onClick={() => setFormData({ ...formData, atencionFueraHorario: false, aplicaSLAFueraHorario: false })}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    !formData.atencionFueraHorario
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Aplica SLA fuera de horario</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormData({ ...formData, aplicaSLAFueraHorario: true })}
                  disabled={!formData.atencionFueraHorario}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    formData.aplicaSLAFueraHorario
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                  } ${!formData.atencionFueraHorario ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  Sí
                </button>
                <button
                  onClick={() => setFormData({ ...formData, aplicaSLAFueraHorario: false })}
                  disabled={!formData.atencionFueraHorario}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    !formData.aplicaSLAFueraHorario
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                  } ${!formData.atencionFueraHorario ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Excluir feriados */}
        <div className="border-b pb-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">🔹 Excluir feriados</p>
            <div className="flex gap-3">
              <button
                onClick={() => setFormData({ ...formData, excluirFeriados: true })}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  formData.excluirFeriados
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                Sí
              </button>
              <button
                onClick={() => setFormData({ ...formData, excluirFeriados: false })}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  !formData.excluirFeriados
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Calendario de feriados */}
          {formData.excluirFeriados && (
            <div className="ml-0 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <p className="text-sm font-semibold text-gray-900">🔹 Calendario de feriados</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoFeriado}
                  onChange={(e) => setNuevoFeriado(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarFeriado();
                    }
                  }}
                  placeholder="Ej: 1 de Enero - Año Nuevo"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={agregarFeriado}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                >
                  + Agregar
                </button>
              </div>
              {formData.calendarioFeriados.length > 0 && (
                <div className="space-y-2">
                  {formData.calendarioFeriados.map((feriado, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded border border-slate-200"
                    >
                      <span className="text-sm text-gray-700">{feriado}</span>
                      <button
                        onClick={() => eliminarFeriado(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-semibold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {formData.calendarioFeriados.length === 0 && (
                <p className="text-xs text-slate-500 italic">No hay feriados registrados</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-linear-to-r from-amber-50 to-slate-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl">📌</div>
          <div className="flex-1 text-sm text-amber-800">
            El reloj SLA solo corre dentro del horario definido.
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
