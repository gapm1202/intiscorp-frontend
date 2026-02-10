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
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header con título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Dashboard Ejecutivo
          </h1>
          <p className="text-xs text-muted mt-0.5">Visión general del sistema en tiempo real</p>
        </div>
        <div className="text-xs text-gray-400">
          Última actualización: {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Indicadores principales - Diseño limpio y compacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Equipos Totales</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.totalEquipment.toLocaleString() ?? "—"}</p>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                En inventario
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Empresas</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.totalCompanies.toLocaleString() ?? "—"}</p>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-500" />
                Clientes activos
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Tickets</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.totalTickets.toLocaleString() ?? "—"}</p>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-purple-500" />
                Soporte técnico
              </p>
            </div>
            <div className="p-2.5 bg-purple-50 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Activos Recientes</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.recentAssets.length ?? 0}</p>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-amber-500" />
                Últimos registros
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de tendencia */}
      <div className="card p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Tendencia de Equipos
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Últimos 12 meses</p>
          </div>
          <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">12 meses</span>
        </div>
        <div className="h-64">
          {stats && stats.equipmentByMonth.length > 0 ? (
            <Charts.AreaLineChart labels={months} data={stats.equipmentByMonth} label="Nuevos equipos" />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">Sin datos disponibles</div>
          )}
        </div>
      </div>

      {/* Gráficos circulares - Estadísticas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-indigo-50 rounded-md">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Por Categoría</h3>
              <p className="text-[10px] text-gray-400">Distribución de equipos</p>
            </div>
          </div>
          <div className="h-56 flex items-center justify-center">
            {categoryLabels.length > 0 ? (
              <Charts.CategoryDoughnut labels={categoryLabels} values={categoryValues} />
            ) : (
              <div className="text-gray-400 text-xs">Sin datos de categorías</div>
            )}
          </div>
        </div>

        <div className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-purple-50 rounded-md">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Estado de Tickets</h3>
              <p className="text-[10px] text-gray-400">Distribución actual</p>
            </div>
          </div>
          <div className="h-56 flex items-center justify-center">
            {ticketStatusLabels.length > 0 ? (
              <Charts.PieChart labels={ticketStatusLabels} values={ticketStatusValues} />
            ) : (
              <div className="text-gray-400 text-xs">Sin datos de tickets</div>
            )}
          </div>
        </div>

        <div className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-emerald-50 rounded-md">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Por Ubicación</h3>
              <p className="text-[10px] text-gray-400">Top sedes</p>
            </div>
          </div>
          <div className="h-56 flex items-center justify-center">
            {locationLabels.length > 0 ? (
              <Charts.CategoryDoughnut labels={locationLabels} values={locationValues} />
            ) : (
              <div className="text-muted text-[13px]">Sin datos de ubicación</div>
            )}
          </div>
        </div>
      </div>

      {/* Activos recientes */}
      <div className="card p-4 hover:shadow-md transition-shadow">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 rounded-lg">
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Activos Recientes</h3>
            <p className="text-[10px] text-gray-400">Últimos equipos registrados</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats?.recentAssets && stats.recentAssets.length > 0 ? (
            stats.recentAssets.map((a) => (
              <div key={a.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-lg hover:border-slate-200 hover:bg-white transition-all">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px] text-slate-700 truncate">{a.nombre}</div>
                    {a.tag && (
                      <div className="text-[11px] text-indigo-500 font-mono mt-0.5">{a.tag}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[60%]">
                    {a.categoria || 'Sin categoría'}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-6 text-gray-400 text-[13px]">
              No hay activos recientes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
