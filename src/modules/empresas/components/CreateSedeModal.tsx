import { useState, useEffect } from "react";
import { createSede, updateSede } from "../services/sedesService";
import ConfirmModal from "./ConfirmModal";

interface Responsable {
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
}

interface CreateSedeModalProps {
  isOpen: boolean;
  empresaId: string | number;
  // when provided, modal will work in edit mode
  sedeId?: string | number;
  initialData?: Partial<{
    nombre: string;
    codigoInterno: string;
    direccion: string;
    ciudad: string;
    provincia: string;
    telefono: string;
    email: string;
    tipo: string;
    horarioAtencion: string;
    observaciones: string;
    responsables: Responsable[];
    autorizaIngresoTecnico: boolean;
    autorizaMantenimientoFueraHorario: boolean;
    autorizaSupervisionCoordinacion: boolean;
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateSedeModal = ({ isOpen, empresaId, sedeId, initialData, onClose, onSuccess }: CreateSedeModalProps) => {
  const [formData, setFormData] = useState({
    nombre: "",
    codigoInterno: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    telefono: "",
    email: "",
    tipo: "principal",
    horarioAtencion: "",
    observaciones: "",
    responsables: [{ nombre: "", cargo: "", telefono: "", email: "" }],
    autorizaIngresoTecnico: false,
    autorizaMantenimientoFueraHorario: false,
    autorizaSupervisionCoordinacion: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSedeData, setPendingSedeData] = useState<typeof formData | null>(null);

  // Generar código interno automático basado en el nombre
  const generarCodigoInterno = (nombre: string) => {
    if (!nombre.trim()) return "";
    
    // Limpiar caracteres especiales y acentos
    const limpio = nombre
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z\s]/g, "")
      .trim();
    
    const palabras = limpio.split(/\s+/).filter(p => p.length > 0);
    if (palabras.length === 0) return "";
    
    // Primera palabra: hasta 3 letras
    const primera = palabras[0].substring(0, 3).toUpperCase();
    
    // Segunda palabra: hasta 4 letras (si existe)
    if (palabras.length > 1) {
      const segunda = palabras[1].substring(0, 4).toUpperCase();
      return `${primera}-${segunda}`;
    }
    
    // Si solo hay una palabra, retornar solo la primera
    return primera;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name === "nombre") {
      setFormData(prev => ({
        ...prev,
        nombre: value,
        codigoInterno: generarCodigoInterno(value),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleResponsableChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      responsables: prev.responsables.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      ),
    }));
  };

  const addResponsable = () => {
    setFormData(prev => ({
      ...prev,
      responsables: [...prev.responsables, { nombre: "", cargo: "", telefono: "", email: "" }],
    }));
  };

  const removeResponsable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      responsables: prev.responsables.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const sedeData = {
      nombre: formData.nombre,
      codigoInterno: formData.codigoInterno,
      direccion: formData.direccion,
      ciudad: formData.ciudad,
      provincia: formData.provincia,
      telefono: formData.telefono,
      email: formData.email,
      tipo: formData.tipo,
      horarioAtencion: formData.horarioAtencion,
      observaciones: formData.observaciones,
      responsables: formData.responsables,
      autorizaIngresoTecnico: formData.autorizaIngresoTecnico,
      autorizaMantenimientoFueraHorario: formData.autorizaMantenimientoFueraHorario,
    };

    try {
      if (sedeId) {
        // editar: open confirm modal to require motivo
        setPendingSedeData(sedeData);
        setConfirmOpen(true);
        setLoading(false);
        return;
      } else {
        const created = await createSede(empresaId, sedeData);
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
        codigoInterno: initialData.codigoInterno ?? "",
        direccion: initialData.direccion ?? "",
        ciudad: initialData.ciudad ?? "",
        provincia: initialData.provincia ?? "",
        telefono: initialData.telefono ?? "",
        email: initialData.email ?? "",
        tipo: initialData.tipo ?? "principal",
        horarioAtencion: initialData.horarioAtencion ?? "",
        observaciones: initialData.observaciones ?? "",
        responsables: initialData.responsables ?? [{ nombre: "", cargo: "", telefono: "", email: "" }],
        autorizaIngresoTecnico: initialData.autorizaIngresoTecnico ?? false,
        autorizaMantenimientoFueraHorario: initialData.autorizaMantenimientoFueraHorario ?? false,
      }));
    }
    // reset when modal closed
    if (!isOpen) {
      setFormData({
        nombre: "",
        codigoInterno: "",
        direccion: "",
        ciudad: "",
        provincia: "",
        telefono: "",
        email: "",
        tipo: "principal",
        horarioAtencion: "",
        observaciones: "",
        responsables: [{ nombre: "", cargo: "", telefono: "", email: "" }],
        autorizaIngresoTecnico: false,
        autorizaMantenimientoFueraHorario: false,
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
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">📌 Información de la Sede</h3>
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
                    Código interno (Automático)
                  </label>
                  <input
                    type="text"
                    value={formData.codigoInterno}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-mono font-bold"
                    placeholder="SED-XXX"
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

                <div className="md:col-span-2">
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horario de atención
                  </label>
                  <input
                    type="text"
                    name="horarioAtencion"
                    value={formData.horarioAtencion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Lunes a Viernes 8am-6pm, Sábado 9am-1pm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notas o información adicional sobre la sede"
                  />
                </div>
              </div>
            </div>

            {/* Responsables de la Sede */}
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">👥 Responsables de la Sede</h3>
                <button
                  type="button"
                  onClick={addResponsable}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  + Agregar Responsable
                </button>
              </div>
              
              {formData.responsables.map((responsable, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={responsable.nombre}
                        onChange={(e) => handleResponsableChange(idx, "nombre", e.target.value)}
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
                        value={responsable.cargo}
                        onChange={(e) => handleResponsableChange(idx, "cargo", e.target.value)}
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
                        value={responsable.telefono}
                        onChange={(e) => handleResponsableChange(idx, "telefono", e.target.value)}
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
                        value={responsable.email}
                        onChange={(e) => handleResponsableChange(idx, "email", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="responsable@empresa.com"
                      />
                    </div>
                  </div>

                  {formData.responsables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeResponsable(idx)}
                      className="mt-3 text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      🗑️ Eliminar responsable
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Autorizaciones */}
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">🔐 Autorizaciones</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autorizaIngresoTecnico"
                    checked={formData.autorizaIngresoTecnico}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700 font-medium">¿Autoriza ingreso técnico?</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autorizaMantenimientoFueraHorario"
                    checked={formData.autorizaMantenimientoFueraHorario}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700 font-medium">¿Autoriza mantenimiento fuera de horario?</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autorizaSupervisionCoordinacion"
                    checked={formData.autorizaSupervisionCoordinacion}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700 font-medium">Supervisión y Coordinación</span>
                </label>
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
