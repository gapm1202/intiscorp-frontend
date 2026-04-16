import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authEmpresaService } from '../services/authEmpresaService';
import CustomCaptcha from '../../../components/ui/CustomCaptcha';

/* ─────────────────────── Inline styles / keyframes ─────────────────────── */
const css = `
  @keyframes floatA {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes floatB {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-14px); }
  }
  @keyframes floatC {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-8px); }
  }
  @keyframes pulseRing {
    0%   { transform: translate(-50%,-50%) scale(1);   opacity: .55; }
    100% { transform: translate(-50%,-50%) scale(1.65); opacity: 0; }
  }
  @keyframes blink {
    0%,100% { opacity: 1;  }
    50%     { opacity: .2; }
  }
  @keyframes slideUp {
    from { transform: translateY(28px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes gearCW  { to { transform: rotate(360deg);  } }
  @keyframes gearCCW { to { transform: rotate(-360deg); } }
  @keyframes dash    { to { stroke-dashoffset: -48; }    }

  .inti-float-a { animation: floatA 3s ease-in-out infinite; }
  .inti-float-b { animation: floatB 3.8s ease-in-out infinite; }
  .inti-float-c { animation: floatC 2.5s ease-in-out infinite; }
  .inti-slide-up { animation: slideUp .55s ease-out both; }
  .inti-gear-cw  { transform-origin: 50% 50%; animation: gearCW  4s linear infinite; }
  .inti-gear-ccw { transform-origin: 50% 50%; animation: gearCCW 3s linear infinite; }
  .inti-blink    { animation: blink 1.4s ease-in-out infinite; }

  .inti-input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px 10px 38px;
    border: 1.5px solid #94a3b8;
    border-radius: 10px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    background: #f0f7ff;
    color: #0f172a;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .inti-input:focus {
    border-color: #185FA5;
    box-shadow: 0 0 0 3px rgba(24,95,165,.15);
  }
  .inti-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #0a1f44 0%, #185FA5 60%, #1a8fd1 100%);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    letter-spacing: .4px;
    transition: opacity .2s, transform .15s;
  }
  .inti-btn:hover:not(:disabled)  { opacity: .88; transform: translateY(-1px); }
  .inti-btn:active:not(:disabled) { transform: scale(.98); }
  .inti-btn:disabled { opacity: .5; cursor: not-allowed; }
`;

/* ─────────────────────── SVG decorative icons ──────────────────────────── */
const IconMonitor = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <rect x="3" y="6" width="34" height="22" rx="3" fill="#38bdf8" opacity=".9"/>
    <rect x="7" y="10" width="26" height="14" rx="1" fill="#0a1f44"/>
    <text x="20" y="21" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace">{'>'}_</text>
    <rect x="13" y="28" width="14" height="3" rx="1" fill="#7dd3fc"/>
    <rect x="9"  y="31" width="22" height="2" rx="1" fill="#7dd3fc"/>
  </svg>
);

const IconWifi = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
    <path d="M4 13 C8 8, 22 8, 26 13"      stroke="#7dd3fc" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M8 17 C11 13.5, 19 13.5, 22 17" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M12 21 C13.5 19, 16.5 19, 18 21" stroke="#bae6fd" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <circle cx="15" cy="24" r="2" fill="#38bdf8"/>
  </svg>
);

const IconGear = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    <g className="inti-gear-cw" style={{ transformOrigin: '22px 22px' }}>
      <path d="M22 8 L24 12 L28 10 L30 14 L26 16 L27 20 L22 22 L17 20 L18 16 L14 14 L16 10 L20 12 Z"
            fill="#38bdf8" opacity=".5"/>
      <circle cx="22" cy="22" r="6" fill="#0e3a6e" stroke="#38bdf8" strokeWidth="1.5"/>
      <circle cx="22" cy="22" r="2.5" fill="#38bdf8"/>
    </g>
  </svg>
);

const IconShield = () => (
  <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
    <path d="M16 2 L30 8 L30 20 C30 28 16 34 16 34 C16 34 2 28 2 20 L2 8 Z"
          fill="#0c5fa5" stroke="#38bdf8" strokeWidth="1.5"/>
    <path d="M10 17 L14 21 L22 13" stroke="#7dd3fc" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconServer = () => (
  <svg width="26" height="34" viewBox="0 0 26 34" fill="none">
    {[2, 13, 24].map((y, i) => (
      <g key={i}>
        <rect x="2" y={y} width="22" height={y === 24 ? 8 : 9} rx="2" fill="#1a8fd1" stroke="#7dd3fc" strokeWidth="1"/>
        <circle cx="19" cy={y + (y === 24 ? 4 : 4.5)} r="2" fill="#38bdf8">
          <animate attributeName="opacity" values="1;0.2;1" dur={`${1.2 + i * 0.6}s`} repeatCount="indefinite"/>
        </circle>
        <rect x="5" y={y + 2.5} width="9" height="3" rx="1" fill="#0c5fa5"/>
      </g>
    ))}
  </svg>
);

/* ─────────────────────── Background SVG network ─────────────────────────── */
const BgNetwork = () => (
  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: .12, pointerEvents: 'none' }}
       viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
    {[60,180,300,420,540].flatMap(x =>
      [60,180,300,420,540].map(y =>
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#7ec8f7"/>
      )
    )}
    {[
      [60,60,300,180],[300,60,540,180],[180,60,60,180],[420,60,180,180],
      [60,180,300,420],[540,180,420,420],[300,60,180,420],
      [60,420,180,540],[300,420,540,540],[420,420,180,540],
    ].map(([x1,y1,x2,y2], i) =>
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7ec8f7" strokeWidth="1"/>
    )}
    {/* Animated data packets */}
    <circle r="4" fill="#38bdf8">
      <animateMotion dur="3s" repeatCount="indefinite" path="M60,60 L300,180 L540,420 L300,540"/>
    </circle>
    <circle r="4" fill="#7ec8f7">
      <animateMotion dur="4s" repeatCount="indefinite" begin="1s" path="M540,60 L180,180 L60,420 L300,540"/>
    </circle>
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function LoginEmpresaPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ ruc: '', contrasena: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaValid) { setError('Código de verificación incorrecto'); return; }
    setLoading(true);
    setError('');
    try {
      await authEmpresaService.login(formData);
      navigate('/portal-soporte/reportar-incidencia');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'RUC o contraseña incorrectos');
      setCaptchaValid(false);
      setCaptchaInput('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{css}</style>

      {/* ── Outer wrapper ── */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#0a1f44 0%,#0e3a6e 40%,#0c5fa5 75%,#1a8fd1 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>

        {/* Background network */}
        <BgNetwork />

        {/* ── Floating icons ── */}
        <div className="inti-float-a" style={{ position: 'absolute', left: '4%',  top: '18%',  opacity: .7 }}><IconMonitor/></div>
        <div className="inti-float-c" style={{ position: 'absolute', left: '7%',  bottom: '22%',opacity: .6 }}><IconWifi/></div>
        <div className="inti-float-b" style={{ position: 'absolute', right: '5%', top: '12%',  opacity: .65 }}><IconGear/></div>
        <div className="inti-float-a" style={{ position: 'absolute', right: '7%', bottom: '18%',opacity: .65 }}><IconShield/></div>
        <div className="inti-float-c" style={{ position: 'absolute', right: '14%',top: '32%',  opacity: .55 }}><IconServer/></div>

        {/* ── Main card ── */}
        <div className="inti-slide-up" style={{
          background: 'rgba(255,255,255,.97)',
          borderRadius: 20,
          width: '100%', maxWidth: 440,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,.35)',
          position: 'relative', zIndex: 2,
        }}>

          {/* ── Card header ── */}
          <div style={{
            background: 'linear-gradient(135deg,#0a1f44 0%,#185FA5 60%,#1a8fd1 100%)',
            padding: '2rem 2rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            {/* Decorative rings behind */}
            <div style={{ position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',border:'1.5px solid rgba(56,189,248,.25)' }}/>
            <div style={{ position:'absolute',top:-10,right:-10,width:80,height:80,borderRadius:'50%',border:'1.5px solid rgba(56,189,248,.15)' }}/>

            {/* Logo with pulse rings */}
            <div style={{ position:'relative', display:'inline-block', marginBottom:'1rem' }}>
              {[0, 700].map(delay => (
                <div key={delay} style={{
                  position:'absolute', top:'50%', left:'50%',
                  width:72, height:72, borderRadius:'50%',
                  border:'2px solid rgba(56,189,248,.5)',
                  animation:`pulseRing 2s ease-out ${delay}ms infinite`,
                }}/>
              ))}
              <div style={{
                width:72, height:72,
                background:'rgba(255,255,255,.12)',
                border:'2px solid rgba(56,189,248,.6)',
                borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <IconMonitor/>
              </div>
            </div>

            {/* Brand */}
            <div style={{ marginBottom: '.25rem' }}>
              <span style={{ fontSize:22, fontWeight:800, color:'#fff',   letterSpacing:3 }}>INTI</span>
              <span style={{ fontSize:22, fontWeight:800, color:'#38bdf8', letterSpacing:3 }}>SOFT</span>
            </div>
            <p style={{ color:'#bae6fd', fontSize:13, margin:0, letterSpacing:.5 }}>Portal de Soporte TI</p>

            {/* Live status */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:'.8rem' }}>
              <div className="inti-blink" style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80' }}/>
              <span style={{ fontSize:11, color:'#86efac', letterSpacing:.5 }}>Sistema operativo</span>
            </div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} style={{ padding:'1.8rem 2rem 2rem' }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', textAlign:'center', margin:'0 0 .5rem' }}>
              Iniciar Sesión
            </h2>
            <p style={{ fontSize:12, color:'#64748b', textAlign:'center', margin:'0 0 1.2rem', paddingBottom:'1rem', borderBottom:'1px solid #e2e8f0' }}>
              Ingresa tus credenciales para continuar
            </p>

            {/* KPI strip removed per request */}

            {/* ── Error ── */}
            {error && (
              <div style={{
                background:'#fef2f2', borderLeft:'4px solid #ef4444',
                borderRadius:8, padding:'10px 12px', marginBottom:'1rem',
                display:'flex', alignItems:'flex-start', gap:8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:1 }}>
                  <path d="M12 9v2m0 4h.01M6.938 19h10.124c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L5.206 16c-.77 1.333.192 3 1.732 3z"
                        stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ fontSize:13, color:'#b91c1c', margin:0 }}>{error}</p>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

              {/* ── RUC ── */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  RUC de la Empresa
                </label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ marginRight: 10, display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M4 6a6 6 0 1112 0A6 6 0 014 6zm-2 11a8 8 0 0116 0H2z" fill="#94a3b8"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={formData.ruc}
                      onChange={e => setFormData(p => ({ ...p, ruc: e.target.value }))}
                      className="inti-input"
                      style={{ paddingLeft: 12 }}
                      placeholder="Ingrese el número de RUC"
                      required
                      autoComplete="username"
                    />
                  </div>
              </div>

              {/* ── Contraseña ── */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Contraseña del Portal
                </label>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <div style={{ marginRight: 10, display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.74 5.74L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.59a1 1 0 01.29-.7l5.96-5.96A6 6 0 1121 9z"
                            stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <input
                    type={mostrarContrasena ? 'text' : 'password'}
                    value={formData.contrasena}
                    onChange={e => setFormData(p => ({ ...p, contrasena: e.target.value }))}
                    className="inti-input"
                    style={{ paddingLeft: 12, paddingRight: 38 }}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena(v => !v)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                             background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', color:'#94a3b8' }}
                  >
                    {mostrarContrasena ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* ── CAPTCHA ── */}
              <CustomCaptcha
                onChange={setCaptchaValid}
                onUserInput={setCaptchaInput}
                userInput={captchaInput}
              />

              {/* ── Submit ── */}
              <button type="submit" className="inti-btn" disabled={loading || !captchaValid}>
                {loading ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".25"/>
                      <path fill="currentColor" opacity=".75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Verificando...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Ingresar al Portal
                  </>
                )}
              </button>
            </div>

            <div style={{ marginTop:'1.2rem', paddingTop:'1rem', borderTop:'1px solid #e2e8f0', textAlign:'center' }}>
              <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>¿No tienes acceso? Contáctanos.</p>
            </div>
          </form>
        </div>

        <p style={{ color:'rgba(186,230,253,.55)', fontSize:11, marginTop:'1rem', letterSpacing:.5, zIndex:2 }}>
          ©  INTISOFT — Soluciones TI
        </p>
      </div>
    </>
  );
}