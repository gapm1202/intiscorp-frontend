import { useState } from 'react';

interface AlertasData {
  umbrales: number[];
  notificarA: {
    tecnicoAsignado: boolean;
    supervisor: boolean;
  };
  accionAutomatica: 'notificar' | 'escalar';
  estadosVisibles: string[];
}

interface GestionAlertasFormProps {
  initialData?: AlertasData;
  onSave?: (data: AlertasData) => void;
  onCancel?: () => void;
}

const defaultData: AlertasData = {
  umbrales: [50, 75, 90],
  notificarA: {
    tecnicoAsignado: true,
    supervisor: true,
  },
  accionAutomatica: 'notificar',
  estadosVisibles: ['🟢 Cumpliendo', '🟡 En riesgo', '🔴 Incumplido'],
};

export function GestionAlertasForm({ initialData, onSave, onCancel }: GestionAlertasFormProps) {
  const getInitialData = (): AlertasData => {
    if (!initialData || Object.keys(initialData).length === 0) return defaultData;
    return {
      umbrales: initialData.umbrales || defaultData.umbrales,
      notificarA: initialData.notificarA || defaultData.notificarA,
      accionAutomatica: initialData.accionAutomatica || defaultData.accionAutomatica,
      estadosVisibles: initialData.estadosVisibles || defaultData.estadosVisibles,
    };
  };

  const [formData, setFormData] = useState<AlertasData>(getInitialData());

  const toggleUmbral = (value: number) => {
    setFormData((prev) => ({
      ...prev,
      umbrales: prev.umbrales.includes(value)
        ? prev.umbrales.filter((v) => v !== value)
        : [...prev.umbrales, value].sort((a, b) => a - b),
    }));
  };

  const toggleNotificar = (field: keyof AlertasData['notificarA']) => {
    setFormData((prev) => ({
      ...prev,
      notificarA: {
        ...prev.notificarA,
        [field]: !prev.notificarA[field],
      },
    }));
  };

  const setAccion = (accion: AlertasData['accionAutomatica']) => {
    setFormData((prev) => ({ ...prev, accionAutomatica: accion }));
  };

  const handleSave = () => {
    if (onSave) onSave(formData);
  };

  const handleReset = () => setFormData(getInitialData());

  const umbralOptions: number[] = [50, 75, 90];
  const estados = ['🟢 Cumpliendo', '🟡 En riesgo', '🔴 Incumplido'];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100">
      <div className="bg-linear-to-r from-amber-50 to-red-50 border-b border-slate-200 px-8 py-6 flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-lg border border-amber-200">🚨</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Alertas y Control</h3>
          <p className="text-sm text-slate-600 mt-1">Control preventivo (muy importante).</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Umbral de alerta */}
        <div className="border-b pb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Umbral de alerta</p>
          <div className="flex flex-wrap gap-3">
            {umbralOptions.map((value) => (
              <button
                key={value}
                onClick={() => toggleUmbral(value)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
                  formData.umbrales.includes(value)
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>

        {/* Notificar a */}
        <div className="border-b pb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Notificar a</p>
          <div className="flex flex-wrap gap-3">
            {[{ key: 'tecnicoAsignado', label: 'Técnico asignado' }, { key: 'supervisor', label: 'Administrador' }].map((item) => (
              <label
                key={item.key}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  formData.notificarA[item.key as keyof AlertasData['notificarA']]
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.notificarA[item.key as keyof AlertasData['notificarA']]}
                  onChange={() => toggleNotificar(item.key as keyof AlertasData['notificarA'])}
                  className="w-5 h-5 text-emerald-600 rounded"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Acción automática */}
        <div className="border-b pb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Acción automática</p>
          <div className="flex flex-wrap gap-3">
            {[{ value: 'notificar', label: 'Notificar' }, { value: 'escalar', label: 'Escalar prioridad' }].map((item) => (
              <button
                key={item.value}
                onClick={() => setAccion(item.value as AlertasData['accionAutomatica'])}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
                  formData.accionAutomatica === item.value
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Estados visibles */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">Estados SLA visibles en tickets</p>
          <div className="flex flex-wrap gap-2">
            {estados.map((estado) => (
              <span
                key={estado}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-800"
              >
                {estado}
              </span>
            ))}
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
