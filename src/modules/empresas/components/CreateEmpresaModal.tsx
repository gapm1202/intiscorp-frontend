import { useState, useEffect } from "react";
import { createEmpresa, updateEmpresa } from "../services/empresasService";
import ConfirmModal from "./ConfirmModal";

interface CreateEmpresaModalProps {
  isOpen: boolean;
  // when provided, modal works in edit mode
  empresaId?: string | number;
  initialData?: Partial<{
    nombre: string;
    ruc: string;
    direccionFiscal: string;
    direccionOperativa: string;
    ciudad: string;
    provincia: string;
    sector: string;
    paginaWeb: string;
    estadoContrato: string;
    adminNombre: string;
    adminCargo: string;
    adminTelefono: string;
    adminEmail: string;
    observaciones: string;
    tecNombre: string;
    tecCargo: string;
    tecTelefono1: string;
    tecTelefono2: string;
    tecEmail: string;
    nivelAutorizacion: string;
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateEmpresaModal = ({ isOpen, empresaId, initialData, onClose, onSuccess }: CreateEmpresaModalProps) => {
  const [formData, setFormData] = useState({
    // Información general
    nombre: "",
    ruc: "",
    direccionFiscal: "",
    direccionOperativa: "",
    ciudad: "",
    provincia: "",
    sector: "",
    paginaWeb: "",
    estadoContrato: "activo",
    
    // Contactos administrativos
    adminNombre: "",
    adminCargo: "",
    adminTelefono: "",
    adminEmail: "",
    observaciones: "",
    
    // Contactos técnicos
    tecNombre: "",
    tecCargo: "",
    tecTelefono1: "",
    tecTelefono2: "",
    tecEmail: "",
    nivelAutorizacion: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEmpresaData, setPendingEmpresaData] = useState<typeof formData | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const empresaData = {
      nombre: formData.nombre,
      ruc: formData.ruc,
      direccionFiscal: formData.direccionFiscal,
      direccionOperativa: formData.direccionOperativa,
      ciudad: formData.ciudad,
      provincia: formData.provincia,
      sector: formData.sector,
      paginaWeb: formData.paginaWeb,
      estadoContrato: formData.estadoContrato,
      adminNombre: formData.adminNombre,
      adminCargo: formData.adminCargo,
      adminTelefono: formData.adminTelefono,
      adminEmail: formData.adminEmail,
      observaciones: formData.observaciones,
      tecNombre: formData.tecNombre,
      tecCargo: formData.tecCargo,
      tecTelefono1: formData.tecTelefono1,
      tecTelefono2: formData.tecTelefono2,
      tecEmail: formData.tecEmail,
      nivelAutorizacion: formData.nivelAutorizacion,
    };

    console.log("📤 Datos siendo enviados al backend:", empresaData);

    try {
      if (empresaId) {
        // require motivo for edits
        setPendingEmpresaData(empresaData);
        setConfirmOpen(true);
        setLoading(false);
        return;
      } else {
        const response = await createEmpresa(empresaData);
        console.log("✅ Respuesta del servidor:", response);
      }
      
      setFormData({
        nombre: "",
        ruc: "",
        direccionFiscal: "",
        direccionOperativa: "",
        ciudad: "",
        provincia: "",
        sector: "",
        paginaWeb: "",
        estadoContrato: "activo",
        adminNombre: "",
        adminCargo: "",
        adminTelefono: "",
        adminEmail: "",
        observaciones: "",
        tecNombre: "",
        tecCargo: "",
        tecTelefono1: "",
        tecTelefono2: "",
        tecEmail: "",
        nivelAutorizacion: "",
      });
      onSuccess();
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al crear empresa";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpdate = async (motivo: string) => {
    if (!empresaId || !pendingEmpresaData) return;
    setConfirmOpen(false);
    setLoading(true);
    setError(null);
    try {
      const resp = await updateEmpresa(empresaId, pendingEmpresaData, motivo);
      console.log("✅ Empresa actualizada con motivo:", resp);
      setPendingEmpresaData(null);
      onSuccess();
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar empresa";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        nombre: initialData.nombre ?? "",
        ruc: initialData.ruc ?? "",
        direccionFiscal: initialData.direccionFiscal ?? "",
        direccionOperativa: initialData.direccionOperativa ?? "",
        ciudad: initialData.ciudad ?? "",
        provincia: initialData.provincia ?? "",
        sector: initialData.sector ?? "",
        paginaWeb: initialData.paginaWeb ?? "",
        estadoContrato: initialData.estadoContrato ?? "activo",
        adminNombre: initialData.adminNombre ?? "",
        adminCargo: initialData.adminCargo ?? "",
        adminTelefono: initialData.adminTelefono ?? "",
        adminEmail: initialData.adminEmail ?? "",
        observaciones: initialData.observaciones ?? "",
        tecNombre: initialData.tecNombre ?? "",
        tecCargo: initialData.tecCargo ?? "",
        tecTelefono1: initialData.tecTelefono1 ?? "",
        tecTelefono2: initialData.tecTelefono2 ?? "",
        tecEmail: initialData.tecEmail ?? "",
        nivelAutorizacion: initialData.nivelAutorizacion ?? "",
      }));
    }
    if (!isOpen) {
      setFormData({
        nombre: "",
        ruc: "",
        direccionFiscal: "",
        direccionOperativa: "",
        ciudad: "",
        provincia: "",
        sector: "",
        paginaWeb: "",
        estadoContrato: "activo",
        adminNombre: "",
        adminCargo: "",
        adminTelefono: "",
        adminEmail: "",
        observaciones: "",
        tecNombre: "",
        tecCargo: "",
        tecTelefono1: "",
        tecTelefono2: "",
        tecEmail: "",
        nivelAutorizacion: "",
      });
    }
  }, [initialData, empresaId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <h2 className="text-xl font-semibold">Crear Nueva Empresa</h2>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sección: Información General de la Empresa */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Información general de la empresa
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Datos esenciales para identificar al cliente.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la empresa *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: TechCorp S.A."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUC *
                  </label>
                  <input
                    type="text"
                    name="ruc"
                    value={formData.ruc}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 20123456789"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección fiscal
                  </label>
                  <input
                    type="text"
                    name="direccionFiscal"
                    value={formData.direccionFiscal}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Calle, número, piso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección operativa
                  </label>
                  <input
                    type="text"
                    name="direccionOperativa"
                    value={formData.direccionOperativa}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Calle, número, piso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad / Provincia *
                  </label>
                  <input
                    type="text"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Lima"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Lima"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sector empresarial (opcional - ITIL: Gestión del Catálogo)
                  </label>
                  <input
                    type="text"
                    name="sector"
                    value={formData.sector}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Tecnología, Finanzas, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Página web (opcional)
                  </label>
                  <input
                    type="url"
                    name="paginaWeb"
                    value={formData.paginaWeb}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: https://www.empresa.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado del contrato *
                  </label>
                  <select
                    name="estadoContrato"
                    value={formData.estadoContrato}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="no_renovado">No renovado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección: Contactos Administrativos */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Contactos administrativos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Para temas comerciales y facturación
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="adminNombre"
                    value={formData.adminNombre}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="adminCargo"
                    value={formData.adminCargo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Gerente de Finanzas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="adminTelefono"
                    value={formData.adminTelefono}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 01-2345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observaciones adicionales"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Contactos Técnicos */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Contactos técnicos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Usuarios clave para soporte
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="tecNombre"
                    value={formData.tecNombre}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="tecCargo"
                    value={formData.tecCargo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Jefe de IT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono 1
                  </label>
                  <input
                    type="tel"
                    name="tecTelefono1"
                    value={formData.tecTelefono1}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 01-2345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono 2
                  </label>
                  <input
                    type="tel"
                    name="tecTelefono2"
                    value={formData.tecTelefono2}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 9-87654321"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="tecEmail"
                    value={formData.tecEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="soporte@empresa.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nivel de autorización
                  </label>
                  <input
                    type="text"
                    name="nivelAutorizacion"
                    value={formData.nivelAutorizacion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Puede aprobar cambios, solicitar credenciales"
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Guardando..." : "Crear Empresa"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmOpen}
        title="Confirmar edición de empresa"
        message="Por favor, indica el motivo para editar esta empresa."
        confirmLabel="Editar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmUpdate}
      />
    </div>
  );
};

export default CreateEmpresaModal;
