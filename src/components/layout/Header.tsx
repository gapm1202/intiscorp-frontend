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
    <header className="shadow-md sticky top-0 z-30">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Botón de menú en móvil */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Título */}
        <div className="flex-1 lg:ml-4">
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
        </div>

        {/* Información del usuario en el header */}
        <div className="flex items-center space-x-4">
          {/* Toggle theme (eye icon) */}
          <button
            onClick={() => setDark(d => !d)}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Toggle theme"
          >
            {dark ? (
              // eye-off icon for dark -> light
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a7.978 7.978 0 014.07-6.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
            ) : (
              // eye icon for light -> dark
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9a3 3 0 100 6 3 3 0 000-6z" />
              </svg>
            )}
          </button>
          {/* Notificaciones */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {contratosProximos.length > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {contratosProximos.length}
                </span>
              )}
            </button>

            {/* Dropdown de notificaciones */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-800">Notificaciones</h3>
                  <p className="text-xs text-gray-500 mt-1">{contratosProximos.length} notificación(es)</p>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {contratosProximos.length === 0 ? (
                    <div className="p-8 text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-gray-500">No hay contratos próximos a vencer</p>
                    </div>
                  ) : (
                    contratosProximos.map((contrato, index) => (
                      <div 
                        key={index} 
                        className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {contrato.empresaNombre}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {contrato.diasRestantes === 0 
                                ? '⚠️ El contrato vence hoy' 
                                : contrato.diasRestantes === 1
                                ? '⚠️ Falta 1 día para que finalice el contrato'
                                : `⏰ Faltan ${contrato.diasRestantes} días para que finalice el contrato`
                              }
                            </p>
                            {!contrato.renovacionAutomatica && (
                              <p className="text-xs text-red-600 mt-1 font-semibold">
                                🔴 Sin renovación automática
                              </p>
                            )}
                            <button
                              onClick={() => handleRevisarContrato(contrato.empresaId)}
                              className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Revisar Contrato
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

          {/* Perfil del usuario */}
          <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{user?.nombre}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.rol}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              {user?.nombre.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Dropdown menu */}
          <div className="relative group">
            <button className="p-1 text-gray-600 hover:bg-gray-100 rounded-lg">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </button>

            {/* Menú dropdown */}
            <div className="absolute right-0 mt-0 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <a
                href="#"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
              >
                Mi Perfil
              </a>
              <a
                href="#"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Configuración
              </a>
              <button
                onClick={() => logout()}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 last:rounded-b-lg"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
