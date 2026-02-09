import { useEffect, useMemo, useState } from "react";
import Charts from "../components/Charts";
import { getDashboardStats, type DashboardStats } from "../services/dashboardService";
import { Package, Building2, FileText, TrendingUp, Activity, BarChart3, PieChart as PieChartIcon } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const months = useMemo(() => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"], []);

  const categoryLabels = stats?.categoryStats.map(c => c.label) || [];
  const categoryValues = stats?.categoryStats.map(c => c.value) || [];
  
  const locationLabels = stats?.locationStats.map(l => l.label) || [];
  const locationValues = stats?.locationStats.map(l => l.value) || [];
  
  const ticketStatusLabels = stats?.ticketsByStatus.map(t => t.label) || [];
  const ticketStatusValues = stats?.ticketsByStatus.map(t => t.value) || [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-muted">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header con título */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-indigo-600" />
          Dashboard Ejecutivo
        </h1>
        <p className="text-sm text-muted mt-1">Visión general del sistema en tiempo real</p>
      </div>

      {/* Indicadores principales con iconos y gradientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-linear-to-br from-blue-50 to-blue-100/50 border-l-4 border-blue-500 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Equipos Totales</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.totalEquipment.toLocaleString() ?? "—"}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                En inventario
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-xl shadow-md">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-linear-to-br from-emerald-50 to-emerald-100/50 border-l-4 border-emerald-500 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Empresas</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.totalCompanies.toLocaleString() ?? "—"}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Clientes activos
              </p>
            </div>
            <div className="p-3 bg-emerald-500 rounded-xl shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-linear-to-br from-purple-50 to-purple-100/50 border-l-4 border-purple-500 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Tickets</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.totalTickets.toLocaleString() ?? "—"}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Soporte técnico
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-xl shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-linear-to-br from-amber-50 to-amber-100/50 border-l-4 border-amber-500 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Activos Recientes</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.recentAssets.length ?? 0}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Últimos registros
              </p>
            </div>
            <div className="p-3 bg-amber-500 rounded-xl shadow-md">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de tendencia */}
      <div className="card p-6 shadow-md hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Tendencia de Equipos
            </h3>
            <p className="text-xs text-muted mt-1">Nuevos equipos agregados en los últimos 12 meses</p>
          </div>
          <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full">12 meses</div>
        </div>
        <div className="h-80">
          {stats && stats.equipmentByMonth.length > 0 ? (
            <Charts.AreaLineChart labels={months} data={stats.equipmentByMonth} label="Nuevos equipos" />
          ) : (
            <div className="h-full flex items-center justify-center text-muted">Sin datos disponibles</div>
          )}
        </div>
      </div>

      {/* Gráficos circulares - Estadísticas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 shadow-md hover:shadow-xl transition-all duration-300 bg-linear-to-br from-white to-indigo-50/30">
          <div className="mb-5 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Por Categoría</h3>
              <p className="text-xs text-muted">Distribución de equipos</p>
            </div>
          </div>
          <div className="h-80 flex items-center justify-center">
            {categoryLabels.length > 0 ? (
              <Charts.CategoryDoughnut labels={categoryLabels} values={categoryValues} />
            ) : (
              <div className="text-muted text-sm">Sin datos de categorías</div>
            )}
          </div>
        </div>

        <div className="card p-6 shadow-md hover:shadow-xl transition-all duration-300 bg-linear-to-br from-white to-purple-50/30">
          <div className="mb-5 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PieChartIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Estados de Tickets</h3>
              <p className="text-xs text-muted">Distribución actual</p>
            </div>
          </div>
          <div className="h-80 flex items-center justify-center">
            {ticketStatusLabels.length > 0 ? (
              <Charts.PieChart labels={ticketStatusLabels} values={ticketStatusValues} />
            ) : (
              <div className="text-muted text-sm">Sin datos de tickets</div>
            )}
          </div>
        </div>

        <div className="card p-6 shadow-md hover:shadow-xl transition-all duration-300 bg-linear-to-br from-white to-emerald-50/30">
          <div className="mb-5 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <PieChartIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Por Ubicación</h3>
              <p className="text-xs text-muted">Top sedes</p>
            </div>
          </div>
          <div className="h-80 flex items-center justify-center">
            {locationLabels.length > 0 ? (
              <Charts.CategoryDoughnut labels={locationLabels} values={locationValues} />
            ) : (
              <div className="text-muted text-sm">Sin datos de ubicación</div>
            )}
          </div>
        </div>
      </div>

      {/* Activos recientes */}
      <div className="card p-6 shadow-md hover:shadow-xl transition-all duration-300">
        <div className="mb-5 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Activos Recientes</h3>
            <p className="text-xs text-muted">Últimos equipos registrados en el sistema</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.recentAssets && stats.recentAssets.length > 0 ? (
            stats.recentAssets.map((a) => (
              <div key={a.id} className="p-4 bg-linear-to-br from-slate-50 to-white border border-slate-200 rounded-lg hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-800 truncate">{a.nombre}</div>
                    {a.tag && (
                      <div className="text-xs text-indigo-600 font-mono mt-1">{a.tag}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded truncate">
                    {a.categoria || 'Sin categoría'}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(a.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted text-sm">
              No hay activos recientes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
