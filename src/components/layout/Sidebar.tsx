import { useAuth } from "@/context/authHelpers";
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
      { id: "tickets", label: "Tickets", path: "/tickets" },
      { id: "inventario", label: "Inventario", path: "/inventario" },
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
    'mis-tickets': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    'crear-ticket': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
    mantenimientos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  };

  const menuItems = user ? menuByRole[user.rol] ?? menuByRole["cliente"] : menuByRole["cliente"];
  const [inventarioOpen, setInventarioOpen] = useState(false);
  type EmpresaItem = { id?: number; _id?: string; nombre?: string; [key: string]: unknown };
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [empresasError, setEmpresasError] = useState<string | null>(null);

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
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
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
              if (item.id === "inventario") {
                return (
                  <li key={item.id}>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={item.id === 'inventario' ? toggleInventario : () => handleNavigation(item.path)}
                        aria-current={isActive ? 'true' : undefined}
                        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${isActive ? 'active' : ''}`}
                      >
                        <span className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-lg ${collapsed ? 'flex items-center justify-center' : 'flex items-center justify-center'} bg-subtle group-hover:bg-primary flex items-center justify-center transition-colors`}> 
                            <svg className="w-4 h-4 text-slate-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {/** reuse iconMap later */}
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
                            </svg>
                          </div>
                          {!collapsed && <span className="text-sm font-medium text-slate-700 group-hover:text-primary">{item.label}</span>}
                        </span>
                        {!collapsed && (String(item.id) === 'tickets' ? <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">5</span> : <></>)}
                      </button>
                    </div>
                    {item.id === 'inventario' && inventarioOpen && !collapsed && (
                          <div className="mt-1 ml-11 space-y-1 border-l-2 border-slate-100 pl-3">
                        {loadingEmpresas ? (
                          <div className="text-xs text-slate-500 py-2">Cargando empresas...</div>
                        ) : empresasError ? (
                          <div className="text-xs text-red-500 py-2">Error cargando empresas</div>
                        ) : empresas.length === 0 ? (
                          <div className="text-xs text-slate-500 py-2">No hay empresas</div>
                        ) : (
                          <ul className="space-y-1">
                            {empresas.map((e: EmpresaItem) => (
                              <li key={e.id ?? e._id}>
                                <button
                                  onClick={() => {
                                    navigate(`/admin/empresas/${e.id ?? e._id}/inventario`);
                                    if (window.innerWidth < 768) toggleSidebar();
                                  }}
                                  className="w-full text-left text-xs py-2 px-3 rounded-md hover:bg-subtle transition-colors text-slate-700"
                                >
                                  {e.nombre ?? "(sin nombre)"}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-subtle transition-all text-left group ${isActive ? 'active' : ''}`}
                  >
                    <span className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-subtle group-hover:bg-primary flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4 text-slate-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {iconMap[item.id] || iconMap.dashboard}
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-primary">{item.label}</span>
                    </span>
                    {item.id === "tickets" && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                        5
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
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
