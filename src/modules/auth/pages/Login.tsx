import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useAuth } from "@/context/authHelpers"; // <-- 1. Importar el hook de autenticación
import { useNavigate } from "react-router-dom"; // <-- 2. Importar el hook de navegación
import { loginUser } from "@/modules/auth/services/authService"; // <-- 3. Importar servicio de login

// El schema de Zod (validación) con trimming de espacios
const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [codigo2FA, setCodigo2FA] = useState("");
  const [tempUserData, setTempUserData] = useState<any>(null);

  const { login } = useAuth(); // <-- 3. Obtener la función 'login' del contexto
  const navigate = useNavigate(); // <-- 4. Obtener la función 'navigate' para redirigir

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // 👇 5. ESTA ES LA FUNCIÓN FUSIONADA
  // 'data' vendrá validada por react-hook-form y zod
  const onSubmit = async (data: FormData) => {
    setError("");
    setLoading(true);

    try {
      // Validar credenciales y solicitar envío de código 2FA
      const responseData = await loginUser(data.email, data.password);
      
      // Guardar datos temporalmente y mostrar modal 2FA
      setTempUserData(responseData);
      setShow2FA(true);
      setError("");
    } catch (err: unknown) {
      console.error("Error de login:", err);
      const e = err as { message?: string };
      setError(e.message || "Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar código 2FA
  const onVerify2FA = async () => {
    if (codigo2FA.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // TODO: Llamar endpoint de verificación 2FA
      // const result = await verify2FACode(tempUserData.user.id, codigo2FA);
      
      // Por ahora, simulamos éxito (el backend debe implementar la verificación)
      // TEMPORAL: Aceptar cualquier código de 6 dígitos
      
      // Guardamos el usuario y token en el contexto
      login({ user: tempUserData.user, token: tempUserData.token });

      // Normalizar rol y redirigir
      const rawUser = tempUserData.user || {};
      const u = rawUser as Record<string, unknown>;
      const roleCandidate = u['rol'] ?? u['role'] ?? (Array.isArray(u['roles']) ? (u['roles'] as unknown[])[0] : undefined) ?? '';
      const normalizedRole = String(roleCandidate).toLowerCase();

      if (normalizedRole.includes("admin")) navigate("/admin");
      else if (normalizedRole.includes("tec")) navigate("/tecnico");
      else navigate("/cliente");
    } catch (err: unknown) {
      console.error("Error verificando código:", err);
      const e = err as { message?: string };
      setError(e.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  // El JSX (HTML) no necesita ningún cambio, ya está conectado con react-hook-form
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
        <div className="mb-8">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-30 w-auto filter drop-shadow-2xl"
          />
        </div>

          <h1 className="text-4xl font-bold mb-4 text-center" style={{ 
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
            color: '#FFFFFF',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            ¡Bienvenido a Intisoft!
          </h1>
          
          <p className="text-lg text-gray-300 text-center max-w-md" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
            Hacemos más eficientes los procesos de nuestros clientes
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-1">500+</div>
              <div className="text-sm text-gray-400">Clientes</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">24/7</div>
              <div className="text-sm text-gray-400">Soporte</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">99.9%</div>
              <div className="text-sm text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-16 w-auto mx-auto mb-4"
            />
          </div>

          {/* Encabezado */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
              CONÉCTESE A SU CUENTA
            </h2>
            <p className="text-gray-500 text-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
              Ingrese sus credenciales para continuar
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
                Ingrese su email
              </label>
              <input
                type="email"
                {...register("email")}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 text-gray-900 ${
                  errors.email 
                    ? "border-red-500 focus:border-red-600 bg-red-50" 
                    : "border-gray-300 focus:border-red-600 bg-gray-50 focus:bg-white"
                }`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
                placeholder="correo@ejemplo.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-2 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <input
                type="password"
                {...register("password")}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 text-gray-900 ${
                  errors.password 
                    ? "border-red-500 focus:border-red-600 bg-red-50" 
                    : "border-gray-300 focus:border-red-600 bg-gray-50 focus:bg-white"
                }`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
                placeholder="********"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-2 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="ml-2 text-sm text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
                  Mantenme conectado
                </span>
              </label>
              <button 
                type="button"
                className="text-sm text-blue-600 hover:text-red-700 font-semibold"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
              >
                Olvidé mi contraseña
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                <p className="text-center text-red-600 text-sm font-medium">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl uppercase tracking-wide"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
              ¿No tienes una cuenta?{" "}
              <button className="text-blue-600 hover:text-blue-700 font-semibold">
                Contactar con soporte
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Verificación 2FA */}
      {show2FA && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
                Verificación de Seguridad
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
                Hemos enviado un código de 6 dígitos a
                <br />
                <span className="font-bold text-red-600 mt-1 inline-block">
                  {tempUserData?.user?.correoPrincipal || 'tu correo'}
                </span>
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
                  Ingresa el código de verificación
                </label>
                <input
                  type="text"
                  value={codigo2FA}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCodigo2FA(value);
                  }}
                  className="w-full px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-600 bg-gray-50 focus:bg-white transition-all duration-200"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-center text-red-600 text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false);
                    setCodigo2FA("");
                    setTempUserData(null);
                    setError("");
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all duration-200"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onVerify2FA}
                  disabled={loading || codigo2FA.length !== 6}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    "Verificar"
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setError("");
                    alert("Código reenviado (funcionalidad pendiente en backend)");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
                >
                  ¿No recibiste el código? Reenviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;