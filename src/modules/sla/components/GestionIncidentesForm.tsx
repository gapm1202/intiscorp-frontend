import { useMemo, useState } from 'react';

export type Impacto = 'alto' | 'medio' | 'bajo';
export type Urgencia = 'alta' | 'media' | 'baja';
export type CategoriaITIL = 'usuario' | 'infraestructura' | 'aplicacion' | 'seguridad';

interface GestionIncidentesData {
  categoriaITIL?: CategoriaITIL;
  impacto: Impacto;
  urgencia: Urgencia;
  prioridadCalculada: string;
}

interface GestionIncidentesFormProps {
  initialData?: GestionIncidentesData;
  onSave?: (data: GestionIncidentesData) => void;
  onCancel?: () => void;
}

const defaultData: GestionIncidentesData = {
  categoriaITIL: undefined,
  impacto: 'medio',
  urgencia: 'media',
  prioridadCalculada: 'Media',
};

function calcularPrioridad(impacto: Impacto, urgencia: Urgencia): string {
  const scoreImpacto: Record<Impacto, number> = { alto: 3, medio: 2, bajo: 1 };
  const scoreUrgencia: Record<Urgencia, number> = { alta: 3, media: 2, baja: 1 };
  const sum = scoreImpacto[impacto] + scoreUrgencia[urgencia];

  if (sum >= 5) return 'Alta';
  if (sum === 4) return 'Media';
  return 'Baja';
}

export function GestionIncidentesForm({ initialData, onSave, onCancel }: GestionIncidentesFormProps) {
  // Asegurar que siempre tenemos data valida, incluso si initialData es null/undefined o vacío
  const getInitialData = (): GestionIncidentesData => {
    if (!initialData || Object.keys(initialData).length === 0) return defaultData;
    return {
      categoriaITIL: initialData.categoriaITIL,
      impacto: initialData.impacto || defaultData.impacto,
      urgencia: initialData.urgencia || defaultData.urgencia,
      prioridadCalculada: initialData.prioridadCalculada || defaultData.prioridadCalculada,
    };
  }; 

  const [formData, setFormData] = useState<GestionIncidentesData>(getInitialData());

  const prioridad = useMemo(
    () => calcularPrioridad(formData.impacto, formData.urgencia),
    [formData.impacto, formData.urgencia]
  );



  const setImpacto = (impacto: Impacto) => {
    setFormData((prev) => ({ ...prev, impacto, prioridadCalculada: calcularPrioridad(impacto, prev.urgencia) }));
  };

  const setUrgencia = (urgencia: Urgencia) => {
    setFormData((prev) => ({ ...prev, urgencia, prioridadCalculada: calcularPrioridad(prev.impacto, urgencia) }));
  };

  const setCategoriaITIL = (categoria: CategoriaITIL) => {
    setFormData((prev) => ({ ...prev, categoriaITIL: categoria }));
  };

  const handleSave = () => {
    const payload: GestionIncidentesData & { tipos: any[] } = {
      ...formData,
      prioridadCalculada: prioridad,
      tipos: [], // Campo obligatorio requerido por el backend
    };
    console.log('🟢 [GestionIncidentesForm] handleSave llamado');
    console.log('🟢 [GestionIncidentesForm] payload:', payload);
    console.log('🟢 [GestionIncidentesForm] onSave existe?:', !!onSave);
    if (onSave) {
      console.log('🟢 [GestionIncidentesForm] Llamando a onSave...');
      onSave(payload);
    } else {
      console.error('❌ [GestionIncidentesForm] onSave NO está definido!');
    }
  };

  const handleReset = () => {
    setFormData(initialData || defaultData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100">
      <div className="bg-linear-to-r from-amber-50 to-orange-50 border-b border-slate-200 px-8 py-6 flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-lg border border-amber-200">⚡</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Gestión de Incidentes</h3>
          <p className="text-sm text-slate-600 mt-1">Define cómo se clasifican los incidentes.</p>
        </div>
      </div>

      <div className="p-8 space-y-8">


        {/* Categoría ITIL */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">🔹 Categoría ITIL</p>
              <p className="text-xs text-gray-500 mt-1">Opcional pero recomendado</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'usuario', label: 'Usuario' },
              { value: 'infraestructura', label: 'Infraestructura' },
              { value: 'aplicacion', label: 'Aplicación' },
              { value: 'seguridad', label: 'Seguridad' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setCategoriaITIL(item.value as CategoriaITIL)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
                  formData.categoriaITIL === item.value
                    ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Impacto */}
        <div className="border-b pb-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">Impacto</p>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'alto', label: 'Alto' },
              { value: 'medio', label: 'Medio' },
              { value: 'bajo', label: 'Bajo' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setImpacto(item.value as Impacto)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
                  formData.impacto === item.value
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Urgencia */}
        <div className="border-b pb-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">Urgencia</p>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'alta', label: 'Alta' },
              { value: 'media', label: 'Media' },
              { value: 'baja', label: 'Baja' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setUrgencia(item.value as Urgencia)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
                  formData.urgencia === item.value
                    ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prioridad calculada */}
        <div className="bg-linear-to-r from-emerald-50 to-slate-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl">📌</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Regla ITIL</p>
            <p className="text-sm text-emerald-700 mt-1">Prioridad = Impacto + Urgencia (se calcula automáticamente).</p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-emerald-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-600">Prioridad actual:</span>
              <span className="text-sm font-bold text-emerald-700">{prioridad}</span>
            </div>
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
