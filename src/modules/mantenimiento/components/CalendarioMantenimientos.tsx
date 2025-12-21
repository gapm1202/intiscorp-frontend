import { useState, useEffect, useMemo } from "react";

interface PlanMantenimiento {
  id: string;
  nombre: string;
  empresa: string;
  sede: string;
  estado: "programado" | "en_ejecucion" | "vencido" | "completado";
  fechaInicio: string;
  fechaFin?: string;
  tecnico?: string;
  modalidad: string;
  activos: string[];
  observaciones?: string;
}

interface CalendarioProps {
  planes?: PlanMantenimiento[];
  empresaId?: string;
  onSelectPlan?: (plan: PlanMantenimiento) => void;
}

// Colores por estado
const estadoColores = {
  programado: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  en_ejecucion: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  vencido: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-800", dot: "bg-red-500" },
  completado: { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-100 text-slate-800", dot: "bg-slate-500" },
};

const estadoLabels = {
  programado: "Programado",
  en_ejecucion: "En Ejecución",
  vencido: "Vencido",
  completado: "Completado",
};

export default function CalendarioMantenimientos({ planes = [], empresaId, onSelectPlan }: CalendarioProps) {
  const [vistaActual, setVistaActual] = useState<"mes" | "semana">("mes");
  const [mesActual, setMesActual] = useState(new Date());
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroTecnico, setFiltroTecnico] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanMantenimiento | null>(null);

  // Obtener meses y años
  const mesAnio = `${mesActual.toLocaleString("es-ES", { month: "long" })} ${mesActual.getFullYear()}`;
  const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const diaInicio = primerDia.getDay();

  // Obtener tecnicos únicos
  const tecnicos = useMemo(() => {
    const tecs = [...new Set(planes.map((p) => p.tecnico).filter(Boolean))];
    return tecs;
  }, [planes]);

  // Filtrar planes
  const planesFiltrados = useMemo(() => {
    return planes.filter((plan) => {
      const matchEstado = filtroEstado === "todos" || plan.estado === filtroEstado;
      const matchTecnico = filtroTecnico === "todos" || plan.tecnico === filtroTecnico;
      return matchEstado && matchTecnico;
    });
  }, [planes, filtroEstado, filtroTecnico]);

  // Obtener planes por fecha
  const planesPorFecha = useMemo(() => {
    const mapa: { [key: string]: PlanMantenimiento[] } = {};
    planesFiltrados.forEach((plan) => {
      const fecha = plan.fechaInicio.split("T")[0]; // YYYY-MM-DD
      if (!mapa[fecha]) mapa[fecha] = [];
      mapa[fecha].push(plan);
    });
    return mapa;
  }, [planesFiltrados]);

  // Construir calendario
  const dias = [];
  for (let i = 0; i < diaInicio; i++) {
    dias.push(null);
  }
  for (let i = 1; i <= diasEnMes; i++) {
    dias.push(i);
  }

  const handleSelectPlan = (plan: PlanMantenimiento) => {
    setSelectedPlan(plan);
    setModalOpen(true);
    if (onSelectPlan) onSelectPlan(plan);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: planesFiltrados.length,
      programados: planesFiltrados.filter((p) => p.estado === "programado").length,
      enEjecucion: planesFiltrados.filter((p) => p.estado === "en_ejecucion").length,
      vencidos: planesFiltrados.filter((p) => p.estado === "vencido").length,
    };
  }, [planesFiltrados]);

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">📅 Calendario de Mantenimientos</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVistaActual(vistaActual === "mes" ? "semana" : "mes")}
              className="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
            >
              {vistaActual === "mes" ? "Vista Semanal" : "Vista Mensual"}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white"
            >
              <option value="todos">Todos los estados</option>
              <option value="programado">🟢 Programado</option>
              <option value="en_ejecucion">🔵 En Ejecución</option>
              <option value="vencido">🔴 Vencido</option>
              <option value="completado">⚪ Completado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Técnico</label>
            <select
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white"
            >
              <option value="todos">Todos los técnicos</option>
              {tecnicos.map((tec) => (
                <option key={tec} value={tec}>
                  {tec}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">{stats.total}</span> planes{" "}
              <span className="text-emerald-600">({stats.programados})</span>{" "}
              <span className="text-blue-600">({stats.enEjecucion})</span>{" "}
              <span className="text-red-600">({stats.vencidos})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendario */}
      {vistaActual === "mes" ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Header del mes */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 flex justify-between items-center border-b border-slate-200">
            <button
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1))}
              className="p-1.5 rounded-md hover:bg-slate-200"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h4 className="text-sm font-semibold text-slate-900 capitalize">{mesAnio}</h4>
            <button
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1))}
              className="p-1.5 rounded-md hover:bg-slate-200"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sab", "Dom"].map((day) => (
              <div key={day} className="p-3 text-center text-xs font-semibold text-slate-600">
                {day}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 p-px">
            {dias.map((dia, idx) => {
              const fechaStr = dia
                ? `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
                : "";
              const planesDelDia = fechaStr ? planesPorFecha[fechaStr] || [] : [];
              const esHoy =
                dia &&
                new Date().getDate() === dia &&
                new Date().getMonth() === mesActual.getMonth() &&
                new Date().getFullYear() === mesActual.getFullYear();

              return (
                <div
                  key={idx}
                  className={`min-h-24 p-2 bg-white ${esHoy ? "bg-amber-50 border-l-4 border-amber-400" : ""}`}
                >
                  {dia && (
                    <>
                      <div className={`text-xs font-semibold mb-1 ${esHoy ? "text-amber-700" : "text-slate-600"}`}>
                        {dia}
                      </div>
                      <div className="space-y-1">
                        {planesDelDia.slice(0, 2).map((plan) => {
                          const colors = estadoColores[plan.estado as keyof typeof estadoColores];
                          return (
                            <button
                              key={plan.id}
                              onClick={() => handleSelectPlan(plan)}
                              className={`w-full text-left px-2 py-1 text-xs rounded border-l-2 ${colors.bg} ${colors.border} hover:shadow-md transition cursor-pointer truncate`}
                            >
                              <div className="font-semibold text-slate-900 truncate">{plan.nombre}</div>
                              <div className="text-slate-600 truncate">{plan.tecnico || "Sin técnico"}</div>
                            </button>
                          );
                        })}
                        {planesDelDia.length > 2 && (
                          <div className="text-xs text-slate-500 px-2 py-1 font-medium">
                            +{planesDelDia.length - 2} más
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border border-slate-200 text-center text-slate-500">
          <p className="text-sm">Vista semanal en desarrollo... 🔧</p>
        </div>
      )}

      {/* Modal de detalles */}
      {modalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedPlan.nombre}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${estadoColores[selectedPlan.estado].badge}`}>
                    {estadoLabels[selectedPlan.estado]}
                  </span>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Empresa</label>
                  <p className="text-sm text-slate-900">{selectedPlan.empresa}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Sede</label>
                  <p className="text-sm text-slate-900">{selectedPlan.sede}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Técnico</label>
                  <p className="text-sm text-slate-900">{selectedPlan.tecnico || "Sin asignar"}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Modalidad</label>
                  <p className="text-sm text-slate-900">{selectedPlan.modalidad}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Fecha Inicio</label>
                  <p className="text-sm text-slate-900">{formatearFecha(selectedPlan.fechaInicio)}</p>
                </div>
                {selectedPlan.fechaFin && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Fecha Fin</label>
                    <p className="text-sm text-slate-900">{formatearFecha(selectedPlan.fechaFin)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Activos</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedPlan.activos.map((activo) => (
                    <span key={activo} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                      {activo}
                    </span>
                  ))}
                </div>
              </div>

              {selectedPlan.observaciones && (
                <div>
                  <label className="text-xs font-semibold text-slate-600">Observaciones</label>
                  <p className="text-sm text-slate-700 mt-1">{selectedPlan.observaciones}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cerrar
              </button>
              <button className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700">
                🚀 Ejecutar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
