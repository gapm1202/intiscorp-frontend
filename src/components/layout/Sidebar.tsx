import { useAuth } from "@/context/authHelpers";
import { useNavGuard } from "@/context/NavGuardContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import type { ReactElement } from 'react';
import { getEmpresas } from "@/modules/empresas/services/empresasService";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const { user, logout } = useAuth();
  const displayName = (user && (user.nombre || (user as any).name || (user as any).nombre_completo || (user as any).email || (user as any).correo || 'Usuario')) as string;
  const displayInitial = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : 'U';
  const navGuard = useNavGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-collapsed') === '1'; } catch { return false; }
  });
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    const onResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { try { localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0'); } catch { /* noop */ } }, [collapsed]);

  const menuByRole: Record<string, Array<{ id: string; label: string; path: string }>> = {
    administrador: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard" },
      { id: "tickets", label: "Tickets", path: "/admin/tickets" },
      { id: "inventario", label: "Inventario", path: "/inventario" },
      { id: "catalogos", label: "Catálogos", path: "/catalogos" },
      { id: "empresas", label: "Empresas", path: "/empresas" },
      { id: "usuarios", label: "Usuarios", path: "/usuarios" },
      { id: "reportes", label: "Reportes", path: "/reportes" },
      { id: "configuracion", label: "Configuración", path: "/config" },
    ],
    tecnico: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard" },
      { id: "mis-tickets", label: "Mis Tickets", path: "/tickets/mis" },
      { id: "mantenimientos", label: "Mantenimientos", path: "/mantenimientos" },
      { id: "inventario", label: "Inventario", path: "/inventario" },
    ],
    cliente: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard" },
      { id: "mis-tickets", label: "Mis Tickets", path: "/tickets/mis" },
      { id: "crear-ticket", label: "Crear Ticket", path: "/tickets/crear" },
      { id: "reportes", label: "Reportes", path: "/reportes" },
    ],
  };

  const iconMap: Record<string, ReactElement> = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    tickets: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />,
    empresas: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    usuarios: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    reportes: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    configuracion: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
    catalogos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />,
    'mis-tickets': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    'crear-ticket': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
    mantenimientos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  };

  const menuItems = user ? menuByRole[user.rol] ?? menuByRole["cliente"] : menuByRole["cliente"];
  const [inventarioOpen, setInventarioOpen] = useState(false);
  const [gruposActivosOpen, setGruposActivosOpen] = useState(false);
  const [catalogosOpen, setCatalogosOpen] = useState(false);
  const [usuariosOpen, setUsuariosOpen] = useState(false);
  const [usuariosClientesOpen, setUsuariosClientesOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.includes('/usuarios')) {
      setUsuariosOpen(true);
      if (location.pathname.includes('/usuarios/empresa/')) {
        setUsuariosClientesOpen(true);
      }
    }
    if (location.pathname.includes('/inventario') || location.pathname.includes('/empresas/') && location.pathname.includes('/inventario')) {
      setInventarioOpen(true);
    }
    if (location.pathname.includes('/tickets')) {
      setTicketsOpen(true);
    }
    if (location.pathname.includes('/grupos-activos') || location.pathname.includes('/admin/grupos-activos')) {
      setGruposActivosOpen(true);
    }
    if (location.pathname.includes('/catalogo')) {
      setCatalogosOpen(true);
    }
  }, [location.pathname]);

  type EmpresaItem = { id?: number; _id?: string; nombre?: string; [key: string]: unknown };
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [empresasError, setEmpresasError] = useState<string | null>(null);

  const handleNavigation = (path: string) => {
    const guard = navGuard.getGuard();
    if (guard.shouldBlock && guard.onBlock && guard.shouldBlock(path)) {
      guard.onBlock(path);
      return;
    }
    navigate(path);
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  const guardedNavigate = (path: string) => {
    const guard = navGuard.getGuard();
    if (guard.shouldBlock && guard.onBlock && guard.shouldBlock(path)) {
      guard.onBlock(path);
      return;
    }
    navigate(path);
    if (window.innerWidth < 768) toggleSidebar();
  };

  const toggleInventario = async () => {
    setInventarioOpen(v => !v);
    if (!inventarioOpen && empresas.length === 0) {
      setLoadingEmpresas(true);
      setEmpresasError(null);
      try {
        const data = await getEmpresas();
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setEmpresas(list);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error cargando empresas";
        setEmpresasError(msg);
      } finally {
        setLoadingEmpresas(false);
      }
    }
  };

  const toggleGruposActivos = () => { setGruposActivosOpen(v => !v); };

  const toggleCatalogos = () => { setCatalogosOpen(v => !v); };
  const toggleTickets = () => { setTicketsOpen(v => !v); };
  const toggleUsuarios = () => { setUsuariosOpen(v => !v); };

  const toggleUsuariosClientes = async () => {
    setUsuariosClientesOpen(v => !v);
    if (!usuariosClientesOpen && empresas.length === 0) {
      setLoadingEmpresas(true);
      setEmpresasError(null);
      try {
        const data = await getEmpresas();
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setEmpresas(list);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error cargando empresas";
        setEmpresasError(msg);
      } finally {
        setLoadingEmpresas(false);
      }
    }
  };

  // ─── Style helpers ───────────────────────────────────────────────
  const isActive = (path: string) => location.pathname === path;
  const includesPath = (segment: string) => location.pathname.includes(segment);

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'space-between',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    background: active ? 'rgba(14,165,233,0.15)' : 'transparent',
    color: active ? '#0ea5e9' : 'rgba(255,255,255,0.55)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
  });

  const subItemStyle = (active: boolean): React.CSSProperties => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    background: active ? 'rgba(14,165,233,0.12)' : 'transparent',
    color: active ? '#38bdf8' : 'rgba(255,255,255,0.45)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
  });

  const deepSubItemStyle = (active: boolean): React.CSSProperties => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '5px 8px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    background: active ? 'rgba(14,165,233,0.12)' : 'transparent',
    color: active ? '#7dd3fc' : 'rgba(255,255,255,0.38)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: active ? 600 : 400,
  });

  const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg
      style={{
        width: 13, height: 13,
        transition: 'transform 0.2s ease',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        color: 'rgba(255,255,255,0.25)',
        flexShrink: 0,
      }}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  const SpinnerIcon = () => (
    <svg style={{ animation: 'spin 0.8s linear infinite', width: 12, height: 12, flexShrink: 0 }} viewBox="0 0 24 24">
      <circle style={{ opacity: 0.2 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path style={{ opacity: 0.7 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .sb-nav-btn:hover { background: rgba(14,165,233,0.10) !important; color: rgba(255,255,255,0.9) !important; }
        .sb-sub-btn:hover { background: rgba(14,165,233,0.08) !important; color: rgba(255,255,255,0.8) !important; }
        .sb-deep-btn:hover { background: rgba(14,165,233,0.08) !important; color: rgba(255,255,255,0.7) !important; }
        .sb-submenu { animation: fadeIn 0.15s ease; }
        .sb-logout:hover .sb-logout-icon { background: rgba(239,68,68,0.8) !important; }
        .sb-logout:hover { background: rgba(239,68,68,0.08) !important; color: rgba(255,255,255,0.9) !important; }
        .sb-collapse-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .sb-icon-active { color: #38bdf8; }
        ::-webkit-scrollbar { width: 3px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.25); border-radius: 10px; }
      `}</style>

      {/* Placeholder for fixed sidebar on large screens */}
      {isLargeScreen && (
        <div style={{ width: collapsed ? 68 : 240, flexShrink: 0 }} className="hidden lg:block" />
      )}

      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(2,12,27,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
          className="lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          height: '100vh',
          minHeight: '100vh',
          width: collapsed ? 68 : 240,
          background: 'linear-gradient(180deg, #020c1b 0%, #041525 60%, #051a2e 100%)',
          borderRight: '1px solid rgba(14,165,233,0.12)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 50,
          transition: 'width 0.2s ease, transform 0.25s ease',
          transform: (isLargeScreen || isOpen) ? 'translateX(0)' : 'translateX(-100%)',
          fontFamily: "'DM Sans', sans-serif",
        }}
        className={`${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Top accent line */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc)',
          flexShrink: 0,
        }} />

        {/* Header */}
        <div style={{
          padding: collapsed ? '14px 12px' : '14px 16px',
          borderBottom: '1px solid rgba(14,165,233,0.08)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, flexShrink: 0 }}>
                <img src="/logo.png" alt="Intis Corp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              {!collapsed && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', letterSpacing: '0.08em' }}>INTISOFT</div>
                  <div style={{ fontSize: 10, color: 'rgba(56,189,248,0.7)', fontWeight: 500, marginTop: 1 }}>Sistema ITSM</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="sb-collapse-btn"
                onClick={() => setCollapsed(v => !v)}
                style={{
                  padding: 6, borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'rgba(255,255,255,0.3)',
                  transition: 'background 0.15s',
                }}
                aria-label="Toggle sidebar"
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                </svg>
              </button>
              <button
                onClick={toggleSidebar}
                className="lg:hidden sb-collapse-btn"
                style={{
                  padding: 6, borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'rgba(255,255,255,0.3)',
                  transition: 'background 0.15s',
                }}
                aria-label="Close sidebar"
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* User info */}
        <div style={{
          padding: collapsed ? '12px 10px' : '12px 16px',
          borderBottom: '1px solid rgba(14,165,233,0.08)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
                boxShadow: '0 2px 8px rgba(14,165,233,0.35)',
              }}>
                {displayInitial}
              </div>
              <div style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 10, height: 10, borderRadius: '50%',
                background: '#4ade80',
                border: '1.5px solid #020c1b',
                boxShadow: '0 0 0 2px rgba(74,222,128,0.2)',
              }} />
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(56,189,248,0.65)', marginTop: 1, textTransform: 'capitalize' }}>
                  {user?.rol}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section label */}
        {!collapsed && (
          <div style={{ padding: '14px 16px 6px', flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(14,165,233,0.45)', textTransform: 'uppercase' }}>
              Navegación
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '4px 8px 8px', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Dashboard */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={() => handleNavigation('/dashboard')}
                style={navItemStyle(isActive('/dashboard'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: isActive('/dashboard') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {!collapsed && <span>Dashboard</span>}
                </span>
              </button>
            </li>

            {/* Tickets */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={toggleTickets}
                style={navItemStyle(includesPath('/tickets'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: includesPath('/tickets') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  {!collapsed && <span>Tickets</span>}
                </span>
                {!collapsed && <ChevronIcon open={ticketsOpen} />}
              </button>
              {ticketsOpen && !collapsed && (
                <ul className="sb-submenu" style={{ listStyle: 'none', margin: '2px 0 0 26px', padding: '0 0 0 10px', borderLeft: '1px solid rgba(14,165,233,0.15)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <li>
                    <button className="sb-sub-btn" onClick={() => guardedNavigate('/admin/tickets')} style={subItemStyle(isActive('/admin/tickets'))}>
                      Bandeja de Tickets
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* Inventario */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={toggleInventario}
                style={navItemStyle(includesPath('/inventario'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: includesPath('/inventario') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {!collapsed && <span>Inventario</span>}
                </span>
                {!collapsed && <ChevronIcon open={inventarioOpen} />}
              </button>
              {inventarioOpen && !collapsed && (
                <ul className="sb-submenu" style={{ listStyle: 'none', margin: '2px 0 0 26px', padding: '0 0 0 10px', borderLeft: '1px solid rgba(14,165,233,0.15)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {loadingEmpresas ? (
                    <li style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', color: 'rgba(56,189,248,0.5)', fontSize: 11 }}>
                      <SpinnerIcon /> Cargando empresas...
                    </li>
                  ) : empresasError ? (
                    <li style={{ padding: '6px 10px', color: 'rgba(239,68,68,0.7)', fontSize: 11 }}>Error cargando empresas</li>
                  ) : empresas.length === 0 ? (
                    <li style={{ padding: '6px 10px', color: 'rgba(255,255,255,0.25)', fontSize: 11, fontStyle: 'italic' }}>No hay empresas</li>
                  ) : empresas.map((e: EmpresaItem) => {
                    const empresaId = e.id ?? e._id;
                    const active = location.pathname.includes(`/empresas/${empresaId}/inventario`);
                    return (
                      <li key={empresaId}>
                        <button className="sb-sub-btn" onClick={() => guardedNavigate(`/admin/empresas/${empresaId}/inventario`)} style={subItemStyle(active)}>
                          {e.nombre ?? "(sin nombre)"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>

            {/* Grupos de Activos (nuevo módulo) */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={toggleGruposActivos}
                style={navItemStyle(includesPath('/grupos-activos') || includesPath('/admin/grupos-activos'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: includesPath('/grupos-activos') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {!collapsed && <span>Grupos de Activos</span>}
                </span>
                {!collapsed && <ChevronIcon open={gruposActivosOpen} />}
              </button>
              {gruposActivosOpen && !collapsed && (
                <ul className="sb-submenu" style={{ listStyle: 'none', margin: '2px 0 0 26px', padding: '0 0 0 10px', borderLeft: '1px solid rgba(14,165,233,0.15)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <li>
                    <button className="sb-sub-btn" onClick={() => guardedNavigate('/admin/grupos-activos/grupos')} style={subItemStyle(includesPath('/grupos-activos/grupos') || isActive('/admin/grupos-activos/grupos'))}>
                      Grupos
                    </button>
                  </li>
                  <li>
                    <button className="sb-sub-btn" onClick={() => guardedNavigate('/admin/grupos-activos/tipos')} style={subItemStyle(includesPath('/grupos-activos/tipos') || isActive('/admin/grupos-activos/tipos'))}>
                      Tipos de Activo
                    </button>
                  </li>
                  <li>
                    <button className="sb-sub-btn" onClick={() => guardedNavigate('/admin/grupos-activos/marcas')} style={subItemStyle(includesPath('/grupos-activos/marcas') || isActive('/admin/grupos-activos/marcas'))}>
                      Marcas
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* Usuarios */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={toggleUsuarios}
                style={navItemStyle(includesPath('/usuarios'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: includesPath('/usuarios') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {!collapsed && <span>Usuarios</span>}
                </span>
                {!collapsed && <ChevronIcon open={usuariosOpen} />}
              </button>
              {usuariosOpen && !collapsed && (
                <div className="sb-submenu" style={{ margin: '2px 0 0 26px', paddingLeft: 10, borderLeft: '1px solid rgba(14,165,233,0.15)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {/* Usuarios Clientes */}
                  <div>
                    <button
                      className="sb-sub-btn"
                      onClick={toggleUsuariosClientes}
                      style={{ ...subItemStyle(includesPath('/usuarios/empresa/')), justifyContent: 'space-between' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg style={{ width: 13, height: 13, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Usuarios Clientes
                      </span>
                      <ChevronIcon open={usuariosClientesOpen} />
                    </button>
                    {usuariosClientesOpen && (
                      <ul className="sb-submenu" style={{ listStyle: 'none', margin: '2px 0 0 18px', padding: '0 0 0 8px', borderLeft: '1px solid rgba(14,165,233,0.10)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {loadingEmpresas ? (
                          <li style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', color: 'rgba(56,189,248,0.45)', fontSize: 11 }}>
                            <SpinnerIcon /> Cargando...
                          </li>
                        ) : empresasError ? (
                          <li style={{ padding: '5px 8px', color: 'rgba(239,68,68,0.6)', fontSize: 11 }}>Error</li>
                        ) : empresas.length === 0 ? (
                          <li style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.2)', fontSize: 11, fontStyle: 'italic' }}>Sin empresas</li>
                        ) : empresas.map((e: EmpresaItem) => {
                          const empresaId = e.id ?? e._id;
                          const active = location.pathname.includes(`/usuarios/empresa/${empresaId}`);
                          return (
                            <li key={empresaId}>
                              <button className="sb-deep-btn" onClick={() => guardedNavigate(`/admin/usuarios/empresa/${empresaId}`)} style={deepSubItemStyle(active)}>
                                {e.nombre ?? "(sin nombre)"}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {/* Usuarios Internos */}
                  <button
                    className="sb-sub-btn"
                    onClick={() => guardedNavigate('/admin/usuarios/internos')}
                    style={{ ...subItemStyle(location.pathname.startsWith('/admin/usuarios/internos')), display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <svg style={{ width: 13, height: 13, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Usuarios Internos
                  </button>
                </div>
              )}
            </li>

            {/* Catálogos */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={toggleCatalogos}
                style={navItemStyle(includesPath('/catalogo'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: includesPath('/catalogo') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  {!collapsed && <span>Catálogos</span>}
                </span>
                {!collapsed && <ChevronIcon open={catalogosOpen} />}
              </button>
              {catalogosOpen && !collapsed && (
                <ul className="sb-submenu" style={{ listStyle: 'none', margin: '2px 0 0 26px', padding: '0 0 0 10px', borderLeft: '1px solid rgba(14,165,233,0.15)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { label: 'Categorías', path: '/admin/catalogo-categorias' },
                    { label: 'Servicios', path: '/admin/catalogo-servicios' },
                    { label: 'Plataformas de Correo', path: '/admin/catalogo-correos' },
                  ].map(item => (
                    <li key={item.path}>
                      <button className="sb-sub-btn" onClick={() => guardedNavigate(item.path)} style={subItemStyle(isActive(item.path))}>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {/* Visitas */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={() => handleNavigation('/admin/visitas')}
                style={navItemStyle(isActive('/admin/visitas'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: isActive('/admin/visitas') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {!collapsed && <span>Visitas</span>}
                </span>
              </button>
            </li>

            {/* Empresas */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={() => handleNavigation('/empresas')}
                style={navItemStyle(isActive('/empresas'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: isActive('/empresas') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {!collapsed && <span>Empresas</span>}
                </span>
              </button>
            </li>

            {/* Reportes */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={() => handleNavigation('/reportes')}
                style={navItemStyle(isActive('/reportes'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: isActive('/reportes') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {!collapsed && <span>Reportes</span>}
                </span>
              </button>
            </li>

            {/* Configuración */}
            <li>
              <button
                className="sb-nav-btn"
                onClick={() => handleNavigation('/config')}
                style={navItemStyle(isActive('/config'))}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 17, height: 17, flexShrink: 0, color: isActive('/config') ? '#38bdf8' : undefined }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {!collapsed && <span>Configuración</span>}
                </span>
              </button>
            </li>

          </ul>
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.15), transparent)', flexShrink: 0 }} />

        {/* Logout */}
        <div style={{ padding: collapsed ? '10px 8px' : '10px 8px', flexShrink: 0 }}>
          <button
            className="sb-logout"
            onClick={() => logout()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '9px 10px' : '9px 12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.15s ease',
              justifyContent: collapsed ? 'center' : undefined,
            }}
          >
            <div
              className="sb-logout-icon"
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <svg style={{ width: 15, height: 15, color: 'rgba(239,68,68,0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
