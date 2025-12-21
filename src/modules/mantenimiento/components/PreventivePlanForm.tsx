import { useEffect, useMemo, useState } from "react";
import { getSedesByEmpresa } from "@/modules/empresas/services/sedesService";
import { getCategorias, type Category } from "@/modules/inventario/services/categoriasService";
import { getInventarioByEmpresa } from "@/modules/inventario/services/inventarioService";
import { getAreasByEmpresa } from "@/modules/inventario/services/areasService";

type Id = string | number;

export interface EmpresaLite {
  _id?: string;
  id?: string | number;
  nombre?: string;
  contactosTecnicos?: Array<{ nombre?: string; email?: string; telefono1?: string }>;
}

export interface PreventivePlanPayload {
  empresaId: string;
  nombrePlan: string;
  estado: "activo" | "inactivo";
  alcance: {
    sedes: { tipo: "todas" | "seleccionadas"; seleccionadas?: Id[] };
    activos: { modo: "categoria" | "especificos" | "todos"; categorias?: string[]; activosIds?: Id[] };
    areaIds?: Id[];
  };
  frecuenciaMeses: 1 | 3 | 6 | 12;
  fechaInicio: string; // YYYY-MM-DD
  horaSugerida?: string; // HH:mm
  modalidad: "remoto" | "presencial" | "mixto";
  tecnicoResponsable?: string; // nombre o id a definir luego
  checklist: string[];
  observaciones?: string;
}

interface Props {
  empresaId: string;
  empresa?: EmpresaLite | null;
  contractStatus?: string | null;
  frecuencia?: string;
  modalidad?: string;
  onSaved?: (plan: PreventivePlanPayload) => void;
}

const DEFAULT_CHECKLIST = [
  "Limpieza física",
  "Revisión de disco",
  "Actualización SO",
  "Antivirus actualizado",
  "Backup verificado",
];

export function PreventivePlanForm({ empresaId, empresa, contractStatus, frecuencia: propFrecuencia, modalidad: propModalidad, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sedes, setSedes] = useState<Array<{ _id?: Id; id?: Id; nombre?: string }>>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [activos, setActivos] = useState<Array<{ _id?: Id; id?: Id; etiqueta?: string; nombre?: string; categoria?: string; assetId?: string; codigo?: string }>>([]);
  const [areas, setAreas] = useState<Array<{ _id?: Id; id?: Id; name?: string; nombre?: string }>>([]);

  // Form state
  const [nombrePlan, setNombrePlan] = useState("");
  const [estado, setEstado] = useState<"activo" | "inactivo">("inactivo");
  const [sedesTipo, setSedesTipo] = useState<"todas" | "seleccionadas">("todas");
  const [sedesSeleccionadas, setSedesSeleccionadas] = useState<Id[]>([]);
  const [activosModo, setActivosModo] = useState<"categoria" | "especificos">("categoria");
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [activosSeleccionados, setActivosSeleccionados] = useState<Id[]>([]);
  const [areasSeleccionadas, setAreasSeleccionadas] = useState<Id[]>([]);
  const [frecuenciaMeses, setFrecuenciaMeses] = useState<1 | 3 | 6 | 12>(3);
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().slice(0, 10));
  const [horaSugerida, setHoraSugerida] = useState<string>("09:00");
  const [modalidad, setModalidad] = useState<"remoto" | "presencial" | "mixto">("mixto");
  const [tecnicoResponsable, setTecnicoResponsable] = useState<string>("");
  const [checklist, setChecklist] = useState<string[]>([...DEFAULT_CHECKLIST]);
  const [nuevaTarea, setNuevaTarea] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");

  const tecnicoOpciones = useMemo(() => {
    const base = empresa?.contactosTecnicos || [];
    const nombres = base
      .map((c) => c?.nombre)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i) as string[];
    return nombres;
  }, [empresa]);

  // Sync estado del plan automáticamente desde estado del contrato
  useEffect(() => {
    const s = (contractStatus || "").toLowerCase();
    setEstado(s === "activo" ? "activo" : "inactivo");
  }, [contractStatus]);

  // Sync frecuencia y modalidad desde props (contrato)
  useEffect(() => {
    if (propFrecuencia) {
      setFrecuenciaMeses(
        propFrecuencia === "1m" ? 1 :
        propFrecuencia === "3m" ? 3 :
        propFrecuencia === "6m" ? 6 :
        propFrecuencia === "12m" ? 12 :
        3
      );
    }
  }, [propFrecuencia]);

  useEffect(() => {
    if (propModalidad) {
      setModalidad(propModalidad as "remoto" | "presencial" | "mixto");
    }
  }, [propModalidad]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [sedesRes, catsRes, invRes, areasRes] = await Promise.all([
          getSedesByEmpresa(empresaId, true).catch(() => ({ data: [] })),
          getCategorias().catch(() => []),
          getInventarioByEmpresa(empresaId).catch(() => ({ data: [] })),
          getAreasByEmpresa(empresaId).catch(() => []),
        ]);

        if (!mounted) return;
        // Normalizar respuestas
        const sedesData = Array.isArray(sedesRes) ? sedesRes : (sedesRes?.data ?? []);
        const invData = Array.isArray(invRes) ? invRes : (invRes?.data ?? []);
        const areasData = Array.isArray(areasRes) ? areasRes : (areasRes?.data ?? []);
        setSedes(sedesData as any);
        setCategorias(Array.isArray(catsRes) ? catsRes : []);
        setActivos(invData as any);
        setAreas(areasData as any);
      } catch (e) {
        setError("No se pudieron cargar datos auxiliares");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [empresaId]);

  function getId(obj: any): Id | undefined {
    return obj?._id ?? obj?.id;
  }

  const activosFiltrados = useMemo(() => activos, [activos]);

  const handleToggleChecklistItem = (idx: number, value?: string) => {
    setChecklist((prev) => {
      const copy = [...prev];
      if (typeof value === "string") copy[idx] = value;
      else copy.splice(idx, 1);
      return copy;
    });
  };

  const addChecklistItem = () => {
    const v = nuevaTarea.trim();
    if (!v) return;
    setChecklist((prev) => [...prev, v]);
    setNuevaTarea("");
  };

  const resetForm = () => {
    setNombrePlan("");
    setEstado("activo");
    setSedesTipo("todas");
    setSedesSeleccionadas([]);
    setActivosModo("categoria");
    setCategoriasSeleccionadas([]);
    setActivosSeleccionados([]);
    setAreasSeleccionadas([]);
    setFrecuenciaMeses(3);
    setFechaInicio(new Date().toISOString().slice(0, 10));
    setHoraSugerida("09:00");
    setModalidad("mixto");
    setTecnicoResponsable("");
    setChecklist([...DEFAULT_CHECKLIST]);
    setObservaciones("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombrePlan.trim()) {
      setError("El nombre del plan es obligatorio");
      return;
    }
    if (!fechaInicio) {
      setError("La fecha de inicio es obligatoria");
      return;
    }
    const payload: PreventivePlanPayload = {
      empresaId,
      nombrePlan: nombrePlan.trim(),
      estado,
      alcance: {
        sedes: { tipo: sedesTipo, seleccionadas: sedesTipo === "seleccionadas" ? sedesSeleccionadas : undefined },
        activos: {
          modo: activosModo,
          categorias: activosModo === "categoria" ? categoriasSeleccionadas : undefined,
          activosIds: activosModo === "especificos" ? activosSeleccionados : undefined,
        },
        areaId: areasSeleccionadas.length > 0 ? areasSeleccionadas : undefined,
      },
      frecuenciaMeses,
      fechaInicio,
      horaSugerida,
      modalidad,
      tecnicoResponsable: tecnicoResponsable || undefined,
      checklist: checklist.filter((c) => c.trim().length > 0),
      observaciones: observaciones || undefined,
    };

    setSaving(true);
    try {
      // Por ahora no hay backend; mostramos JSON y notificamos
      console.log("[PreventivePlan] Guardar plan:", payload);
      setSuccess("✅ Plan guardado localmente (simulado). Integraremos API luego.");
      onSaved?.(payload);
      // resetForm(); // mantener datos tras guardar si prefieres comentar
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError("No se pudo guardar el plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-start justify-between pb-6 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-900">🎯 Planes de Mantenimiento</h3>
          <p className="text-sm text-slate-500 mt-1">Configura qué, cada cuánto y cómo se realiza el preventivo.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">{success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Empresa</label>
          <input
            value={empresa?.nombre || "—"}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Nombre del plan</label>
          <input
            value={nombrePlan}
            onChange={(e) => setNombrePlan(e.target.value)}
            placeholder="Ej: Preventivo PCs Ventas"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Estado (automático)</label>
          <select
            value={estado}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <p className="text-xs text-slate-500">Se sincroniza con el estado del contrato.</p>
        </div>
      </div>

      {/* Alcance */}
      <div className="space-y-4">
        <h4 className="text-base font-bold text-slate-900">Alcance</h4>
        {/* Sedes */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Sede(s)</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSedesTipo("todas")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  sedesTipo === "todas"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setSedesTipo("seleccionadas")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  sedesTipo === "seleccionadas"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
              >
                Seleccionadas
              </button>
            </div>
          </div>
          {sedesTipo === "seleccionadas" && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-auto pr-1">
              {sedes.map((s) => {
                const id = getId(s);
                const checked = sedesSeleccionadas.includes(id!);
                return (
                  <label key={String(id)} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSedesSeleccionadas((prev) =>
                          e.target.checked ? [...prev, id!] : prev.filter((x) => x !== id!)
                        );
                      }}
                    />
                    <span>{s.nombre || "Sede"}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Activos */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Activos</span>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActivosModo("categoria");
                  setCategoriasSeleccionadas([]);
                  setActivosSeleccionados([]);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  activosModo === "categoria"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
              >
                Por categoría
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivosModo("especificos");
                  setCategoriasSeleccionadas([]);
                  setActivosSeleccionados([]);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  activosModo === "especificos"
                    ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
              >
                Activos específicos
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivosModo("todos");
                  setCategoriasSeleccionadas([]);
                  setActivosSeleccionados([]);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  activosModo === "todos"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
              >
                Todos los activos
              </button>
            </div>
          </div>

          {activosModo === "categoria" ? (
            <div className="mt-3">
              <p className="text-xs text-slate-600 mb-2">Selecciona las categorías que deseas mantener:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-auto pr-1">
                {categorias.length > 0 ? (
                  categorias.map((c) => {
                    const id = c.id ?? c.nombre;
                    const checked = categoriasSeleccionadas.includes(String(id));
                    return (
                      <label key={String(id)} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setCategoriasSeleccionadas((prev) =>
                              e.target.checked
                                ? [...prev, String(id)]
                                : prev.filter((x) => x !== String(id))
                            );
                          }}
                        />
                        <span className="font-medium">{c.nombre}</span>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-slate-500 col-span-full text-sm">No hay categorías disponibles. Crea algunas en Inventario primero.</p>
                )}
              </div>
            </div>
          ) : activosModo === "especificos" ? (
            <div className="mt-3">
              <p className="text-xs text-slate-600 mb-2">Selecciona los activos específicos:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-auto pr-1">
                {activosFiltrados.map((a: any) => {
                  const id = getId(a)!;
                  const label = a?.assetId || a?.codigo || a?.etiqueta || a?.nombre || `Activo ${id}`;
                  const cat = a?.categoria ? ` · ${a.categoria}` : "";
                  const checked = activosSeleccionados.includes(id);
                  return (
                    <label key={String(id)} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setActivosSeleccionados((prev) =>
                            e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                          );
                        }}
                      />
                      <span className="font-medium">{label}</span>{cat}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-800">
              ✓ Se aplicará el preventivo a <strong>todos los activos</strong> de todas las categorías.
            </div>
          )}
        </div>

        {/* Área(s) */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="font-semibold text-slate-700">Área(s) (opcional)</label>
            <button
              type="button"
              onClick={() => {
                if (areasSeleccionadas.length === areas.length) {
                  setAreasSeleccionadas([]);
                } else {
                  setAreasSeleccionadas(areas.map(ar => getId(ar)!));
                }
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                areasSeleccionadas.length === areas.length && areas.length > 0
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
            >
              {areasSeleccionadas.length === areas.length && areas.length > 0 ? "✓ Todas seleccionadas" : "Seleccionar todas"}
            </button>
          </div>
          {areas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-auto pr-1">
              {areas.map((ar: any) => {
                const id = getId(ar)!;
                const checked = areasSeleccionadas.includes(id);
                const nombre = ar?.name || ar?.nombre || "Área";
                return (
                  <label key={String(id)} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setAreasSeleccionadas((prev) =>
                          e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                        );
                      }}
                    />
                    <span className="font-medium">{nombre}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm p-2">No hay áreas disponibles. Crea algunas en Inventario primero.</p>
          )}
        </div>
      </div>

      {/* Frecuencia y fecha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Frecuencia (automática)</label>
          <select
            value={frecuenciaMeses}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
          >
            <option value={1}>Cada 1 mes</option>
            <option value={3}>Cada 3 meses</option>
            <option value={6}>Cada 6 meses</option>
            <option value={12}>Cada 12 meses</option>
          </select>
          <p className="text-xs text-slate-500">Se sincroniza con el contrato.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Fecha de inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Hora sugerida</label>
          <input
            type="time"
            value={horaSugerida}
            onChange={(e) => setHoraSugerida(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300"
          />
        </div>
      </div>

      {/* Modalidad y técnico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Modalidad (automática)</label>
          <div className="flex gap-2">
            {(["remoto", "presencial", "mixto"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled
                className={`px-3 py-1.5 rounded-md text-sm font-medium border cursor-not-allowed ${
                  modalidad === m
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">Se sincroniza con el contrato.</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Técnico responsable</label>
          <input
            list="tecnicos"
            value={tecnicoResponsable}
            onChange={(e) => setTecnicoResponsable(e.target.value)}
            placeholder="Nombre del técnico"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="tecnicos">
            {tecnicoOpciones.map((n, i) => (
              <option key={i} value={n!} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Checklist base */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-900">Checklist base (editable)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white">
              <input
                value={item}
                onChange={(e) => handleToggleChecklistItem(idx, e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-slate-300"
              />
              <button
                type="button"
                onClick={() => handleToggleChecklistItem(idx)}
                className="px-2.5 py-1.5 rounded-md text-sm font-medium bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200"
                aria-label="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            placeholder="Agregar tarea..."
            className="flex-1 px-3 py-2 rounded-md border border-slate-300"
          />
          <button
            type="button"
            onClick={addChecklistItem}
            className="px-3 py-2 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
          >
            + Añadir
          </button>
        </div>
      </div>

      {/* Observaciones */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Observaciones</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={4}
          placeholder="Notas generales del plan"
          className="w-full px-3 py-2 rounded-lg border border-slate-300"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-500">📌 Este plan genera mantenimientos automáticamente en el calendario.</p>
        <button
          type="submit"
          disabled={saving || loading}
          className="px-6 py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "💾 Guardar Plan"}
        </button>
      </div>
    </form>
  );
}

export default PreventivePlanForm;
