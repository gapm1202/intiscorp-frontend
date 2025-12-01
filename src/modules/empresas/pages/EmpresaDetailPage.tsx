import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEmpresaById } from "@/modules/empresas/services/empresasService";
import { getSedesByEmpresa, deleteSede } from "@/modules/empresas/services/sedesService";
import CreateSedeModal from "@/modules/empresas/components/CreateSedeModal";
import CreateEmpresaModal from "@/modules/empresas/components/CreateEmpresaModal";
import DeleteSedeModal from "./../components/DeleteSedeModal";

interface Sede {
  id?: number;
  _id?: string;
  nombre?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  tipo?: string;
  responsable?: string;
  cargoResponsable?: string;
  telefonoResponsable?: string;
  emailResponsable?: string;
  [key: string]: unknown;
}

interface Empresa {
  id?: number;
  _id?: string;
  nombre?: string;
  ruc?: string;
  direccionFiscal?: string;
  direccionOperativa?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  paginaWeb?: string;
  estadoContrato?: string;
  adminNombre?: string;
  adminCargo?: string;
  adminTelefono?: string;
  adminEmail?: string;
  observaciones?: string;
  tecNombre?: string;
  tecCargo?: string;
  tecTelefono1?: string;
  tecTelefono2?: string;
  tecEmail?: string;
  nivelAutorizacion?: string;
  [key: string]: unknown;
}

const EmpresaDetailPage = () => {
  const { empresaId } = useParams<{ empresaId: string }>();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSedeModal, setShowCreateSedeModal] = useState(false);
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [showEditEmpresaModal, setShowEditEmpresaModal] = useState(false);
  const [sedeToDelete, setSedeToDelete] = useState<Sede | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    if (!empresaId) return;

    const fetchEmpresa = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEmpresaById(empresaId);
        setEmpresa(data);
        
        // Cargar sedes
        const sedesData = await getSedesByEmpresa(empresaId);
        setSedes(Array.isArray(sedesData) ? sedesData : sedesData.data || []);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error al cargar empresa";
        console.error(err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [empresaId]);

  const handleDeleteSede = async (motivo: string) => {
    const sedeId = sedeToDelete?._id ?? sedeToDelete?.id;
    if (!empresaId || !sedeId) return;

    setIsDeleting(true);
    setError(null);

    try {
      console.log(`Eliminando sede con motivo: ${motivo}`); // Aquí puedes usar el motivo
      await deleteSede(empresaId, sedeId, motivo);
      setSedes(prev => prev.filter(s => (s._id ?? s.id) !== sedeId));
      
      if (selectedSede && (selectedSede._id ?? selectedSede.id) === sedeId) {
        setSelectedSede(null);
      }
      setSedeToDelete(null); // Cierra el modal
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al eliminar la sede";
      console.error("Error al eliminar sede:", err);
      setError(errorMsg); // Muestra el error en la UI
      // Opcional: podrías cerrar el modal de confirmación aquí o dejarlo abierto para que el usuario reintente.
      // setSedeToDelete(null); 
    } finally {
      setIsDeleting(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center text-gray-600">
          Cargando información de la empresa...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/admin/empresas")}
            className="text-blue-600 hover:text-blue-800 font-medium mb-4"
          >
            ← Volver
          </button>
          <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center text-gray-600">
          No se encontró la empresa
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p><strong>Error:</strong> {error}</p>
          <button onClick={() => setError(null)} className="text-sm font-bold ml-4">Cerrar</button>
        </div>
      )}


      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6 flex items-start justify-between">
          <button
            onClick={() => navigate("/admin/empresas")}
            className="text-blue-600 hover:text-blue-800 font-medium mb-4"
          >
            ← Volver a Empresas
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{empresa.nombre}</h1>
            <p className="text-gray-600 mt-1">
              {empresa.estadoContrato && `Estado: ${String(empresa.estadoContrato).charAt(0).toUpperCase() + String(empresa.estadoContrato).slice(1)}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/admin/empresas/${empresaId}/historial`)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded text-sm"
            >
              📋 Historial
            </button>
            <button
              onClick={() => setShowEditEmpresaModal(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-3 rounded text-sm"
            >
              ✏️ Editar Empresa
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Sección: Información General de la Empresa */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Información general de la empresa</h2>
            <p className="text-sm text-gray-600 mb-4">Datos esenciales para identificar al cliente</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 font-medium">Nombre de la empresa</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.nombre || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">RUC</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.ruc || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Dirección fiscal</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.direccionFiscal || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Dirección operativa</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.direccionOperativa || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Ciudad / Provincia</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.ciudad || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Provincia</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.provincia || "-"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 font-medium">Sector empresarial (ITIL: Gestión del Catálogo)</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.sector || "-"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 font-medium">Página web</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.paginaWeb ? (
                    <a href={String(empresa.paginaWeb)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {String(empresa.paginaWeb)}
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 font-medium">Estado del contrato</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    empresa.estadoContrato === "activo" ? "bg-green-100 text-green-800" :
                    empresa.estadoContrato === "suspendido" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {empresa.estadoContrato || "-"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Contactos Administrativos */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Contactos administrativos</h2>
            <p className="text-sm text-gray-600 mb-4">Para temas comerciales y facturación</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 font-medium">Nombre completo</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.adminNombre || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Cargo</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.adminCargo || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Teléfono</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.adminTelefono || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Email</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.adminEmail ? (
                    <a href={`mailto:${String(empresa.adminEmail)}`} className="text-blue-600 hover:underline">
                      {String(empresa.adminEmail)}
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 font-medium">Observaciones</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.observaciones || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Contactos Técnicos */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Contactos técnicos</h2>
            <p className="text-sm text-gray-600 mb-4">Usuarios clave para soporte</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 font-medium">Nombre completo</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.tecNombre || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Cargo</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.tecCargo || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Teléfono 1</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.tecTelefono1 || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Teléfono 2</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.tecTelefono2 || "-"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 font-medium">Email</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.tecEmail ? (
                    <a href={`mailto:${String(empresa.tecEmail)}`} className="text-blue-600 hover:underline">
                      {String(empresa.tecEmail)}
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 font-medium">Nivel de autorización</p>
                <p className="text-lg text-gray-800 font-semibold mt-1">
                  {empresa.nivelAutorizacion || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Sedes */}
          <div className="p-6 border-t">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Sedes</h2>
              <button
                onClick={() => setShowCreateSedeModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                + Agregar Sede
              </button>
            </div>

            {sedes.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No hay sedes registradas</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sedes.map((sede, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {String(sede.nombre) || "Sin nombre"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {sede.tipo ? `Tipo: ${String(sede.tipo).charAt(0).toUpperCase() + String(sede.tipo).slice(1)}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedSede(sede);
                            setShowCreateSedeModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setSedeToDelete(sede)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => navigate(`/admin/empresas/${empresaId}/sedes/${sede._id ?? sede.id}/inventario`)}
                          className="text-green-600 hover:text-green-800 font-medium text-sm"
                        >
                          Ver Inventario
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {sede.direccion && (
                        <p>
                          <span className="font-medium text-gray-700">Dirección:</span>{" "}
                          <span className="text-gray-800">{String(sede.direccion)}</span>
                        </p>
                      )}
                      {sede.ciudad && (
                        <p>
                          <span className="font-medium text-gray-700">Ciudad:</span>{" "}
                          <span className="text-gray-800">{String(sede.ciudad)}</span>
                        </p>
                      )}
                      {sede.provincia && (
                        <p>
                          <span className="font-medium text-gray-700">Provincia:</span>{" "}
                          <span className="text-gray-800">{String(sede.provincia)}</span>
                        </p>
                      )}
                      {sede.telefono && (
                        <p>
                          <span className="font-medium text-gray-700">Teléfono:</span>{" "}
                          <span className="text-gray-800">{String(sede.telefono)}</span>
                        </p>
                      )}
                      {sede.email && (
                        <p>
                          <span className="font-medium text-gray-700">Email:</span>{" "}
                          <a href={`mailto:${String(sede.email)}`} className="text-blue-600 hover:underline">
                            {String(sede.email)}
                          </a>
                        </p>
                      )}
                      {sede.responsable && (
                        <p>
                          <span className="font-medium text-gray-700">Responsable:</span>{" "}
                          <span className="text-gray-800">{String(sede.responsable)}</span>
                        </p>
                      )}
                      {sede.cargoResponsable && (
                        <p>
                          <span className="font-medium text-gray-700">Cargo:</span>{" "}
                          <span className="text-gray-800">{String(sede.cargoResponsable)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(`/admin/empresas/${empresaId}/inventario`)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            📦 Ver Inventario
          </button>
          <button
            onClick={() => navigate("/admin/empresas")}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Volver
          </button>
        </div>

        {/* Modal para crear sede */}
        <CreateSedeModal
          isOpen={showCreateSedeModal}
          empresaId={empresaId || ""}
          sedeId={selectedSede?._id ?? selectedSede?.id}
          initialData={selectedSede ?? undefined}
          onClose={() => {
            setShowCreateSedeModal(false);
            setSelectedSede(null);
          }}
          onSuccess={() => {
            if (empresaId) {
              getSedesByEmpresa(empresaId)
                .then((sedesData) => {
                  setSedes(Array.isArray(sedesData) ? sedesData : sedesData.data || []);
                })
                .catch(err => console.error("Error al cargar sedes:", err));
            }
            setSelectedSede(null);
            setShowCreateSedeModal(false);
          }}
        />

        {/* Modal para editar/crear empresa */}
        <CreateEmpresaModal
          isOpen={showEditEmpresaModal}
          empresaId={empresaId}
          initialData={empresa ?? undefined}
          onClose={() => setShowEditEmpresaModal(false)}
          onSuccess={async () => {
            if (empresaId) {
              try {
                const updated = await getEmpresaById(empresaId);
                setEmpresa(updated);
              } catch (err) {
                console.error("Error al recargar empresa:", err);
              }
            }
            setShowEditEmpresaModal(false);
          }}
        />

        {/* Modal para confirmar eliminación de sede */}
        <DeleteSedeModal
          isOpen={!!sedeToDelete} 
          sedeName={sedeToDelete?.nombre || ""}
          onClose={() => setSedeToDelete(null)}
          onConfirm={handleDeleteSede}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default EmpresaDetailPage;
