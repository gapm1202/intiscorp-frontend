import { useState, useEffect } from "react";
import { createEmpresa, updateEmpresa } from "../services/empresasService";
import ConfirmModal from "./ConfirmModal";

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

const DEFAULT_CONTACTO_ADMIN: ContactoAdmin = {
  nombre: "",
  cargo: "",
  telefono: "",
  email: "",
};

const DEFAULT_CONTACTO_TECNICO: ContactoTecnico = {
  nombre: "",
  cargo: "",
  telefono1: "",
  telefono2: "",
  email: "",
  contactoPrincipal: false,
  horarioDisponible: "",
  autorizaCambiosCriticos: false,
  nivelAutorizacion: "",
  supervisionCoordinacion: true,
};

const getDefaultFormData = () => ({
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
  contactosAdmin: [DEFAULT_CONTACTO_ADMIN],
  autorizacionFacturacion: false,
  contactosTecnicos: [DEFAULT_CONTACTO_TECNICO],
  contrasenaPortalSoporte: "",
});

type InitialEmpresaData = CreateEmpresaModalProps["initialData"] & Partial<{
  observaciones: string;
  adminNombre: string;
  adminCargo: string;
  adminTelefono: string;
  adminEmail: string;
  tecNombre: string;
  tecCargo: string;
  tecTelefono1: string;
  tecTelefono2: string;
  tecEmail: string;
  horarioDisponible: string;
  contactoPrincipal: boolean;
  autorizaCambiosCriticos: boolean;
  nivelAutorizacion: string;
  supervisionCoordinacion: boolean;
}>;

const normalizeContactosAdmin = (initialData?: InitialEmpresaData) => {
  if (Array.isArray(initialData?.contactosAdmin) && initialData.contactosAdmin.length > 0) {
    return initialData.contactosAdmin.map((contacto) => ({
      nombre: contacto.nombre ?? "",
      cargo: contacto.cargo ?? "",
      telefono: contacto.telefono ?? "",
      email: contacto.email ?? "",
    }));
  }

  if (
    initialData?.adminNombre ||
    initialData?.adminCargo ||
    initialData?.adminTelefono ||
    initialData?.adminEmail
  ) {
    return [{
      nombre: initialData.adminNombre ?? "",
      cargo: initialData.adminCargo ?? "",
      telefono: initialData.adminTelefono ?? "",
      email: initialData.adminEmail ?? "",
    }];
  }

  return [DEFAULT_CONTACTO_ADMIN];
};

const normalizeContactosTecnicos = (initialData?: InitialEmpresaData) => {
  if (Array.isArray(initialData?.contactosTecnicos) && initialData.contactosTecnicos.length > 0) {
    return initialData.contactosTecnicos.map((contacto) => ({
      nombre: contacto.nombre ?? "",
      cargo: contacto.cargo ?? "",
      telefono1: contacto.telefono1 ?? "",
      telefono2: contacto.telefono2 ?? "",
      email: contacto.email ?? "",
      contactoPrincipal: contacto.contactoPrincipal ?? false,
      horarioDisponible: contacto.horarioDisponible ?? "",
      autorizaCambiosCriticos: contacto.autorizaCambiosCriticos ?? false,
      nivelAutorizacion: contacto.nivelAutorizacion ?? "",
      supervisionCoordinacion: contacto.supervisionCoordinacion ?? true,
    }));
  }

  if (
    initialData?.tecNombre ||
    initialData?.tecCargo ||
    initialData?.tecTelefono1 ||
    initialData?.tecTelefono2 ||
    initialData?.tecEmail
  ) {
    return [{
      nombre: initialData.tecNombre ?? "",
      cargo: initialData.tecCargo ?? "",
      telefono1: initialData.tecTelefono1 ?? "",
      telefono2: initialData.tecTelefono2 ?? "",
      email: initialData.tecEmail ?? "",
      contactoPrincipal: initialData.contactoPrincipal ?? false,
      horarioDisponible: initialData.horarioDisponible ?? "",
      autorizaCambiosCriticos: initialData.autorizaCambiosCriticos ?? false,
      nivelAutorizacion: initialData.nivelAutorizacion ?? "",
      supervisionCoordinacion: initialData.supervisionCoordinacion ?? true,
    }];
  }

  return [DEFAULT_CONTACTO_TECNICO];
};

const normalizeInitialFormData = (initialData?: InitialEmpresaData) => {
  const defaults = getDefaultFormData();

  if (!initialData) {
    return defaults;
  }

  return {
    ...defaults,
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
    observacionesGenerales: initialData.observacionesGenerales ?? initialData.observaciones ?? "",
    contactosAdmin: normalizeContactosAdmin(initialData),
    autorizacionFacturacion: initialData.autorizacionFacturacion ?? false,
    contactosTecnicos: normalizeContactosTecnicos(initialData),
  };
};

interface CreateEmpresaModalProps {
  isOpen: boolean;
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

const inputClass =
  "w-full px-3 py-2 bg-white border border-sky-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm";

const labelClass = "block text-sm font-semibold text-slate-700 mb-1";

const SectionHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between mb-4">
    <div>
      <h3 className="text-base font-bold text-blue-900 tracking-wide uppercase" style={{ letterSpacing: "0.06em" }}>
        {title}
      </h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Section = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white border border-sky-100 rounded-xl p-5 shadow-sm space-y-4">
    {children}
  </div>
);

const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
  >
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
    {label}
  </button>
);

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg border border-red-200 transition-colors"
  >
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
    Eliminar
  </button>
);

const CheckRow = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) => (
  <label className="flex items-center gap-2.5 cursor-pointer group">
    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white group-hover:border-blue-400"}`}>
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </div>
    <span className="text-sm font-medium text-slate-700">{label}</span>
  </label>
);

const CreateEmpresaModal = ({ isOpen, empresaId, initialData, onClose, onSuccess }: CreateEmpresaModalProps) => {
  const [formData, setFormData] = useState(getDefaultFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarContrasenaPortal, setMostrarContrasenaPortal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEmpresaData, setPendingEmpresaData] = useState<typeof formData | null>(null);
  const [loadingCodigo, setLoadingCodigo] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<null | { codigoCliente?: string; usuario?: string; contrasena?: string }>(null);
  const [passwordModalMsg, setPasswordModalMsg] = useState<string | null>(null);

  useEffect(() => {
    // codigoCliente is now generated by backend. Keep any provided initialData, but do not generate locally.
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...normalizeInitialFormData(initialData),
      }));
    }
    if (!isOpen) {
      setFormData(getDefaultFormData());
      setMostrarContrasenaPortal(false);
    }
  }, [initialData, empresaId, isOpen]);

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

    if (!empresaId) {
      const pwd = String(formData.contrasenaPortalSoporte ?? '');
      if (pwd.trim().length < 12) {
        setPasswordModalMsg('La contraseña del Portal de Soporte debe tener al menos 12 caracteres.');
        setLoading(false);
        return;
      }
    }

    let estadoContrato = formData.estadoContrato || 'activo';
    if (formData.estadoContrato !== 'suspendido') {
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
      contrasenaPortalSoporte: formData.contrasenaPortalSoporte,
    };

    try {
      if (empresaId) {
        setPendingEmpresaData(empresaData);
        setConfirmOpen(true);
        setLoading(false);
        return;
      } else {
        // Do not send codigoCliente on create; it's generated by backend
        const payload = { ...empresaData } as any;
        delete payload.codigoCliente;
        const response = await createEmpresa(payload);
        // extract codigoCliente and credenciales if provided to show to user
        const codigo = response?.codigoCliente || response?.data?.codigoCliente || response?.empresa?.codigoCliente || response?.data?._id ? String(response?.codigoCliente || response?.data?.codigoCliente || response?.empresa?.codigoCliente || "") : "";
        const usuario = response?.credenciales?.usuario || response?.data?.credenciales?.usuario || undefined;
        const contrasena = response?.credenciales?.contrasena || response?.data?.credenciales?.contrasena || undefined;
        setCreatedInfo({ codigoCliente: codigo, usuario, contrasena });
      }

      setFormData(getDefaultFormData());
      // Do not close immediately: show backend-generated codigoCliente/credenciales to the user
      return;
    } catch (err: any) {
      console.error('❌ Error al crear/actualizar empresa:', err);
      if (err?.response?.data?.error && err.response.data.error.includes('RUC')) {
        const errorData = err.response.data;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(15,30,60,0.55)" }}>
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#f0f7ff" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5 shrink-0"
          style={{ background: "linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {empresaId ? "Editar Empresa" : "Nueva Empresa"}
              </h2>
              <p className="text-sky-200 text-xs">
                {empresaId ? "Modifica los datos del cliente" : "Registro de nuevo cliente"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-7 py-6">
          {/* Error banner */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-800 text-sm">Error al guardar</p>
                <p className="text-red-700 text-sm mt-0.5">{error}</p>
              </div>
              <button onClick={() => setError("")} type="button" className="text-red-400 hover:text-red-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── SECCIÓN 1: Información General ── */}
            <Section>
              <SectionHeader
                title="Información General"
                subtitle="Datos esenciales para identificar al cliente"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre de la empresa <span className="text-blue-500">*</span></label>
                  <input type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                    className={inputClass} placeholder="Ej: TechCorp S.A." required />
                </div>

                <div>
                  <label className={labelClass}>RUC <span className="text-blue-500">*</span></label>
                  <input type="text" name="ruc" value={formData.ruc} onChange={handleChange}
                    className={inputClass} placeholder="Ej: 20123456789" required />
                </div>

                <div>
                  <label className={labelClass}>Código interno de cliente</label>
                  <input type="text" name="codigoCliente" value={formData.codigoCliente} readOnly
                    className="w-full px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-slate-500 text-sm font-mono" placeholder="Se genera automáticamente" />
                  {loadingCodigo && <p className="text-xs text-sky-500 mt-1">Generando código...</p>}
                </div>

                <div>
                  <label className={labelClass}>Nombre Comercial</label>
                  <input type="text" name="direccionFiscal" value={formData.direccionFiscal} onChange={handleChange}
                    className={inputClass} placeholder="Nombre o razón comercial" />
                </div>

                <div>
                  <label className={labelClass}>Dirección operativa</label>
                  <input type="text" name="direccionOperativa" value={formData.direccionOperativa} onChange={handleChange}
                    className={inputClass} placeholder="Calle, número, piso" />
                </div>

                <div>
                  <label className={labelClass}>Ciudad <span className="text-blue-500">*</span></label>
                  <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange}
                    className={inputClass} placeholder="Ej: Lima" required />
                </div>

                <div>
                  <label className={labelClass}>Provincia</label>
                  <input type="text" name="provincia" value={formData.provincia} onChange={handleChange}
                    className={inputClass} placeholder="Ej: Lima" />
                </div>

                <div>
                  <label className={labelClass}>Sector empresarial</label>
                  <input type="text" name="sector" value={formData.sector} onChange={handleChange}
                    className={inputClass} placeholder="Ej: Tecnología, Finanzas…" />
                </div>

                {/* Portal password - solo en creación */}
                {!empresaId && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Contraseña Portal de Soporte <span className="text-blue-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Usuario de acceso: <span className="font-mono font-bold text-slate-700">{formData.ruc || 'RUC'}</span>
                    </p>
                    <div className="relative">
                      <input
                        type={mostrarContrasenaPortal ? "text" : "password"}
                        name="contrasenaPortalSoporte"
                        value={formData.contrasenaPortalSoporte}
                        onChange={handleChange}
                        autoComplete="new-password"
                        className="w-full px-3 py-2 pr-10 bg-white border-2 border-blue-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm transition-colors"
                        placeholder="Mínimo 12 caracteres"
                        minLength={12}
                        required
                      />
                      <button type="button" onClick={() => setMostrarContrasenaPortal(!mostrarContrasenaPortal)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        {mostrarContrasenaPortal ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2 flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-blue-700">Esta contraseña se encriptará y podrá modificarse desde el módulo de Usuarios.</p>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className={labelClass}>Página web</label>
                  <input type="url" name="paginaWeb" value={formData.paginaWeb} onChange={handleChange}
                    className={inputClass} placeholder="https://www.empresa.com" />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Estado del contrato <span className="text-blue-500">*</span></label>
                  <select name="estadoContrato" value={formData.estadoContrato} onChange={handleChange}
                    className="w-full px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-slate-500 text-sm focus:outline-none cursor-not-allowed" disabled>
                    <option value="">— Se definirá en la pestaña Contrato —</option>
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="vencido">Vencido</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">El estado se asignará automáticamente según las fechas del contrato.</p>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Observaciones generales</label>
                  <textarea name="observacionesGenerales" value={formData.observacionesGenerales} onChange={handleChange}
                    className={inputClass} placeholder="Observaciones generales de la empresa" rows={3} />
                </div>
              </div>
            </Section>

            {/* ── SECCIÓN 2: Contactos Administrativos ── */}
            <Section>
              <SectionHeader
                title="Contactos Administrativos"
                subtitle="Para temas comerciales y facturación"
                action={<AddButton onClick={addContactoAdmin} label="Agregar" />}
              />

              {formData.contactosAdmin.map((contacto, idx) => (
                <div key={idx} className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-800">Contacto {idx + 1}</span>
                    {formData.contactosAdmin.length > 1 && (
                      <RemoveButton onClick={() => removeContactoAdmin(idx)} />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Nombre completo</label>
                      <input type="text" value={contacto.nombre}
                        onChange={(e) => handleContactoAdminChange(idx, 'nombre', e.target.value)}
                        className={inputClass} placeholder="Nombre completo" />
                    </div>
                    <div>
                      <label className={labelClass}>Cargo</label>
                      <input type="text" value={contacto.cargo}
                        onChange={(e) => handleContactoAdminChange(idx, 'cargo', e.target.value)}
                        className={inputClass} placeholder="Ej: Gerente de Finanzas" />
                    </div>
                    <div>
                      <label className={labelClass}>Teléfono</label>
                      <input type="tel" value={contacto.telefono}
                        onChange={(e) => handleContactoAdminChange(idx, 'telefono', e.target.value)}
                        className={inputClass} placeholder="01-2345678" />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" value={contacto.email}
                        onChange={(e) => handleContactoAdminChange(idx, 'email', e.target.value)}
                        className={inputClass} placeholder="contacto@empresa.com" />
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <CheckRow
                  checked={formData.autorizacionFacturacion}
                  onChange={(v) => setFormData(prev => ({ ...prev, autorizacionFacturacion: v }))}
                  label="Autorización de facturación"
                />
              </div>
            </Section>

            {/* ── SECCIÓN 3: Contactos Técnicos ── */}
            <Section>
              <SectionHeader
                title="Contactos Técnicos"
                subtitle="Usuarios clave para soporte"
                action={<AddButton onClick={addContactoTecnico} label="Agregar" />}
              />

              {formData.contactosTecnicos.map((contacto, idx) => (
                <div key={idx} className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-800">Contacto técnico {idx + 1}</span>
                    {formData.contactosTecnicos.length > 1 && (
                      <RemoveButton onClick={() => removeContactoTecnico(idx)} />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Nombre completo</label>
                      <input type="text" value={contacto.nombre}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'nombre', e.target.value)}
                        className={inputClass} placeholder="Nombre completo" />
                    </div>
                    <div>
                      <label className={labelClass}>Cargo</label>
                      <input type="text" value={contacto.cargo}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'cargo', e.target.value)}
                        className={inputClass} placeholder="Ej: Jefe de IT" />
                    </div>
                    <div>
                      <label className={labelClass}>Teléfono 1</label>
                      <input type="tel" value={contacto.telefono1}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'telefono1', e.target.value)}
                        className={inputClass} placeholder="01-2345678" />
                    </div>
                    <div>
                      <label className={labelClass}>Teléfono 2</label>
                      <input type="tel" value={contacto.telefono2}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'telefono2', e.target.value)}
                        className={inputClass} placeholder="9-87654321" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Email</label>
                      <input type="email" value={contacto.email}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'email', e.target.value)}
                        className={inputClass} placeholder="soporte@empresa.com" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Horario disponible</label>
                      <input type="text" value={contacto.horarioDisponible}
                        onChange={(e) => handleContactoTecnicoChange(idx, 'horarioDisponible', e.target.value)}
                        className={inputClass} placeholder="Ej: Lunes a Viernes 8:00–18:00" />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="bg-white border border-sky-200 rounded-lg p-3 space-y-2.5">
                    <CheckRow
                      checked={contacto.contactoPrincipal}
                      onChange={(v) => handleContactoTecnicoChange(idx, 'contactoPrincipal', v)}
                      label="Contacto de cuenta y soporte"
                    />
                    <CheckRow
                      checked={contacto.autorizaCambiosCriticos}
                      onChange={(v) => handleContactoTecnicoChange(idx, 'autorizaCambiosCriticos', v)}
                      label="¿Autoriza cambios críticos?"
                    />
                    <CheckRow
                      checked={contacto.supervisionCoordinacion}
                      onChange={(v) => handleContactoTecnicoChange(idx, 'supervisionCoordinacion', v)}
                      label="Supervisión y coordinación"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Nivel de autorización</label>
                    <select value={contacto.nivelAutorizacion}
                      onChange={(e) => handleContactoTecnicoChange(idx, 'nivelAutorizacion', e.target.value)}
                      className={inputClass}>
                      <option value="">— Seleccionar —</option>
                      <option value="solo_reporta">Solo reporta</option>
                      <option value="autoriza_intervencion">Autoriza intervención</option>
                      <option value="autoriza_cambios_mayores">Autoriza cambios mayores</option>
                    </select>
                  </div>
                </div>
              ))}
            </Section>

            {/* ── Botones ── */}
            <div className="flex gap-3 pt-1 pb-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-blue-200 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 font-semibold rounded-xl text-white text-sm transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)" }}>
                {loading
                  ? (empresaId ? "Guardando..." : "Creando...")
                  : (empresaId ? "Guardar cambios" : "Crear Empresa")}
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

      {passwordModalMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-red-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl shrink-0">⚠️</div>
              <div className="flex-1">
                <h4 className="text-red-800 font-bold text-base">Contraseña insuficiente</h4>
                <p className="text-sm text-slate-600 mt-1">{passwordModalMsg}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPasswordModalMsg(null)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cerrar
              </button>
              <button onClick={() => setPasswordModalMsg(null)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
      {createdInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border">
            <h4 className="text-lg font-bold mb-2">Empresa creada</h4>
            <p className="text-sm text-slate-700 mb-3">Código de cliente generado: <span className="font-mono font-bold">{createdInfo.codigoCliente}</span></p>
            {createdInfo.usuario && (
              <p className="text-sm text-slate-600">Usuario: <span className="font-mono">{createdInfo.usuario}</span></p>
            )}
            {createdInfo.contrasena && (
              <p className="text-sm text-slate-600 mb-3">Contraseña: <span className="font-mono">{createdInfo.contrasena}</span></p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setCreatedInfo(null)} className="px-4 py-2 rounded-lg bg-white border text-slate-700">Cerrar</button>
              <button onClick={() => { setCreatedInfo(null); onSuccess(); onClose(); }} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEmpresaModal;