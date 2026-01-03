import { useState, useEffect } from "react";
import ServicioForm from "../components/ServicioForm";
import Toast from "@/components/ui/Toast";
import type { CatalogServicio, ServicioStats } from "../types/servicio.types";
import * as servicioApi from "../services/servicioApi";

export default function CatalogoServiciosPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [servicios, setServicios] = useState<CatalogServicio[]>([]);
  const [stats, setStats] = useState<ServicioStats>({
    total: 0,
    activos: 0,
    inactivos: 0,
    visiblesEnTickets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroVisible, setFiltroVisible] = useState("todos");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [serviciosData, statsData] = await Promise.all([
        servicioApi.getServicios(),
        servicioApi.getStats(),
      ]);
      setServicios(serviciosData);
      setStats(statsData);
    } catch (error) {
      console.error("Error cargando datos:", error);
      console.warn("⚠️ Backend no disponible. Usando datos de ejemplo.");
      // Datos de ejemplo mientras el backend no está disponible
      setServicios([]);
      setStats({ total: 0, activos: 0, inactivos: 0, visiblesEnTickets: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedServicio) {
        await servicioApi.updateServicio(selectedServicio.id, data);
        setToast({ message: "Servicio actualizado exitosamente", type: "success" });
      } else {
        await servicioApi.createServicio(data);
        setToast({ message: "Servicio creado exitosamente", type: "success" });
      }
      await loadData();
      setShowForm(false);
      setSelectedServicio(null);
    } catch (error) {
      console.error("Error guardando servicio:", error);
      setToast({ message: "Error al guardar el servicio", type: "error" });
    }
  };

  const handleToggleEstado = async (servicio: CatalogServicio) => {
    const confirm = window.confirm(
      `¿Está seguro de ${servicio.activo ? "desactivar" : "activar"} este servicio?`
    );
    if (!confirm) return;

    try {
      await servicioApi.updateServicio(servicio.id!, { activo: !servicio.activo });
      await loadData();
    } catch (error) {
      console.error("Error cambiando estado:", error);
      alert("Error al cambiar el estado del servicio");
    }
  };

  const serviciosFiltrados = servicios.filter((servicio) => {
    if (filtroEstado === "activos" && !servicio.activo) return false;
    if (filtroEstado === "inactivos" && servicio.activo) return false;
    if (filtroVisible === "si" && !servicio.visibleEnTickets) return false;
    if (filtroVisible === "no" && servicio.visibleEnTickets) return false;
    if (busqueda) {
      const search = busqueda.toLowerCase();
      const matchNombre = servicio.nombre.toLowerCase().includes(search);
      const matchCodigo = servicio.codigo.toLowerCase().includes(search);
      if (!matchNombre && !matchCodigo) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Catalogo de Servicios</h1>
          <p className="text-slate-600 mt-1">Gestion de servicios para tickets de soporte</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={() => {
              setSelectedServicio(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            ➕ Nuevo Servicio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <p className="text-blue-100 text-sm font-medium">Servicios Totales</p>
          <p className="text-3xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <p className="text-green-100 text-sm font-medium">Servicios Activos</p>
          <p className="text-3xl font-bold mt-2">{stats.activos}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6 shadow-lg">
          <p className="text-red-100 text-sm font-medium">Servicios Inactivos</p>
          <p className="text-3xl font-bold mt-2">{stats.inactivos}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <p className="text-purple-100 text-sm font-medium">Visibles en Tickets</p>
          <p className="text-3xl font-bold mt-2">{stats.visiblesEnTickets}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Buscar por nombre o codigo</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Visible en tickets</label>
            <select
              value={filtroVisible}
              onChange={(e) => setFiltroVisible(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            >
              <option value="todos">Todos</option>
              <option value="si">Si</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Codigo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Servicio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Descripcion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Tipo de Servicio</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase">Visible en Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Fecha de Creacion</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Cargando servicios...
                  </td>
                </tr>
              ) : serviciosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No hay servicios registrados
                  </td>
                </tr>
              ) : (
                serviciosFiltrados.map((servicio) => (
                  <tr key={servicio.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{servicio.codigo}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{servicio.nombre}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{servicio.descripcion || "-"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs">{servicio.tipoServicio}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        servicio.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {servicio.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {servicio.visibleEnTickets ? (
                        <span className="text-green-600 font-medium">✓ Si</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {servicio.createdAt ? new Date(servicio.createdAt).toLocaleDateString("es-ES") : "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedServicio(servicio);
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleEstado(servicio)}
                          className={`transition-colors ${
                            servicio.activo ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"
                          }`}
                          title={servicio.activo ? "Desactivar" : "Activar"}
                        >
                          {servicio.activo ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ServicioForm
          servicio={selectedServicio}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setSelectedServicio(null);
          }}
        />
      )}
    </div>
  );
}
