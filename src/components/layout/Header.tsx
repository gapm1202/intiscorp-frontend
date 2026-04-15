import { useAuth } from "@/context/authHelpers";
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getContratosProximosAVencer } from '@/modules/empresas/services/contratosService';
import { getContractualVisitNotifications, type ContractualVisitNotification } from '@/modules/visitas/services/contractualNotificationsService';
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
  const [contratosProximos, setContratosProximos] = useState<ContratoProximoVencer[]>([]);
  const [visitasContractualesPendientes, setVisitasContractualesPendientes] = useState<ContractualVisitNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const cargarNotificaciones = async () => {
      try {
        const [contratos, visitasPendientes] = await Promise.all([
          getContratosProximosAVencer(30),
          getContractualVisitNotifications(),
        ]);
        const contratosNormalizados = (contratos || []).map(c => ({
          ...c,
          diasRestantes: typeof c.diasRestantes === 'string' ? parseInt(c.diasRestantes, 10) : c.diasRestantes
        }));
        setContratosProximos(contratosNormalizados);
        setVisitasContractualesPendientes(visitasPendientes);
      } catch (error) {
        console.error('Error al cargar notificaciones del header:', error);
        setContratosProximos([]);
        setVisitasContractualesPendientes([]);
      }
    };

    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRevisarContrato = (empresaId: string) => {
    setShowNotifications(false);
    navigate(`/admin/empresas/${empresaId}`);
    sessionStorage.setItem(`empresaTab_${empresaId}`, 'contrato');
  };

  const handleIrAGestionVisitas = (empresaId: string) => {
    setShowNotifications(false);
    navigate(`/admin/visitas?empresaId=${empresaId}`);
  };

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

  const displayName = (user && (user.nombre || (user as any).name || (user as any).nombre_completo || (user as any).email || (user as any).correo || 'Usuario')) as string;
  const initial = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : 'U';

  const location = useLocation();

  const readable = (seg: string) => seg.replace(/-/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const parts = location.pathname.split('/').filter(Boolean).filter(p => p !== 'admin' && p !== 'cliente' && p !== 'tecnico');
  const crumbs = parts.length > 0 ? parts.map(readable) : ['Dashboard'];

  const urgencyColor = (dias: number) => {
    if (dias <= 7) return { bg: '#fef2f2', icon: '#ef4444', badge: '#ef4444', text: '#dc2626' };
    if (dias <= 15) return { bg: '#fff7ed', icon: '#f97316', badge: '#f97316', text: '#ea580c' };
    return { bg: '#fefce8', icon: '#eab308', badge: '#ca8a04', text: '#a16207' };
  };

  const totalNotifications = contratosProximos.length + visitasContractualesPendientes.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50%       { box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
        .hdr-notif-panel   { animation: slideDown 0.18s ease forwards; }
        .hdr-btn:hover     { background: #f0f9ff !important; color: #0369a1 !important; }
        .hdr-icon-btn:hover { background: #f0f9ff !important; }
        .hdr-notif-row:hover { background: #f8fbff !important; }
        .hdr-profile:hover  { background: #f0f9ff !important; }
        .hdr-dd-item:hover  { background: #f0f9ff !important; color: #0369a1 !important; }
        .hdr-dd-logout:hover { background: #fef2f2 !important; color: #dc2626 !important; }
        .hdr-profile-wrap:hover .hdr-dropdown { opacity: 1 !important; visibility: visible !important; }
        .hdr-revisar-btn:hover { background: #0284c7 !important; }
        .hdr-visitas-btn:hover { background: #d97706 !important; }
      `}</style>

      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e0f2fe',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: '0 1px 8px rgba(14,165,233,0.07)',
      }}>
        {/* Top accent stripe */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 50%, #bae6fd 100%)',
        }} />

        <div style={{
          padding: '0 24px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>

          {/* Mobile menu button */}
          <button
            className="lg:hidden hdr-icon-btn"
            onClick={toggleSidebar}
            style={{
              padding: '6px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: '#64b5d9', transition: 'background 0.15s',
            }}
          >
            <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb (dynamic) */}
          <div style={{ flex: 1 }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {crumbs.map((c, idx) => (
                <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: idx === crumbs.length - 1 ? '#0369a1' : '#93c5d9', fontWeight: idx === crumbs.length - 1 ? 600 : 400 }}>{c}</span>
                  {idx !== crumbs.length - 1 && <span style={{ fontSize: 12, color: '#bae6fd' }}>/</span>}
                </span>
              ))}
            </nav>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

            {/* Notifications */}
            <div style={{ position: 'relative' }} ref={notificationRef}>
              <button
                className="hdr-icon-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  position: 'relative', padding: 8, borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: showNotifications ? '#f0f9ff' : 'transparent',
                  color: showNotifications ? '#0ea5e9' : '#64b5d9',
                  transition: 'all 0.15s',
                }}
              >
                <svg style={{ width: 18, height: 18, display: 'block' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {totalNotifications > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    minWidth: 16, height: 16, padding: '0 4px',
                    background: '#ef4444', borderRadius: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 9, fontWeight: 700,
                    border: '1.5px solid #fff',
                    animation: 'pulse-dot 2s infinite',
                  }}>
                    {totalNotifications}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="hdr-notif-panel" style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 320,
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #e0f2fe',
                  boxShadow: '0 8px 32px rgba(14,165,233,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}>
                  {/* Panel header */}
                  <div style={{
                    padding: '14px 16px 12px',
                    borderBottom: '1px solid #e0f2fe',
                    background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0c4a6e' }}>Notificaciones</div>
                      <div style={{ fontSize: 11, color: '#64b5d9', marginTop: 2 }}>
                        {totalNotifications} alerta(s) activas
                      </div>
                    </div>
                    {totalNotifications > 0 && (
                      <div style={{
                        padding: '3px 10px', borderRadius: 20,
                        background: '#ef4444', color: '#fff',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {totalNotifications}
                      </div>
                    )}
                  </div>

                  {/* Panel body */}
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {totalNotifications === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: '#f0f9ff', margin: '0 auto 10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg style={{ width: 22, height: 22, color: '#7dd3fc' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p style={{ fontSize: 12, color: '#93c5d9', margin: 0 }}>Todo al día</p>
                      </div>
                    ) : (
                      <>
                        {visitasContractualesPendientes.length > 0 && (
                          <div style={{ borderBottom: contratosProximos.length > 0 ? '1px solid #e0f2fe' : 'none' }}>
                            <div style={{
                              padding: '10px 16px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              color: '#b45309',
                              background: '#fffbeb',
                            }}>
                              Visitas contractuales pendientes
                            </div>
                            {visitasContractualesPendientes.map((notificacion, index) => (
                              <div key={`${notificacion.empresaId}-${index}`} className="hdr-notif-row" style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #fef3c7',
                                transition: 'background 0.12s',
                                cursor: 'default',
                                background: '#fffdf7',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                  <div style={{
                                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                    background: '#fff7ed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    <svg style={{ width: 16, height: 16, color: '#ea580c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.65 18h16.7a1 1 0 00.86-1.5l-7.5-13a1 1 0 00-1.72 0z" />
                                    </svg>
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9a3412', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {notificacion.empresaNombre}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#b45309', marginTop: 2, fontWeight: 500, lineHeight: 1.35 }}>
                                      {notificacion.mensaje}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                      <span style={{
                                        padding: '2px 7px', borderRadius: 20,
                                        background: '#ffedd5', color: '#c2410c',
                                        fontSize: 10, fontWeight: 600,
                                        border: '1px solid #fdba74',
                                      }}>
                                        {notificacion.visitasRegistradas}/{notificacion.cantidadVisitas}
                                      </span>
                                      <button
                                        className="hdr-visitas-btn"
                                        onClick={() => handleIrAGestionVisitas(notificacion.empresaId)}
                                        style={{
                                          padding: '3px 10px', borderRadius: 6,
                                          background: '#f59e0b', color: '#fff',
                                          border: 'none', cursor: 'pointer',
                                          fontSize: 10, fontWeight: 600,
                                          transition: 'background 0.15s',
                                        }}
                                      >
                                        Ir a Gestión
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {contratosProximos.length > 0 && (
                          <div>
                            <div style={{
                              padding: '10px 16px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              color: '#0c4a6e',
                              background: '#f8fbff',
                            }}>
                              Contratos por vencer
                            </div>
                            {contratosProximos.map((contrato, index) => {
                              const colors = urgencyColor(contrato.diasRestantes);
                              return (
                                <div key={index} className="hdr-notif-row" style={{
                                  padding: '12px 16px',
                                  borderBottom: '1px solid #f0f9ff',
                                  transition: 'background 0.12s',
                                  cursor: 'default',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    <div style={{
                                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                      background: colors.bg,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                      <svg style={{ width: 16, height: 16, color: colors.icon }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {contrato.empresaNombre}
                                      </div>
                                      <div style={{ fontSize: 11, color: colors.text, marginTop: 2, fontWeight: 500 }}>
                                        {contrato.diasRestantes === 0
                                          ? 'Vence hoy'
                                          : contrato.diasRestantes === 1
                                          ? 'Vence mañana'
                                          : `Vence en ${contrato.diasRestantes} días`}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                        {!contrato.renovacionAutomatica && (
                                          <span style={{
                                            padding: '2px 7px', borderRadius: 20,
                                            background: '#fef2f2', color: '#dc2626',
                                            fontSize: 10, fontWeight: 600,
                                            border: '1px solid #fecaca',
                                          }}>
                                            Sin renovación
                                          </span>
                                        )}
                                        <button
                                          className="hdr-revisar-btn"
                                          onClick={() => handleRevisarContrato(contrato.empresaId)}
                                          style={{
                                            padding: '3px 10px', borderRadius: 6,
                                            background: '#0ea5e9', color: '#fff',
                                            border: 'none', cursor: 'pointer',
                                            fontSize: 10, fontWeight: 600,
                                            transition: 'background 0.15s',
                                          }}
                                        >
                                          Revisar
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 22, background: '#bae6fd', margin: '0 6px' }} className="hidden sm:block" />

            {/* Profile */}
            <div className="hdr-profile-wrap" style={{ position: 'relative' }}>
              <button
                className="hdr-profile"
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '5px 10px 5px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'transparent', transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(14,165,233,0.3)',
                }}>
                  {initial}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e', lineHeight: 1.2 }}>{displayName}</div>
                  <div style={{ fontSize: 10, color: '#64b5d9', textTransform: 'capitalize', marginTop: 1 }}>{user?.rol}</div>
                </div>
                <svg style={{ width: 13, height: 13, color: '#7dd3fc', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </button>

              {/* Dropdown */}
              <div className="hdr-dropdown" style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 180,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e0f2fe',
                boxShadow: '0 8px 24px rgba(14,165,233,0.1), 0 2px 6px rgba(0,0,0,0.05)',
                opacity: 0, visibility: 'hidden',
                transition: 'all 0.15s ease',
                zIndex: 50,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '6px' }}>
                  <button onClick={() => { if (user?.id) navigate(`/admin/usuarios/internos/${user.id}/ver`); }} className="hdr-dd-item" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                    color: '#0369a1', fontSize: 12, fontWeight: 500,
                    transition: 'all 0.12s', border: 'none', background: 'transparent', cursor: 'pointer'
                  }}>
                    <svg style={{ width: 14, height: 14, flexShrink: 0, color: '#7dd3fc' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mi Perfil
                  </button>
                  <a href="#" className="hdr-dd-item" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                    color: '#0369a1', fontSize: 12, fontWeight: 500,
                    transition: 'all 0.12s',
                  }}>
                    <svg style={{ width: 14, height: 14, flexShrink: 0, color: '#7dd3fc' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configuración
                  </a>
                </div>
                <div style={{ borderTop: '1px solid #e0f2fe', padding: '6px' }}>
                  <button
                    onClick={() => logout()}
                    className="hdr-dd-logout"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'transparent', color: '#ef4444',
                      fontSize: 12, fontWeight: 500,
                      transition: 'all 0.12s', textAlign: 'left',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </>
  );
};

export default Header;