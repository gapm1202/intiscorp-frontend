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
  const navGuard = useNavGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-collapsed') === '1'; } catch { return false; }
  });

  useEffect(() => { try { localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0'); } catch { /* noop */ } }, [collapsed]);

  // Menú dinámico según rol
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
  const [catalogosOpen, setCatalogosOpen] = useState(false);
  const [usuariosOpen, setUsuariosOpen] = useState(false);
  const [usuariosClientesOpen, setUsuariosClientesOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);

  // Mantener menús abiertos según la ruta actual
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
    // load empresas lazily when opening
    if (!inventarioOpen && empresas.length === 0) {
      setLoadingEmpresas(true);
      setEmpresasError(null);
      try {
        const data = await getEmpresas();
        // Expecting an array; backend may return { data: [...] }
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

  const toggleCatalogos = () => {
    setCatalogosOpen(v => !v);
  };

  const toggleTickets = () => {
    setTicketsOpen(v => !v);
  };

  const toggleUsuarios = () => {
    setUsuariosOpen(v => !v);
  };

  const toggleUsuariosClientes = async () => {
    setUsuariosClientesOpen(v => !v);
    // Cargar empresas cuando se abre el menú (si no están ya cargadas)
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

  return (
    <>
      {/* Overlay móvil con blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden z-40 transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static left-0 top-0 min-h-screen ${collapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white shadow-2xl transition-all duration-300 z-50 flex flex-col border-r border-white/10 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header del Sidebar */}
         <div className="p-5 border-b border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center transition-all ${collapsed ? 'w-14 h-14' : 'w-14 h-14'}`}> 
                <img src="/logo.png" alt="Intis Corp" className="w-full h-full object-contain drop-shadow-2xl brightness-110" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                 <h2
                  className="text-2xl font-black tracking-tight"
                  style={{
                    color: '#ffffff',
                    textShadow: `
                      0 2px 6px rgba(0,0,0,0.9),
                      0 0 12px rgba(0,0,0,0.8)
                    `
                  }}
                >
                  INTISOFT
                </h2>
                  <p className="text-xs text-white font-bold tracking-wide mt-0.5 opacity-90">Sistema de Gestión</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCollapsed(v => !v)} 
                className="p-2.5 rounded-lg hover:bg-white/10 transition-all duration-200 hover:shadow-lg" 
                aria-label="Toggle sidebar"
              >
                <svg className="w-5 h-5 text-slate-300 hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                </svg>
              </button>
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                aria-label="Close sidebar mobile"
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Información del usuario en el sidebar - Mejorado */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-600/5 to-purple-600/5">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-base font-black text-white shadow-lg shadow-blue-500/30 ring-2 ring-white/20">
                {user?.nombre?.charAt(0)?.toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-lg"></div>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{user?.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></span>
                  <p className="text-xs text-slate-300 font-medium truncate capitalize">
                    {user?.rol}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Menú de navegación */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <ul className="space-y-2">
            {/* Dashboard */}
            <li>
              <button
                onClick={() => handleNavigation('/dashboard')}
                aria-current={location.pathname === '/dashboard' ? 'true' : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-left group relative overflow-hidden ${
                  location.pathname === '/dashboard' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30' 
                    : 'hover:shadow-lg'
                }`}
              >
                {location.pathname === '/dashboard' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent animate-pulse"></div>
                )}
                <span className="flex items-center space-x-3 relative z-10">
                  <div className={`w-10 h-10 rounded-lg ${
                    location.pathname === '/dashboard' 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  } flex items-center justify-center transition-all duration-200`}>
                    <svg className={`w-5 h-5 ${
                      location.pathname === '/dashboard' 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-white'
                    } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <span className={`text-sm font-bold ${
                      location.pathname === '/dashboard' 
                        ? 'text-white' 
                        : 'text-slate-300 group-hover:text-white'
                    } transition-colors`}>Dashboard</span>
                  )}
                </span>
              </button>
            </li>

            {/* Tickets con submenu */}
            <li>
              <button
                onClick={toggleTickets}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-left group relative overflow-hidden ${
                  location.pathname.includes('/tickets') 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 shadow-lg shadow-purple-500/30' 
                    : 'hover:shadow-lg'
                }`}
              >
                {location.pathname.includes('/tickets') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-transparent animate-pulse"></div>
                )}
                <span className="flex items-center space-x-3 relative z-10">
                  <div className={`w-10 h-10 rounded-lg ${
                    location.pathname.includes('/tickets') 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  } flex items-center justify-center transition-all duration-200`}>
                    <svg className={`w-5 h-5 ${
                      location.pathname.includes('/tickets') 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-white'
                    } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <>
                      <span className={`text-sm font-bold ${
                        location.pathname.includes('/tickets') 
                          ? 'text-white' 
                          : 'text-slate-300 group-hover:text-white'
                      } transition-colors`}>Tickets</span>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${ticketsOpen ? 'rotate-90' : ''} ml-auto ${
                        location.pathname.includes('/tickets') ? 'text-white' : 'text-slate-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              {ticketsOpen && !collapsed && (
                <ul className="mt-2 ml-6 space-y-1 border-l-2 border-purple-500/30 pl-4">
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/tickets')}
                      className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                        location.pathname === '/admin/tickets'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold shadow-lg shadow-purple-500/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {location.pathname === '/admin/tickets' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                        )}
                        Bandeja de Tickets
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/tickets/qr')}
                      className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                        location.pathname === '/admin/tickets/qr'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold shadow-lg shadow-purple-500/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {location.pathname === '/admin/tickets/qr' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                        )}
                        Tickets QR
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/tickets/internos')}
                      className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                        location.pathname === '/admin/tickets/internos'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold shadow-lg shadow-purple-500/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {location.pathname === '/admin/tickets/internos' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                        )}
                        Tickets Internos
                      </span>
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* Inventario con empresas */}
            <li>
              <button
                onClick={toggleInventario}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-left group relative overflow-hidden ${
                  location.pathname.includes('/inventario') 
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/30' 
                    : 'hover:shadow-lg'
                }`}
              >
                {location.pathname.includes('/inventario') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-transparent animate-pulse"></div>
                )}
                <span className="flex items-center space-x-3 relative z-10">
                  <div className={`w-10 h-10 rounded-lg ${
                    location.pathname.includes('/inventario') 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  } flex items-center justify-center transition-all duration-200`}>
                    <svg className={`w-5 h-5 ${
                      location.pathname.includes('/inventario') 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-white'
                    } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <>
                      <span className={`text-sm font-bold ${
                        location.pathname.includes('/inventario') 
                          ? 'text-white' 
                          : 'text-slate-300 group-hover:text-white'
                      } transition-colors`}>Inventario</span>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${inventarioOpen ? 'rotate-90' : ''} ml-auto ${
                        location.pathname.includes('/inventario') ? 'text-white' : 'text-slate-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              {inventarioOpen && !collapsed && (
                <ul className="mt-2 ml-6 space-y-1 border-l-2 border-emerald-500/30 pl-4">
                  {loadingEmpresas ? (
                    <li className="text-xs text-slate-400 py-2 px-4 flex items-center gap-2">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cargando empresas...
                    </li>
                  ) : empresasError ? (
                    <li className="text-xs text-red-400 py-2 px-4">Error cargando empresas</li>
                  ) : empresas.length === 0 ? (
                    <li className="text-xs text-slate-400 py-2 px-4">No hay empresas</li>
                  ) : (
                    empresas.map((e: EmpresaItem) => {
                      const empresaId = e.id ?? e._id;
                      const isEmpresaActive = location.pathname.includes(`/empresas/${empresaId}/inventario`);
                      
                      return (
                        <li key={empresaId}>
                          <button
                            onClick={() => guardedNavigate(`/admin/empresas/${empresaId}/inventario`)}
                            className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                              isEmpresaActive
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {isEmpresaActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                              )}
                              {e.nombre ?? "(sin nombre)"}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </li>

            {/* Usuarios - Menú principal */}
            <li>
              <button
                onClick={toggleUsuarios}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-left group relative overflow-hidden ${
                  location.pathname.includes('/usuarios') 
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 shadow-lg shadow-cyan-500/30' 
                    : 'hover:shadow-lg'
                }`}
              >
                {location.pathname.includes('/usuarios') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-transparent animate-pulse"></div>
                )}
                <span className="flex items-center space-x-3 relative z-10">
                  <div className={`w-10 h-10 rounded-lg ${
                    location.pathname.includes('/usuarios') 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  } flex items-center justify-center transition-all duration-200`}>
                    <svg className={`w-5 h-5 ${
                      location.pathname.includes('/usuarios') 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-white'
                    } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <>
                      <span className={`text-sm font-bold ${
                        location.pathname.includes('/usuarios') 
                          ? 'text-white' 
                          : 'text-slate-300 group-hover:text-white'
                      } transition-colors`}>Usuarios</span>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${usuariosOpen ? 'rotate-90' : ''} ml-auto ${
                        location.pathname.includes('/usuarios') ? 'text-white' : 'text-slate-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              {usuariosOpen && !collapsed && (
                <div className="mt-2 ml-6 space-y-2 border-l-2 border-cyan-500/30 pl-4">
                  {/* Usuarios Clientes */}
                  <div>
                    <button
                      onClick={toggleUsuariosClientes}
                      className="w-full flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-white/5 transition-all duration-200 text-left group"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors">Usuarios Clientes</span>
                      </span>
                      <svg className={`w-3 h-3 transition-transform duration-200 text-slate-400 ${usuariosClientesOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {usuariosClientesOpen && (
                      <ul className="mt-1 ml-6 space-y-1 border-l-2 border-cyan-500/20 pl-3">
                        {loadingEmpresas ? (
                          <li className="text-xs text-slate-400 py-2 px-4 flex items-center gap-2">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Cargando empresas...
                          </li>
                        ) : empresasError ? (
                          <li className="text-xs text-red-400 py-2 px-4">Error cargando empresas</li>
                        ) : empresas.length === 0 ? (
                          <li className="text-xs text-slate-400 py-2 px-4">No hay empresas</li>
                        ) : (
                          empresas.map((e: EmpresaItem) => {
                            const empresaId = e.id ?? e._id;
                            const isEmpresaActive = location.pathname.includes(`/usuarios/empresa/${empresaId}`);
                            
                            return (
                              <li key={empresaId}>
                                <button
                                  onClick={() => guardedNavigate(`/admin/usuarios/empresa/${empresaId}`)}
                                  className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                                    isEmpresaActive
                                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/20'
                                      : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    {isEmpresaActive && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                                    )}
                                    {e.nombre ?? "(sin nombre)"}
                                  </span>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Usuarios Internos */}
                  <div>
                    <button
                      onClick={() => guardedNavigate('/admin/usuarios/internos')}
                      className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                        location.pathname.startsWith('/admin/usuarios/internos')
                          ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {location.pathname.startsWith('/admin/usuarios/internos') && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                        )}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold">Usuarios Internos</span>
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </li>

            {/* Catálogos */}
            <li>
              <button
                onClick={toggleCatalogos}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-left group relative overflow-hidden ${
                  location.pathname.includes('/catalogo') 
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-lg shadow-amber-500/30' 
                    : 'hover:shadow-lg'
                }`}
              >
                {location.pathname.includes('/catalogo') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-transparent animate-pulse"></div>
                )}
                <span className="flex items-center space-x-3 relative z-10">
                  <div className={`w-10 h-10 rounded-lg ${
                    location.pathname.includes('/catalogo') 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  } flex items-center justify-center transition-all duration-200`}>
                    <svg className={`w-5 h-5 ${
                      location.pathname.includes('/catalogo') 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-white'
                    } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <>
                      <span className={`text-sm font-bold ${
                        location.pathname.includes('/catalogo') 
                          ? 'text-white' 
                          : 'text-slate-300 group-hover:text-white'
                      } transition-colors`}>Catálogos</span>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${catalogosOpen ? 'rotate-90' : ''} ml-auto ${
                        location.pathname.includes('/catalogo') ? 'text-white' : 'text-slate-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              {catalogosOpen && !collapsed && (
                <ul className="mt-2 ml-6 space-y-1 border-l-2 border-amber-500/30 pl-4">
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/catalogo-categorias')}
                      className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                        location.pathname === '/admin/catalogo-categorias'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold shadow-lg shadow-amber-500/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {location.pathname === '/admin/catalogo-categorias' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                        )}
                        Categorías
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/catalogo-servicios')}
                      className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                        location.pathname === '/admin/catalogo-servicios'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold shadow-lg shadow-amber-500/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {location.pathname === '/admin/catalogo-servicios' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                        )}
                        Servicios
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/catalogo-correos')}
                      className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-all duration-200 ${
                        location.pathname === '/admin/catalogo-correos'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold shadow-lg shadow-amber-500/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {location.pathname === '/admin/catalogo-correos' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"></span>
                        )}
                        Plataformas de Correo
                      </span>
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* Empresas */}
            <li>
              <button
                onClick={() => handleNavigation('/empresas')}
                aria-current={location.pathname === '/empresas' ? 'true' : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-left group relative overflow-hidden ${
                  location.pathname === '/empresas' 
                    ? 'bg-gradient-to-r from-rose-600 to-rose-500 shadow-lg shadow-rose-500/30' 
                    : 'hover:shadow-lg'
                }`}
              >
                {location.pathname === '/empresas' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-600/20 to-transparent animate-pulse"></div>
                )}
                <span className="flex items-center space-x-3 relative z-10">
                  <div className={`w-10 h-10 rounded-lg ${
                    location.pathname === '/empresas' 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  } flex items-center justify-center transition-all duration-200`}>
                    <svg className={`w-5 h-5 ${
                      location.pathname === '/empresas' 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-white'
                    } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <span className={`text-sm font-bold ${
                      location.pathname === '/empresas' 
                        ? 'text-white' 
                        : 'text-slate-300 group-hover:text-white'
                    } transition-colors`}>Empresas</span>
                  )}
                </span>
              </button>
            </li>

            {/* Reportes */}
            <li>
              <button
                onClick={() => handleNavigation('/reportes')}
                aria-current={location.pathname === '/reportes' ? 'true' : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-left group relative overflow-hidden ${
                  location.pathname === '/reportes' 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-500/30' 
                    : 'hover:shadow-lg'
                }`}
              >
                {location.pathname === '/reportes' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent animate-pulse"></div>
                )}
                <span className="flex items-center space-x-3 relative z-10">
                  <div className={`w-10 h-10 rounded-lg ${
                    location.pathname === '/reportes' 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  } flex items-center justify-center transition-all duration-200`}>
                    <svg className={`w-5 h-5 ${
                      location.pathname === '/reportes' 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-white'
                    } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <span className={`text-sm font-bold ${
                      location.pathname === '/reportes' 
                        ? 'text-white' 
                        : 'text-slate-300 group-hover:text-white'
                    } transition-colors`}>Reportes</span>
                  )}
                </span>
              </button>
            </li>

            {/* Configuración */}
            <li>
              <button
                onClick={() => handleNavigation('/config')}
                aria-current={location.pathname === '/config' ? 'true' : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-left group relative overflow-hidden ${
                  location.pathname === '/config' 
                    ? 'bg-gradient-to-r from-slate-700 to-slate-600 shadow-lg shadow-slate-500/30' 
                    : 'hover:shadow-lg'
                }`}
              >
                {location.pathname === '/config' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-700/20 to-transparent animate-pulse"></div>
                )}
                <span className="flex items-center space-x-3 relative z-10">
                  <div className={`w-10 h-10 rounded-lg ${
                    location.pathname === '/config' 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  } flex items-center justify-center transition-all duration-200`}>
                    <svg className={`w-5 h-5 ${
                      location.pathname === '/config' 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-white'
                    } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <span className={`text-sm font-bold ${
                      location.pathname === '/config' 
                        ? 'text-white' 
                        : 'text-slate-300 group-hover:text-white'
                    } transition-colors`}>Configuración</span>
                  )}
                </span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Footer del Sidebar - Mejorado */}
        <div className="p-4 border-t border-white/10 bg-gradient-to-r from-red-600/5 to-red-600/10">
          <button
            onClick={() => {
              logout();
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-600/20 transition-all duration-200 text-left group relative overflow-hidden shadow-lg hover:shadow-red-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-lg bg-white/5 group-hover:bg-red-600 flex items-center justify-center transition-all duration-200 relative z-10">
              <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            {!collapsed && (
              <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors relative z-10">
                Cerrar Sesión
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
