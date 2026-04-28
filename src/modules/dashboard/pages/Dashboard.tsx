import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Charts from "../components/Charts";
import { getDashboardStats, type DashboardStats } from "../services/dashboardService";
import { getContratosProximosAVencer } from "@/modules/empresas/services/contratosService";
import {
  getContractualVisitNotifications,
  getUpcomingVisitNotifications,
  type ContractualVisitNotification,
  type UpcomingVisitNotification,
} from "@/modules/visitas/services/contractualNotificationsService";
import { getNotificacionesPendientes, type NotificacionSistema } from "@/modules/notificaciones/services/notificacionesSistemaService";
import { Package, Building2, FileText, TrendingUp, Activity, BarChart3, PieChart as PieChartIcon, Bell, Calendar, AlertTriangle, Clock } from "lucide-react";

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

    /* ── Pendientes ── */
    .db-pendientes { margin-bottom: 20px; }
    .db-pend-list { display: flex; flex-direction: column; gap: 8px; }
    .db-pend-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #eaecf5;
      background: #fff;
      transition: box-shadow 0.15s, transform 0.15s;
      cursor: default;
    }
    .db-pend-item:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); transform: translateY(-1px); }
    .db-pend-icon {
      width: 36px; height: 36px;
      border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .db-pend-body { flex: 1; min-width: 0; }
    .db-pend-empresa {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12px; font-weight: 700; color: #0f1120;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .db-pend-msg { font-size: 11px; color: #6b7280; margin-top: 2px; line-height: 1.4; }
    .db-pend-badge {
      font-size: 10px; font-weight: 600;
      padding: 3px 10px; border-radius: 20px;
      white-space: nowrap;
    }
    .db-pend-action {
      padding: 4px 12px; border-radius: 8px;
      border: none; cursor: pointer;
      font-size: 10px; font-weight: 600; color: #fff;
      transition: background 0.15s, transform 0.1s;
    }
    .db-pend-action:hover { transform: scale(1.04); }
    .db-pend-empty {
      display: flex; flex-direction: column; align-items: center;
      padding: 32px 0; gap: 8px;
    }
    .db-pend-empty-icon {
      width: 44px; height: 44px; border-radius: 50%;
      background: #f0fdf4;
      display: flex; align-items: center; justify-content: center;
    }
    .db-pend-tabs {
      display: flex; gap: 4px; margin-bottom: 14px;
    }
    .db-pend-tab {
      padding: 5px 14px; border-radius: 20px; border: none;
      font-size: 11px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }

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

interface ContratoProximoVencer {
  empresaId: string;
  empresaNombre: string;
  fechaFin: string;
  diasRestantes: number;
  renovacionAutomatica: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [contratosProximos, setContratosProximos] = useState<ContratoProximoVencer[]>([]);
  const [visitasPendientes, setVisitasPendientes] = useState<ContractualVisitNotification[]>([]);
  const [visitasProximas, setVisitasProximas] = useState<UpcomingVisitNotification[]>([]);
  const [preventivoPendientes, setPreventivoPendientes] = useState<NotificacionSistema[]>([]);
  const [pendTab, setPendTab] = useState<'all' | 'proximas' | 'contractuales' | 'contratos' | 'preventivo'>('all');

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

  useEffect(() => {
    const cargarPendientes = async () => {
      try {
        const [contratos, contractuales, proximas, preventivo] = await Promise.all([
          getContratosProximosAVencer(30),
          getContractualVisitNotifications(),
          getUpcomingVisitNotifications(3),
          getNotificacionesPendientes(),
        ]);
        setContratosProximos((contratos || []).map(c => ({
          ...c,
          diasRestantes: typeof c.diasRestantes === 'string' ? parseInt(c.diasRestantes as any, 10) : c.diasRestantes,
        })));
        setVisitasPendientes(contractuales || []);
        setVisitasProximas(proximas || []);
        setPreventivoPendientes(preventivo || []);
      } catch (err) {
        console.error('Error cargando pendientes:', err);
      }
    };
    cargarPendientes();
  }, []);

  const totalPendientes = contratosProximos.length + visitasPendientes.length + visitasProximas.length + preventivoPendientes.length;

  const filteredItems = useMemo(() => {
    type PendItem = { type: 'proxima'; data: UpcomingVisitNotification }
      | { type: 'contractual'; data: ContractualVisitNotification }
      | { type: 'contrato'; data: ContratoProximoVencer }
      | { type: 'preventivo'; data: NotificacionSistema };
    const items: PendItem[] = [];
    if (pendTab === 'all' || pendTab === 'preventivo') {
      preventivoPendientes.forEach(p => items.push({ type: 'preventivo', data: p }));
    }
    if (pendTab === 'all' || pendTab === 'proximas') {
      visitasProximas.forEach(v => items.push({ type: 'proxima', data: v }));
    }
    if (pendTab === 'all' || pendTab === 'contractuales') {
      visitasPendientes.forEach(v => items.push({ type: 'contractual', data: v }));
    }
    if (pendTab === 'all' || pendTab === 'contratos') {
      contratosProximos.forEach(c => items.push({ type: 'contrato', data: c }));
    }
    return items;
  }, [pendTab, visitasProximas, visitasPendientes, contratosProximos, preventivoPendientes]);

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

      {/* ─── PENDIENTES ─── */}
      <div className="db-panel db-pendientes">
        <div className="db-panel-hd">
          <div className="db-panel-hd-left">
            <div className="db-ph-icon" style={{ background: '#fef2f2' }}>
              <Bell size={14} color="#ef4444" />
            </div>
            <div>
              <div className="db-ph-title">Pendientes</div>
              <div className="db-ph-sub">Alertas y notificaciones activas</div>
            </div>
          </div>
          {totalPendientes > 0 && (
            <span className="db-badge" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
              {totalPendientes}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="db-pend-tabs">
          {[
            { key: 'all' as const, label: 'Todos', count: totalPendientes },
            { key: 'preventivo' as const, label: 'Mantenimiento', count: preventivoPendientes.length },
            { key: 'proximas' as const, label: 'Visitas próximas', count: visitasProximas.length },
            { key: 'contractuales' as const, label: 'Contractuales', count: visitasPendientes.length },
            { key: 'contratos' as const, label: 'Contratos', count: contratosProximos.length },
          ].map(tab => (
            <button
              key={tab.key}
              className="db-pend-tab"
              onClick={() => setPendTab(tab.key)}
              style={{
                background: pendTab === tab.key ? '#0f1120' : '#f3f4f6',
                color: pendTab === tab.key ? '#fff' : '#6b7280',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Items */}
        {filteredItems.length === 0 ? (
          <div className="db-pend-empty">
            <div className="db-pend-empty-icon">
              <svg width="22" height="22" fill="none" stroke="#10b981" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Sin pendientes</span>
          </div>
        ) : (
          <div className="db-pend-list" style={{ maxHeight: 340, overflowY: 'auto' }}>
            {filteredItems.map((item, idx) => {
              if (item.type === 'preventivo') {
                const p = item.data as NotificacionSistema;
                return (
                  <div key={`prev-${p.id}`} className="db-pend-item" style={{ borderLeft: '3px solid #3b82f6' }}>
                    <div className="db-pend-icon" style={{ background: '#dbeafe' }}>
                      <Clock size={16} color="#2563eb" />
                    </div>
                    <div className="db-pend-body">
                      <div className="db-pend-empresa">{p.empresaNombre}</div>
                      <div className="db-pend-msg">{p.mensaje}</div>
                    </div>
                    <span className="db-pend-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      Preventivo
                    </span>
                    <button className="db-pend-action" style={{ background: '#3b82f6' }} onClick={() => navigate('/admin/mantenimiento-preventivo')}>
                      Planificar
                    </button>
                  </div>
                );
              }
              if (item.type === 'proxima') {
                const v = item.data as UpcomingVisitNotification;
                return (
                  <div key={`prx-${v.visitaId || idx}`} className="db-pend-item" style={{ borderLeft: '3px solid #10b981' }}>
                    <div className="db-pend-icon" style={{ background: '#d1fae5' }}>
                      <Calendar size={16} color="#059669" />
                    </div>
                    <div className="db-pend-body">
                      <div className="db-pend-empresa">{v.empresaNombre}</div>
                      <div className="db-pend-msg">{v.mensaje}</div>
                      {v.sedeNombre && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{v.sedeNombre}</div>}
                    </div>
                    <span className="db-pend-badge" style={{
                      background: v.diasRestantes === 0 ? '#fef2f2' : '#ecfdf5',
                      color: v.diasRestantes === 0 ? '#dc2626' : '#065f46',
                      border: `1px solid ${v.diasRestantes === 0 ? '#fecaca' : '#6ee7b7'}`,
                    }}>
                      {v.diasRestantes === 0 ? 'Hoy' : v.diasRestantes === 1 ? 'Mañana' : `${v.diasRestantes}d`}
                    </span>
                    <button className="db-pend-action" style={{ background: '#10b981' }} onClick={() => navigate(`/admin/visitas?empresaId=${v.empresaId}`)}>
                      Ver
                    </button>
                  </div>
                );
              }
              if (item.type === 'contractual') {
                const v = item.data as ContractualVisitNotification;
                return (
                  <div key={`ctr-${v.empresaId}-${idx}`} className="db-pend-item" style={{ borderLeft: '3px solid #f59e0b' }}>
                    <div className="db-pend-icon" style={{ background: '#fff7ed' }}>
                      <AlertTriangle size={16} color="#ea580c" />
                    </div>
                    <div className="db-pend-body">
                      <div className="db-pend-empresa">{v.empresaNombre}</div>
                      <div className="db-pend-msg">{v.mensaje}</div>
                    </div>
                    <span className="db-pend-badge" style={{ background: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }}>
                      {v.visitasRegistradas}/{v.cantidadVisitas}
                    </span>
                    <button className="db-pend-action" style={{ background: '#f59e0b' }} onClick={() => navigate(`/admin/visitas?empresaId=${v.empresaId}`)}>
                      Gestión
                    </button>
                  </div>
                );
              }
              /* contrato */
              const c = item.data as ContratoProximoVencer;
              return (
                <div key={`con-${c.empresaId}-${idx}`} className="db-pend-item" style={{ borderLeft: `3px solid ${c.diasRestantes <= 7 ? '#ef4444' : c.diasRestantes <= 15 ? '#f97316' : '#eab308'}` }}>
                  <div className="db-pend-icon" style={{ background: c.diasRestantes <= 7 ? '#fef2f2' : c.diasRestantes <= 15 ? '#fff7ed' : '#fefce8' }}>
                    <Clock size={16} color={c.diasRestantes <= 7 ? '#ef4444' : c.diasRestantes <= 15 ? '#f97316' : '#eab308'} />
                  </div>
                  <div className="db-pend-body">
                    <div className="db-pend-empresa">{c.empresaNombre}</div>
                    <div className="db-pend-msg">
                      {c.diasRestantes === 0 ? 'Contrato vence hoy' : c.diasRestantes === 1 ? 'Contrato vence mañana' : `Contrato vence en ${c.diasRestantes} días`}
                    </div>
                  </div>
                  <span className="db-pend-badge" style={{
                    background: c.diasRestantes <= 7 ? '#fef2f2' : '#fefce8',
                    color: c.diasRestantes <= 7 ? '#dc2626' : '#a16207',
                    border: `1px solid ${c.diasRestantes <= 7 ? '#fecaca' : '#fde68a'}`,
                  }}>
                    {c.diasRestantes}d
                  </span>
                  <button className="db-pend-action" style={{ background: '#0ea5e9' }} onClick={() => { navigate(`/admin/empresas/${c.empresaId}`); sessionStorage.setItem(`empresaTab_${c.empresaId}`, 'contrato'); }}>
                    Revisar
                  </button>
                </div>
              );
            })}
          </div>
        )}
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