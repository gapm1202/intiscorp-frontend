import { useEffect, useMemo, useState } from "react";
import Charts from "../components/Charts";
import { getDashboardStats, type DashboardStats } from "../services/dashboardService";
import { Package, Building2, FileText, TrendingUp, Activity, BarChart3, PieChart as PieChartIcon } from "lucide-react";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');

    .db * { box-sizing: border-box; margin: 0; padding: 0; }

    .db {
      font-family: 'Instrument Sans', sans-serif;
      background: #f4f6fb;
      color: #1a1d2e;
      min-height: 100vh;
      padding: 24px 28px;
    }

    /* ── Header ── */
    .db-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .db-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #0f1120;
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.3px;
    }
    .db-title-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(99,102,241,0.3);
    }
    .db-subtitle { font-size: 12px; color: #8b91a8; margin-top: 3px; }
    .db-live {
      display: flex; align-items: center; gap: 7px;
      font-size: 11px; color: #6b7280;
      background: #fff;
      border: 1px solid #e5e7f0;
      padding: 6px 14px;
      border-radius: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .db-live-dot {
      width: 7px; height: 7px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
      animation: db-pulse 2s infinite;
    }
    @keyframes db-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

    /* ── KPI Grid ── */
    .db-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    @media(max-width:900px){.db-kpi-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:500px){.db-kpi-grid{grid-template-columns:1fr}}

    .db-kpi {
      background: #fff;
      border-radius: 16px;
      padding: 18px 18px 16px;
      border: 1px solid #eaecf5;
      box-shadow: 0 1px 6px rgba(0,0,0,0.04);
      transition: box-shadow 0.2s, transform 0.2s;
      position: relative;
      overflow: hidden;
    }
    .db-kpi:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); transform: translateY(-2px); }
    .db-kpi::after {
      content:'';
      position:absolute;
      top:0;left:0;right:0;
      height:3px;
      background: var(--kpi-stripe, #6366f1);
      border-radius:16px 16px 0 0;
    }
    .db-kpi-top {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 14px;
    }
    .db-kpi-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #8b91a8;
    }
    .db-kpi-icon {
      width: 36px; height: 36px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: var(--kpi-icon-bg, #f0f0ff);
    }
    .db-kpi-value {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 36px;
      font-weight: 800;
      color: #0f1120;
      line-height: 1;
      letter-spacing: -1.5px;
    }
    .db-kpi-meta {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: #9ca3af;
      margin-top: 8px;
    }

    /* ── Panel base ── */
    .db-panel {
      background: #fff;
      border-radius: 18px;
      border: 1px solid #eaecf5;
      box-shadow: 0 1px 6px rgba(0,0,0,0.04);
      padding: 20px;
      transition: box-shadow 0.2s;
    }
    .db-panel:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.07); }

    .db-panel-hd {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px;
    }
    .db-panel-hd-left {
      display: flex; align-items: center; gap: 10px;
    }
    .db-ph-icon {
      width: 32px; height: 32px;
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
    }
    .db-ph-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px; font-weight: 700; color: #0f1120;
    }
    .db-ph-sub { font-size: 10px; color: #9ca3af; margin-top: 1px; }

    .db-badge {
      font-size: 10px; font-weight: 600;
      padding: 4px 10px; border-radius: 20px;
    }
    .db-badge-v { background:#ede9fe; color:#7c3aed; }
    .db-badge-n { background:#f3f4f6; color:#374151; border:1px solid #e5e7eb; }

    /* ── Trend chart ── */
    .db-trend { margin-bottom: 20px; }
    .db-trend-body { height: 240px; }

    /* ── Charts row ── */
    .db-charts-row {
      display: grid;
      grid-template-columns: repeat(3,1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    @media(max-width:900px){.db-charts-row{grid-template-columns:1fr}}
    .db-chart-body {
      height: 210px;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── Assets ── */
    .db-assets-grid {
      display: grid;
      grid-template-columns: repeat(3,1fr);
      gap: 10px;
    }
    @media(max-width:900px){.db-assets-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:540px){.db-assets-grid{grid-template-columns:1fr}}

    .db-asset {
      background: #f9fafb;
      border: 1px solid #eaecf5;
      border-radius: 12px;
      padding: 12px 14px;
      transition: border-color 0.2s, background 0.2s;
    }
    .db-asset:hover { border-color: #c7d2fe; background: #f5f3ff; }
    .db-asset-code {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px; font-weight: 700; color: #111827;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .db-asset-tag { font-size: 10px; color: #6366f1; margin-top: 2px; font-weight: 500; }
    .db-asset-foot {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;
    }
    .db-asset-cat {
      font-size: 10px; background: #e0e7ff; color: #4338ca;
      border-radius: 6px; padding: 2px 8px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;
      font-weight: 500;
    }
    .db-asset-date { font-size: 10px; color: #9ca3af; }

    .db-empty { font-size: 12px; color: #9ca3af; text-align:center; padding: 28px 0; width:100%; }
    .db-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; height:60vh; gap:14px; }
    .db-spinner {
      width:40px;height:40px;border-radius:50%;
      border:2px solid #e5e7eb; border-top-color:#6366f1;
      animation:db-spin 0.75s linear infinite;
    }
    @keyframes db-spin{to{transform:rotate(360deg)}}
    .db-loading-txt { font-size:13px; color:#9ca3af; }
  `}</style>
);

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

  const months = useMemo(() => {
    const names = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const year = new Date().getFullYear();
    return names.map((n) => `${n} ${year}`);
  }, []);

  const categoryLabels = stats?.categoryStats.map(c => c.label) || [];
  const categoryValues = stats?.categoryStats.map(c => c.value) || [];
  const locationLabels = stats?.locationStats.map(l => l.label) || [];
  const locationValues = stats?.locationStats.map(l => l.value) || [];
  const ticketStatusLabels = stats?.ticketsByStatus.map(t => t.label) || [];
  const ticketStatusValues = stats?.ticketsByStatus.map(t => t.value) || [];

  if (loading) {
    return (
      <div className="db">
        <GlobalStyles />
        <div className="db-loading">
          <div className="db-spinner" />
          <p className="db-loading-txt">Cargando estadísticas…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="db">
      <GlobalStyles />

      {/* Header */}
      <div className="db-header">
        <div>
          <div className="db-title">
            <div className="db-title-icon">
              <BarChart3 size={17} color="#fff" />
            </div>
            Dashboard Estadistico
          </div>
          <p className="db-subtitle">Visión general del sistema en tiempo real</p>
        </div>
        <div className="db-live">
          <div className="db-live-dot" />
          Actualizado {new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="db-kpi-grid">
        <div className="db-kpi" style={{'--kpi-stripe':'#6366f1','--kpi-icon-bg':'#ede9fe'} as React.CSSProperties}>
          <div className="db-kpi-top">
            <span className="db-kpi-label">Equipos Totales</span>
            <div className="db-kpi-icon"><Package size={16} color="#6366f1" /></div>
          </div>
          <div className="db-kpi-value">{stats?.totalEquipment.toLocaleString() ?? "—"}</div>
          <div className="db-kpi-meta"><TrendingUp size={11} color="#6366f1" /> En inventario</div>
        </div>

        <div className="db-kpi" style={{'--kpi-stripe':'#10b981','--kpi-icon-bg':'#d1fae5'} as React.CSSProperties}>
          <div className="db-kpi-top">
            <span className="db-kpi-label">Empresas</span>
            <div className="db-kpi-icon"><Building2 size={16} color="#10b981" /></div>
          </div>
          <div className="db-kpi-value">{stats?.totalCompanies.toLocaleString() ?? "—"}</div>
          <div className="db-kpi-meta"><Activity size={11} color="#10b981" /> Clientes activos</div>
        </div>

        <div className="db-kpi" style={{'--kpi-stripe':'#f43f5e','--kpi-icon-bg':'#ffe4e6'} as React.CSSProperties}>
          <div className="db-kpi-top">
            <span className="db-kpi-label">Tickets</span>
            <div className="db-kpi-icon"><FileText size={16} color="#f43f5e" /></div>
          </div>
          <div className="db-kpi-value">{stats?.totalTickets.toLocaleString() ?? "—"}</div>
          <div className="db-kpi-meta"><Activity size={11} color="#f43f5e" /> Soporte técnico</div>
        </div>

        <div className="db-kpi" style={{'--kpi-stripe':'#f59e0b','--kpi-icon-bg':'#fef3c7'} as React.CSSProperties}>
          <div className="db-kpi-top">
            <span className="db-kpi-label">Activos Recientes</span>
            <div className="db-kpi-icon"><Package size={16} color="#f59e0b" /></div>
          </div>
          <div className="db-kpi-value">{stats?.recentAssets.length ?? 0}</div>
          <div className="db-kpi-meta"><TrendingUp size={11} color="#f59e0b" /> Últimos registros</div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="db-panel db-trend">
        <div className="db-panel-hd">
          <div className="db-panel-hd-left">
            <div className="db-ph-icon" style={{background:'#ede9fe'}}>
              <TrendingUp size={14} color="#6366f1" />
            </div>
            <div>
              <div className="db-ph-title">Tendencia de Equipos</div>
              <div className="db-ph-sub">Últimos 12 meses</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <span className="db-badge db-badge-v">12 meses</span>
            <span className="db-badge db-badge-n">
              {stats ? stats.equipmentByMonth.reduce((a,b) => a+(Number(b)||0),0) : 0} Nuevos
            </span>
          </div>
        </div>
        <div className="db-trend-body">
          {stats && stats.equipmentByMonth.length > 0 ? (
            (() => {
              const currentYear = new Date().getFullYear();
              const keepIndices: number[] = months
                .map((m,idx) => ({m,idx} as any))
                .filter(x => String(x.m).includes(String(currentYear)))
                .map(x => x.idx);
              const filteredLabels = keepIndices.map(i => months[i]);
              const filteredData = keepIndices.map(i => Number(stats.equipmentByMonth[i]) || 0);
              return filteredLabels.length > 0 ? (
                <Charts.AreaLineChart labels={filteredLabels} data={filteredData} label="Nuevos equipos" />
              ) : (
                <div className="db-empty">Sin datos disponibles</div>
              );
            })()
          ) : (
            <div className="db-empty">Sin datos disponibles</div>
          )}
        </div>
      </div>

      {/* Donut / Pie charts */}
      <div className="db-charts-row">
        <div className="db-panel">
          <div className="db-panel-hd">
            <div className="db-panel-hd-left">
              <div className="db-ph-icon" style={{background:'#ede9fe'}}>
                <PieChartIcon size={13} color="#6366f1" />
              </div>
              <div>
                <div className="db-ph-title">Por Categoría</div>
                <div className="db-ph-sub">Distribución de equipos</div>
              </div>
            </div>
          </div>
          <div className="db-chart-body">
            {categoryLabels.length > 0
              ? <Charts.CategoryDoughnut labels={categoryLabels} values={categoryValues} />
              : <div className="db-empty">Sin datos de categorías</div>
            }
          </div>
        </div>

        <div className="db-panel">
          <div className="db-panel-hd">
            <div className="db-panel-hd-left">
              <div className="db-ph-icon" style={{background:'#ffe4e6'}}>
                <PieChartIcon size={13} color="#f43f5e" />
              </div>
              <div>
                <div className="db-ph-title">Estado de Tickets</div>
                <div className="db-ph-sub">Distribución actual</div>
              </div>
            </div>
          </div>
          <div className="db-chart-body">
            {ticketStatusLabels.length > 0
              ? <Charts.PieChart labels={ticketStatusLabels} values={ticketStatusValues} />
              : <div className="db-empty">Sin datos de tickets</div>
            }
          </div>
        </div>

        <div className="db-panel">
          <div className="db-panel-hd">
            <div className="db-panel-hd-left">
              <div className="db-ph-icon" style={{background:'#d1fae5'}}>
                <PieChartIcon size={13} color="#10b981" />
              </div>
              <div>
                <div className="db-ph-title">Por Ubicación</div>
                <div className="db-ph-sub">Top sedes</div>
              </div>
            </div>
          </div>
          <div className="db-chart-body">
            {locationLabels.length > 0
              ? <Charts.CategoryDoughnut labels={locationLabels} values={locationValues} />
              : <div className="db-empty">Sin datos de ubicación</div>
            }
          </div>
        </div>
      </div>

      {/* Recent assets */}
      <div className="db-panel">
        <div className="db-panel-hd">
          <div className="db-panel-hd-left">
            <div className="db-ph-icon" style={{background:'#fef3c7'}}>
              <Package size={13} color="#f59e0b" />
            </div>
            <div>
              <div className="db-ph-title">Activos Recientes</div>
              <div className="db-ph-sub">Últimos equipos registrados</div>
            </div>
          </div>
        </div>
        <div className="db-assets-grid">
          {stats?.recentAssets && stats.recentAssets.length > 0 ? (
            stats.recentAssets.map((a) => (
              <div key={a.id} className="db-asset">
                <div className="db-asset-code">{(a as any).codigo || String(a.id) || a.nombre}</div>
                {a.tag && <div className="db-asset-tag">{a.tag}</div>}
                <div className="db-asset-foot">
                  <span className="db-asset-cat">{a.categoria || 'Sin categoría'}</span>
                  <span className="db-asset-date">
                    {new Date(a.createdAt).toLocaleDateString('es-ES',{month:'short',day:'numeric'})}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="db-empty">No hay activos recientes</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;