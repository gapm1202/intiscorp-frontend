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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
