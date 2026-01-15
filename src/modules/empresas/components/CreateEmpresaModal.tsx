import { useState, useEffect } from "react";
import { createEmpresa, updateEmpresa } from "../services/empresasService";
import ConfirmModal from "./ConfirmModal";
import { computeNextClientCodeLocal } from "@/utils/helpers";

interface ContactoAdmin {
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
}

interface ContactoTecnico {
  nombre: string;
  cargo: string;
  telefono1: string;
  telefono2: string;
  email: string;
  contactoPrincipal: boolean;
  horarioDisponible: string;
  autorizaCambiosCriticos: boolean;
  nivelAutorizacion: string;
  supervisionCoordinacion: boolean;
}

interface CreateEmpresaModalProps {
  isOpen: boolean;
  // when provided, modal works in edit mode
  empresaId?: string | number;
  initialData?: Partial<{
    nombre: string;
    ruc: string;
    codigoCliente: string;
    direccionFiscal: string;
    direccionOperativa: string;
    ciudad: string;
    provincia: string;
    sector: string;
    paginaWeb: string;
    estadoContrato: string;
    observacionesGenerales: string;
    contactosAdmin: ContactoAdmin[];
    autorizacionFacturacion: boolean;
    contactosTecnicos: ContactoTecnico[];
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateEmpresaModal = ({ isOpen, empresaId, initialData, onClose, onSuccess }: CreateEmpresaModalProps) => {
  const [formData, setFormData] = useState({
    // Información general
    nombre: "",
    ruc: "",
    codigoCliente: "",
    direccionFiscal: "",
    direccionOperativa: "",
    ciudad: "",
    provincia: "",
    sector: "",
    paginaWeb: "",
    estadoContrato: "",
    observacionesGenerales: "",
    
    // Contactos administrativos
    contactosAdmin: [{ nombre: "", cargo: "", telefono: "", email: "" }],
    autorizacionFacturacion: false,
    
    // Contactos técnicos
    contactosTecnicos: [{ nombre: "", cargo: "", telefono1: "", telefono2: "", email: "", contactoPrincipal: false, horarioDisponible: "", autorizaCambiosCriticos: false, nivelAutorizacion: "", supervisionCoordinacion: true }],
    
    // Credenciales Portal Soporte
    contrasenaPortalSoporte: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarContrasenaPortal, setMostrarContrasenaPortal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEmpresaData, setPendingEmpresaData] = useState<typeof formData | null>(null);
  const [loadingCodigo, setLoadingCodigo] = useState(false);

  // Generar código de cliente automáticamente al abrir modal para crear
  useEffect(() => {
    if (isOpen && !empresaId && !initialData?.codigoCliente) {
      setLoadingCodigo(true);
      // Aquí se debería cargar la lista de empresas para calcular el siguiente código
      // Por ahora, usamos un fallback local que se mejorará cuando el backend lo soporte
      try {
        const nextCode = computeNextClientCodeLocal([]);
        setFormData(prev => ({ ...prev, codigoCliente: nextCode }));
      } catch (e) {
        // Si falla, al menos ponemos CLI-001 como fallback
        setFormData(prev => ({ ...prev, codigoCliente: "CLI-001" }));
      } finally {
        setLoadingCodigo(false);
      }
    }
  }, [isOpen, empresaId, initialData?.codigoCliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleContactoAdminChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactosAdmin: prev.contactosAdmin.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addContactoAdmin = () => {
    setFormData(prev => ({
      ...prev,
      contactosAdmin: [...prev.contactosAdmin, { nombre: "", cargo: "", telefono: "", email: "" }],
    }));
  };

  const removeContactoAdmin = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contactosAdmin: prev.contactosAdmin.filter((_, i) => i !== index),
    }));
  };

  const handleContactoTecnicoChange = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      contactosTecnicos: prev.contactosTecnicos.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addContactoTecnico = () => {
    setFormData(prev => ({
      ...prev,
      contactosTecnicos: [...prev.contactosTecnicos, { nombre: "", cargo: "", telefono1: "", telefono2: "", email: "", contactoPrincipal: false, horarioDisponible: "", autorizaCambiosCriticos: false, nivelAutorizacion: "", supervisionCoordinacion: true }],
    }));
  };

  const removeContactoTecnico = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contactosTecnicos: prev.contactosTecnicos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Lógica para asignar estado automáticamente según fecha de fin
    let estadoContrato = formData.estadoContrato || 'activo';
    // Si el estado NO es suspendido, se determina automáticamente
    if (formData.estadoContrato !== 'suspendido') {
      // Buscar si hay una fecha de fin en el contrato activo (esto normalmente vendría de la pestaña Contrato)
      // Aquí solo simulamos: si existe una fecha de fin y ya venció, es 'vencido', si no, 'activo'.
      // NOTA: En este formulario no hay campo de fecha de fin, así que solo se puede dejar como 'activo' por defecto.
      // Si se integra con la pestaña Contrato, aquí se debería consultar esa fecha.
      estadoContrato = 'activo';
    }

    const empresaData = {
      nombre: formData.nombre,
      ruc: formData.ruc,
      codigoCliente: formData.codigoCliente,
      direccionFiscal: formData.direccionFiscal,
      direccionOperativa: formData.direccionOperativa,
      ciudad: formData.ciudad,
      provincia: formData.provincia,
      sector: formData.sector,
      paginaWeb: formData.paginaWeb,
      estadoContrato,
      observacionesGenerales: formData.observacionesGenerales,
      contactosAdmin: formData.contactosAdmin,
      autorizacionFacturacion: formData.autorizacionFacturacion,
      contactosTecnicos: formData.contactosTecnicos,
    };

    try {
      if (empresaId) {
        // require motivo for edits
        setPendingEmpresaData(empresaData);
        setConfirmOpen(true);
        setLoading(false);
        return;
      } else {
        const response = await createEmpresa(empresaData);
      }
      
      setFormData({
        nombre: "",
        ruc: "",
        codigoCliente: "",
        direccionFiscal: "",
        direccionOperativa: "",
        ciudad: "",
        provincia: "",
        sector: "",
        paginaWeb: "",
        estadoContrato: "",
        observacionesGenerales: "",
        contactosAdmin: [{ nombre: "", cargo: "", telefono: "", email: "" }],
        autorizacionFacturacion: false,
        contactosTecnicos: [{ nombre: "", cargo: "", telefono1: "", telefono2: "", email: "", contactoPrincipal: false, horarioDisponible: "", autorizaCambiosCriticos: false, nivelAutorizacion: "", supervisionCoordinacion: true }],
        contrasenaPortalSoporte: "",
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Error al crear/actualizar empresa:', err);
      
      // Verificar si es error de RUC duplicado del backend
      if (err?.response?.data?.error && err.response.data.error.includes('RUC')) {
        const errorData = err.response.data;
        // El backend debe devolver: { error: 'RUC duplicado', empresaExistente: 'Nombre de la empresa' }
        const empresaExistente = errorData.empresaExistente || 'otra empresa';
        setError(`Este número de RUC ya ha sido usado en la empresa "${empresaExistente}". Por favor, verifica el RUC ingresado.`);
      } else {
        const errorMsg = err?.response?.data?.error || err?.message || "Error al crear/actualizar empresa";
        setError(errorMsg);
      }
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
        codigoCliente: initialData.codigoCliente ?? "",
        direccionFiscal: initialData.direccionFiscal ?? "",
        direccionOperativa: initialData.direccionOperativa ?? "",
        ciudad: initialData.ciudad ?? "",
        provincia: initialData.provincia ?? "",
        sector: initialData.sector ?? "",
        paginaWeb: initialData.paginaWeb ?? "",
        estadoContrato: initialData.estadoContrato ?? "",
        observacionesGenerales: initialData.observacionesGenerales ?? "",
        contactosAdmin: initialData.contactosAdmin ?? [{ nombre: "", cargo: "", telefono: "", email: "" }],
        autorizacionFacturacion: initialData.autorizacionFacturacion ?? false,
        contactosTecnicos: initialData.contactosTecnicos ?? [{ nombre: "", cargo: "", telefono1: "", telefono2: "", email: "", contactoPrincipal: false, horarioDisponible: "", autorizaCambiosCriticos: false, nivelAutorizacion: "" }],
      }));
    }
    if (!isOpen) {
      setFormData({
        nombre: "",
        ruc: "",
        codigoCliente: "",
        direccionFiscal: "",
        direccionOperativa: "",
        ciudad: "",
        provincia: "",
        sector: "",
        paginaWeb: "",
        estadoContrato: "",
        observacionesGenerales: "",
        contactosAdmin: [{ nombre: "", cargo: "", telefono: "", email: "" }],
        autorizacionFacturacion: false,
        contactosTecnicos: [{ nombre: "", cargo: "", telefono1: "", telefono2: "", email: "", contactoPrincipal: false, horarioDisponible: "", autorizaCambiosCriticos: false, nivelAutorizacion: "", supervisionCoordinacion: true }],
        contrasenaPortalSoporte: "",
      });
      setMostrarContrasenaPortal(false);
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
            <div className="mb-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg shadow-md p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-800 mb-1 text-sm">Error al guardar</h4>
                  <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                </div>
                <button 
                  onClick={() => setError("")}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
                    Código interno de cliente
                  </label>
                  <input
                    type="text"
                    name="codigoCliente"
                    value={formData.codigoCliente}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    placeholder="Se genera automáticamente"
                  />
                  {loadingCodigo && <p className="text-xs text-gray-500 mt-1">Generando código...</p>}
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
                    Ciudad *
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
                    Sector empresarial (opcional)
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

                {/* Solo mostrar en modo creación */}
                {!empresaId && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-indigo-700 mb-1 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Contraseña Portal de Soporte *
                    </label>
                    <p className="text-xs text-gray-600 mb-2">
                      Esta contraseña será usada para acceder al portal de soporte. Usuario: <span className="font-mono font-bold">{formData.ruc || 'RUC'}</span>
                    </p>
                    <div className="relative">
                      <input
                        type={mostrarContrasenaPortal ? "text" : "password"}
                        name="contrasenaPortalSoporte"
                        value={formData.contrasenaPortalSoporte}
                        onChange={handleChange}
                        autoComplete="new-password"
                        className="w-full px-3 py-2 pr-10 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                        placeholder="Ingrese una contraseña segura (mín. 8 caracteres)"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarContrasenaPortal(!mostrarContrasenaPortal)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {mostrarContrasenaPortal ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-2">
                      <p className="text-xs text-indigo-800 flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Esta contraseña se encriptará y podrá ser modificada posteriormente desde el módulo de Usuarios.</span>
                      </p>
                    </div>
                  </div>
                )}

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
                    disabled
                  >
                    <option value="">--- Se definirá en la pestaña Contrato ---</option>
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="vencido">Vencido</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    El estado del contrato se definirá automáticamente en la pestaña Contrato según las fechas configuradas.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones generales
                  </label>
                  <textarea
                    name="observacionesGenerales"
                    value={formData.observacionesGenerales}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observaciones generales de la empresa"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Contactos Administrativos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Contactos administrativos</h3>
                <button
                  type="button"
                  onClick={addContactoAdmin}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  + Agregar contacto
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Para temas comerciales y facturación</p>
              
              {formData.contactosAdmin.map((contacto, idx) => (
                <div key={idx} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Contacto administrativo {idx + 1}</h4>
                    {formData.contactosAdmin.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContactoAdmin(idx)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                      <input
                        type="text"
                        value={contacto.nombre}
                        onChange={(e) => handleContactoAdminChange(idx, 'nombre', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                      <input
                        type="text"
                        value={contacto.cargo}
                        onChange={(e) => handleContactoAdminChange(idx, 'cargo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Gerente de Finanzas"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <input
                        type="tel"
                        value={contacto.telefono}
                        onChange={(e) => handleContactoAdminChange(idx, 'telefono', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: 01-2345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={contacto.email}
                        onChange={(e) => handleContactoAdminChange(idx, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="contacto@empresa.com"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.autorizacionFacturacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, autorizacionFacturacion: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Autorización de facturación
                </label>
              </div>
            </div>

            {/* Sección: Contactos Técnicos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Contactos técnicos</h3>
                <button
                  type="button"
                  onClick={addContactoTecnico}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  + Agregar contacto
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Usuarios clave para soporte</p>

              {formData.contactosTecnicos.map((contacto, idx) => (
                <div key={idx} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Contacto técnico {idx + 1}</h4>
                    {formData.contactosTecnicos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContactoTecnico(idx)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                      <input
                        type="text"
                        value={contacto.nombre}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'nombre', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                      <input
                        type="text"
                        value={contacto.cargo}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'cargo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Jefe de IT"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono 1</label>
                      <input
                        type="tel"
                        value={contacto.telefono1}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'telefono1', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: 01-2345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono 2</label>
                      <input
                        type="tel"
                        value={contacto.telefono2}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'telefono2', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: 9-87654321"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={contacto.email}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="soporte@empresa.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Horario disponible</label>
                      <input
                        type="text"
                        value={contacto.horarioDisponible}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'horarioDisponible', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Lunes a Viernes 8:00-18:00"
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-3 border border-gray-200 rounded bg-gray-50 space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={contacto.contactoPrincipal}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'contactoPrincipal', e.target.checked)}
                        className="w-4 h-4"
                      />
                      Contacto de cuenta y soporte
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={contacto.autorizaCambiosCriticos}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'autorizaCambiosCriticos', e.target.checked)}
                        className="w-4 h-4"
                      />
                      ¿Autoriza cambios críticos?
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={contacto.supervisionCoordinacion}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'supervisionCoordinacion', e.target.checked)}
                        className="w-4 h-4"
                      />
                      Supervisión y coordinación
                    </label>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de autorización</label>
                    <select
                      value={contacto.nivelAutorizacion}
                      onChange={(e) => handleContactoTecnicoChange(idx, 'nivelAutorizacion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="solo_reporta">Solo reporta</option>
                      <option value="autoriza_intervencion">Autoriza intervención</option>
                      <option value="autoriza_cambios_mayores">Autoriza cambios mayores</option>
                    </select>
                  </div>
                </div>
              ))}
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
