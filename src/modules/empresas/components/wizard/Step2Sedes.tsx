import { useState } from "react";
import type { SedeData } from "./wizardTypes";

interface Step2Props {
  sedes: SedeData[];
  onSedeAdded: (sede: SedeData) => void;
  onSedeRemoved: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

const emptySedeForm = () => ({
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

const generarCodigoInterno = (nombre: string): string => {
  if (!nombre.trim()) return "";
  const limpio = nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();
  const palabras = limpio.split(/\s+/).filter(p => p.length > 0);
  if (palabras.length === 0) return "";
  const primera = palabras[0].substring(0, 3).toUpperCase();
  if (palabras.length > 1) return `${primera}-${palabras[1].substring(0, 4).toUpperCase()}`;
  return primera;
};

const Step2Sedes = ({ sedes, onSedeAdded, onSedeRemoved, onNext, onPrev }: Step2Props) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySedeForm());
  const [formErrors, setFormErrors] = useState<{ nombre?: string; direccion?: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "nombre") {
      setForm(prev => ({ ...prev, nombre: value, codigoInterno: generarCodigoInterno(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    const errs: { nombre?: string; direccion?: string } = {};
    if (!form.nombre.trim()) errs.nombre = "El nombre de la sede es requerido.";
    if (!form.direccion.trim()) errs.direccion = "La dirección es requerida.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    const sede: SedeData = { _id: `temp-sede-${Date.now()}`, ...form, activo: true };
    onSedeAdded(sede);
    setForm(emptySedeForm());
    setFormErrors({});
    setShowForm(false);
  };

  const handleCancel = () => {
    setForm(emptySedeForm());
    setFormErrors({});
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
            Registrar Sedes
          </h3>
          <p className="text-sm text-gray-500 ml-10">Agrega las sedes donde opera la empresa.</p>
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
            Agregar Sede
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2"><span>📌</span> Nueva Sede</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la sede *</label>
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.nombre ? "border-red-400" : "border-gray-300"}`}
                placeholder="Ej: Sede Lima Centro" />
              {formErrors.nombre && <p className="text-xs text-red-500 mt-1">{formErrors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código interno (automático)</label>
              <input type="text" value={form.codigoInterno} readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-mono font-bold"
                placeholder="SED-XXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sede</label>
              <select name="tipo" value={form.tipo} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="principal">Principal</option>
                <option value="secundaria">Secundaria</option>
                <option value="sucursal">Sucursal</option>
                <option value="almacen">Almacén</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
              <input type="text" name="direccion" value={form.direccion} onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.direccion ? "border-red-400" : "border-gray-300"}`}
                placeholder="Calle, número, piso" />
              {formErrors.direccion && <p className="text-xs text-red-500 mt-1">{formErrors.direccion}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" name="ciudad" value={form.ciudad} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Lima" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <input type="text" name="provincia" value={form.provincia} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Lima" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="tel" name="telefono" value={form.telefono} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 01-2345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sede@empresa.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Horario de atención</label>
              <input type="text" name="horarioAtencion" value={form.horarioAtencion} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Lunes a Viernes 8am-6pm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Información adicional sobre la sede" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button type="button" onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Agregar Sede
            </button>
          </div>
        </div>
      )}

      {/* Sedes list */}
      {sedes.length === 0 && !showForm ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium mb-2">No hay sedes registradas</p>
          <p className="text-gray-400 text-sm">Haz clic en "Agregar Sede" para crear la primera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sedes.map((sede, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{sede.nombre}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                      {sede.tipo}
                    </span>
                    {sede.codigoInterno && <span className="font-mono text-xs">{sede.codigoInterno}</span>}
                    {sede.direccion && <span>{sede.direccion}</span>}
                    {sede.ciudad && <span>· {sede.ciudad}</span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSedeRemoved(idx)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar sede"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <p className="text-sm text-gray-500 text-right">{sedes.length} sede{sedes.length !== 1 ? "s" : ""} registrada{sedes.length !== 1 ? "s" : ""}</p>
        </div>
        )}

      {/* Validation warning */}
      {sedes.length === 0 && !showForm && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-700">Debes registrar al menos una sede para continuar.</p>
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
          disabled={sedes.length === 0}
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

export default Step2Sedes;
