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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Iniciar Sesión
        </h1>

        {/* 'handleSubmit' de react-hook-form llamará a NUESTRA función 'onSubmit' */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              {...register("email")}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="ejemplo@correo.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              {...register("password")}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Mostrar error de login (ej. 'Credenciales inválidas') */}
          {error && (
            <p className="text-center text-red-500 text-sm mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>

      {/* Modal de Verificación 2FA */}
      {show2FA && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verificación de Seguridad</h2>
              <p className="text-gray-600 text-sm">
                Hemos enviado un código de 6 dígitos a tu correo principal.
                <br />
                <span className="font-semibold text-blue-600">{tempUserData?.user?.correoPrincipal || 'tu correo'}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Ingresa el código de verificación
                </label>
                <input
                  type="text"
                  value={codigo2FA}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCodigo2FA(value);
                  }}
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-center text-red-600 text-sm font-medium">{error}</p>
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onVerify2FA}
                  disabled={loading || codigo2FA.length !== 6}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verificando..." : "Verificar"}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={async () => {
                    setError("");
                    // TODO: Implementar reenvío de código
                    alert("Código reenviado (funcionalidad pendiente en backend)");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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