import { useState } from "react";
import type { UsuarioData, SedeData } from "./wizardTypes";

interface Step3Props {
  usuarios: UsuarioData[];
  sedes: SedeData[];
  onUsuarioCreated: (usuario: UsuarioData) => void;
  onUsuarioRemoved: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

const TIPOS_DOCUMENTO = ["DNI", "RUC", "Pasaporte", "CE - Carnet de Extranjer\u00eda", "Otro"];

const emptyUsuarioForm = () => ({
  nombreCompleto: "",
  correo: "",
  cargo: "",
  telefono: "",
  sedeId: "",
  tipoDocumento: "DNI",
  numeroDocumento: "",
  observaciones: "",
});

const Step3Usuarios = ({ usuarios, sedes, onUsuarioCreated, onUsuarioRemoved, onNext, onPrev }: Step3Props) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyUsuarioForm());
  const [formErrors, setFormErrors] = useState<{ nombreCompleto?: string; correo?: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs: { nombreCompleto?: string; correo?: string } = {};
    if (!form.nombreCompleto.trim()) errs.nombreCompleto = "El nombre es requerido.";
    if (!form.correo.trim()) errs.correo = "El correo es requerido.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    const sedeMatch = sedes.find(s => (s._id || s.id) === form.sedeId);
    const usuario: UsuarioData = {
      _id: `temp-user-${Date.now()}`,
      empresaId: "",
      sedeId: form.sedeId,
      sedeNombre: sedeMatch?.nombre || "",
      nombreCompleto: form.nombreCompleto,
      correo: form.correo,
      cargo: form.cargo,
      telefono: form.telefono,
      observaciones: form.observaciones,
      tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento,
      areaId: "",
    };
    onUsuarioCreated(usuario);
    setForm(emptyUsuarioForm());
    setFormErrors({});
    setShowForm(false);
  };

  const handleCancel = () => {
    setForm(emptyUsuarioForm());
    setFormErrors({});
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
            Crear Usuarios de la Empresa
          </h3>
          <p className="text-sm text-gray-500 ml-10">Registra los usuarios que pertenecerán a esta empresa.</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Inline form for adding usuario */}
      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2"><span>👤</span> Nuevo Usuario</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
              <input type="text" name="nombreCompleto" value={form.nombreCompleto} onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.nombreCompleto ? "border-red-400" : "border-gray-300"}`}
                placeholder="Ej: Juan Pérez García" />
              {formErrors.nombreCompleto && <p className="text-xs text-red-500 mt-1">{formErrors.nombreCompleto}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
              <input type="email" name="correo" value={form.correo} onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.correo ? "border-red-400" : "border-gray-300"}`}
                placeholder="usuario@empresa.com" />
              {formErrors.correo && <p className="text-xs text-red-500 mt-1">{formErrors.correo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <input type="text" name="cargo" value={form.cargo} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Jefe de IT" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="tel" name="telefono" value={form.telefono} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 9-87654321" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sede asignada</label>
              <select name="sedeId" value={form.sedeId} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Sin sede asignada --</option>
                {sedes.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
              <select name="tipoDocumento" value={form.tipoDocumento} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
              <input type="text" name="numeroDocumento" value={form.numeroDocumento} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="N° de documento" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionales" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button type="button" onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Agregar Usuario
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      {usuarios.length === 0 && !showForm ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium mb-2">No hay usuarios registrados</p>
          <p className="text-gray-400 text-sm">Haz clic en "Nuevo Usuario" para agregar el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map((usr, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-bold text-sm">
                    {usr.nombreCompleto.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{usr.nombreCompleto}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{usr.correo}</span>
                    {usr.cargo && <span>· {usr.cargo}</span>}
                    {usr.sedeNombre && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {usr.sedeNombre}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUsuarioRemoved(idx)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar usuario"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <p className="text-sm text-gray-500 text-right">{usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}</p>
        </div>
      )}

      {/* Validation warning */}
      {usuarios.length === 0 && !showForm && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-700">Debes registrar al menos un usuario para continuar.</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={usuarios.length === 0}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
        >
          Siguiente
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

    </div>
  );
};

export default Step3Usuarios;
