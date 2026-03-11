import { useState } from "react";
import type { UsuarioData, SedeData, ContactoAdminConfig, ContactoTecnicoConfig, ResponsableSedeConfig } from "./wizardTypes";

interface Step4Props {
  usuarios: UsuarioData[];
  sedes: SedeData[];
  contactosAdmin: ContactoAdminConfig[];
  contactosTecnicos: ContactoTecnicoConfig[];
  responsablesSede: ResponsableSedeConfig[];
  onContactosAdminChange: (contactos: ContactoAdminConfig[]) => void;
  onContactosTecnicosChange: (contactos: ContactoTecnicoConfig[]) => void;
  onResponsablesSedeChange: (responsables: ResponsableSedeConfig[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

const Step4Contactos = ({
  usuarios,
  sedes,
  contactosAdmin,
  contactosTecnicos,
  responsablesSede,
  onContactosAdminChange,
  onContactosTecnicosChange,
  onResponsablesSedeChange,
  onNext,
  onPrev,
}: Step4Props) => {
  const [adminSelect, setAdminSelect] = useState("");
  const [tecnicoSelect, setTecnicoSelect] = useState("");
  const [responsableSelect, setResponsableSelect] = useState("");
  const [responsableSedeSelect, setResponsableSedeSelect] = useState("");

  // Usuarios disponibles que no han sido asignados aún como cierto rol
  const usedAdminIds = new Set(contactosAdmin.map(c => c.usuarioId));
  const usedTecnicoIds = new Set(contactosTecnicos.map(c => c.usuarioId));
  const usedResponsableKeys = new Set(responsablesSede.map(r => `${r.usuarioId}-${r.sedeId}`));

  const handleAddAdmin = () => {
    if (!adminSelect) return;
    const usr = usuarios.find(u => (u._id || u.id) === adminSelect);
    if (!usr) return;
    onContactosAdminChange([
      ...contactosAdmin,
      { usuarioId: adminSelect, nombreCompleto: usr.nombreCompleto, autorizacionFacturacion: false },
    ]);
    setAdminSelect("");
  };

  const handleRemoveAdmin = (idx: number) => {
    onContactosAdminChange(contactosAdmin.filter((_, i) => i !== idx));
  };

  const handleAdminFieldChange = (idx: number, field: keyof ContactoAdminConfig, value: string | boolean) => {
    onContactosAdminChange(contactosAdmin.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleAddTecnico = () => {
    if (!tecnicoSelect) return;
    const usr = usuarios.find(u => (u._id || u.id) === tecnicoSelect);
    if (!usr) return;
    onContactosTecnicosChange([
      ...contactosTecnicos,
      {
        usuarioId: tecnicoSelect,
        nombreCompleto: usr.nombreCompleto,
        horarioDisponible: "",
        contactoPrincipal: false,
        autorizaCambiosCriticos: false,
        supervisionCoordinacion: false,
        nivelAutorizacion: "",
      },
    ]);
    setTecnicoSelect("");
  };

  const handleRemoveTecnico = (idx: number) => {
    onContactosTecnicosChange(contactosTecnicos.filter((_, i) => i !== idx));
  };

  const handleTecnicoFieldChange = (idx: number, field: keyof ContactoTecnicoConfig, value: string | boolean) => {
    onContactosTecnicosChange(contactosTecnicos.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleAddResponsable = () => {
    if (!responsableSelect || !responsableSedeSelect) return;
    const usr = usuarios.find(u => (u._id || u.id) === responsableSelect);
    const sede = sedes.find(s => (s._id || s.id) === responsableSedeSelect);
    if (!usr || !sede) return;
    const key = `${responsableSelect}-${responsableSedeSelect}`;
    if (usedResponsableKeys.has(key)) return;
    onResponsablesSedeChange([
      ...responsablesSede,
      {
        usuarioId: responsableSelect,
        nombreCompleto: usr.nombreCompleto,
        sedeId: responsableSedeSelect,
        sedeNombre: sede.nombre,
        autorizaIngresoTecnico: false,
        autorizaMantenimientoFueraHorario: false,
        supervisionCoordinacion: false,
      },
    ]);
    setResponsableSelect("");
    setResponsableSedeSelect("");
  };

  const handleRemoveResponsable = (idx: number) => {
    onResponsablesSedeChange(responsablesSede.filter((_, i) => i !== idx));
  };

  const handleResponsableFieldChange = (idx: number, field: keyof ResponsableSedeConfig, value: string | boolean) => {
    onResponsablesSedeChange(responsablesSede.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const noUsuarios = usuarios.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">4</span>
          Configuración de Contactos y Responsables
        </h3>
        <p className="text-sm text-gray-500 ml-10">Selecciona usuarios del paso anterior para asignar roles.</p>
      </div>

      {noUsuarios && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-700">No hay usuarios creados. Regresa al paso 3 para crear usuarios antes de asignar contactos.</p>
        </div>
      )}

      {/* === CONTACTOS ADMINISTRATIVOS === */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h4 className="font-semibold text-gray-800 mb-1">Contactos administrativos</h4>
        <p className="text-xs text-gray-500 mb-4">Para temas comerciales y facturación.</p>

        <div className="flex gap-2 mb-4">
          <select
            value={adminSelect}
            onChange={e => setAdminSelect(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={noUsuarios}
          >
            <option value="">-- Seleccionar usuario --</option>
            {usuarios.filter(u => !usedAdminIds.has(u._id || u.id || "")).map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>{u.nombreCompleto}</option>
            ))}
          </select>
          <button type="button" onClick={handleAddAdmin} disabled={!adminSelect} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Agregar
          </button>
        </div>

        {contactosAdmin.length > 0 && (
          <div className="space-y-3">
            {contactosAdmin.map((ca, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800 text-sm">{ca.nombreCompleto}</span>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={ca.autorizacionFacturacion}
                      onChange={e => handleAdminFieldChange(idx, "autorizacionFacturacion", e.target.checked)}
                      className="w-4 h-4"
                    />
                    Autorización de facturación
                  </label>
                </div>
                <button type="button" onClick={() => handleRemoveAdmin(idx)} className="text-red-500 hover:text-red-700 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === CONTACTOS TÉCNICOS === */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h4 className="font-semibold text-gray-800 mb-1">Contactos técnicos</h4>
        <p className="text-xs text-gray-500 mb-4">Usuarios clave para soporte técnico.</p>

        <div className="flex gap-2 mb-4">
          <select
            value={tecnicoSelect}
            onChange={e => setTecnicoSelect(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={noUsuarios}
          >
            <option value="">-- Seleccionar usuario --</option>
            {usuarios.filter(u => !usedTecnicoIds.has(u._id || u.id || "")).map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>{u.nombreCompleto}</option>
            ))}
          </select>
          <button type="button" onClick={handleAddTecnico} disabled={!tecnicoSelect} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Agregar
          </button>
        </div>

        {contactosTecnicos.length > 0 && (
          <div className="space-y-3">
            {contactosTecnicos.map((ct, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-800 text-sm">{ct.nombreCompleto}</span>
                  <button type="button" onClick={() => handleRemoveTecnico(idx)} className="text-red-500 hover:text-red-700 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Horario disponible</label>
                    <input
                      type="text"
                      value={ct.horarioDisponible}
                      onChange={e => handleTecnicoFieldChange(idx, "horarioDisponible", e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Ej: L-V 8:00-18:00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nivel de autorización</label>
                    <select
                      value={ct.nivelAutorizacion}
                      onChange={e => handleTecnicoFieldChange(idx, "nivelAutorizacion", e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="solo_reporta">Solo reporta</option>
                      <option value="autoriza_intervencion">Autoriza intervención</option>
                      <option value="autoriza_cambios_mayores">Autoriza cambios mayores</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={ct.contactoPrincipal} onChange={e => handleTecnicoFieldChange(idx, "contactoPrincipal", e.target.checked)} className="w-4 h-4" />
                    Contacto de cuenta y soporte
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={ct.autorizaCambiosCriticos} onChange={e => handleTecnicoFieldChange(idx, "autorizaCambiosCriticos", e.target.checked)} className="w-4 h-4" />
                    Autoriza cambios críticos
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={ct.supervisionCoordinacion} onChange={e => handleTecnicoFieldChange(idx, "supervisionCoordinacion", e.target.checked)} className="w-4 h-4" />
                    Supervisión y coordinación
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === RESPONSABLES DE LA SEDE === */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h4 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <span>👥</span> Responsables de la Sede
        </h4>
        <p className="text-xs text-gray-500 mb-4">Asigna responsables con autorizaciones por sede.</p>

        <div className="flex gap-2 mb-4">
          <select
            value={responsableSelect}
            onChange={e => setResponsableSelect(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={noUsuarios}
          >
            <option value="">-- Seleccionar usuario --</option>
            {usuarios.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>{u.nombreCompleto}</option>
            ))}
          </select>
          <select
            value={responsableSedeSelect}
            onChange={e => setResponsableSedeSelect(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={sedes.length === 0}
          >
            <option value="">-- Seleccionar sede --</option>
            {sedes.map(s => (
              <option key={s._id || s.id} value={s._id || s.id}>{s.nombre}</option>
            ))}
          </select>
          <button type="button" onClick={handleAddResponsable} disabled={!responsableSelect || !responsableSedeSelect} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Agregar
          </button>
        </div>

        {responsablesSede.length > 0 && (
          <div className="space-y-3">
            {responsablesSede.map((resp, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-gray-800 text-sm">{resp.nombreCompleto}</span>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{resp.sedeNombre}</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveResponsable(idx)} className="text-red-500 hover:text-red-700 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <span>🔐</span> Autorizaciones
                  </p>
                  <div className="flex flex-wrap gap-4">
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
      </div>

      {/* Validation warning */}
      {(contactosAdmin.length === 0 || contactosTecnicos.length === 0 || responsablesSede.length === 0) && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-amber-700">
            <p className="font-medium mb-1">Debes asignar al menos un usuario en cada sección:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {contactosAdmin.length === 0 && <li>Contacto administrativo</li>}
              {contactosTecnicos.length === 0 && <li>Contacto técnico</li>}
              {responsablesSede.length === 0 && <li>Responsable de sede</li>}
            </ul>
          </div>
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
          disabled={contactosAdmin.length === 0 || contactosTecnicos.length === 0 || responsablesSede.length === 0}
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

export default Step4Contactos;
