import { useState, type ReactNode } from "react";
import { AuthContext, type AuthContextType, type User } from "./authHelpers";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Inicializar desde localStorage
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return null;
      try {
      const parsed = JSON.parse(savedUser) as Record<string, unknown>;
      // Normalizar si el backend guardó 'role' en vez de 'rol'
      if (parsed && !parsed['rol'] && (parsed['role'] || (parsed['roles'] && (parsed['roles'] as unknown[])[0]))) {
        parsed['rol'] = parsed['role'] ?? (parsed['roles'] && (parsed['roles'] as unknown[])[0]) ?? "";
      }
      return parsed as unknown as User;
    } catch {
      return null;
    }
  });
  
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token") || null;
  });

  const login = (data: { user: unknown; token: string }) => {
    const raw = (data.user ?? {}) as Record<string, unknown>;
    const normalized: User = {
      id: Number(raw['id'] ?? raw['_id'] ?? 0),
      nombre: String(raw['nombre'] ?? raw['name'] ?? raw['nombre_completo'] ?? ""),
      email: String(raw['email'] ?? raw['correo'] ?? ""),
      rol: String(raw['rol'] ?? raw['role'] ?? (Array.isArray(raw['roles']) ? (raw['roles'] as unknown[])[0] : "") ?? ""),
    };

    setUser(normalized);
    setToken(data.token);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(normalized));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
    window.location.href = "/login";
  };

  const contextValue: AuthContextType = { user, token, login, logout };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// NOTE: `useAuth` is exported from `authHelpers.ts`. Import it from there to avoid fast-refresh issues.
