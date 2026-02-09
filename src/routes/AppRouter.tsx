import { Routes, Route } from "react-router-dom";
import Dashboard from "../modules/dashboard/pages/Dashboard";
import PrivateRoute from "./PrivateRoute";
import RoleRoute from "./RoleRoute";
import AdminLayout from "../layouts/AdminLayout";
import ClientLayout from "../layouts/ClientLayout";
import TechnicianLayout from "../layouts/TechnicianLayout";
import Login from "../modules/auth/pages/Login";
import EmpresasList from "../modules/empresas/pages/EmpresasList";
import EmpresaDetailPage from "../modules/empresas/pages/EmpresaDetailPage";
import HistorialEmpresaPage from "../modules/empresas/pages/HistorialEmpresaPage";
import InventarioPage from "../modules/inventario/pages/InventarioPage";
import EtiquetasPage from "../modules/inventario/pages/EtiquetasPage";
import LoginEmpresaPage from "../modules/public/pages/LoginEmpresaPage";
import ReporteIncidenciaPage from "../modules/public/pages/ReporteIncidenciaPage";
import CatalogoCategoriasPage from "../modules/catalogo/pages/CatalogoCategoriasPage";
import CatalogoServiciosPage from "../modules/catalogo/pages/CatalogoServiciosPage";
import CatalogoCorreosPage from "../modules/catalogo/pages/CatalogoCorreosPage";
import TicketsPage from "../modules/tickets/pages/TicketsPage";
import TicketDetailPage from "../modules/tickets/pages/TicketDetailPage";
import SeguimientoTicketPage from "../modules/tickets/pages/SeguimientoTicketPage";
import UsuariosEmpresaPage from "../modules/usuarios/pages/UsuariosEmpresaPage";
import UsuarioDetailPage from "../modules/usuarios/pages/UsuarioDetailPage";
import { UsuariosInternosPage } from "../modules/usuarios/pages/UsuariosInternosPage";
import UsuariosInternosFormPage from "../modules/usuarios/pages/UsuariosInternosFormPage";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Rutas públicas del portal de soporte */}
      <Route path="/portal-soporte/login" element={<LoginEmpresaPage />} />
      <Route path="/portal-soporte/reportar-incidencia" element={<ReporteIncidenciaPage />} />

      <Route element={<PrivateRoute />}>
        {/* Ruta principal del dashboard */}
        <Route
          path="/dashboard"
          element={
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          }
        />
        
        <Route
          path="/admin/*"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/empresas"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <EmpresasList />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/empresas/:empresaId"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <EmpresaDetailPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/empresas/:empresaId/historial"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <HistorialEmpresaPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/empresas/:empresaId/inventario"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <InventarioPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/empresas/:empresaId/sedes/:sedeId/inventario"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <InventarioPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/empresas/:empresaId/etiquetas"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <EtiquetasPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/empresas/:empresaId/sedes/:sedeId/etiquetas"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <EtiquetasPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/catalogo-categorias"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <CatalogoCategoriasPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/catalogo-servicios"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <CatalogoServiciosPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/catalogo-correos"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <CatalogoCorreosPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <TicketsPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/tickets/:id"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <TicketDetailPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/usuarios/empresa/:empresaId"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <UsuariosEmpresaPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/usuarios/empresa/:empresaId/:usuarioId"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <UsuarioDetailPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        {/* Rutas Usuarios Internos */}
        <Route
          path="/admin/usuarios/internos"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <UsuariosInternosPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/usuarios/internos/nuevo"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <UsuariosInternosFormPage />
              </AdminLayout>
            </RoleRoute>
          }
        />
        {/* Rutas para usuarios desde empresas */}
        <Route
          path="/empresas/:empresaId/usuarios"
          element={
            <AdminLayout>
              <UsuariosEmpresaPage />
            </AdminLayout>
          }
        />
        <Route
          path="/empresas/:empresaId/usuarios/:usuarioId"
          element={
            <AdminLayout>
              <UsuarioDetailPage />
            </AdminLayout>
          }
        />
        {/* Ruta accesible en /empresas (protegida) - usar AdminLayout para mantener sidebar */}
        <Route
          path="/empresas"
          element={
            <AdminLayout>
              <EmpresasList />
            </AdminLayout>
          }
        />

        <Route
          path="/cliente/*"
          element={
            <RoleRoute role="cliente">
              <ClientLayout>
                <Dashboard />
              </ClientLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/tecnico/*"
          element={
            <RoleRoute role="tecnico">
              <TechnicianLayout>
                <Dashboard />
              </TechnicianLayout>
            </RoleRoute>
          }
        />
      </Route>

      {/* Ruta pública para seguimiento por código (link en correo) */}
      <Route path="/seguimiento/:codigo" element={<SeguimientoTicketPage />} />


    </Routes>
  );
};

export default AppRouter;
