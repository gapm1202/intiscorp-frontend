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
  requisitosPersonalizados?: string[];
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
  requisitosPersonalizados: [],
};

export function GestionRequisitosForm({ initialData, onSave, onCancel }: GestionRequisitosFormProps) {
  const getInitialData = (): RequisitosData => {
    if (!initialData || Object.keys(initialData).length === 0) return defaultData;
    return {
      obligacionesCliente: initialData.obligacionesCliente || defaultData.obligacionesCliente,
      condicionesTecnicas: initialData.condicionesTecnicas || defaultData.condicionesTecnicas,
      responsabilidadesProveedor: initialData.responsabilidadesProveedor || defaultData.responsabilidadesProveedor,
      requisitosPersonalizados: initialData.requisitosPersonalizados || [],
    };
  };

  const [formData, setFormData] = useState<RequisitosData>(getInitialData());
  const [nuevoRequisito, setNuevoRequisito] = useState('');
  const [mostrarAgregarRequisito, setMostrarAgregarRequisito] = useState(false);

  const toggleField = <K extends Section>(section: K, key: keyof RequisitosData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: !prev[section][key],
      },
    }));
  };

  const agregarRequisito = () => {
    if (nuevoRequisito.trim()) {
      setFormData(prev => ({
        ...prev,
        requisitosPersonalizados: [...(prev.requisitosPersonalizados || []), nuevoRequisito.trim()]
      }));
      setNuevoRequisito('');
      setMostrarAgregarRequisito(false);
    }
  };

  const eliminarRequisito = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requisitosPersonalizados: (prev.requisitosPersonalizados || []).filter((_, i) => i !== index)
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

        {/* Requisitos Personalizados */}
        <div className="border-b pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Requisitos personalizados</p>
            {!mostrarAgregarRequisito && (
              <button
                onClick={() => setMostrarAgregarRequisito(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Agregar requisito
              </button>
            )}
          </div>

          {mostrarAgregarRequisito && (
            <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="text"
                value={nuevoRequisito}
                onChange={(e) => setNuevoRequisito(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') agregarRequisito();
                  if (e.key === 'Escape') {
                    setMostrarAgregarRequisito(false);
                    setNuevoRequisito('');
                  }
                }}
                placeholder="Nombre del requisito..."
                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={agregarRequisito}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Agregar
              </button>
              <button
                onClick={() => {
                  setMostrarAgregarRequisito(false);
                  setNuevoRequisito('');
                }}
                className="px-4 py-2 bg-slate-400 text-white rounded-lg hover:bg-slate-500 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {formData.requisitosPersonalizados && formData.requisitosPersonalizados.length > 0 ? (
            <div className="space-y-2">
              {formData.requisitosPersonalizados.map((req, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">✨ {req}</span>
                  <button
                    onClick={() => eliminarRequisito(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    ✕ Eliminar
                  </button>
                </div>
              ))}
            </div>
          ) : !mostrarAgregarRequisito && (
            <p className="text-sm text-gray-500 italic">No hay requisitos personalizados agregados</p>
          )}
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
