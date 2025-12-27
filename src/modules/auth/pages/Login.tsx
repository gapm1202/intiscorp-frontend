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
      // Usar el servicio de login con axios
      const responseData = await loginUser(data.email, data.password);

      // ¡ÉXITO!
      // 'responseData' debería ser algo como { user: {...}, token: "..." }
      
      // 6. Guardamos el usuario y token en el contexto
      login({ user: responseData.user, token: responseData.token });

      // 7. Normalizar rol y redirigir
      const rawUser = responseData.user || {};
      // El backend puede devolver `rol`, `role` o `roles` (array). Normalizamos sin usar `any`.
      const u = rawUser as Record<string, unknown>;
      const roleCandidate = u['rol'] ?? u['role'] ?? (Array.isArray(u['roles']) ? (u['roles'] as unknown[])[0] : undefined) ?? '';
      const normalizedRole = String(roleCandidate).toLowerCase();

      if (normalizedRole.includes("admin")) navigate("/admin");
      else if (normalizedRole.includes("tec")) navigate("/tecnico");
      else navigate("/cliente");

    } catch (err: unknown) {
      console.error("Error de login:", err);
      const e = err as { message?: string };
      setError(e.message || "Error de conexión con el servidor");
    } finally {
      // Esto se ejecuta siempre, al final del 'try' o 'catch'
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
    </div>
  );
};

export default Login;