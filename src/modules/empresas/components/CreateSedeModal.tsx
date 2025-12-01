import { useState, useEffect } from "react";
import { createSede, updateSede } from "../services/sedesService";
import ConfirmModal from "./ConfirmModal";

interface CreateSedeModalProps {
  isOpen: boolean;
  empresaId: string | number;
  // when provided, modal will work in edit mode
  sedeId?: string | number;
  initialData?: Partial<{
    nombre: string;
    direccion: string;
    ciudad: string;
    provincia: string;
    telefono: string;
    email: string;
    tipo: string;
    responsable: string;
    cargoResponsable: string;
    telefonoResponsable: string;
    emailResponsable: string;
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateSedeModal = ({ isOpen, empresaId, sedeId, initialData, onClose, onSuccess }: CreateSedeModalProps) => {
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    telefono: "",
    email: "",
    tipo: "principal",
    responsable: "",
    cargoResponsable: "",
    telefonoResponsable: "",
    emailResponsable: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSedeData, setPendingSedeData] = useState<typeof formData | null>(null);

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

    const sedeData = {
      nombre: formData.nombre,
      direccion: formData.direccion,
      ciudad: formData.ciudad,
      provincia: formData.provincia,
      telefono: formData.telefono,
      email: formData.email,
      tipo: formData.tipo,
      responsable: formData.responsable,
      cargoResponsable: formData.cargoResponsable,
      telefonoResponsable: formData.telefonoResponsable,
      emailResponsable: formData.emailResponsable,
    };

    console.log("📤 Datos de sede siendo enviados:", sedeData);

    try {
      if (sedeId) {
        // editar: open confirm modal to require motivo
        setPendingSedeData(sedeData);
        setConfirmOpen(true);
        setLoading(false);
        return;
      } else {
        const created = await createSede(empresaId, sedeData);
        console.log("✅ Sede creada exitosamente:", created);
      }
      
      setFormData({
        nombre: "",
        direccion: "",
        ciudad: "",
        provincia: "",
        telefono: "",
        email: "",
        tipo: "principal",
        responsable: "",
        cargoResponsable: "",
        telefonoResponsable: "",
        emailResponsable: "",
      });
      onSuccess();
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al crear sede";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpdate = async (motivo: string) => {
    if (!sedeId || !pendingSedeData) return;
    setConfirmOpen(false);
    setLoading(true);
    setError(null);
    try {
      const updated = await updateSede(empresaId, sedeId, pendingSedeData, motivo);
      console.log("✅ Sede actualizada con motivo:", updated);
      setPendingSedeData(null);
      onSuccess();
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar sede";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // populate form when initialData or sedeId changes (edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        nombre: initialData.nombre ?? "",
        direccion: initialData.direccion ?? "",
        ciudad: initialData.ciudad ?? "",
        provincia: initialData.provincia ?? "",
        telefono: initialData.telefono ?? "",
        email: initialData.email ?? "",
        tipo: initialData.tipo ?? "principal",
        responsable: initialData.responsable ?? "",
        cargoResponsable: initialData.cargoResponsable ?? "",
        telefonoResponsable: initialData.telefonoResponsable ?? "",
        emailResponsable: initialData.emailResponsable ?? "",
      }));
    }
    // reset when modal closed
    if (!isOpen) {
      setFormData({
        nombre: "",
        direccion: "",
        ciudad: "",
        provincia: "",
        telefono: "",
        email: "",
        tipo: "principal",
        responsable: "",
        cargoResponsable: "",
        telefonoResponsable: "",
        emailResponsable: "",
      });
    }
  }, [initialData, sedeId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <h2 className="text-xl font-semibold">Agregar Nueva Sede</h2>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de la Sede */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de la Sede</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la sede *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Sede Lima, Sede Arequipa, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Sede
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="principal">Principal</option>
                    <option value="secundaria">Secundaria</option>
                    <option value="sucursal">Sucursal</option>
                    <option value="almacen">Almacén</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Calle, número, piso"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Lima"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
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
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sede@empresa.com"
                  />
                </div>
              </div>
            </div>

            {/* Responsable de la Sede */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Responsable de la Sede</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del responsable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="cargoResponsable"
                    value={formData.cargoResponsable}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Gerente de Sede"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="telefonoResponsable"
                    value={formData.telefonoResponsable}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 9-87654321"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="emailResponsable"
                    value={formData.emailResponsable}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="responsable@empresa.com"
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
                {loading ? "Guardando..." : "Crear Sede"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmOpen}
        title="Confirmar edición de sede"
        message="Por favor, indica el motivo para editar esta sede."
        confirmLabel="Editar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmUpdate}
      />
    </div>
  );
};

export default CreateSedeModal;
