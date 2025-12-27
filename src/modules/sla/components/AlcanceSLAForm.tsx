 import { useState, useEffect } from 'react';
import { getCatalogCategories, getCatalogTypes, ticketTypeLabel } from "@/modules/catalogo/services/catalogoService";

interface AlcanceSLAData {
  slaActivo: boolean;
  aplicaA: 'incidentes';
  tiposTicketCubiertos: string[];
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

const getDefaultAlcanceData = (): AlcanceSLAData => ({
  slaActivo: false,
  aplicaA: 'incidentes',
  tiposTicketCubiertos: ['incidente'],
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
  categorias,
  sedes = [],
}: AlcanceSLAFormProps) {
  // Determinar estado automático del SLA según estado del contrato
  const estadoContrato = arguments[0]?.estadoContrato || '';
  const estadoContratoLower = (estadoContrato || '').toLowerCase();
  const estadoContratoActivo = estadoContratoLower === 'activo';
  const estadoContratoInactivo = estadoContratoLower === 'vencido' || estadoContratoLower === 'suspendido';
  const getInitialData = (): AlcanceSLAData => {
    if (!initialData || Object.keys(initialData).length === 0) return getDefaultAlcanceData();
    let data = {
      ...getDefaultAlcanceData(),
      ...initialData,
    };
    if (estadoContratoActivo) {
      data.slaActivo = true;
    }
    if (estadoContratoInactivo) {
      data.slaActivo = false;
    }
    return data;
  };

  const [formData, setFormData] = useState<AlcanceSLAData>(getInitialData());
  const [availableCategories, setAvailableCategories] = useState<string[]>(categorias ?? []);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  useEffect(() => {
    // Si nos pasan categorías como prop las usamos; si no, intentamos cargar del módulo Catálogo
    if (categorias && categorias.length) {
      setAvailableCategories(categorias);
    } else {
      let mounted = true;
      const load = async () => {
        try {
          const cats = await getCatalogCategories();
          if (!mounted) return;
          setAvailableCategories(cats.map((c: any) => c.nombre));
        } catch (e) {
          console.warn('[AlcanceSLAForm] no se pudieron cargar categorías del catálogo', e);
        }
      };
      load();
      return () => { mounted = false; };
    }
  }, [categorias]);

  // Cargar tipos desde catálogo
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const types = await getCatalogTypes();
        if (!mounted) return;
        const normalized = Array.from(new Set((types || []).map((t) => String(t).trim().toLowerCase())));
        setAvailableTypes(normalized);
        if (!formData.tiposTicketCubiertos || !formData.tiposTicketCubiertos.length) {
          setFormData((prev) => ({ ...prev, tiposTicketCubiertos: [normalized[0] || 'incidente'] }));
        }
      } catch (e) {
        console.warn('[AlcanceSLAForm] no se pudieron cargar tipos del catálogo', e);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Si se activa 'todos', sincronizamos la lista de categorías para reflejar todas las existentes
  useEffect(() => {
    if (formData.activosCubiertos.tipo === 'todos') {
      setFormData((prev) => ({
        ...prev,
        activosCubiertos: {
          ...prev.activosCubiertos,
          categorias: availableCategories,
        },
      }));
    }
  }, [availableCategories, formData.activosCubiertos.tipo]);

  const handleToggleSLAActivo = () => {
    if (estadoContratoActivo) return; // No permitir cambiar si el contrato está activo
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

  // Handler para selección múltiple de categorías (replace multi-select UI)
  const handleSelectCategorias = (selected: string[]) => {
    setFormData((prev) => ({
      ...prev,
      activosCubiertos: {
        ...prev.activosCubiertos,
        categorias: selected,
      },
    }));
  };

  // Alterna una categoría individual en la selección (más cómodo en UI con checkboxes)
  const handleToggleCategoriaSelection = (categoria: string) => {
    setFormData((prev) => {
      const actuales = prev.activosCubiertos.categorias || [];
      return {
        ...prev,
        activosCubiertos: {
          ...prev.activosCubiertos,
          categorias: actuales.includes(categoria) ? actuales.filter((c) => c !== categoria) : [...actuales, categoria],
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
              {/* Mostrar el switch solo si el contrato NO está activo/inactivo automático */}
              {!(estadoContratoActivo || estadoContratoInactivo) && (
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
              )}
            </div>
            <div className="text-sm font-medium text-gray-700">
              Estado: {estadoContratoActivo && (
                <span className="text-green-600">✓ Activo</span>
              )}
              {estadoContratoInactivo && (
                <span className="text-red-600">✗ Inactivo</span>
              )}
              {estadoContratoActivo && (
                <span className="ml-2 text-xs text-emerald-700 font-semibold">(Automático por contrato activo)</span>
              )}
              {estadoContratoInactivo && (
                <span className="ml-2 text-xs text-rose-700 font-semibold">(Automático por contrato vencido/suspendido)</span>
              )}
            </div>
          </div>

          {/* 2. Aplica a */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">Tipos de ticket cubiertos por el SLA</label>
            <div className="space-y-3">
              {availableTypes.length === 0 && <p className="text-sm text-gray-500">Cargando tipos…</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {availableTypes.map((t) => (
                  <label key={t} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={(formData.tiposTicketCubiertos || []).includes(t)}
                      onChange={() => {
                        setFormData((prev) => {
                          const curr = prev.tiposTicketCubiertos || [];
                          return {
                            ...prev,
                            tiposTicketCubiertos: curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t],
                          };
                        });
                      }}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{ticketTypeLabel(t)}</span>
                  </label>
                ))}
              </div>
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

          {/* 4. Categorías cubiertas por el SLA */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">Categorías cubiertas por el SLA</label>
            <div className="space-y-4">
              {/* Modo: todas vs seleccionadas */}
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
                          categorias: availableCategories,
                        },
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">🔘 Aplica a todas las categorías</span>
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
                          categorias: [],
                        },
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">🔘 Aplica solo a las categorías seleccionadas</span>
                </label>
              </div>

              {/* Mostrar selector múltiple si está seleccionado "Por Categoría" */}
              {formData.activosCubiertos.tipo === 'porCategoria' && (
                <div className="ml-8 space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Selecciona las categorías cubiertas:</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableCategories.length === 0 && (
                      <p className="text-sm text-gray-500">No hay categorías disponibles en Catálogo.</p>
                    )}
                    {availableCategories.map((categoria) => (
                      <label key={categoria} className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.activosCubiertos.categorias || []).includes(categoria)}
                          onChange={() => handleToggleCategoriaSelection(categoria)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{categoria}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Jala las categorías creadas en el módulo de Catálogo de Categorías</p>
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
