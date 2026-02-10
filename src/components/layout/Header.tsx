import { useAuth } from "@/context/authHelpers";
import { useEffect, useState, useRef } from 'react';
import { getContratosProximosAVencer } from '@/modules/empresas/services/contratosService';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar: () => void;
}

interface ContratoProximoVencer {
  empresaId: string;
  empresaNombre: string;
  fechaFin: string;
  diasRestantes: number;
  renovacionAutomatica: boolean;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch { return false; }
  });
  const [contratosProximos, setContratosProximos] = useState<ContratoProximoVencer[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    try {
      if (dark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* noop */
    }
  }, [dark]);

  // Cargar contratos próximos a vencer
  useEffect(() => {
    const cargarContratosProximos = async () => {
      try {
        const contratos = await getContratosProximosAVencer(30);
        
        // Normalizar diasRestantes a número (por si viene como string)
        const contratosNormalizados = (contratos || []).map(c => ({
          ...c,
          diasRestantes: typeof c.diasRestantes === 'string' ? parseInt(c.diasRestantes, 10) : c.diasRestantes
        }));
        
        setContratosProximos(contratosNormalizados);
      } catch (error) {
        console.error('Error al cargar contratos próximos a vencer:', error);
        setContratosProximos([]);
      }
    };

    cargarContratosProximos();
    // Actualizar cada 5 minutos
    const interval = setInterval(cargarContratosProximos, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRevisarContrato = (empresaId: string) => {
    setShowNotifications(false);
    navigate(`/admin/empresas/${empresaId}`);
    // Guardar en sessionStorage para abrir la pestaña contrato
    sessionStorage.setItem(`empresaTab_${empresaId}`, 'contrato');
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between">
        {/* Botón de menú en móvil */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 hover:bg-gray-50 rounded-md text-gray-500"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Breadcrumb / Título */}
        <div className="flex-1 lg:ml-2">
          <nav className="flex items-center gap-1.5 text-[13px]">
            <span className="text-gray-400">Dashboard</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium">General</span>
          </nav>
        </div>

        {/* Acciones del header */}
        <div className="flex items-center gap-1">
          {/* Toggle theme */}
          <button
            onClick={() => setDark(d => !d)}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2 rounded-md hover:bg-gray-50 text-gray-500 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? (
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Notificaciones */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {contratosProximos.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold">
                  {contratosProximos.length}
                </span>
              )}
            </button>

            {/* Dropdown de notificaciones */}
            {showNotifications && (
              <div className="absolute right-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50 animate-scale-in origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-[13px] font-semibold text-gray-800">Notificaciones</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{contratosProximos.length} pendiente(s)</p>
                </div>
                
                <div className="max-h-72 overflow-y-auto">
                  {contratosProximos.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <svg className="w-10 h-10 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[12px] text-gray-400">No hay notificaciones</p>
                    </div>
                  ) : (
                    contratosProximos.map((contrato, index) => (
                      <div 
                        key={index} 
                        className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 bg-amber-50 rounded-md shrink-0">
                            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-gray-800 truncate">
                              {contrato.empresaNombre}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {contrato.diasRestantes === 0 
                                ? 'Vence hoy' 
                                : contrato.diasRestantes === 1
                                ? 'Vence mañana'
                                : `Vence en ${contrato.diasRestantes} días`
                              }
                            </p>
                            {!contrato.renovacionAutomatica && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded">
                                Sin renovación
                              </span>
                            )}
                            <button
                              onClick={() => handleRevisarContrato(contrato.empresaId)}
                              className="mt-2 px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-medium rounded-md hover:bg-indigo-700 transition-colors"
                            >
                              Revisar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>

          {/* Perfil del usuario con dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white font-medium text-xs">
                {user?.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[12px] font-medium text-gray-700 leading-tight">{user?.nombre}</p>
                <p className="text-[10px] text-gray-400 capitalize">{user?.rol}</p>
              </div>
              <svg className="w-3.5 h-3.5 text-gray-400 hidden sm:block" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </button>

            {/* Menú dropdown */}
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="py-1">
                <a href="#" className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Mi Perfil
                </a>
                <a href="#" className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configuración
                </a>
              </div>
              <div className="border-t border-gray-100">
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
