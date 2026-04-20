import { useState } from 'react';

const MOTIVOS_PREDEFINIDOS = [
  { value: 'renovacion_anual', label: 'Renovación anual estándar' },
  { value: 'cambio_condiciones', label: 'Renovación con cambio de condiciones' },
  { value: 'otro', label: 'Otro' },
];

interface Props {
  motivo: string;
  onChange: (motivo: string) => void;
}

export default function Step8MotivoRenovacion({ motivo, onChange }: Props) {
  // Detect if current motivo matches a predefined option
  const isPredefined = MOTIVOS_PREDEFINIDOS.some(m => m.value === motivo);
  const [selected, setSelected] = useState<string>(
    motivo === '' ? '' : isPredefined ? motivo : 'otro'
  );
  const [customMotivo, setCustomMotivo] = useState(
    motivo !== '' && !isPredefined ? motivo : ''
  );

  const handleSelect = (value: string) => {
    setSelected(value);
    if (value !== 'otro') {
      onChange(value);
    } else {
      onChange(customMotivo);
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomMotivo(value);
    onChange(value);
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800">🔁 Motivo de Renovación</p>
        <p className="text-xs text-blue-600 mt-1">
          Este motivo quedará registrado en el historial de versiones del contrato.
        </p>
      </div>

      <div className="space-y-3">
        {MOTIVOS_PREDEFINIDOS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleSelect(value)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              selected === value
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              selected === value ? 'border-blue-500' : 'border-slate-300'
            }`}>
              {selected === value && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
            </span>
            <span className={`text-sm font-medium ${selected === value ? 'text-blue-700' : 'text-slate-700'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {selected === 'otro' && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
            Especificar motivo <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Describa el motivo de la renovación..."
            value={customMotivo}
            onChange={e => handleCustomChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            autoFocus
          />
          {!customMotivo.trim() && (
            <p className="text-xs text-red-500 mt-1.5">⚠️ Debe especificar el motivo de la renovación.</p>
          )}
        </div>
      )}

      {!selected && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ Seleccione el motivo de renovación para continuar.
        </p>
      )}
    </div>
  );
}
