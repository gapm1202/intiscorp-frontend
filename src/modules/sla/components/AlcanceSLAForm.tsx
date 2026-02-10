 import { useState, useEffect } from 'react';
import { getCatalogCategories, getTicketTypes } from "@/modules/catalogo/services/catalogoService";
import { getServicios } from '@/modules/catalogo/services/servicioApi';

interface AlcanceSLAData {
  slaActivo: boolean;
  aplicaA: 'incidentes';
  tiposTicket: string[];  // UUIDs de tipos de ticket
  serviciosCatalogoSLA: {
    tipo: 'todos' | 'seleccionados';
    servicios?: string[]; // IDs de servicios seleccionados
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
  estadoContrato?: string;
  contratoCompleto?: boolean;
  slaActivoOverride?: boolean;
}

const getDefaultAlcanceData = (): AlcanceSLAData => ({
  slaActivo: false,
  aplicaA: 'incidentes',
  tiposTicket: [],  // Se llenará con UUIDs al cargar tipos
  serviciosCatalogoSLA: {
    tipo: 'todos',
    servicios: [],
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
  estadoContrato = '',
  contratoCompleto = true,
  slaActivoOverride,
}: AlcanceSLAFormProps) {
  // Determinar estado automático del SLA según estado del contrato
  const estadoContratoLower = (estadoContrato || '').toLowerCase().trim();
  const estadoContratoActivo = estadoContratoLower === 'activo' || estadoContratoLower === 'vigente' || estadoContratoLower === 'active';
  const estadoContratoInactivo = estadoContratoLower === 'vencido' || estadoContratoLower === 'suspendido' || estadoContratoLower === 'expired' || estadoContratoLower === 'suspended';
  
  // Estado del SLA depende del estado del contrato
  const slaDebeEstarInactivo = estadoContratoInactivo;
  const getInitialData = (): AlcanceSLAData => {
    if (!initialData || Object.keys(initialData).length === 0) return getDefaultAlcanceData();
    let data = {
      ...getDefaultAlcanceData(),
      ...initialData,
    };
    const normalizeIds = (values?: unknown[]) => (values ?? []).map((v) => String(v));
    data = {
      ...data,
      tiposTicket: normalizeIds(data.tiposTicket),
      serviciosCatalogoSLA: {
        ...data.serviciosCatalogoSLA,
        servicios: normalizeIds(data.serviciosCatalogoSLA?.servicios),
      },
      activosCubiertos: {
        ...data.activosCubiertos,
        categorias: normalizeIds(data.activosCubiertos?.categorias),
        categoriasPersonalizadas: normalizeIds(data.activosCubiertos?.categoriasPersonalizadas),
      },
      sedesCubiertas: {
        ...data.sedesCubiertas,
        sedes: normalizeIds(data.sedesCubiertas?.sedes),
      },
    };
    if (estadoContratoActivo) {
      data.slaActivo = true;
    } else if (estadoContratoInactivo) {
      data.slaActivo = false;
    }
    return data;
  };

  const [formData, setFormData] = useState<AlcanceSLAData>(getInitialData());
  const slaActivoDisplay = typeof slaActivoOverride === 'boolean' ? slaActivoOverride : formData.slaActivo;
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; nombre: string }>>([]);
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);
  const [availableServicios, setAvailableServicios] = useState<any[]>([]);

  // Actualizar automáticamente el estado del SLA cuando cambie el estado del contrato o se complete
  useEffect(() => {
    if (estadoContratoActivo) {
      setFormData(prev => ({ ...prev, slaActivo: true }));
    } else if (estadoContratoInactivo) {
      setFormData(prev => ({ ...prev, slaActivo: false }));
    }
  }, [estadoContrato, estadoContratoActivo, estadoContratoInactivo]);

  useEffect(() => {
    setFormData(getInitialData());
  }, [initialData, estadoContrato, contratoCompleto]);

  useEffect(() => {
    // Si nos pasan categorías como prop las usamos; si no, intentamos cargar del módulo Catálogo
    if (categorias && categorias.length) {
      setAvailableCategories(categorias.map((nombre) => ({ id: nombre, nombre })));
    } else {
      let mounted = true;
      const load = async () => {
        try {
          const cats = await getCatalogCategories();
          if (!mounted) return;
          setAvailableCategories(cats.map((c: any) => ({ id: String(c.id ?? c._id ?? c.nombre), nombre: c.nombre })));
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
        const types = await getTicketTypes();
        if (!mounted) return;
        // Filtrar solo los tipos activos
        const tiposActivos = types.filter((tipo: any) => tipo.activo === true);
        console.log('[AlcanceSLAForm] Tipos de ticket activos cargados:', tiposActivos);
        setAvailableTypes(tiposActivos);
        
        // Si no hay tipos seleccionados, seleccionar el primero por defecto usando su UUID
        if (!formData.tiposTicket || !formData.tiposTicket.length) {
          const primerTipoUUID = tiposActivos[0]?.id;  // Usar UUID, no nombre
          if (primerTipoUUID) {
            setFormData((prev) => ({ ...prev, tiposTicket: [primerTipoUUID] }));
          }
        }
      } catch (e) {
        console.warn('[AlcanceSLAForm] no se pudieron cargar tipos del catálogo', e);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Cargar servicios del Catálogo de Servicios
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const servicios = await getServicios();
        if (!mounted) return;
        // Filtrar solo servicios activos
        const serviciosActivos = servicios.filter((s: any) => s.activo === true);
        console.log('[AlcanceSLAForm] Servicios del catálogo cargados:', serviciosActivos);
        setAvailableServicios(serviciosActivos);
      } catch (e) {
        console.warn('[AlcanceSLAForm] no se pudieron cargar servicios del catálogo', e);
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
          categorias: availableCategories.map((c) => c.id),
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
  const handleToggleCategoriaSelection = (categoriaId: string) => {
    setFormData((prev) => {
      const actuales = prev.activosCubiertos.categorias || [];
      return {
        ...prev,
        activosCubiertos: {
          ...prev.activosCubiertos,
          categorias: actuales.includes(categoriaId)
            ? actuales.filter((c) => c !== categoriaId)
            : [...actuales, categoriaId],
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

  const handleToggleServicioCatalogo = (servicioId: string) => {
    setFormData((prev) => {
      const actuales = prev.serviciosCatalogoSLA.servicios || [];
      return {
        ...prev,
        serviciosCatalogoSLA: {
          ...prev.serviciosCatalogoSLA,
          servicios: actuales.includes(servicioId)
            ? actuales.filter((s) => s !== servicioId)
            : [...actuales, servicioId],
        },
      };
    });
  };

  const handleSave = () => {
    if (onSave) {
      if (formData.activosCubiertos.tipo === 'porCategoria' && (formData.activosCubiertos.categorias || []).length === 0) {
        alert('Seleccione al menos una categoria para guardar el alcance.');
        return;
      }
      const normalizeIds = (values?: unknown[]) => (values ?? []).map((v) => String(v));
      onSave({
        ...formData,
        tiposTicket: normalizeIds(formData.tiposTicket),
        serviciosCatalogoSLA: {
          ...formData.serviciosCatalogoSLA,
          servicios: normalizeIds(formData.serviciosCatalogoSLA.servicios),
        },
        activosCubiertos: {
          ...formData.activosCubiertos,
          categorias: normalizeIds(formData.activosCubiertos.categorias),
          categoriasPersonalizadas: normalizeIds(formData.activosCubiertos.categoriasPersonalizadas),
        },
        sedesCubiertas: {
          ...formData.sedesCubiertas,
          sedes: normalizeIds(formData.sedesCubiertas.sedes),
        },
      });
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
          {/* 1. SLA Activo - Solo lectura, controlado por estado del contrato */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-900">Estado del SLA</label>
                <p className="text-xs text-gray-500 mt-1">
                  El estado se asigna automáticamente según el contrato
                </p>
              </div>
              {/* Indicador visual de solo lectura */}
              <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                slaActivoDisplay
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : 'bg-red-100 text-red-800 border-2 border-red-300'
              }`}>
                {slaActivoDisplay ? '✓ Activo' : '✗ Inactivo'}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">Estado controlado automáticamente</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {slaActivoDisplay ? (
                      <>
                        El SLA está <strong>Activo</strong> porque el estado del contrato es <strong className="text-green-700">Activo</strong>.
                      </>
                    ) : (
                      <>
                        El SLA está <strong>Inactivo</strong> porque el estado del contrato es <strong className="text-red-700">{estadoContratoInactivo ? 'Vencido o Suspendido' : 'No activo'}</strong>.
                      </>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    <>📌 Para cambiar el estado del SLA, actualiza el estado del contrato en la pestaña Contrato.</>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Aplica a */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">Tipos de ticket cubiertos por el SLA</label>
            <div className="space-y-3">
              {availableTypes.length === 0 && <p className="text-sm text-gray-500">Cargando tipos…</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {availableTypes.map((tipo) => (
                  <label key={tipo.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={(formData.tiposTicket || []).includes(tipo.id)}
                      onChange={() =>
                        setFormData((prev) => {
                          const curr = prev.tiposTicket || [];
                          return {
                            ...prev,
                            tiposTicket: curr.includes(tipo.id) ? curr.filter((x) => x !== tipo.id) : [...curr, tipo.id],
                          };
                        })
                      }
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{tipo.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Servicios cubiertos por el SLA (Origen: Catálogo de Servicios) */}
          <div className="border-b pb-6">
            <label className="text-sm font-semibold text-gray-900 block mb-4">
              Servicios cubiertos por el SLA
              <span className="text-xs font-normal text-gray-500 ml-2">(Origen: Catálogo de Servicios)</span>
            </label>
            <div className="space-y-4">
              {/* Radio buttons: Todos vs Seleccionados */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="serviciosCatalogoSLA"
                    value="todos"
                    checked={formData.serviciosCatalogoSLA.tipo === 'todos'}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        serviciosCatalogoSLA: {
                          ...prev.serviciosCatalogoSLA,
                          tipo: 'todos',
                        },
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">🔘 Aplica a todos los servicios</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="serviciosCatalogoSLA"
                    value="seleccionados"
                    checked={formData.serviciosCatalogoSLA.tipo === 'seleccionados'}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        serviciosCatalogoSLA: {
                          ...prev.serviciosCatalogoSLA,
                          tipo: 'seleccionados',
                          servicios: [],
                        },
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">🔘 Aplica solo a los servicios seleccionados</span>
                </label>
              </div>

              {/* Mostrar lista de servicios si está seleccionado "Seleccionados" */}
              {formData.serviciosCatalogoSLA.tipo === 'seleccionados' && (
                <div className="ml-8 space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Selecciona los servicios cubiertos:</label>
                  {availableServicios.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay servicios activos en el Catálogo de Servicios.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {availableServicios.map((servicio) => (
                        <label key={servicio.id} className="flex items-start gap-2 p-2 rounded hover:bg-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(formData.serviciosCatalogoSLA.servicios || []).includes(String(servicio.id))}
                            onChange={() => handleToggleServicioCatalogo(String(servicio.id))}
                            className="w-4 h-4 text-blue-600 rounded mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-gray-900 font-medium">{servicio.nombre}</span>
                            <span className="text-xs text-gray-500 block">{servicio.codigo}</span>
                            {servicio.tipoServicio && (
                              <span className="text-xs text-blue-600 block">Tipo: {servicio.tipoServicio}</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Servicios cargados desde el módulo Catálogo de Servicios</p>
                </div>
              )}
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
                          categorias: availableCategories.map((c) => c.id),
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
                      <label key={categoria.id} className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.activosCubiertos.categorias || []).includes(categoria.id)}
                          onChange={() => handleToggleCategoriaSelection(categoria.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{categoria.nombre}</span>
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
              tiposTicket: [],
              serviciosCatalogoSLA: {
                tipo: 'todos',
                servicios: [],
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
