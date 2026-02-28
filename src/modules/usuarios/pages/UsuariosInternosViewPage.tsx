import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usuariosInternosService } from '../services/usuariosInternosService';
import type { UsuarioInterno } from '../types/usuariosInternos.types';

export default function UsuariosInternosViewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ? parseInt(params.id) : undefined;
  const [usuario, setUsuario] = useState<UsuarioInterno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const u = await usuariosInternosService.getById(id);
        setUsuario(u);
      } catch (err) {
        console.error('Error cargando usuario:', err);
        alert('No se pudo cargar el usuario');
        navigate('/admin/usuarios/internos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f8ff 0%, #e0f2fe 50%, #bae6fd 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 52,
            height: 52,
            border: '3px solid #e0f2fe',
            borderTop: '3px solid #0ea5e9',
            borderRadius: '50%',
            margin: '0 auto',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: 16, color: '#0284c7', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 500, letterSpacing: '0.01em' }}>
            Cargando usuario...
          </p>
        </div>
      </div>
    );
  }

  if (!usuario) return null;

  const rolConfig: Record<string, { bg: string; color: string; border: string; label: string }> = {
    administrador: { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd', label: 'Administrador' },
    tecnico:       { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', label: 'Técnico' },
    default:       { bg: '#dcfce7', color: '#166534', border: '#86efac', label: '' },
  };
  const rol = rolConfig[usuario.rol] ?? { ...rolConfig.default, label: usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1) };

  const sectionTitle = (text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 3, height: 20, background: 'linear-gradient(180deg, #0ea5e9, #38bdf8)', borderRadius: 4 }} />
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0c4a6e', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em', textTransform: 'uppercase' }}>
        {text}
      </h3>
    </div>
  );

  const emptyState = (msg: string) => (
    <div style={{
      padding: '14px 18px',
      borderRadius: 10,
      background: '#f0f9ff',
      border: '1px dashed #7dd3fc',
      color: '#64b5d9',
      fontSize: 14,
      fontFamily: "'DM Sans', sans-serif",
      fontStyle: 'italic',
    }}>
      {msg}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .view-card { transition: box-shadow 0.2s ease; }
        .view-card:hover { box-shadow: 0 8px 32px rgba(14,165,233,0.13) !important; }
        .back-btn:hover { color: #0284c7 !important; transform: translateX(-2px); }
        .back-btn { transition: color 0.15s, transform 0.15s; }
        .item-row:hover { background: #f0f9ff !important; }
        .item-row { transition: background 0.15s; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #f8fafc 0%, #f0f9ff 40%, #e0f2fe 100%)',
        padding: '40px 16px 60px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Decorative top bar */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)',
          zIndex: 100,
        }} />

        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Back button */}
          <button
            className="back-btn"
            onClick={() => navigate('/admin/usuarios/internos')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 28,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              padding: '6px 0',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Usuarios Internos
          </button>

          {/* Main card */}
          <div className="view-card" style={{
            background: '#ffffff',
            borderRadius: 18,
            boxShadow: '0 4px 24px rgba(14,165,233,0.09), 0 1px 4px rgba(0,0,0,0.04)',
            border: '1px solid #e0f2fe',
            overflow: 'hidden',
          }}>

            {/* Header band */}
            <div style={{
              background: 'linear-gradient(110deg, #0ea5e9 0%, #38bdf8 60%, #7dd3fc 100%)',
              padding: '32px 36px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative circles */}
              <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', bottom: -50, right: 80, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
                <div>
                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.25)',
                      border: '2px solid rgba(255,255,255,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {usuario.nombreCompleto?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                        {usuario.nombreCompleto}
                      </h2>
                      <div style={{ marginTop: 4, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily: "'DM Mono', monospace" }}>
                        @{usuario.usuario}
                      </div>
                    </div>
                  </div>

                  {/* Role badge */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 14px',
                    borderRadius: 20,
                    background: rol.bg,
                    color: rol.color,
                    border: `1px solid ${rol.border}`,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: rol.color }} />
                    {rol.label || (usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1))}
                  </span>
                </div>

                {/* Meta info */}
                <div style={{
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '14px 20px',
                  minWidth: 200,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: usuario.activo ? '#4ade80' : '#f87171',
                      boxShadow: usuario.activo ? '0 0 0 3px rgba(74,222,128,0.3)' : '0 0 0 3px rgba(248,113,113,0.3)',
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {usuario.createdAt && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
                      Creado: {new Date(usuario.createdAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  )}
                  {usuario.creadoPorNombre && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                      Por: <strong style={{ color: 'rgba(255,255,255,0.95)' }}>{usuario.creadoPorNombre}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '36px 36px 32px' }}>

              {/* Grid: correo principal + teléfonos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, marginBottom: 32 }}>

                {/* Correo principal */}
                <div>
                  {sectionTitle('Correo principal')}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    border: '1px solid #bae6fd',
                    borderRadius: 12,
                    padding: '18px 20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: usuario.correoPrincipalConfig ? 14 : 0 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: '#0ea5e9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 15, color: '#0c4a6e', fontFamily: "'DM Mono', monospace", wordBreak: 'break-all' }}>
                        {usuario.correoPrincipal}
                      </span>
                    </div>
                    {usuario.correoPrincipalConfig && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 2 }}>
                        {[
                          ['Uso', usuario.correoPrincipalConfig.descripcionUso],
                          ['Plataforma', usuario.correoPrincipalConfig.plataformaNombre],
                          ['Tipo', usuario.correoPrincipalConfig.tipoCorreoNombre],
                          ['Protocolo', usuario.correoPrincipalConfig.protocoloNombre],
                          ['Licencia', usuario.correoPrincipalConfig.tipoLicenciaNombre],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label as string} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                            <span style={{ color: '#64b5d9', fontWeight: 600, minWidth: 70 }}>{label}:</span>
                            <span style={{ color: '#0c4a6e' }}>{value as string}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Teléfonos */}
                <div>
                  {sectionTitle('Teléfonos')}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {usuario.telefonos && usuario.telefonos.length > 0 ? (
                      usuario.telefonos.map((t) => (
                        <div key={t.numero} className="item-row" style={{
                          background: '#f8fafc',
                          border: '1px solid #e0f2fe',
                          borderRadius: 12,
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              background: '#e0f2fe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <svg width="16" height="16" fill="none" stroke="#0ea5e9" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#0c4a6e', fontFamily: "'DM Mono', monospace" }}>{t.numero}</div>
                              {t.descripcion && <div style={{ fontSize: 12, color: '#64b5d9', marginTop: 2 }}>{t.descripcion}</div>}
                            </div>
                          </div>
                          {t.esPrincipal && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              padding: '4px 10px',
                              borderRadius: 20,
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #86efac',
                            }}>
                              Principal
                            </span>
                          )}
                        </div>
                      ))
                    ) : emptyState('No hay teléfonos registrados')}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #bae6fd, transparent)', margin: '0 0 32px' }} />

              {/* Correos adicionales */}
              <div>
                {sectionTitle('Correos adicionales')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {usuario.correosAdicionales && usuario.correosAdicionales.length > 0 ? (
                    usuario.correosAdicionales.map((c) => (
                      <div key={c.correo} className="item-row" style={{
                        background: '#f8fafc',
                        border: '1px solid #e0f2fe',
                        borderRadius: 12,
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: 9,
                            background: '#e0f2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <svg width="16" height="16" fill="none" stroke="#0ea5e9" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0c4a6e', fontFamily: "'DM Mono', monospace" }}>{c.correo}</div>
                            {c.descripcion && <div style={{ fontSize: 12, color: '#64b5d9', marginTop: 2 }}>{c.descripcion}</div>}
                          </div>
                        </div>
                        {c.esPrincipal && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            padding: '4px 10px',
                            borderRadius: 20,
                            background: '#dcfce7',
                            color: '#166534',
                            border: '1px solid #86efac',
                          }}>
                            Principal
                          </span>
                        )}
                      </div>
                    ))
                  ) : emptyState('No hay correos adicionales')}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}