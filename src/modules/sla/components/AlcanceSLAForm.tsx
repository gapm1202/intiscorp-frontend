 import { useState } from 'react';

interface AlcanceSLAData {
  slaActivo: boolean;
  aplicaA: 'incidentes';
  tipoServicioCubierto: 'incidente' | 'incidenteCritico';
  serviciosCubiertos: {
    soporteRemoto: boolean;
    soportePresencial: boolean;
    atencionEnSede: boolean;
  };
  activosCubiertos: {
    tipo: 'todos' | 'porCategoria';
    categorias?: string[];
    categoriasPersonalizadas?: string[];
  };
  sedesCubiertas: {
    tipo: 'todas' | 'seleccionadas';
    sedes?: string[];
  };
  observaciones: string;
}

interface AlcanceSLAFormProps {
  initialData?: AlcanceSLAData;
  onSave?: (data: AlcanceSLAData) => void;
  onCancel?: () => void;
  categorias?: string[];
  sedes?: { id: string; nombre: string }[];
}

const CATEGORIAS_DISPONIBLES = ['PC', 'Servidor', 'Impresora', 'Router', 'Switch', 'Firewall', 'Otro'];

const getDefaultAlcanceData = (): AlcanceSLAData => ({
  slaActivo: false,
  aplicaA: 'incidentes',
  tipoServicioCubierto: 'incidente',
  serviciosCubiertos: {
    soporteRemoto: false,
    soportePresencial: false,
    atencionEnSede: false,
  },
  activosCubiertos: {
    tipo: 'todos',
    categorias: [],
    categoriasPersonalizadas: [],
  },
  sedesCubiertas: {
    tipo: 'todas',
    sedes: [],
  },
  observaciones: '',
});

export function AlcanceSLAForm({
  initialData,
  onSave,
  onCancel,
  categorias = CATEGORIAS_DISPONIBLES,
  sedes = [],
}: AlcanceSLAFormProps) {
  const getInitialData = (): AlcanceSLAData => {
    if (!initialData || Object.keys(initialData).length === 0) return getDefaultAlcanceData();
    return {
      ...getDefaultAlcanceData(),
      ...initialData,
    };
  };

  const [formData, setFormData] = useState<AlcanceSLAData>(getInitialData());
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  const handleToggleSLAActivo = () => {
    setFormData((prev) => ({
      ...prev,
      slaActivo: !prev.slaActivo,
    }));
  };

  const handleToggleServicio = (servicio: keyof typeof formData.serviciosCubiertos) => {
    setFormData((prev) => ({
      ...prev,
      serviciosCubiertos: {
        ...prev.serviciosCubiertos,
        [servicio]: !prev.serviciosCubiertos[servicio],
      },
    }));
  };

  const handleToggleCategoria = (categoria: string) => {
    setFormData((prev) => {
      const actuales = prev.activosCubiertos.categorias || [];
      return {
        ...prev,
        activosCubiertos: {
          ...prev.activosCubiertos,
          categorias: actuales.includes(categoria)
            ? actuales.filter((c) => c !== categoria)
            : [...actuales, categoria],
        },
      };
    });
  };

  const handleToggleSede = (sedeId: string) => {
    setFormData((prev) => {
      const actuales = prev.sedesCubiertas.sedes || [];
      return {
        ...prev,
        sedesCubiertas: {
          ...prev.sedesCubiertas,
          sedes: actuales.includes(sedeId)
            ? actuales.filter((s) => s !== sedeId)
            : [...actuales, sedeId],
        },
      };
    });
  };

  const agregarCategoriaPersonalizada = () => {
    if (nuevaCategoria.trim()) {
      setFormData((prev) => ({
        ...prev,
        activosCubiertos: {
          ...prev.activosCubiertos,
          categoriasPersonalizadas: [
            ...(prev.activosCubiertos.categoriasPersonalizadas || []),
            nuevaCategoria.trim(),
          ],
        },
      }));
      setNuevaCategoria('');
    }
  };

  const eliminarCategoriaPersonalizada = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      activosCubiertos: {
        ...prev.activosCubiertos,
        categoriasPersonalizadas: (prev.activosCubiertos.categoriasPersonalizadas || []).filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
  };

  const handleObservaciones = (text: string) => {
    setFormData((prev) => ({
      ...prev,
      observaciones: text,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">👉</span>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alcance del SLA</h2>
          <p className="text-sm text-gray-600 mt-1">Define qué cubre el SLA para esta empresa.</p>
        </div>
      </div>

      {/* Card Principal */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100">
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-slate-200 px-8 py-6">
          <h3 className="text-lg font-bold text-slate-900">Configuración del Alcance</h3>
          <p className="text-sm text-slate-600 mt-1">Establece los parámetros de cobertura del SLA</p>
        </div>
        <div className="p-8 space-y-8">
          {/* 1. SLA Activo */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-900">SLA Activo</label>
                <p className="text-xs text-gray-500 mt-1">
                  Si está inactivo, los tickets no medirán SLA
                </p>
              </div>
              <button
                onClick={handleToggleSLAActivo}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  formData.slaActivo
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    formData.slaActivo ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="text-sm font-medium text-gray-700">
              Estado: <span className={formData.slaActivo ? 'text-green-600' : 'text-red-600'}>
                {formData.slaActivo ? '✓ Activo' : '✗ Inactivo'}
              </span>
            </div>
          </div>

          {/* 2. Aplica a */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">Aplica a</label>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                checked={formData.aplicaA === 'incidentes'}
                disabled
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Incidentes (Fijo)</span>
            </div>
          </div>

          {/* 2.1. Tipo de servicio cubierto */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">🔹 Tipo de servicio cubierto</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="tipoServicioCubierto"
                  value="incidente"
                  checked={formData.tipoServicioCubierto === 'incidente'}
                  onChange={() => setFormData((prev) => ({ ...prev, tipoServicioCubierto: 'incidente' }))}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm text-gray-700">Incidente</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="tipoServicioCubierto"
                  value="incidenteCritico"
                  checked={formData.tipoServicioCubierto === 'incidenteCritico'}
                  onChange={() => setFormData((prev) => ({ ...prev, tipoServicioCubierto: 'incidenteCritico' }))}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm text-gray-700">Incidente crítico</span>
              </label>
            </div>
          </div>

          {/* 3. Servicios Cubiertos */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">Servicios Cubiertos</label>
            <div className="space-y-3">
              {[
                { key: 'soporteRemoto', label: '🌐 Soporte Remoto' },
                { key: 'soportePresencial', label: '👤 Soporte Presencial' },
                { key: 'atencionEnSede', label: '🏢 Atención en Sede' },
              ].map((servicio) => (
                <label
                  key={servicio.key}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={
                      formData.serviciosCubiertos[servicio.key as keyof typeof formData.serviciosCubiertos]
                    }
                    onChange={() =>
                      handleToggleServicio(servicio.key as keyof typeof formData.serviciosCubiertos)
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{servicio.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Activos Cubiertos */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">Activos Cubiertos</label>
            <div className="space-y-4">
              {/* Todos vs Por Categoría */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="activosCubiertos"
                    value="todos"
                    checked={formData.activosCubiertos.tipo === 'todos'}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        activosCubiertos: {
                          ...prev.activosCubiertos,
                          tipo: 'todos',
                        },
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">📦 Todos los activos</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="activosCubiertos"
                    value="porCategoria"
                    checked={formData.activosCubiertos.tipo === 'porCategoria'}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        activosCubiertos: {
                          ...prev.activosCubiertos,
                          tipo: 'porCategoria',
                        },
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">🏷️ Por categoría</span>
                </label>
              </div>

              {/* Mostrar categorías si está seleccionado "Por Categoría" */}
              {formData.activosCubiertos.tipo === 'porCategoria' && (
                <div className="ml-8 space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-3">Selecciona las categorías a cubrir:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categorias.map((categoria) => (
                      <label
                        key={categoria}
                        className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.activosCubiertos.categorias?.includes(categoria) || false}
                          onChange={() => handleToggleCategoria(categoria)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{categoria}</span>
                      </label>
                    ))}
                  </div>
                  {/* Campo para agregar categorías personalizadas cuando se selecciona 'Otro' */}
                  {formData.activosCubiertos.categorias?.includes('Otro') && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200 space-y-3">
                      <p className="text-xs font-semibold text-gray-700">Agregar más categorías:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={nuevaCategoria}
                          onChange={(e) => setNuevaCategoria(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              agregarCategoriaPersonalizada();
                            }
                          }}
                          placeholder="Ej: Tablet, Escáner, UPS..."
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={agregarCategoriaPersonalizada}
                          type="button"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold whitespace-nowrap"
                        >
                          + Agregar
                        </button>
                      </div>
                      {(formData.activosCubiertos.categoriasPersonalizadas || []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600">Categorías agregadas:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {(formData.activosCubiertos.categoriasPersonalizadas || []).map((cat, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 hover:bg-white"
                              >
                                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.activosCubiertos.categorias?.includes(cat) || false}
                                    onChange={() => handleToggleCategoria(cat)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                  />
                                  <span className="text-sm text-gray-700">{cat}</span>
                                </label>
                                <button
                                  onClick={() => eliminarCategoriaPersonalizada(index)}
                                  type="button"
                                  className="text-red-600 hover:text-red-800 text-sm font-semibold ml-2"
                                  title="Eliminar categoría"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 5. Sedes Cubiertas */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">Sedes Cubiertas</label>
            <div className="space-y-4">
              {/* Todas vs Seleccionadas */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="sedesCubiertas"
                    value="todas"
                    checked={formData.sedesCubiertas.tipo === 'todas'}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        sedesCubiertas: {
                          ...prev.sedesCubiertas,
                          tipo: 'todas',
                        },
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">🌍 Todas las sedes</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="sedesCubiertas"
                    value="seleccionadas"
                    checked={formData.sedesCubiertas.tipo === 'seleccionadas'}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        sedesCubiertas: {
                          ...prev.sedesCubiertas,
                          tipo: 'seleccionadas',
                        },
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">📍 Sedes seleccionadas</span>
                </label>
              </div>

              {/* Mostrar sedes si está seleccionado "Seleccionadas" */}
              {formData.sedesCubiertas.tipo === 'seleccionadas' && (
                <div className="ml-8 space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-3">Selecciona las sedes a cubrir:</p>
                  {sedes.length > 0 ? (
                    <div className="space-y-2">
                      {sedes.map((sede) => (
                        <label
                          key={sede.id}
                          className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.sedesCubiertas.sedes?.includes(sede.id) || false}
                            onChange={() => handleToggleSede(sede.id)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700">{sede.nombre}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No hay sedes disponibles</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 6. Observaciones de Alcance */}
          <div>
            <label className="text-sm font-semibold text-gray-900 block mb-3">
              📝 Observaciones de Alcance
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleObservaciones(e.target.value)}
              placeholder="Agregue notas adicionales sobre el alcance del SLA..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setFormData(
            initialData || {
              slaActivo: false,
              aplicaA: 'incidentes',
              tipoServicioCubierto: 'incidente',
              serviciosCubiertos: {
                soporteRemoto: false,
                soportePresencial: false,
                atencionEnSede: false,
              },
              activosCubiertos: {
                tipo: 'todos',
                categorias: [],
                categoriasPersonalizadas: [],
              },
              sedesCubiertas: {
                tipo: 'todas',
                sedes: [],
              },
              observaciones: '',
            }
          )}
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

      {/* Info box */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>📌 Regla importante:</strong> Si el SLA está inactivo → los tickets no miden SLA.
        </p>
      </div>
    </div>
  );
}
