import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/authHelpers";
import { useNavigate } from "react-router-dom";
import { loginUser, verify2FACode } from "@/modules/auth/services/authService";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

/* ─────────────────────────────────────────
   Animated Canvas: floating data nodes
───────────────────────────────────────── */
const DataCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type Node = { x: number; y: number; vx: number; vy: number; r: number; pulse: number; pSpeed: number };
    const nodes: Node[] = Array.from({ length: 38 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1,
      pulse: Math.random() * Math.PI * 2,
      pSpeed: Math.random() * 0.02 + 0.01,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.25;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(96,190,255,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        n.pulse += n.pSpeed;
        const glow = Math.sin(n.pulse) * 0.5 + 0.5;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6);
        grad.addColorStop(0, `rgba(56,189,248,${0.15 * glow})`);
        grad.addColorStop(1, "rgba(56,189,248,0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147,217,255,${0.6 + 0.4 * glow})`;
        ctx.fill();
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

/* ─────────────────────────────────────────
   Animated dashboard illustration
───────────────────────────────────────── */
const DashboardIllustration = () => (
  <div className="relative w-full max-w-sm mx-auto mt-6 select-none">
    <style>{`
      @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      @keyframes barGrow1 { 0%{height:0} 100%{height:52px} }
      @keyframes barGrow2 { 0%{height:0} 100%{height:72px} }
      @keyframes barGrow3 { 0%{height:0} 100%{height:40px} }
      @keyframes barGrow4 { 0%{height:0} 100%{height:64px} }
      @keyframes barGrow5 { 0%{height:0} 100%{height:88px} }
      @keyframes pulse-ring { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      .float-card  { animation: floatUp 4s ease-in-out infinite; }
      .float-card-2{ animation: floatUp 4s ease-in-out infinite 1.5s; }
      .bar1{animation:barGrow1 1.2s cubic-bezier(.22,1,.36,1) forwards 0.2s;height:0}
      .bar2{animation:barGrow2 1.2s cubic-bezier(.22,1,.36,1) forwards 0.4s;height:0}
      .bar3{animation:barGrow3 1.2s cubic-bezier(.22,1,.36,1) forwards 0.6s;height:0}
      .bar4{animation:barGrow4 1.2s cubic-bezier(.22,1,.36,1) forwards 0.8s;height:0}
      .bar5{animation:barGrow5 1.2s cubic-bezier(.22,1,.36,1) forwards 1s;height:0}
      .pulse-ring  { animation: pulse-ring 2.5s ease-in-out infinite; }
      .blink-dot   { animation: blink 1.4s ease-in-out infinite; }
    `}</style>

    <div className="float-card relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-300"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
        <div className="ml-auto text-white/50 text-xs font-mono">Intisoft</div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Clientes", value: "1,248", color: "from-sky-400 to-blue-500" },
          { label: "Tickets",  value: "342",   color: "from-cyan-400 to-sky-500" },
          { label: "Uptime",   value: "99.9%", color: "from-blue-400 to-indigo-500" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl bg-gradient-to-br ${s.color} p-3 text-white`}>
            <div className="text-lg font-bold leading-none">{s.value}</div>
            <div className="text-xs opacity-80 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 rounded-xl p-3">
        <div className="text-white/60 text-xs mb-3">Actividad mensual</div>
        <div className="flex items-end gap-2 h-24">
          {["bar1","bar2","bar3","bar4","bar5"].map((cls, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
              <div className={`${cls} w-full rounded-t-md`} style={{ background: 'linear-gradient(to top, rgba(56,189,248,0.9), rgba(99,210,255,0.5))', alignSelf: 'flex-end' }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {["Ene","Feb","Mar","Abr","May"].map(m => (
            <span key={m} className="text-white/40 text-[10px]">{m}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="blink-dot w-2 h-2 rounded-full bg-green-400"></div>
        <span className="text-white/50 text-xs">Sistema en línea</span>
        <div className="ml-auto text-white/30 text-xs font-mono">●●●</div>
      </div>
    </div>

    <div className="float-card-2 absolute -top-4 -right-4 bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
      <div className="pulse-ring w-6 h-6 rounded-full bg-sky-400/30 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-sky-300"></div>
      </div>
      <div>
        <div className="text-white text-[11px] font-semibold">Nuevo ticket</div>
        <div className="text-white/50 text-[10px]">hace 2 min</div>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   Main Login Component
───────────────────────────────────────── */
const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [codigo2FA, setCodigo2FA] = useState("");
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [tempUserId, setTempUserId] = useState<number | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    setLoading(true);
    try {
      const responseData = await loginUser(data.email, data.password);
      if (responseData?.require2FA) {
        setTempUserData(responseData);
        const uid = responseData.userId ?? responseData.usuario_id ?? responseData.user?.id ?? null;
        setTempUserId(uid ? Number(uid) : null);
        setShow2FA(true);
        setError("");
        return;
      }
      if (responseData?.token) {
        login({ user: responseData.user, token: responseData.token });
        const u = (responseData.user || {}) as Record<string, unknown>;
        const roleCandidate = u['rol'] ?? u['role'] ?? (Array.isArray(u['roles']) ? (u['roles'] as unknown[])[0] : undefined) ?? '';
        const normalizedRole = String(roleCandidate).toLowerCase();
        if (normalizedRole.includes("admin")) navigate("/admin");
        else if (normalizedRole.includes("tec")) navigate("/tecnico");
        else navigate("/cliente");
        return;
      }
      throw new Error(responseData?.message || 'Respuesta de login inesperada');
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number; response?: { status?: number } };
      const statusCode = e.status ?? e.response?.status ?? null;
      if (statusCode === 403 || String(e.message || "").toLowerCase().includes("inactivo")) {
        setError(e.message || "Usuario inactivo. Contacta al administrador.");
      } else {
        setError(e.message || "Error de conexión con el servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async () => {
    if (codigo2FA.length !== 6) { setError("El código debe tener 6 dígitos"); return; }
    setError("");
    setLoading(true);
    try {
      const userId = tempUserId ?? tempUserData?.userId ?? tempUserData?.usuario_id ?? tempUserData?.user?.id;
      if (!userId) throw new Error('No se encontró userId para verificar 2FA');
      const result = await verify2FACode(Number(userId), codigo2FA);
      if (!result?.token) throw new Error(result?.message || 'Verificación 2FA fallida');
      const candidate = result.user ?? tempUserData?.user ?? tempUserData ?? {};
      const extractedUser = {
        id: Number(candidate.id ?? candidate._id ?? candidate.userId ?? candidate.usuario_id ?? 0),
        nombre: String(candidate.nombre ?? candidate.name ?? candidate.nombre_completo ?? candidate.fullName ?? candidate.displayName ?? candidate.correoPrincipal ?? candidate.email ?? candidate.correo ?? ''),
        email: String(candidate.email ?? candidate.correo ?? candidate.correoPrincipal ?? ''),
        rol: String(candidate.rol ?? candidate.role ?? (Array.isArray(candidate.roles) ? candidate.roles[0] : '') ?? ''),
      };
      login({ user: extractedUser, token: result.token });
      const u = extractedUser as Record<string, unknown>;
      const roleCandidate = u['rol'] ?? u['role'] ?? (Array.isArray(u['roles']) ? (u['roles'] as unknown[])[0] : undefined) ?? '';
      const normalizedRole = String(roleCandidate).toLowerCase();
      if (normalizedRole.includes("admin")) navigate("/admin");
      else if (normalizedRole.includes("tec")) navigate("/tecnico");
      else navigate("/cliente");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email?: string | null) => {
    if (!email) return 'tu correo';
    const parts = String(email).split('@');
    if (parts.length !== 2) return email;
    const local = parts[0]; const domain = parts[1];
    if (local.length <= 3) return local[0] + '*'.repeat(Math.max(3, local.length)) + '@' + domain;
    return `${local.slice(0, 3)}${'*'.repeat(Math.max(1, local.length - 3))}@${domain}`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .login-root * { box-sizing: border-box; }

        @keyframes slideInLeft  { from{opacity:0;transform:translateX(-32px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(32px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes fadeInUp     { from{opacity:0;transform:translateY(16px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer      { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes spin-loader  { to{transform:rotate(360deg)} }
        @keyframes modal-in     { from{opacity:0;transform:scale(0.92) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin-ring    { to{transform:rotate(360deg)} }

        .slide-left  { animation: slideInLeft  0.7s cubic-bezier(.22,1,.36,1) both; }
        .slide-right { animation: slideInRight 0.7s cubic-bezier(.22,1,.36,1) both; }

        .form-field { animation: fadeInUp 0.5s cubic-bezier(.22,1,.36,1) both; }
        .form-field:nth-child(1){animation-delay:0.3s}
        .form-field:nth-child(2){animation-delay:0.42s}
        .form-field:nth-child(3){animation-delay:0.54s}
        .form-field:nth-child(4){animation-delay:0.66s}
        .form-field:nth-child(5){animation-delay:0.78s}
        .form-field:nth-child(6){animation-delay:0.9s}

        .btn-primary {
          background: linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%);
          position: relative; overflow: hidden;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .btn-primary::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          background-size: 400px 100%;
          animation: shimmer 2.4s infinite;
          opacity: 0; transition: opacity 0.3s;
        }
        .btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(14,165,233,0.45); }
        .btn-primary:hover:not(:disabled)::after { opacity:1; }
        .btn-primary:active:not(:disabled) { transform:translateY(0); }

        .input-styled {
          font-family: 'DM Sans', sans-serif;
          background: #F0F8FF;
          border: 1.5px solid #BAE6FD;
          border-radius: 12px;
          padding: 13px 16px 13px 44px;
          width: 100%; color: #0C2340; font-size: 15px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          outline: none;
        }
        .input-styled:focus { border-color:#0EA5E9; background:#fff; box-shadow:0 0 0 4px rgba(14,165,233,0.12); }
        .input-styled.has-error { border-color:#F87171; background:#FFF5F5; box-shadow:0 0 0 3px rgba(248,113,113,0.10); }
        .input-styled::placeholder { color:#94A3B8; }

        .modal-backdrop { animation: fadeInUp 0.2s ease both; }
        .modal-card     { animation: modal-in 0.35s cubic-bezier(.22,1,.36,1) both; }
        .spin-ring { animation: spin-ring 8s linear infinite; }
        .spin-loader-el { animation: spin-loader 0.8s linear infinite; }

        .hero-bg { background: linear-gradient(160deg,#03254E 0%,#0D4E8A 40%,#0E7ABF 75%,#29B6F6 100%); }
      `}</style>

      <div className="login-root min-h-screen flex" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* ── LEFT HERO PANEL ── */}
        <div className="hidden lg:flex lg:w-[52%] hero-bg relative overflow-hidden flex-col justify-between p-10">
          <DataCanvas />

          {/* Decorative rings */}
          <div className="spin-ring absolute -bottom-40 -left-40 rounded-full" style={{ width:500, height:500, border:'1px solid rgba(255,255,255,0.05)' }} />
          <div className="spin-ring absolute -bottom-32 -left-32 rounded-full" style={{ width:380, height:380, border:'1px solid rgba(255,255,255,0.08)', animationDirection:'reverse', animationDuration:'12s' }} />

          {/* Logo top */}
          <div className="relative z-10 slide-left flex items-center gap-3">
            <div style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.15)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontWeight:800, fontSize:18, color:'white', letterSpacing:'-0.3px' }}>INTISOFT</span>
          </div>

          {/* Hero copy + illustration + stats */}
          <div className="relative z-10">
            <div className="slide-left" style={{ animationDelay:'0.1s' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'3px', color:'rgba(147,217,255,0.8)', textTransform:'uppercase', marginBottom:12 }}>
                Plataforma empresarial
              </div>
              <h1 style={{ fontSize:'clamp(28px,3vw,42px)', fontWeight:800, color:'white', lineHeight:1.15, letterSpacing:'-0.8px', margin:'0 0 16px' }}>
                GESTIÓN DE SOPORTE<br />Y MANTENIMIENTO
              </h1>
              <p style={{ color:'rgba(186,230,253,0.75)', fontSize:15, lineHeight:1.7, maxWidth:360, fontFamily:"'DM Sans', sans-serif", fontWeight:400, margin:0 }}>
                Accede a operaciones, soporte y análisis en tiempo real desde un solo lugar.
              </p>
            </div>

            <DashboardIllustration />

            <div className="slide-left" style={{ animationDelay:'0.2s', marginTop:28, display:'flex', gap:32 }}>
              {[["500+","Clientes activos"],["99.9%","Disponibilidad"],["24/7","Soporte"]].map(([v,l]) => (
                <div key={l}>
                  <div style={{ fontSize:22, fontWeight:800, color:'white' }}>{v}</div>
                  <div style={{ fontSize:11, color:'rgba(147,217,255,0.7)', fontFamily:"'DM Sans', sans-serif" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="w-full lg:w-[48%] flex items-center justify-center bg-white p-6 relative overflow-hidden">
          {/* Subtle bg blobs */}
          <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,0.06) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%)', pointerEvents:'none' }} />

          <div className="w-full slide-right" style={{ maxWidth:400 }}>

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
              <img src="/logo.png" alt="Logo" style={{ height:40, width:'auto' }} />
            </div>

            {/* Heading */}
            <div style={{ marginBottom:36 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'2.5px', color:'#0EA5E9', textTransform:'uppercase', marginBottom:8 }}>
                Portal de acceso
              </div>
              <h2 style={{ fontSize:28, fontWeight:800, color:'#0C2340', letterSpacing:'-0.5px', margin:'0 0 8px', lineHeight:1.2 }}>
                Bienvenido
              </h2>
              <p style={{ margin:0, color:'#64748B', fontSize:14, fontFamily:"'DM Sans', sans-serif" }}>
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column' }}>

              {/* Email */}
              <div className="form-field" style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#1E3A5F', marginBottom:7 }}>
                  Correo electrónico
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#93C5FD', pointerEvents:'none' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    type="email"
                    {...register("email")}
                    className={`input-styled${errors.email ? ' has-error' : ''}`}
                    placeholder="correo@empresa.com"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
                {errors.email && <p style={{ color:'#EF4444', fontSize:12, margin:'5px 0 0', fontFamily:"'DM Sans', sans-serif" }}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="form-field" style={{ marginBottom:12 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#1E3A5F', marginBottom:7 }}>
                  Contraseña
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#93C5FD', pointerEvents:'none' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    type="password"
                    {...register("password")}
                    className={`input-styled${errors.password ? ' has-error' : ''}`}
                    placeholder="••••••••"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
                {errors.password && <p style={{ color:'#EF4444', fontSize:12, margin:'5px 0 0', fontFamily:"'DM Sans', sans-serif" }}>{errors.password.message}</p>}
              </div>

              {/* Remember / Forgot */}
              <div className="form-field" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" style={{ accentColor:'#0EA5E9', width:15, height:15 }} />
                  <span style={{ fontSize:13, color:'#64748B', fontFamily:"'DM Sans', sans-serif" }}>Mantenerme conectado</span>
                </label>
                <button type="button" style={{ fontSize:13, color:'#0EA5E9', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="form-field" style={{ marginBottom:20, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px' }}>
                  <p style={{ color:'#DC2626', fontSize:13, margin:0, textAlign:'center', fontFamily:"'DM Sans', sans-serif" }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <div className="form-field">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ width:'100%', border:'none', borderRadius:12, padding:'14px 0', color:'white', fontSize:15, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing:'0.3px', fontFamily:"'Plus Jakarta Sans', sans-serif", opacity: loading ? 0.75 : 1 }}
                >
                  {loading ? (
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <svg className="spin-loader-el" width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Ingresando...
                    </span>
                  ) : "Ingresar al sistema"}
                </button>
              </div>
            </form>

            <div style={{ marginTop:28, textAlign:'center', borderTop:'1px solid #E2EEF8', paddingTop:20 }}>
              <p style={{ fontSize:13, color:'#94A3B8', fontFamily:"'DM Sans', sans-serif", margin:0 }}>
                ¿No tienes una cuenta?{" "}
                <button style={{ color:'#0EA5E9', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13 }}>
                  Contactar con soporte
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* ── 2FA MODAL ── */}
        {show2FA && (
          <div className="modal-backdrop" style={{ position:'fixed', inset:0, background:'rgba(3,37,78,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }}>
            <div className="modal-card" style={{ background:'white', borderRadius:20, padding:36, maxWidth:420, width:'100%', boxShadow:'0 32px 80px rgba(3,37,78,0.35)', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>

              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,#E0F2FE,#BAE6FD)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#0369A1" strokeWidth="1.8"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#0369A1" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1.5" fill="#0369A1"/>
                  </svg>
                </div>
                <h3 style={{ fontSize:20, fontWeight:800, color:'#0C2340', margin:'0 0 8px', letterSpacing:'-0.3px' }}>
                  Verificación de seguridad
                </h3>
                <p style={{ fontSize:13, color:'#64748B', margin:0, lineHeight:1.6, fontFamily:"'DM Sans', sans-serif" }}>
                  Enviamos un código de 6 dígitos a<br />
                  <strong style={{ color:'#0369A1' }}>
                    {maskEmail(tempUserData?.user?.correoPrincipal ?? tempUserData?.user?.email ?? tempUserData?.email ?? null)}
                  </strong>
                </p>
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#1E3A5F', letterSpacing:'1px', textTransform:'uppercase', marginBottom:10, textAlign:'center' }}>
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={codigo2FA}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,6); setCodigo2FA(v); }}
                  style={{ width:'100%', textAlign:'center', fontSize:32, fontWeight:800, letterSpacing:14, padding:'16px 8px', background:'#F0F8FF', border:`2px solid ${codigo2FA.length===6?'#0EA5E9':'#BAE6FD'}`, borderRadius:14, color:'#0C2340', outline:'none', fontFamily:'monospace', transition:'border-color 0.2s, box-shadow 0.2s', boxShadow: codigo2FA.length===6?'0 0 0 4px rgba(14,165,233,0.12)':'none' }}
                  placeholder="······"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
                  <p style={{ color:'#DC2626', fontSize:13, margin:0, textAlign:'center', fontFamily:"'DM Sans', sans-serif" }}>{error}</p>
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <button
                  type="button"
                  onClick={() => { setShow2FA(false); setCodigo2FA(""); setTempUserData(null); setError(""); }}
                  style={{ flex:1, padding:'13px 0', borderRadius:12, border:'1.5px solid #BAE6FD', background:'white', color:'#1E3A5F', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:"'Plus Jakarta Sans', sans-serif" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onVerify2FA}
                  disabled={loading || codigo2FA.length !== 6}
                  className="btn-primary"
                  style={{ flex:1, padding:'13px 0', borderRadius:12, border:'none', color:'white', fontWeight:700, fontSize:14, cursor: loading || codigo2FA.length!==6 ? 'not-allowed' : 'pointer', fontFamily:"'Plus Jakarta Sans', sans-serif", opacity: loading || codigo2FA.length!==6 ? 0.6 : 1 }}
                >
                  {loading ? (
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      <svg className="spin-loader-el" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Verificando...
                    </span>
                  ) : "Verificar código"}
                </button>
              </div>

              <div style={{ textAlign:'center' }}>
                <button
                  type="button"
                  onClick={async () => { setError(""); alert("Código reenviado (funcionalidad pendiente en backend)"); }}
                  style={{ fontSize:13, color:'#0EA5E9', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}
                >
                  ¿No recibiste el código? Reenviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;