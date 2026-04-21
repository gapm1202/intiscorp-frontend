import { useState, useEffect } from "react";
import { createSede, updateSede } from "../services/sedesService";
import ConfirmModal from "./ConfirmModal";

interface UsuarioOption {
  _id?: string;
  id?: string;
  nombreCompleto: string;
}

interface ResponsableSede {
  usuarioId: string;
  nombreCompleto: string;
  autorizaIngresoTecnico: boolean;
  autorizaMantenimientoFueraHorario: boolean;
  supervisionCoordinacion: boolean;
}

interface CreateSedeModalProps {
  isOpen: boolean;
  empresaId: string | number;
  // when provided, modal will work in edit mode
  sedeId?: string | number;
  usuarios?: UsuarioOption[];
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
    responsablesSede: ResponsableSede[];
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateSedeModal = ({ isOpen, empresaId, sedeId, initialData, usuarios = [], onClose, onSuccess }: CreateSedeModalProps) => {
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
  });
  const [responsablesSede, setResponsablesSede] = useState<ResponsableSede[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSedeData, setPendingSedeData] = useState<any>(null);

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

  const handleAddResponsable = () => {
    if (!selectedUser) return;
    const usr = usuarios.find(u => (u._id || u.id) === selectedUser);
    if (!usr) return;
    if (responsablesSede.some(r => r.usuarioId === selectedUser)) return;
    setResponsablesSede(prev => [
      ...prev,
      { usuarioId: selectedUser, nombreCompleto: usr.nombreCompleto, autorizaIngresoTecnico: false, autorizaMantenimientoFueraHorario: false, supervisionCoordinacion: false },
    ]);
    setSelectedUser("");
  };

  const handleRemoveResponsable = (idx: number) => {
    setResponsablesSede(prev => prev.filter((_, i) => i !== idx));
  };

  const handleResponsableFieldChange = (idx: number, field: keyof ResponsableSede, value: boolean) => {
    setResponsablesSede(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
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
      responsablesSede,
    };

    try {
      if (sedeId) {
        // editar: open confirm modal to require motivo
        setPendingSedeData(sedeData);
        setConfirmOpen(true);
        setLoading(false);
        return;
      } else {
        await createSede(empresaId, sedeData);
      }

      setFormData({ nombre: "", codigoInterno: "", direccion: "", ciudad: "", provincia: "", telefono: "", email: "", tipo: "principal", horarioAtencion: "", observaciones: "" });
      setResponsablesSede([]);
      setSelectedUser("");
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
      }));
      setResponsablesSede(initialData.responsablesSede ?? []);
    }
    // reset when modal closed
    if (!isOpen) {
      setFormData({ nombre: "", codigoInterno: "", direccion: "", ciudad: "", provincia: "", telefono: "", email: "", tipo: "principal", horarioAtencion: "", observaciones: "" });
      setResponsablesSede([]);
      setSelectedUser("");
      setIsExpanded(false);
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
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-1">👥 Responsables de la Sede</h3>
              <p className="text-xs text-gray-500 mb-4">Asigna responsables con autorizaciones por sede.</p>

              {/* Sede accordion */}
              <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🏢</span>
                    <span className="font-semibold text-gray-800 text-sm">
                      {formData.nombre.trim() || "Nueva sede"}
                    </span>
                    {responsablesSede.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {responsablesSede.length} responsable{responsablesSede.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                    <span>{isExpanded ? "Ocultar detalles" : "Ver detalles"}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Responsables de la sede</p>
                      <p className="text-xs text-gray-400 mb-3">Asigna responsables con autorizaciones por sede.</p>

                      {/* User selector */}
                      {usuarios.length === 0 ? (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          No hay usuarios disponibles. Agrega usuarios a la empresa primero.
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="">-- Seleccionar usuario --</option>
                            {usuarios
                              .filter(u => !responsablesSede.some(r => r.usuarioId === (u._id || u.id)))
                              .map(u => (
                                <option key={u._id || u.id} value={u._id || u.id}>{u.nombreCompleto}</option>
                              ))}
                          </select>
                          <div className="flex items-center px-3 py-2 border border-gray-200 rounded-lg bg-slate-50 text-sm text-gray-500 max-w-40 truncate">
                            {formData.nombre.trim() || "Nueva sede"}
                          </div>
                          <button
                            type="button"
                            onClick={handleAddResponsable}
                            disabled={!selectedUser}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap"
                          >
                            Agregar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Assigned responsables */}
                    {responsablesSede.length > 0 && (
                      <div className="space-y-2">
                        {responsablesSede.map((resp, idx) => (
                          <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-800 text-sm">{resp.nombreCompleto}</span>
                              <button type="button" onClick={() => handleRemoveResponsable(idx)} className="text-red-400 hover:text-red-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <div className="p-2 bg-white rounded border border-gray-100">
                              <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">🔐 Autorizaciones</p>
                              <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <input type="checkbox" checked={resp.autorizaIngresoTecnico} onChange={e => handleResponsableFieldChange(idx, "autorizaIngresoTecnico", e.target.checked)} className="w-4 h-4" />
                                  Autoriza ingreso técnico
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <input type="checkbox" checked={resp.autorizaMantenimientoFueraHorario} onChange={e => handleResponsableFieldChange(idx, "autorizaMantenimientoFueraHorario", e.target.checked)} className="w-4 h-4" />
                                  Mantenimiento fuera de horario
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <input type="checkbox" checked={resp.supervisionCoordinacion} onChange={e => handleResponsableFieldChange(idx, "supervisionCoordinacion", e.target.checked)} className="w-4 h-4" />
                                  Supervisión y coordinación
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {responsablesSede.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Sin responsables asignados a esta sede aún.</p>
                    )}
                  </div>
                )}
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
