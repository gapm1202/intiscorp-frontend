import { useEffect, useMemo, useState } from "react";
import Charts from "../components/Charts";
import { getDashboardStats, type DashboardStats } from "../services/dashboardService";
import { Package, Building2, FileText, TrendingUp, Activity } from "lucide-react";

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
      {/* Indicadores principales con iconos y gradientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-linear-to-br from-blue-50 to-white border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Equipos Totales</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.totalEquipment.toLocaleString() ?? "—"}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                En inventario
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-linear-to-br from-emerald-50 to-white border-l-4 border-emerald-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Empresas</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.totalCompanies.toLocaleString() ?? "—"}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Clientes activos
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-linear-to-br from-purple-50 to-white border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Tickets</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.totalTickets.toLocaleString() ?? "—"}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Soporte técnico
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-linear-to-br from-amber-50 to-white border-l-4 border-amber-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Activos Recientes</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.recentAssets.length ?? 0}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Últimos registros
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Equipos agregados</h3>
              <p className="text-xs text-muted mt-0.5">Tendencia de los últimos 12 meses</p>
            </div>
            <div className="text-xs text-muted bg-slate-50 px-3 py-1.5 rounded-full">12 meses</div>
          </div>
          <div className="h-72">
            {stats && stats.equipmentByMonth.length > 0 ? (
              <Charts.AreaLineChart labels={months} data={stats.equipmentByMonth} label="Nuevos equipos" />
            ) : (
              <div className="h-full flex items-center justify-center text-muted">Sin datos disponibles</div>
            )}
          </div>
        </div>

        <div className="card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Distribución por categoría</h3>
            <p className="text-xs text-muted mt-0.5">Tipos de equipos en inventario</p>
          </div>
          <div className="h-72 flex items-center justify-center">
            {categoryLabels.length > 0 ? (
              <Charts.CategoryDoughnut labels={categoryLabels} values={categoryValues} />
            ) : (
              <div className="text-muted text-sm">Sin datos de categorías</div>
            )}
          </div>
        </div>
      </div>

      {/* Segunda fila de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Estados de Tickets</h3>
            <p className="text-xs text-muted mt-0.5">Distribución actual</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            {ticketStatusLabels.length > 0 ? (
              <Charts.CategoryDoughnut labels={ticketStatusLabels} values={ticketStatusValues} />
            ) : (
              <div className="text-muted text-sm">Sin datos de tickets</div>
            )}
          </div>
        </div>

        <div className="card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Inventario por ubicación</h3>
            <p className="text-xs text-muted mt-0.5">Top sedes con más equipos</p>
          </div>
          <div className="h-64">
            {locationLabels.length > 0 ? (
              <Charts.VerticalBar labels={locationLabels} values={locationValues} label="Equipos" />
            ) : (
              <div className="h-full flex items-center justify-center text-muted text-sm">Sin datos de ubicación</div>
            )}
          </div>
        </div>

        <div className="card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Activos recientes</h3>
            <p className="text-xs text-muted mt-0.5">Últimos registros en el sistema</p>
          </div>
          <div className="h-64 overflow-auto">
            {stats?.recentAssets && stats.recentAssets.length > 0 ? (
              <div className="space-y-3">
                {stats.recentAssets.map((a) => (
                  <div key={a.id} className="pb-3 border-b border-slate-100 last:border-0">
                    <div className="font-medium text-sm text-slate-800 truncate">{a.nombre}</div>
                    <div className="text-xs text-muted mt-1 flex items-center justify-between">
                      <span className="truncate">
                        {a.tag && `${a.tag} • `}
                        {a.categoria}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {new Date(a.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted text-sm">No hay activos recientes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
