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
import PublicReportPage from "../modules/public/pages/PublicReportPage";
import PublicTicketStatusPage from "../modules/public/pages/PublicTicketStatusPage";
import CatalogoCategoriasPage from "../modules/catalogo/pages/CatalogoCategoriasPage";
import TicketsPage from "../modules/tickets/pages/TicketsPage";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<PrivateRoute />}>
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
          path="/admin/tickets"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <TicketsPage />
              </AdminLayout>
            </RoleRoute>
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
        {/* Public report page (no auth) - accessed from QR */}
        <Route path="/public/report" element={<PublicReportPage />} />
        <Route path="/public/activos" element={<PublicReportPage />} />
        <Route path="/public/ticket/:ticketId" element={<PublicTicketStatusPage />} />
      </Route>


    </Routes>
  );
};

export default AppRouter;
