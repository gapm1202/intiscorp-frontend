import { createContext, useContext } from "react";

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: { user: unknown; token: string }) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};
