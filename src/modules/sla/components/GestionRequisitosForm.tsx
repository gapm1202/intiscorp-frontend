import { useState } from 'react';

interface RequisitosData {
  obligacionesCliente: {
    autorizarIntervencion: boolean;
    accesoEquipo: boolean;
    infoClara: boolean;
  };
  condicionesTecnicas: {
    equipoEncendido: boolean;
    conectividadActiva: boolean;
    accesoRemoto: boolean;
  };
  responsabilidadesProveedor: {
    tecnicoAsignado: boolean;
    registroAtencion: boolean;
    informeTecnico: boolean;
  };
}

interface GestionRequisitosFormProps {
  initialData?: RequisitosData;
  onSave?: (data: RequisitosData) => void;
  onCancel?: () => void;
}

type Section = keyof RequisitosData;

const defaultData: RequisitosData = {
  obligacionesCliente: {
    autorizarIntervencion: true,
    accesoEquipo: true,
    infoClara: true,
  },
  condicionesTecnicas: {
    equipoEncendido: true,
    conectividadActiva: true,
    accesoRemoto: true,
  },
  responsabilidadesProveedor: {
    tecnicoAsignado: true,
    registroAtencion: true,
    informeTecnico: true,
  },
};

export function GestionRequisitosForm({ initialData, onSave, onCancel }: GestionRequisitosFormProps) {
  const getInitialData = (): RequisitosData => {
    if (!initialData || Object.keys(initialData).length === 0) return defaultData;
    return {
      obligacionesCliente: initialData.obligacionesCliente || defaultData.obligacionesCliente,
      condicionesTecnicas: initialData.condicionesTecnicas || defaultData.condicionesTecnicas,
      responsabilidadesProveedor: initialData.responsabilidadesProveedor || defaultData.responsabilidadesProveedor,
    };
  };

  const [formData, setFormData] = useState<RequisitosData>(getInitialData());

  const toggleField = <K extends Section>(section: K, key: keyof RequisitosData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: !prev[section][key],
      },
    }));
  };

  const handleSave = () => {
    if (onSave) onSave(formData);
  };

  const handleReset = () => setFormData(getInitialData());

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100">
      <div className="bg-linear-to-r from-purple-50 to-pink-50 border-b border-slate-200 px-8 py-6 flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-lg border border-purple-200">✅</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Requisitos del SLA</h3>
          <p className="text-sm text-slate-600 mt-1">Condiciones para que el SLA sea válido.</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Obligaciones del cliente */}
        <div className="border-b pb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Obligaciones del cliente</p>
          {([{
            key: 'autorizarIntervencion',
            label: 'Autorizar intervención',
          }, {
            key: 'accesoEquipo',
            label: 'Brindar acceso al equipo',
          }, {
            key: 'infoClara',
            label: 'Proveer información clara',
          }] as Array<{ key: keyof RequisitosData['obligacionesCliente']; label: string }>).map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={formData.obligacionesCliente[item.key]}
                onChange={() => toggleField('obligacionesCliente', item.key)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>

        {/* Condiciones técnicas */}
        <div className="border-b pb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Condiciones técnicas</p>
          {([{
            key: 'equipoEncendido',
            label: 'Equipo encendido',
          }, {
            key: 'conectividadActiva',
            label: 'Conectividad activa',
          }, {
            key: 'accesoRemoto',
            label: 'Acceso remoto habilitado',
          }] as Array<{ key: keyof RequisitosData['condicionesTecnicas']; label: string }>).map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={formData.condicionesTecnicas[item.key]}
                onChange={() => toggleField('condicionesTecnicas', item.key)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>

        {/* Responsabilidades del proveedor */}
        <div className="border-b pb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Responsabilidades del proveedor (INTISCORP)</p>
          {([{
            key: 'tecnicoAsignado',
            label: 'Técnico asignado',
          }, {
            key: 'registroAtencion',
            label: 'Registro de atención',
          }, {
            key: 'informeTecnico',
            label: 'Informe técnico',
          }] as Array<{ key: keyof RequisitosData['responsabilidadesProveedor']; label: string }>).map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={formData.responsabilidadesProveedor[item.key]}
                onChange={() => toggleField('responsabilidadesProveedor', item.key)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>

        <div className="bg-linear-to-r from-amber-50 to-slate-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl">📌</div>
          <div className="flex-1 text-sm text-amber-800">
            Si no se cumplen → el SLA se congela.
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
