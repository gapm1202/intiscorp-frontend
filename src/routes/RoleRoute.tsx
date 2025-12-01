import type { ReactNode } from "react";
import { useAuth } from "@/context/authHelpers";

interface RoleRouteProps {
  role: string;
  children: ReactNode;
}

const RoleRoute = ({ role, children }: RoleRouteProps) => {
  const { user } = useAuth();

  if (!user) return null;

  const userRole = (user.rol || "").toLowerCase();
  const expected = (role || "").toLowerCase();

  // Normalizar y permitir coincidencias parciales (ej. 'admin' <-> 'administrador')
  const matches =
    userRole === expected || userRole.includes(expected) || expected.includes(userRole);

  if (!matches) return null;
  return <>{children}</>;
};

export default RoleRoute;
