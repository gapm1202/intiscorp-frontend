import { useState } from "react";

interface ServicioFormProps {
  servicio?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function ServicioForm({ servicio, onSave, onCancel }: ServicioFormProps) {
  const [formData, setFormData] = useState({
    codigo: servicio?.codigo || "",
    nombre: servicio?.nombre || "",
    descripcion: servicio?.descripcion || "",
    tipoServicio: servicio?.tipoServicio || "",
    activo: servicio?.activo !== undefined ? servicio.activo : true,
    visibleEnTickets: servicio?.visibleEnTickets !== undefined ? servicio.visibleEnTickets : true,
  });

  const [showOtroTipo, setShowOtroTipo] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Si se cambia el nombre, generar código automáticamente
    if (name === "nombre") {
      const codigo = generarCodigo(value);
      setFormData((prev) => ({ ...prev, nombre: value, codigo }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "tipoServicio" && value === "Otro") {
      setShowOtroTipo(true);
    } else if (name === "tipoServicio") {
      setShowOtroTipo(false);
    }
  };

  const generarCodigo = (nombre: string): string => {
    if (!nombre.trim()) return "";
    
    const palabras = nombre.trim().toUpperCase().split(/\s+/);
    const codigoPalabras = palabras
      .map(palabra => palabra.substring(0, 5))
      .join("-");
    
    return `SRV-${codigoPalabras}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo || !formData.nombre) {
      alert("El codigo y nombre son obligatorios");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary-600 text-white p-6 rounded-t-xl">
          <h2 className="text-2xl font-bold">
            {servicio ? "Editar Servicio" : "Nuevo Servicio"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
              Datos del Servicio
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Codigo del servicio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                readOnly
                placeholder="Se genera automaticamente"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Se genera automaticamente del nombre del servicio</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del servicio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Conectividad a Internet"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descripcion
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Ej: Soporte relacionado a problemas de conexion"
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de servicio <span className="text-red-500">*</span>
              </label>
              <select
                name="tipoServicio"
                value={formData.tipoServicio}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seleccione un tipo</option>
                <option value="Infraestructura">Infraestructura</option>
                <option value="Aplicacion">Aplicacion</option>
                <option value="Comunicaciones">Comunicaciones</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Soporte general">Soporte general</option>
                <option value="Otro">Otro</option>
              </select>

              {showOtroTipo && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value)}
                    placeholder="Ingrese el nuevo tipo de servicio"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (nuevoTipo.trim()) {
                        setFormData((prev) => ({ ...prev, tipoServicio: nuevoTipo.trim() }));
                        setShowOtroTipo(false);
                        setNuevoTipo("");
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Agregar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
              Configuracion
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="activo"
                      checked={formData.activo === true}
                      onChange={() => setFormData((prev) => ({ ...prev, activo: true }))}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="activo"
                      checked={formData.activo === false}
                      onChange={() => setFormData((prev) => ({ ...prev, activo: false }))}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Inactivo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Visible para tickets
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibleEnTickets"
                      checked={formData.visibleEnTickets === true}
                      onChange={() => setFormData((prev) => ({ ...prev, visibleEnTickets: true }))}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Si</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibleEnTickets"
                      checked={formData.visibleEnTickets === false}
                      onChange={() => setFormData((prev) => ({ ...prev, visibleEnTickets: false }))}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {servicio && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                Metadatos
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 font-medium">Fecha de creacion:</p>
                  <p className="text-slate-800">
                    {servicio.createdAt ? new Date(servicio.createdAt).toLocaleDateString("es-ES") : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">Ultima modificacion:</p>
                  <p className="text-slate-800">
                    {servicio.updatedAt ? new Date(servicio.updatedAt).toLocaleDateString("es-ES") : "N/A"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-600 font-medium">Usuario creador:</p>
                  <p className="text-slate-800">{servicio.creadoPor || "N/A"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
            >
              {servicio ? "Actualizar" : "Crear Servicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
