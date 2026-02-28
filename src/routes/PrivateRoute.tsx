import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/context/authHelpers";

const PrivateRoute = () => {
  try {
    const { token, user } = useAuth();
    const isAuthenticated = Boolean(token || user);
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
  } catch {
    const token = localStorage.getItem("token");
    const isAuthenticated = Boolean(token);
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
  }
};

export default PrivateRoute;
