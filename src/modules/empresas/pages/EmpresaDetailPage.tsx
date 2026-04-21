
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getEmpresaById } from "@/modules/empresas/services/empresasService";
import { getSedesByEmpresa, toggleSedeActivo } from "@/modules/empresas/services/sedesService";
import { getUsuariosAdministrativos } from "@/modules/auth/services/userService";
import CreateSedeModal from "@/modules/empresas/components/CreateSedeModal";
import CreateEmpresaWizard from "@/modules/empresas/components/wizard/CreateEmpresaWizard";
import { getUsuariosByEmpresa } from "@/modules/usuarios/services/usuariosService";
import DeleteSedeModal from "./../components/DeleteSedeModal";
import { useNavGuard } from "@/context/NavGuardContext";
import ContratoSlaTab from "@/modules/empresas/components/contratoSla/ContratoSlaTab";

interface Sede {
  id?: number;
  _id?: string;
  nombre?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  tipo?: string;
  responsable?: string;
  cargoResponsable?: string;
  telefonoResponsable?: string;
  emailResponsable?: string;
  activo?: boolean;
  motivo?: string;
  [key: string]: unknown;
}

interface ContactoAdmin {
  nombre?: string;
  cargo?: string;
  telefono?: string;
  email?: string;
}

interface ContactoTecnico {
  nombre?: string;
  cargo?: string;
  telefono1?: string;
  telefono2?: string;
  email?: string;
  contactoPrincipal?: boolean;
  horarioDisponible?: string;
  autorizaCambiosCriticos?: boolean;
  nivelAutorizacion?: string;
  supervisionCoordinacion?: boolean;
}

interface Empresa {
  id?: number;
  _id?: string;
  nombre?: string;
  ruc?: string;
  codigoCliente?: string;
  direccionFiscal?: string;
  direccionOperativa?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  paginaWeb?: string;
  estadoContrato?: string;
  observacionesGenerales?: string;
  autorizacionFacturacion?: boolean;
  contactosAdmin?: ContactoAdmin[];
  contactosTecnicos?: ContactoTecnico[];
  // Legacy
  adminNombre?: string;
  adminCargo?: string;
  adminTelefono?: string;
  adminEmail?: string;
  observaciones?: string;
  tecNombre?: string;
  tecCargo?: string;
  tecTelefono1?: string;
  tecTelefono2?: string;
  tecEmail?: string;
  nivelAutorizacion?: string;
  [key: string]: unknown;
}

const mapEmpresaToEditWizardData = (empresa?: Empresa | null, sedes: Sede[] = [], usuarios: any[] = []) => {
  if (!empresa) return undefined;

  const findUsuarioId = (nombre?: string, email?: string) => {
    const matched = usuarios.find((usuario) => {
      const sameEmail = email && String(usuario.correo || "").toLowerCase() === String(email).toLowerCase();
      const sameName = nombre && String(usuario.nombreCompleto || "").trim().toLowerCase() === String(nombre).trim().toLowerCase();
      return sameEmail || sameName;
    });

    return String(matched?._id || matched?.id || "");
  };

  const wizardSedes = sedes.map((sede) => ({
    _id: String(sede._id ?? sede.id ?? ""),
    id: String(sede.id ?? sede._id ?? ""),
    nombre: String(sede.nombre ?? ""),
    codigoInterno: String((sede as any).codigoInterno ?? (sede as any).codigo_interno ?? ""),
    direccion: String(sede.direccion ?? ""),
    ciudad: String(sede.ciudad ?? ""),
    provincia: String(sede.provincia ?? ""),
    telefono: String(sede.telefono ?? ""),
    email: String(sede.email ?? ""),
    tipo: String(sede.tipo ?? "principal"),
    horarioAtencion: String((sede as any).horarioAtencion ?? (sede as any).horario_atencion ?? ""),
    observaciones: String((sede as any).observaciones ?? ""),
    activo: Boolean((sede as any).activo ?? true),
  }));

  const wizardUsuarios = usuarios.map((usuario) => ({
    _id: String(usuario._id ?? usuario.id ?? ""),
    id: String(usuario.id ?? usuario._id ?? ""),
    empresaId: String(usuario.empresaId ?? empresa._id ?? empresa.id ?? ""),
    sedeId: String(usuario.sedeId ?? ""),
    sedeNombre: String(usuario.sedeNombre ?? ""),
    nombreCompleto: String(usuario.nombreCompleto ?? ""),
    correo: String(usuario.correo ?? ""),
    cargo: String(usuario.cargo ?? ""),
    telefono: String(usuario.telefono ?? ""),
    observaciones: String(usuario.observaciones ?? ""),
    tipoDocumento: String((usuario as any).tipoDocumento ?? "DNI"),
    numeroDocumento: String((usuario as any).numeroDocumento ?? ""),
    areaId: String((usuario as any).areaId ?? ""),
  }));

  const contactosAdmin = Array.isArray(empresa.contactosAdmin) && empresa.contactosAdmin.length > 0
    ? empresa.contactosAdmin.map((contacto, index) => ({
        usuarioId: findUsuarioId(contacto.nombre, contacto.email) || `admin-${index}`,
        nombreCompleto: String(contacto.nombre ?? ""),
        autorizacionFacturacion: Boolean((contacto as any).autorizacionFacturacion ?? empresa.autorizacionFacturacion ?? (empresa as any).autorizacion_facturacion ?? false),
      }))
    : (empresa.adminNombre || empresa.adminEmail)
    ? [{
        usuarioId: findUsuarioId(empresa.adminNombre, empresa.adminEmail) || "admin-0",
        nombreCompleto: String(empresa.adminNombre ?? ""),
        autorizacionFacturacion: Boolean(empresa.autorizacionFacturacion ?? (empresa as any).autorizacion_facturacion ?? false),
      }]
    : [];

  const contactosTecnicos = Array.isArray(empresa.contactosTecnicos) && empresa.contactosTecnicos.length > 0
    ? empresa.contactosTecnicos.map((contacto, index) => ({
        usuarioId: findUsuarioId(contacto.nombre, contacto.email) || `tecnico-${index}`,
        nombreCompleto: String(contacto.nombre ?? ""),
        horarioDisponible: String(contacto.horarioDisponible ?? ""),
        contactoPrincipal: Boolean(contacto.contactoPrincipal ?? false),
        autorizaCambiosCriticos: Boolean(contacto.autorizaCambiosCriticos ?? false),
        supervisionCoordinacion: Boolean(contacto.supervisionCoordinacion ?? false),
        nivelAutorizacion: String(contacto.nivelAutorizacion ?? ""),
      }))
    : (empresa.tecNombre || empresa.tecEmail)
    ? [{
        usuarioId: findUsuarioId(empresa.tecNombre, empresa.tecEmail) || "tecnico-0",
        nombreCompleto: String(empresa.tecNombre ?? ""),
        horarioDisponible: "",
        contactoPrincipal: false,
        autorizaCambiosCriticos: false,
        supervisionCoordinacion: false,
        nivelAutorizacion: String(empresa.nivelAutorizacion ?? ""),
      }]
    : [];

  return {
    general: {
      nombre: String(empresa.nombre ?? ""),
      ruc: String(empresa.ruc ?? (empresa as any).RUC ?? ""),
      codigoCliente: String(empresa.codigoCliente ?? (empresa as any).codigo_cliente ?? ""),
      direccionFiscal: String(empresa.direccionFiscal ?? (empresa as any).direccion_fiscal ?? ""),
      direccionOperativa: String(empresa.direccionOperativa ?? (empresa as any).direccion_operativa ?? ""),
      ciudad: String(empresa.ciudad ?? ""),
      provincia: String(empresa.provincia ?? ""),
      sector: String(empresa.sector ?? ""),
      paginaWeb: String(empresa.paginaWeb ?? (empresa as any).pagina_web ?? ""),
      observacionesGenerales: String(empresa.observacionesGenerales ?? empresa.observaciones ?? (empresa as any).observaciones_generales ?? ""),
    },
    sedes: wizardSedes,
    usuarios: wizardUsuarios,
    contactosAdmin,
    contactosTecnicos,
    responsablesSede: [],
    contrasenaPortalSoporte: "",
  };
};

const EmpresaDetailPage = () => {
  const { empresaId } = useParams<{ empresaId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSedeModal, setShowCreateSedeModal] = useState(false);
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [showEditEmpresaModal, setShowEditEmpresaModal] = useState(false);
  const [sedeToDelete, setSedeToDelete] = useState<Sede | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Restaurar activeTab desde sessionStorage para mantener la pestaña después de reload
  const [activeTab, setActiveTab] = useState<'general' | 'sedes' | 'contactos' | 'contrato-sla' | 'contrato' | 'sla' | 'historial'>(
    () => {
      const saved = sessionStorage.getItem(`empresaTab_${empresaId}`);
      // Migrate old 'contrato' or 'sla' tab to unified 'contrato-sla'
      if (saved === 'contrato' || saved === 'sla') return 'contrato-sla';
      return (saved as any) || 'general';
    }
  );
  
  // Usuarios administrativos (para ContratoSlaTab)
  const [usuariosAdmin, setUsuariosAdmin] = useState<Array<{ id: string; nombre: string }>>([]);

  // Stable sedes array for ContratoSlaTab — prevents loadContrato from re-running on every parent render
  const sedesForTab = useMemo(() =>
    sedes.map(s => ({ id: String((s as any)._id || (s as any).id || ''), nombre: s.nombre || '' })),
    [sedes]
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage] = useState('');
  const [toastType] = useState<'success' | 'error'>('success');
  const [empresaUsuarios, setEmpresaUsuarios] = useState<any[]>([]);
  const empresaEditInitialData = mapEmpresaToEditWizardData(empresa, sedes, empresaUsuarios);

  // Confirmación de salida sin guardar
  const [showUnsavedConfirmModal, setShowUnsavedConfirmModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase() || name.slice(0, 2).toUpperCase();
  };

  // Función para formatear nombres de campos técnicos a nombres legibles


  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTabs = ['general', 'sedes', 'contactos', 'contrato-sla', 'contrato', 'sla', 'mantenimientos', 'historial'];
    if (tabParam && validTabs.includes(tabParam)) {
      // Migrate legacy URLs
      const resolvedTab = (tabParam === 'contrato' || tabParam === 'sla') ? 'contrato-sla' : tabParam;
      setActiveTab(resolvedTab as typeof activeTab);
      sessionStorage.setItem(`empresaTab_${empresaId}`, resolvedTab);
    }
  }, [searchParams, empresaId]);

  useEffect(() => {
    if (!empresaId) return;

    const fetchEmpresa = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEmpresaById(empresaId);
        setEmpresa(data);
        const sedesData = await getSedesByEmpresa(empresaId, true);
        setSedes(Array.isArray(sedesData) ? sedesData : sedesData.data || []);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error al cargar empresa";
        console.error('[ERROR] Al cargar empresa/sedes:', err);
        
        // Si el error es de sedes pero la empresa se cargó, mostrar warning en lugar de error completo
        if (empresa) {
          console.warn('[WARNING] Error al cargar sedes, pero empresa cargada. Continuando...');
          setSedes([]);
        } else {
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [empresaId]);

  // Cargar usuarios administrativos para ContratoSlaTab
  useEffect(() => {
    if (activeTab !== 'contrato-sla') return;

    const fetchUsuariosAdmin = async () => {
      try {
        const usuarios = await getUsuariosAdministrativos();
        setUsuariosAdmin(usuarios);
      } catch (err) {
        console.error('Error al cargar usuarios administrativos:', err);
      }
    };

    fetchUsuariosAdmin();
  }, [activeTab]);

  useEffect(() => {
    if (!showEditEmpresaModal || !empresaId) return;

    const fetchUsuariosEmpresa = async () => {
      try {
        const usuarios = await getUsuariosByEmpresa(empresaId);
        setEmpresaUsuarios(Array.isArray(usuarios) ? usuarios : []);
      } catch (err) {
        console.error('Error al cargar usuarios de la empresa para edición:', err);
        setEmpresaUsuarios([]);
      }
    };

    fetchUsuariosEmpresa();
  }, [empresaId, showEditEmpresaModal]);

  // Guardar activeTab en sessionStorage para restaurarlo después de reload
  useEffect(() => {
    sessionStorage.setItem(`empresaTab_${empresaId}`, activeTab);
  }, [activeTab, empresaId]);
  // Helpers SLA

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as typeof activeTab);
  };

  const handleConfirmUnsavedExit = async () => {
    if (pendingPath) {
      navigate(pendingPath);
    } else if (pendingTab) {
      setActiveTab(pendingTab as typeof activeTab);
    }
    setPendingTab(null);
    setPendingPath(null);
    setShowUnsavedConfirmModal(false);
  };

  const handleCancelUnsavedExit = () => {
    setShowUnsavedConfirmModal(false);
    setPendingTab(null);
    setPendingPath(null);
  };
  // Registrar guard global de navegación
  const { clearGuard, getGuard } = useNavGuard();

  // Navegación que respeta el guard
  const handleGuardedNavigation = (path: string) => {
    const guard = getGuard();
    if (guard.shouldBlock && guard.onBlock && guard.shouldBlock(path)) {
      guard.onBlock(path);
      return;
    }
    navigate(path);
  };
  useEffect(() => {
    clearGuard();
    return () => { clearGuard(); };
  }, [activeTab]);

  const handleToggleSede = async (motivo: string) => {
    const sedeId = sedeToDelete?._id ?? sedeToDelete?.id;
    if (!empresaId || !sedeId) return;
    const currentActive = sedeToDelete?.activo !== false; // default true if undefined

    setIsDeleting(true);
    setError(null);

    try {
      const updated = await toggleSedeActivo(empresaId, sedeId, !currentActive, motivo);
      setSedes(prev => prev.map(s => (s._id ?? s.id) === sedeId ? { ...s, ...updated } : s));

      setSedeToDelete(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar la sede";
      console.error("Error al actualizar sede:", err);
      setError(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center text-gray-600">
          Cargando información de la empresa...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => handleGuardedNavigation("/admin/empresas")}
            className="text-blue-600 hover:text-blue-800 font-medium mb-4"
          >
            ← Volver
          </button>
          <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center text-gray-600">
          No se encontró la empresa
        </div>
      </div>
    );
  }
return (
  <div className="min-h-screen bg-slate-50 px-4 py-8 md:p-8">
    {error && (
      <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      </div>
    )}



    <div className="max-w-7xl mx-auto">
      <button
        onClick={() => handleGuardedNavigation("/admin/empresas")}
        className="text-blue-600 hover:text-blue-800 font-medium text-sm mb-6 flex items-center gap-2 transition-all group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Volver a Empresas
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden mb-6 shadow-sm">
        <div className="h-28 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500" />
        <div className="px-8 pb-6 -mt-14 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="flex items-end gap-5 flex-1">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center ring-4 ring-white shrink-0">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-700 to-sky-500 text-white flex items-center justify-center text-xl font-bold">
                {getInitials(empresa.nombre)}
              </div>
            </div>
            <div className="pb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">{empresa.nombre}</h1>
            </div>
          </div>
          <div className="pb-1">
            <button
              onClick={() => setShowEditEmpresaModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
            >
               Editar empresa
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-6 items-start">

        {/* ── Sidebar de Navegación Vertical ── */}
        <div className="w-56 flex-shrink-0 sticky top-6 z-30">
          <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
            {/* Mini-header con nombre de empresa */}
            <div className="bg-gradient-to-br from-blue-700 to-sky-600 px-4 py-4">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-sm mb-2">
                {getInitials(empresa.nombre)}
              </div>
              <p className="text-white font-semibold text-sm leading-tight truncate">{empresa.nombre}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`w-2 h-2 rounded-full ${
                  empresa?.estadoContrato === 'activo' ? 'bg-emerald-400' :
                  empresa?.estadoContrato === 'suspendido' ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
                <span className="text-blue-100 text-xs capitalize">
                  {empresa?.estadoContrato || 'Sin contrato'}
                </span>
              </div>
            </div>

            {/* Nav items */}
            <nav className="p-2">
              {[
                { id: 'general', label: 'Información General', icon: '📋' },
                { id: 'sedes', label: 'Sedes', icon: '📍', badge: sedes.length },
                { id: 'contactos', label: 'Contactos', icon: '👥' },
                { id: 'contrato-sla', label: 'Contrato & SLA', icon: '📄' },
                
                { id: 'historial', label: 'Historial', icon: '📊' },
              ].map(tab => (
                <div key={tab.id} className="relative group">
                  <button
                    onClick={() => !tab.disabled && handleTabChange(tab.id)}
                    disabled={tab.disabled}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 text-left relative
                      ${tab.disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    {/* Indicador activo */}
                    {activeTab === tab.id && !tab.disabled && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
                    )}

                    <span className={`
                      w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0
                      ${tab.disabled ? 'bg-slate-100' : activeTab === tab.id ? 'bg-blue-100' : 'bg-slate-100'}
                    `}>
                      {tab.icon}
                    </span>

                    <span className="truncate flex-1">{tab.label}</span>

                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`
                        text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0
                        ${activeTab === tab.id ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}
                      `}>
                        {tab.badge}
                      </span>
                    )}
                  </button>

                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* ── Área de Contenido ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* TAB: Información General */}
          {activeTab === 'general' && (
            <>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-7 pb-5 border-b border-slate-100">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Información General de la Empresa</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Datos esenciales para identificar al cliente</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre de la empresa <span className="text-red-500">*</span></label>
                  <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-blue-50/50 rounded-xl border border-blue-100">{empresa.nombre || "—"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">RUC <span className="text-red-500">*</span></label>
                  <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">{empresa.ruc || "—"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Código interno de cliente</label>
                  <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono">{empresa.codigoCliente || "—"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre comercial</label>
                  <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">{empresa.direccionFiscal || "—"}</p>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dirección operativa</label>
                  <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">{empresa.direccionOperativa || "—"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ciudad <span className="text-red-500">*</span></label>
                  <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">{empresa.ciudad || "—"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Provincia</label>
                  <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">{empresa.provincia || "—"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sector empresarial (opcional)</label>
                  <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">{empresa.sector || "—"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Página web (opcional)</label>
                  <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 min-h-[42px]">
                    {empresa.paginaWeb ? (
                      <a href={String(empresa.paginaWeb)} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 break-all font-medium">
                        {String(empresa.paginaWeb)}
                      </a>
                    ) : (
                      <span className="text-base font-semibold text-slate-900">—</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observaciones generales</label>
                  {empresa.observacionesGenerales || empresa.observaciones ? (
                    <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-100 whitespace-pre-wrap text-slate-800 leading-relaxed text-sm font-medium min-h-16">
                      {empresa.observacionesGenerales || empresa.observaciones}
                    </div>
                  ) : (
                    <p className="text-base font-semibold text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">—</p>
                  )}
                </div>
              </div>
            </div>
            </>
          )}

          {/* TAB: Contactos */}
          {activeTab === 'contactos' && (
            <>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-7 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4m-2 4h12a2 2 0 002-2V11a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm2 0v1a4 4 0 008 0v-1" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Contactos Administrativos</h2>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  empresa.autorizacionFacturacion ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  {empresa.autorizacionFacturacion ? "✓ Facturación Autorizada" : "Facturación No Autorizada"}
                </span>
              </div>

              {Array.isArray(empresa.contactosAdmin) && empresa.contactosAdmin.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {empresa.contactosAdmin.map((c, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-sm transition-all bg-slate-50/40">
                      <div className="grid grid-cols-2 gap-8 mb-5">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Nombre completo</p>
                          <p className="text-base font-bold text-slate-900">{c.nombre || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Cargo</p>
                          <p className="text-base font-semibold text-slate-700">{c.cargo || "Sin cargo"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200">
                        {c.telefono && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Teléfono</p>
                            <a href={`tel:${c.telefono}`} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">{c.telefono}</a>
                          </div>
                        )}
                        {c.email && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</p>
                            <a href={`mailto:${c.email}`} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 break-all">{c.email}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nombre</p><p className="text-base text-slate-900 font-semibold">{empresa.adminNombre || "—"}</p></div>
                  <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cargo</p><p className="text-base text-slate-900 font-semibold">{empresa.adminCargo || "—"}</p></div>
                  <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Teléfono</p><p className="text-base text-slate-900 font-semibold">{empresa.adminTelefono ? <a href={`tel:${empresa.adminTelefono}`} className="text-blue-600 hover:underline">{empresa.adminTelefono}</a> : "—"}</p></div>
                  <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</p><p className="text-base text-slate-900 font-semibold">{empresa.adminEmail ? <a href={`mailto:${String(empresa.adminEmail)}`} className="text-blue-600 hover:underline">{String(empresa.adminEmail)}</a> : "—"}</p></div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-7 pb-5 border-b border-slate-100">
                <div className="p-2.5 bg-purple-50 rounded-xl">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Contactos Técnicos</h2>
              </div>

              {Array.isArray(empresa.contactosTecnicos) && empresa.contactosTecnicos.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {empresa.contactosTecnicos.map((c, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-6 hover:border-purple-200 hover:shadow-sm transition-all bg-slate-50/40">
                      <div className="grid grid-cols-2 gap-8 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Nombre completo</p>
                          <p className="text-base font-bold text-slate-900">{c.nombre || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Cargo</p>
                          <p className="text-base font-semibold text-slate-700">{c.cargo || "Sin cargo"}</p>
                        </div>
                      </div>
                      {(c.contactoPrincipal || c.autorizaCambiosCriticos || c.nivelAutorizacion) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {c.contactoPrincipal && <span className="px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200 font-semibold">⭐ Principal</span>}
                          {c.autorizaCambiosCriticos && <span className="px-3 py-1 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200 font-semibold">🔒 Cambios críticos</span>}
                          {c.nivelAutorizacion && <span className="px-3 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200 font-semibold">📊 {c.nivelAutorizacion.replace(/_/g, " ").toLowerCase().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200">
                        {c.telefono1 && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Teléfono principal</p><a href={`tel:${c.telefono1}`} className="text-sm font-semibold text-purple-600 hover:text-purple-700">{c.telefono1}</a></div>}
                        {c.telefono2 && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Teléfono alterno</p><a href={`tel:${c.telefono2}`} className="text-sm font-semibold text-purple-600 hover:text-purple-700">{c.telefono2}</a></div>}
                        {c.email && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</p><a href={`mailto:${c.email}`} className="text-sm font-semibold text-purple-600 hover:text-purple-700 break-all">{c.email}</a></div>}
                        {c.horarioDisponible && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Horario disponible</p><p className="text-sm font-semibold text-slate-800">{c.horarioDisponible}</p></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nombre</p><p className="text-base text-slate-900 font-semibold">{empresa.tecNombre || "—"}</p></div>
                  <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cargo</p><p className="text-base text-slate-900 font-semibold">{empresa.tecCargo || "—"}</p></div>
                  <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Teléfono 1</p><p className="text-base text-slate-900 font-semibold">{empresa.tecTelefono1 ? <a href={`tel:${empresa.tecTelefono1}`} className="text-blue-600 hover:underline">{empresa.tecTelefono1}</a> : "—"}</p></div>
                  <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Teléfono 2</p><p className="text-base text-slate-900 font-semibold">{empresa.tecTelefono2 ? <a href={`tel:${empresa.tecTelefono2}`} className="text-blue-600 hover:underline">{empresa.tecTelefono2}</a> : "—"}</p></div>
                  <div className="md:col-span-2 space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</p><p className="text-base text-slate-900 font-semibold">{empresa.tecEmail ? <a href={`mailto:${String(empresa.tecEmail)}`} className="text-blue-600 hover:underline">{String(empresa.tecEmail)}</a> : "—"}</p></div>
                  <div className="md:col-span-2 space-y-1.5"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nivel de Autorización</p><p className="text-base text-slate-900 font-semibold">{empresa.nivelAutorizacion || "—"}</p></div>
                </div>
              )}
            </div>
            </>
          )}

          {/* TAB: Contrato & SLA (unified) */}
          {(activeTab === 'contrato-sla' || activeTab === 'contrato' || activeTab === 'sla') && (
            <ContratoSlaTab
              empresaId={empresaId!}
              sedes={sedesForTab}
              usuariosAdmin={usuariosAdmin}
            />
          )}

          

          {/* TAB: Historial */}
          {activeTab === 'historial' && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Historial</h2>
              </div>
              <p className="text-slate-500 text-sm mb-5">Visualiza el historial completo de cambios y eventos de la empresa.</p>
              <button
                onClick={() => handleGuardedNavigation(`/admin/empresas/${empresaId}/historial`)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm"
              >
                📊 Ir al Historial Completo
              </button>
            </div>
          )}

          {/* TAB: Sedes */}
          {activeTab === 'sedes' && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-7">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-7 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-50 rounded-xl">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Sedes Registradas</h2>
                </div>
                <button onClick={() => setShowCreateSedeModal(true)} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2 px-5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm whitespace-nowrap">
                  + Nueva Sede
                </button>
              </div>

              {sedes.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-slate-300 text-5xl mb-3">🏢</div>
                  <p className="text-slate-500 font-medium">No hay sedes registradas</p>
                  <p className="text-slate-400 text-sm mt-1">Crea tu primera sede para empezar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {sedes.map((sede, index) => (
                    <div key={index} className={`border rounded-xl p-5 transition-all group ${sede.activo === false ? "border-slate-200 bg-slate-50" : "bg-white border-slate-200 hover:shadow-md hover:border-orange-200"}`}>
                      <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
                        <div className="flex-1">
                          <h3 className={`text-base font-bold transition-colors mb-1 ${sede.activo === false ? "text-slate-400" : "text-slate-900 group-hover:text-orange-600"}`}>
                            {String(sede.nombre) || "Sin nombre"}
                          </h3>
                          <div className="flex gap-1.5 flex-wrap">
                            {sede.tipo && <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full border border-orange-200">{String(sede.tipo).charAt(0).toUpperCase() + String(sede.tipo).slice(1)}</span>}
                            {sede.activo === false && <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full border border-slate-300">Inactiva</span>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          <button onClick={() => { setSelectedSede(sede); setShowCreateSedeModal(true); }} disabled={sede.activo === false}
                            className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-all ${sede.activo === false ? "text-slate-300 bg-slate-100 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100"}`}>
                            ✏️ Editar
                          </button>
                          <button onClick={() => handleGuardedNavigation(`/admin/empresas/${empresaId}/sedes/${sede._id ?? sede.id}/inventario`)} disabled={sede.activo === false}
                            className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-all ${sede.activo === false ? "text-slate-300 bg-slate-100 cursor-not-allowed" : "text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}>
                            📦 Inventario
                          </button>
                          <button onClick={() => setSedeToDelete(sede)}
                            className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-all ${sede.activo === false ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "text-slate-600 bg-slate-100 hover:bg-slate-200"}`}>
                            {sede.activo === false ? "✅ Activar" : "⏸️ Desactivar"}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {sede.direccion && (
                          <div className="flex items-start gap-2.5">
                            <span className="text-sm mt-0.5 flex-shrink-0">📍</span>
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Dirección</p>
                              <p className={`text-sm font-medium ${sede.activo === false ? "text-slate-400" : "text-slate-700"}`}>{String(sede.direccion)}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-5">
                          {sede.ciudad && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Ciudad</p><p className={`text-sm ${sede.activo === false ? "text-slate-400" : "text-slate-700"}`}>{String(sede.ciudad)}</p></div>}
                          {sede.provincia && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Provincia</p><p className={`text-sm ${sede.activo === false ? "text-slate-400" : "text-slate-700"}`}>{String(sede.provincia)}</p></div>}
                        </div>
                        {sede.telefono && (
                          <div className="flex items-start gap-2.5">
                            <span className="text-sm mt-0.5 flex-shrink-0">📞</span>
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Teléfono</p>
                              <a href={`tel:${String(sede.telefono)}`} className={`text-sm font-medium ${sede.activo === false ? "text-slate-400" : "text-orange-600 hover:text-orange-700"}`}>{String(sede.telefono)}</a>
                            </div>
                          </div>
                        )}
                        {sede.email && (
                          <div className="flex items-start gap-2.5">
                            <span className="text-sm mt-0.5 flex-shrink-0">📧</span>
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Email</p>
                              <a href={`mailto:${String(sede.email)}`} className={`text-sm font-medium break-all ${sede.activo === false ? "text-slate-400" : "text-orange-600 hover:text-orange-700"}`}>{String(sede.email)}</a>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-5 pt-1">
                          {sede.responsable && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Responsable</p><p className={`text-sm ${sede.activo === false ? "text-slate-400" : "text-slate-700"}`}>{String(sede.responsable)}</p></div>}
                          {sede.cargoResponsable && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Cargo</p><p className={`text-sm ${sede.activo === false ? "text-slate-400" : "text-slate-700"}`}>{String(sede.cargoResponsable)}</p></div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Modales globales */}
      <CreateSedeModal
        isOpen={showCreateSedeModal}
        empresaId={empresaId || ""}
        sedeId={selectedSede?._id ?? selectedSede?.id}
        initialData={selectedSede ?? undefined}
        onClose={() => { setShowCreateSedeModal(false); setSelectedSede(null); }}
        onSuccess={() => {
          if (empresaId) {
            getSedesByEmpresa(empresaId).then((sedesData) => { setSedes(Array.isArray(sedesData) ? sedesData : sedesData.data || []); }).catch(err => console.error("Error al cargar sedes:", err));
          }
          setSelectedSede(null);
          setShowCreateSedeModal(false);
        }}
      />

      <CreateEmpresaWizard
        key={`empresa-edit-${empresaId}-${showEditEmpresaModal ? 'open' : 'closed'}`}
        isOpen={showEditEmpresaModal}
        mode="edit"
        empresaId={empresaId}
        initialData={empresaEditInitialData}
        onClose={() => setShowEditEmpresaModal(false)}
        onSuccess={async () => {
          if (empresaId) {
            try {
              const updated = await getEmpresaById(empresaId);
              setEmpresa(updated);
              const sedesData = await getSedesByEmpresa(empresaId, true);
              setSedes(Array.isArray(sedesData) ? sedesData : sedesData.data || []);
              const usuarios = await getUsuariosByEmpresa(empresaId);
              setEmpresaUsuarios(Array.isArray(usuarios) ? usuarios : []);
            } catch (err) {
              console.error("Error al recargar empresa:", err);
            }
          }
          setShowEditEmpresaModal(false);
        }}
      />

      <DeleteSedeModal
        isOpen={!!sedeToDelete}
        sedeName={sedeToDelete?.nombre || ""}
        isActive={sedeToDelete?.activo !== false}
        onClose={() => setSedeToDelete(null)}
        onConfirm={handleToggleSede}
        isProcessing={isDeleting}
      />

      {/* Modal confirmación SLA sin guardar */}
      {showUnsavedConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleCancelUnsavedExit} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-7 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-10a9 9 0 110 18 9 9 0 010-18z" /></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">¿Estás seguro de salir?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Los formularios SLA se reiniciarán.</p>
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-5">Si continúas, se borrarán de la base de datos las secciones SLA ya guardadas.</p>
            <div className="flex gap-3">
              <button onClick={handleCancelUnsavedExit} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm">Cancelar</button>
              <button onClick={handleConfirmUnsavedExit} className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors text-sm">Sí, salir y limpiar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg min-w-72 max-w-md ${toastType === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <div className="flex-shrink-0">
              {toastType === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <div className="flex-1 text-sm font-medium">{toastMessage}</div>
            <button onClick={() => setShowToast(false)} className="flex-shrink-0 hover:opacity-80">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpresaDetailPage;
