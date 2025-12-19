import { useState } from 'react';

interface ExclusionesData {
  flags: {
    pendienteRespuestaCliente: boolean;
    esperandoRepuestos: boolean;
    esperandoProveedorExterno: boolean;
    fueraDeAlcance: boolean;
    fuerzaMayor: boolean;
  };
}

interface GestionExclusionesFormProps {
  initialData?: ExclusionesData;
  onSave?: (data: ExclusionesData) => void;
  onCancel?: () => void;
}

const defaultData: ExclusionesData = {
  flags: {
    pendienteRespuestaCliente: false,
    esperandoRepuestos: false,
    esperandoProveedorExterno: false,
    fueraDeAlcance: false,
    fuerzaMayor: false,
  },
};

export function GestionExclusionesForm({ initialData, onSave, onCancel }: GestionExclusionesFormProps) {
  const getInitialData = (): ExclusionesData => {
    if (!initialData || Object.keys(initialData).length === 0) return defaultData;
    return {
      flags: initialData.flags || defaultData.flags,
    };
  };

  const [formData, setFormData] = useState<ExclusionesData>(getInitialData());

  const toggleFlag = (key: keyof ExclusionesData['flags']) => {
    setFormData((prev) => ({
      ...prev,
      flags: {
        ...prev.flags,
        [key]: !prev.flags[key],
      },
    }));
  };

  const handleSave = () => {
    if (onSave) onSave(formData);
  };

  const handleReset = () => setFormData(getInitialData());

  const opciones: Array<{ key: keyof ExclusionesData['flags']; label: string }> = [
    { key: 'pendienteRespuestaCliente', label: 'Pendiente de respuesta del cliente' },
    { key: 'esperandoRepuestos', label: 'Esperando repuestos' },
    { key: 'esperandoProveedorExterno', label: 'Esperando proveedor externo' },
    { key: 'fueraDeAlcance', label: 'Incidente fuera de alcance' },
    { key: 'fuerzaMayor', label: 'Fuerza mayor' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100">
      <div className="bg-linear-to-r from-rose-50 to-orange-50 border-b border-slate-200 px-8 py-6 flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-lg border border-orange-200">⏸️</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Exclusiones</h3>
          <p className="text-sm text-slate-600 mt-1">Situaciones donde el SLA no aplica.</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Exclusiones / Pausas */}
        <div className="border-b pb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Motivos de exclusión o pausa</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {opciones.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formData.flags[item.key]}
                  onChange={() => toggleFlag(item.key)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-linear-to-r from-amber-50 to-slate-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl">📌</div>
          <div className="flex-1 text-sm text-amber-800">
            Durante la exclusión, el tiempo SLA no avanza.
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
