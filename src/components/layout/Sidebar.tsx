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
  const [usuariosInternosOpen, setUsuariosInternosOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);

  // Mantener menús abiertos según la ruta actual
  useEffect(() => {
    if (location.pathname.includes('/usuarios')) {
      setUsuariosOpen(true);
      if (location.pathname.includes('/usuarios/empresa/')) {
        setUsuariosClientesOpen(true);
      }
      if (location.pathname.includes('/usuarios/internos')) {
        setUsuariosInternosOpen(true);
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

  const toggleUsuariosInternos = () => {
    setUsuariosInternosOpen(v => !v);
  };

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static left-0 top-0 min-h-screen ${collapsed ? 'w-20' : 'w-64'} bg-panel text-slate-800 shadow-card transition-all duration-300 z-50 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header del Sidebar */}
        <div className="p-4 border-b border-slate-100/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center rounded-md ${collapsed ? 'w-10 h-10' : 'w-10 h-10'}`}> 
              <img src="/logo.png" alt="Intis Corp" className="w-10 h-10 object-contain rounded-md" />
            </div>
            {!collapsed && <h2 className="text-lg font-bold tracking-tight text-slate-800">Intis Corp</h2>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCollapsed(v => !v)} className="p-2 rounded hover:bg-subtle" aria-label="Toggle sidebar">
              <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} /></svg>
            </button>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded hover:bg-subtle"
              aria-label="Close sidebar mobile"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Información del usuario en el sidebar */}
        <div className="p-3 border-b border-slate-100/40 bg-panel/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-primary-600 flex items-center justify-center text-sm font-bold text-white shadow">
              {user?.nombre?.charAt(0)?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-800">{user?.nombre}</p>
                <p className="text-xs text-slate-500 truncate capitalize flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-green"></span>
                  {user?.rol}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menú de navegación */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {/* Dashboard */}
            <li>
              <button
                onClick={() => handleNavigation('/dashboard')}
                aria-current={location.pathname === '/dashboard' ? 'true' : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${location.pathname === '/dashboard' ? 'bg-primary/10' : ''}`}
              >
                <span className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg ${location.pathname === '/dashboard' ? 'bg-primary' : 'bg-subtle group-hover:bg-primary'} flex items-center justify-center transition-colors`}>
                    <svg className={`w-5 h-5 ${location.pathname === '/dashboard' ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  {!collapsed && <span className={`text-sm font-medium ${location.pathname === '/dashboard' ? 'text-primary' : 'text-slate-700 group-hover:text-primary'}`}>Dashboard</span>}
                </span>
              </button>
            </li>

            {/* Tickets con submenu */}
            <li>
              <button
                onClick={toggleTickets}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${location.pathname.includes('/tickets') ? 'bg-primary/10' : ''}`}
              >
                <span className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg ${location.pathname.includes('/tickets') ? 'bg-primary' : 'bg-subtle group-hover:bg-primary'} flex items-center justify-center transition-colors`}>
                    <svg className={`w-5 h-5 ${location.pathname.includes('/tickets') ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <>
                      <span className={`text-sm font-medium ${location.pathname.includes('/tickets') ? 'text-primary' : 'text-slate-700 group-hover:text-primary'}`}>Tickets</span>
                      <svg className={`w-4 h-4 transition-transform ${ticketsOpen ? 'rotate-90' : ''} ml-auto`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              {ticketsOpen && !collapsed && (
                <ul className="mt-1 ml-11 space-y-1 border-l-2 border-primary/20 pl-3">
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/tickets')}
                      className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                        location.pathname === '/admin/tickets'
                          ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                          : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                      }`}
                    >
                      {location.pathname === '/admin/tickets' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                      )}
                      Bandeja de Tickets
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/tickets/qr')}
                      className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                        location.pathname === '/admin/tickets/qr'
                          ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                          : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                      }`}
                    >
                      {location.pathname === '/admin/tickets/qr' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                      )}
                      Tickets QR
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/tickets/internos')}
                      className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                        location.pathname === '/admin/tickets/internos'
                          ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                          : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                      }`}
                    >
                      {location.pathname === '/admin/tickets/internos' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                      )}
                      Tickets Internos
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* Inventario con empresas */}
            <li>
              <button
                onClick={toggleInventario}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${location.pathname.includes('/inventario') ? 'bg-primary/10' : ''}`}
              >
                <span className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg ${location.pathname.includes('/inventario') ? 'bg-primary' : 'bg-subtle group-hover:bg-primary'} flex items-center justify-center transition-colors`}>
                    <svg className={`w-5 h-5 ${location.pathname.includes('/inventario') ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <>
                      <span className={`text-sm font-medium ${location.pathname.includes('/inventario') ? 'text-primary' : 'text-slate-700 group-hover:text-primary'}`}>Inventario</span>
                      <svg className={`w-4 h-4 transition-transform ${inventarioOpen ? 'rotate-90' : ''} ml-auto`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              {inventarioOpen && !collapsed && (
                <ul className="mt-1 ml-11 space-y-1 border-l-2 border-primary/20 pl-3">
                  {loadingEmpresas ? (
                    <li className="text-xs text-slate-500 py-2 px-3">Cargando empresas...</li>
                  ) : empresasError ? (
                    <li className="text-xs text-red-500 py-2 px-3">Error cargando empresas</li>
                  ) : empresas.length === 0 ? (
                    <li className="text-xs text-slate-500 py-2 px-3">No hay empresas</li>
                  ) : (
                    empresas.map((e: EmpresaItem) => {
                      const empresaId = e.id ?? e._id;
                      const isEmpresaActive = location.pathname.includes(`/empresas/${empresaId}/inventario`);
                      
                      return (
                        <li key={empresaId}>
                          <button
                            onClick={() => guardedNavigate(`/admin/empresas/${empresaId}/inventario`)}
                            className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                              isEmpresaActive
                                ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                                : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                            }`}
                          >
                            {isEmpresaActive && (
                              <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                            )}
                            {e.nombre ?? "(sin nombre)"}
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
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${location.pathname.includes('/usuarios') ? 'bg-primary/10' : ''}`}
              >
                <span className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg ${location.pathname.includes('/usuarios') ? 'bg-primary' : 'bg-subtle group-hover:bg-primary'} flex items-center justify-center transition-colors`}>
                    <svg className={`w-5 h-5 ${location.pathname.includes('/usuarios') ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <>
                      <span className={`text-sm font-medium ${location.pathname.includes('/usuarios') ? 'text-primary' : 'text-slate-700 group-hover:text-primary'}`}>Usuarios</span>
                      <svg className={`w-4 h-4 transition-transform ${usuariosOpen ? 'rotate-90' : ''} ml-auto`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              {usuariosOpen && !collapsed && (
                <div className="mt-1 ml-11 space-y-1 border-l-2 border-primary/20 pl-3">
                  {/* Usuarios Clientes */}
                  <div>
                    <button
                      onClick={toggleUsuariosClientes}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-primary/10 transition-all text-left group"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-600 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary">Usuarios Clientes</span>
                      </span>
                      <svg className={`w-3 h-3 transition-transform ${usuariosClientesOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {usuariosClientesOpen && (
                      <ul className="mt-1 ml-6 space-y-1 border-l-2 border-primary/10 pl-2">
                        {loadingEmpresas ? (
                          <li className="text-xs text-slate-500 py-2 px-3">Cargando empresas...</li>
                        ) : empresasError ? (
                          <li className="text-xs text-red-500 py-2 px-3">Error cargando empresas</li>
                        ) : empresas.length === 0 ? (
                          <li className="text-xs text-slate-500 py-2 px-3">No hay empresas</li>
                        ) : (
                          empresas.map((e: EmpresaItem) => {
                            const empresaId = e.id ?? e._id;
                            const isEmpresaActive = location.pathname.includes(`/usuarios/empresa/${empresaId}`);
                            
                            return (
                              <li key={empresaId}>
                                <button
                                  onClick={() => guardedNavigate(`/admin/usuarios/empresa/${empresaId}`)}
                                  className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                                    isEmpresaActive
                                      ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                                      : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                                  }`}
                                >
                                  {isEmpresaActive && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                                  )}
                                  {e.nombre ?? "(sin nombre)"}
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
                      onClick={toggleUsuariosInternos}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-primary/10 transition-all text-left group"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-600 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary">Usuarios Internos</span>
                      </span>
                      <svg className={`w-3 h-3 transition-transform ${usuariosInternosOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {usuariosInternosOpen && (
                      <ul className="mt-1 ml-6 space-y-1 border-l-2 border-primary/10 pl-2">
                        <li>
                          <button
                            onClick={() => guardedNavigate('/admin/usuarios/internos/administradores')}
                            className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                              location.pathname === '/admin/usuarios/internos/administradores'
                                ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                                : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                            }`}
                          >
                            {location.pathname === '/admin/usuarios/internos/administradores' && (
                              <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                            )}
                            Administradores
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => guardedNavigate('/admin/usuarios/internos/tecnicos')}
                            className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                              location.pathname === '/admin/usuarios/internos/tecnicos'
                                ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                                : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                            }`}
                          >
                            {location.pathname === '/admin/usuarios/internos/tecnicos' && (
                              <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                            )}
                            Técnicos
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </li>

            {/* Catálogos */}
            <li>
              <button
                onClick={toggleCatalogos}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${location.pathname.includes('/catalogo') ? 'bg-primary/10' : ''}`}
              >
                <span className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg ${location.pathname.includes('/catalogo') ? 'bg-primary' : 'bg-subtle group-hover:bg-primary'} flex items-center justify-center transition-colors`}>
                    <svg className={`w-5 h-5 ${location.pathname.includes('/catalogo') ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  {!collapsed && (
                    <>
                      <span className={`text-sm font-medium ${location.pathname.includes('/catalogo') ? 'text-primary' : 'text-slate-700 group-hover:text-primary'}`}>Catálogos</span>
                      <svg className={`w-4 h-4 transition-transform ${catalogosOpen ? 'rotate-90' : ''} ml-auto`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              {catalogosOpen && !collapsed && (
                <ul className="mt-1 ml-11 space-y-1 border-l-2 border-primary/20 pl-3">
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/catalogo-categorias')}
                      className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                        location.pathname === '/admin/catalogo-categorias'
                          ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                          : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                      }`}
                    >
                      {location.pathname === '/admin/catalogo-categorias' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                      )}
                      Categorías
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/catalogo-servicios')}
                      className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                        location.pathname === '/admin/catalogo-servicios'
                          ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                          : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                      }`}
                    >
                      {location.pathname === '/admin/catalogo-servicios' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                      )}
                      Servicios
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => guardedNavigate('/admin/catalogo-correos')}
                      className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
                        location.pathname === '/admin/catalogo-correos'
                          ? 'bg-gradient-to-r from-primary to-primary-600 text-white font-bold shadow-md'
                          : 'text-slate-700 hover:bg-primary/10 hover:text-primary font-medium'
                      }`}
                    >
                      {location.pathname === '/admin/catalogo-correos' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 shadow-sm"></span>
                      )}
                      Plataformas de Correo
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
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${location.pathname === '/empresas' ? 'bg-primary/10' : ''}`}
              >
                <span className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg ${location.pathname === '/empresas' ? 'bg-primary' : 'bg-subtle group-hover:bg-primary'} flex items-center justify-center transition-colors`}>
                    <svg className={`w-5 h-5 ${location.pathname === '/empresas' ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  {!collapsed && <span className={`text-sm font-medium ${location.pathname === '/empresas' ? 'text-primary' : 'text-slate-700 group-hover:text-primary'}`}>Empresas</span>}
                </span>
              </button>
            </li>

            {/* Reportes */}
            <li>
              <button
                onClick={() => handleNavigation('/reportes')}
                aria-current={location.pathname === '/reportes' ? 'true' : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${location.pathname === '/reportes' ? 'bg-primary/10' : ''}`}
              >
                <span className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg ${location.pathname === '/reportes' ? 'bg-primary' : 'bg-subtle group-hover:bg-primary'} flex items-center justify-center transition-colors`}>
                    <svg className={`w-5 h-5 ${location.pathname === '/reportes' ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  {!collapsed && <span className={`text-sm font-medium ${location.pathname === '/reportes' ? 'text-primary' : 'text-slate-700 group-hover:text-primary'}`}>Reportes</span>}
                </span>
              </button>
            </li>

            {/* Configuración */}
            <li>
              <button
                onClick={() => handleNavigation('/config')}
                aria-current={location.pathname === '/config' ? 'true' : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${location.pathname === '/config' ? 'bg-primary/10' : ''}`}
              >
                <span className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg ${location.pathname === '/config' ? 'bg-primary' : 'bg-subtle group-hover:bg-primary'} flex items-center justify-center transition-colors`}>
                    <svg className={`w-5 h-5 ${location.pathname === '/config' ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  {!collapsed && <span className={`text-sm font-medium ${location.pathname === '/config' ? 'text-primary' : 'text-slate-700 group-hover:text-primary'}`}>Configuración</span>}
                </span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-3 border-t border-slate-100/40 bg-panel/60">
          <button
            onClick={() => {
              logout();
            }}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-red-600/10 transition-all text-left group bg-panel"
          >
            <div className="w-8 h-8 rounded-lg bg-subtle group-hover:bg-red-500 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-slate-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            {!collapsed && <span className="text-sm font-medium text-slate-700 group-hover:text-white">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
