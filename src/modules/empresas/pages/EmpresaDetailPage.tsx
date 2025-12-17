import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEmpresaById } from "@/modules/empresas/services/empresasService";
import { getSedesByEmpresa, toggleSedeActivo } from "@/modules/empresas/services/sedesService";
import { getContratoActivo, createContrato, updateContratoDatos, updateContratoServicios, updateContratoPreventivo, updateContratoEconomicos, uploadContratoDocumentos, deleteContratoDocumento } from "@/modules/empresas/services/contratosService";
import CreateSedeModal from "@/modules/empresas/components/CreateSedeModal";
import CreateEmpresaModal from "@/modules/empresas/components/CreateEmpresaModal";
import DeleteSedeModal from "./../components/DeleteSedeModal";

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

const EmpresaDetailPage = () => {
  const { empresaId } = useParams<{ empresaId: string }>();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSedeModal, setShowCreateSedeModal] = useState(false);
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [showEditEmpresaModal, setShowEditEmpresaModal] = useState(false);
  const [sedeToDelete, setSedeToDelete] = useState<Sede | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'sedes' | 'contactos' | 'contrato' | 'sla' | 'mantenimientos' | 'historial'>('general');
  
  // Estados de contrato
  const [contractId, setContractId] = useState<string | null>(null);
  const [savingDatos, setSavingDatos] = useState(false);
  const [savingServicios, setSavingServicios] = useState(false);
  const [savingPreventivo, setSavingPreventivo] = useState(false);
  const [savingEconomicos, setSavingEconomicos] = useState(false);
  const [savingContrato, setSavingContrato] = useState(false);
  const [contratoSuccess, setContratoSuccess] = useState<string | null>(null);
  const [savingContratoTotal, setSavingContratoTotal] = useState(false);
  
  // Estados para modal de documentos
  const [showDocumentosModal, setShowDocumentosModal] = useState(false);
  const [documentosTemp, setDocumentosTemp] = useState<Array<{ file: File; tipo: string }>>([]);
  
  // Estados para modal de motivo
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoInput, setMotivoInput] = useState('');
  const [motivoCallback, setMotivoCallback] = useState<((motivo: string) => void) | null>(null);
  
  // Estados para modo edición/visualización de cada sección
  // Por defecto, mostrar formularios para que el usuario pueda rellenarlos y guardar.
  const [editModoDatos, setEditModoDatos] = useState(true);
  const [editModoServicios, setEditModoServicios] = useState(true);
  const [editModoPreventivo, setEditModoPreventivo] = useState(true);
  const [editModoEconomicos, setEditModoEconomicos] = useState(true);
  
  // Flags para rastrear si cada sección ya fue guardada (para distinguir creación de edición)
  const [serviciosGuardados, setServiciosGuardados] = useState(false);
  const [preventivoGuardado, setPreventivoGuardado] = useState(false);
  const [economicosGuardados, setEconomicosGuardados] = useState(false);
  
  // Estado para Datos del Contrato
  const [contratoData, setContratoData] = useState({
    tipoContrato: '',
    estadoContrato: '',
    fechaInicio: '',
    fechaFin: '',
    renovacionAutomatica: true,
    responsableComercial: '',
    observacionesContractuales: ''
  });

  // Estado para Servicios Incluidos
  const [serviciosIncluidos, setServiciosIncluidos] = useState({
    soporteRemoto: false,
    soportePresencial: false,
    mantenimientoPreventivo: false,
    gestionInventario: false,
    gestionCredenciales: false,
    monitoreo: false,
    informesMensuales: false,
    gestionAccesos: false,
    horasMensualesIncluidas: '',
    excesoHorasFacturable: false,
  });

  // Estado para Mantenimientos Preventivos
  const [preventivoData, setPreventivoData] = useState({
    incluyePreventivo: false,
    frecuencia: '',
    modalidad: '',
    aplica: '',
    observaciones: '',
  });

  // Estado para Condiciones Económicas
  const [economicasData, setEconomicasData] = useState({
    tipoFacturacion: '',
    montoReferencial: '',
    moneda: '',
    diaFacturacion: '',
    observaciones: '',
  });

  // Estado para Documentos del Contrato
  const [documentosContrato, setDocumentosContrato] = useState<Array<{ 
    id?: string;
    _id?: string;
    archivo: string;
    url?: string;
    fecha: string; 
    hora: string; 
    usuario: string;
    tipo: string;
  }>>([]);

  // Estado para Historial del Contrato
  const [historialContrato, setHistorialContrato] = useState<Array<{
    campo: string;
    valorAnterior: string;
    valorNuevo: string;
    motivo?: string;
    fecha: string;
    usuario: string;
    tipoAccion?: string;
  }>>([]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase() || name.slice(0, 2).toUpperCase();
  };

  const mapHistorialContrato = (history: any[]) => {
    setHistorialContrato(history.map((h: any) => {
      let tipoAccion = 'EDICION';
      const campoRaw = h.campo || h.fieldChanged || '';
      const campo = campoRaw.toLowerCase();
      const valorNuevo = (h.valorNuevo || h.newValue || '').toLowerCase();

      if (typeof h.tipoAccion === 'string' && h.tipoAccion.trim()) {
        tipoAccion = h.tipoAccion.trim().toUpperCase();
      } else if (campoRaw === 'Creación del Contrato') {
        tipoAccion = 'CREACION';
      } else if (
        campo.includes('eliminación') ||
        campo.includes('eliminado') ||
        campo.includes('deleted') ||
        (campo.includes('documento') && (campo.includes('borrado') || campo.includes('eliminado'))) ||
        (valorNuevo === '—' && campo.includes('documento'))
      ) {
        tipoAccion = 'ELIMINACION';
      }

      return {
        campo: campoRaw,
        valorAnterior: h.valorAnterior || h.oldValue || '—',
        valorNuevo: h.valorNuevo || h.newValue || '—',
        motivo: h.motivo || h.reason,
        fecha: new Date(h.fecha || h.timestamp).toLocaleString('es-PE'),
        usuario: h.usuario || h.user || 'Sistema',
        tipoAccion,
      };
    }));
  };

  const refreshContratoHistorial = async () => {
    if (!empresaId) return;
    try {
      const contratoActivo = await getContratoActivo(empresaId);
      if (contratoActivo?.history) {
        mapHistorialContrato(contratoActivo.history);
      }
    } catch (e) {
      console.warn('No se pudo refrescar el historial:', e);
    }
  };

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
        console.error(err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [empresaId]);

  // Cargar contrato activo al cambiar a tab contrato
  useEffect(() => {
    if (!empresaId || activeTab !== 'contrato') return;

    const fetchContratoActivo = async () => {
      try {
        const contratoActivo = await getContratoActivo(empresaId);
        if (contratoActivo) {
          setContractId(contratoActivo._id || contratoActivo.id);
          // Si existe un contrato activo, por defecto mostrar vista resumida con botón Editar
          setEditModoDatos(false);
          setEditModoServicios(false);
          setEditModoPreventivo(false);
          setEditModoEconomicos(false);
          // Marcar como guardados si ya existen
          setServiciosGuardados(true);
          setPreventivoGuardado(true);
          setEconomicosGuardados(true);
          setContratoData({
            tipoContrato: contratoActivo.tipoContrato || '',
            estadoContrato: contratoActivo.estadoContrato || '',
            fechaInicio: contratoActivo.fechaInicio ? contratoActivo.fechaInicio.split('T')[0] : '',
            fechaFin: contratoActivo.fechaFin ? contratoActivo.fechaFin.split('T')[0] : '',
            renovacionAutomatica: contratoActivo.renovacionAutomatica ?? true,
            responsableComercial: contratoActivo.responsableComercial || '',
            observacionesContractuales: contratoActivo.observaciones || '',
          });
          if (contratoActivo.services) {
            setServiciosIncluidos({
              soporteRemoto: contratoActivo.services.soporteRemoto || false,
              soportePresencial: contratoActivo.services.soportePresencial || false,
              mantenimientoPreventivo: contratoActivo.services.mantenimientoPreventivo || false,
              gestionInventario: contratoActivo.services.gestionInventario || false,
              gestionCredenciales: contratoActivo.services.gestionCredenciales || false,
              monitoreo: contratoActivo.services.monitoreo || false,
              informesMensuales: contratoActivo.services.informesMensuales || false,
              gestionAccesos: contratoActivo.services.gestionAccesos || false,
              horasMensualesIncluidas: contratoActivo.services.horasMensualesIncluidas || '',
              excesoHorasFacturable: contratoActivo.services.excesoHorasFacturable || false,
            });
          }
          if (contratoActivo.preventivePolicy) {
            setPreventivoData({
              incluyePreventivo: contratoActivo.preventivePolicy.incluyePreventivo || false,
              frecuencia: contratoActivo.preventivePolicy.frecuencia || '',
              modalidad: contratoActivo.preventivePolicy.modalidad || '',
              aplica: contratoActivo.preventivePolicy.aplica || '',
              observaciones: contratoActivo.preventivePolicy.observaciones || '',
            });
          }
          if (contratoActivo.economics) {
            setEconomicasData({
              tipoFacturacion: contratoActivo.economics.tipoFacturacion || '',
              montoReferencial: contratoActivo.economics.montoReferencial || '',
              moneda: contratoActivo.economics.moneda || '',
              diaFacturacion: contratoActivo.economics.diaFacturacion || '',
              observaciones: contratoActivo.economics.observaciones || '',
            });
          }
          if (contratoActivo.documents) {
            setDocumentosContrato(contratoActivo.documents.map((doc: any) => {
              const fechaDoc = doc.fechaSubida || doc.fecha_subida || doc.createdAt || doc.created_at;
              const fecha = fechaDoc ? new Date(fechaDoc) : null;
              return {
                id: doc.id,
                _id: doc._id,
                archivo: doc.nombre || doc.archivo || doc.filename || doc.nombre_archivo || 'documento.pdf',
                url: doc.url || doc.ruta || doc.path || '',
                fecha: fecha && !isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-PE') : '—',
                hora: fecha && !isNaN(fecha.getTime()) ? fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—',
                usuario: doc.usuarioSubida || doc.usuario_subida || doc.usuario || doc.uploadedBy || 'Sistema',
                tipo: doc.tipo || doc.type || '',
              };
            }));
          }
          if (contratoActivo.history) {
            mapHistorialContrato(contratoActivo.history);
          }
        }
      } catch (err) {
        console.warn('No se pudo cargar el contrato activo:', err);
      }
    };

    fetchContratoActivo();
  }, [empresaId, activeTab]);

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

  const pedirMotivo = (callback: (motivo: string) => void) => {
    setMotivoInput('');
    setMotivoCallback(() => callback);
    setShowMotivoModal(true);
  };

  const handleConfirmarMotivo = () => {
    if (!motivoInput.trim()) {
      alert('El motivo es obligatorio');
      return;
    }
    if (motivoCallback) {
      motivoCallback(motivoInput.trim());
    }
    setShowMotivoModal(false);
    setMotivoInput('');
    setMotivoCallback(null);
  };

  // Handlers para guardar cambios en contrato
  const handleSaveDatosContrato = async () => {
    console.log('[DEBUG] handleSaveDatosContrato iniciado');
    if (!empresaId) {
      setError('No se ha cargado la empresa');
      return;
    }
    
    // Validar campos obligatorios
    if (!contratoData.tipoContrato || !contratoData.estadoContrato || !contratoData.fechaInicio || !contratoData.fechaFin) {
      alert('Por favor complete todos los campos obligatorios (Tipo de contrato, Estado, Fecha inicio y Fecha fin)');
      return;
    }
    
    setSavingDatos(true);
    setError(null);
    setContratoSuccess(null);
    try {
      if (!contractId) {
        console.log('[DEBUG] Creando nuevo contrato...');
        // CREAR contrato nuevo SIN pedir motivo
        const nuevoContrato = await createContrato(empresaId, {
          tipoContrato: contratoData.tipoContrato,
          estadoContrato: contratoData.estadoContrato,
          fechaInicio: contratoData.fechaInicio,
          fechaFin: contratoData.fechaFin,
          renovacionAutomatica: contratoData.renovacionAutomatica,
          responsableComercial: contratoData.responsableComercial,
          observaciones: contratoData.observacionesContractuales,
          motivo: 'Creación inicial del contrato',
        });
        const newId = nuevoContrato?._id || nuevoContrato?.id;
        if (newId) {
          setContractId(newId);
        } else {
          // Fallback: intentar leer el contrato activo para obtener el ID
          try {
            const activo = await getContratoActivo(empresaId);
            if (activo && (activo._id || activo.id)) {
              setContractId(activo._id || activo.id);
            }
          } catch (e) {
            console.warn('No se pudo obtener el ID del contrato recién creado:', e);
          }
        }
        
        // Recargar contrato activo para obtener el historial actualizado del backend
        try {
          const contratoActualizado = await getContratoActivo(empresaId);
          if (contratoActualizado?.history) {
            setHistorialContrato(contratoActualizado.history.map((h: any) => ({
              campo: h.campo || h.fieldChanged,
              valorAnterior: h.valorAnterior || h.oldValue || '—',
              valorNuevo: h.valorNuevo || h.newValue || '—',
              motivo: h.motivo || h.reason,
              fecha: new Date(h.fecha || h.timestamp).toLocaleString('es-PE'),
              usuario: h.usuario || h.user || 'Sistema',
            })));
          }
        } catch (e) {
          console.warn('No se pudo recargar el historial:', e);
        }
        
        setContratoSuccess('✅ Datos del contrato guardados');
        setEditModoDatos(false);
        await refreshContratoHistorial();
      } else {
        console.log('[DEBUG] Actualizando contrato existente, pidiendo motivo...');
        // ACTUALIZAR contrato existente - PEDIR MOTIVO
        setSavingDatos(false);
        pedirMotivo(async (motivo) => {
          setSavingDatos(true);
          try {
            console.log('[DEBUG] Llamando a updateContratoDatos con motivo:', motivo);
            await updateContratoDatos(empresaId, contractId, {
              tipoContrato: contratoData.tipoContrato,
              fechaInicio: contratoData.fechaInicio,
              fechaFin: contratoData.fechaFin,
              renovacionAutomatica: contratoData.renovacionAutomatica,
              responsableComercial: contratoData.responsableComercial,
              observaciones: contratoData.observacionesContractuales,
              motivo,
            });
            console.log('[DEBUG] updateContratoDatos completado');
            setContratoSuccess('✅ Datos del contrato actualizados');
            setEditModoDatos(false);
            await refreshContratoHistorial();
            setTimeout(() => setContratoSuccess(null), 3000);
          } catch (err) {
            console.error('[DEBUG] Error en updateContratoDatos:', err);
            const errorMsg = err instanceof Error ? err.message : 'Error al guardar datos del contrato';
            setError(errorMsg);
          } finally {
            setSavingDatos(false);
          }
        });
        return;
      }
    } catch (err) {
      console.error('[DEBUG] Error en handleSaveDatosContrato:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar datos del contrato';
      setError(errorMsg);
    } finally {
      console.log('[DEBUG] Reseteando flag savingDatos');
      setSavingDatos(false);
    }
  };

  const handleSaveServicios = async () => {
    console.log('[DEBUG] handleSaveServicios iniciado');
    if (!empresaId) {
      setError('No se ha cargado la empresa');
      return;
    }
    if (!contractId) {
      alert('⚠️ Primero debes guardar los Datos del Contrato');
      return;
    }

    // Solo pedir motivo si ya fue guardado antes (edición)
    if (serviciosGuardados) {
      console.log('[DEBUG] Pidiendo motivo (es edición)');
      setSavingServicios(false);
      pedirMotivo((motivo) => {
        handleSaveServiciosConMotivo(motivo);
      });
      return;
    }

    // Primera vez: guardar sin pedir motivo
    handleSaveServiciosConMotivo('Configuración inicial de servicios incluidos');
  };

  const handleSaveServiciosConMotivo = async (motivo: string) => {
    if (!empresaId || !contractId) {
      setError('No se ha cargado la empresa o contrato');
      return;
    }

    console.log('[DEBUG] Iniciando guardado de servicios con motivo:', motivo);
    setSavingServicios(true);
    setError(null);
    setContratoSuccess(null);
    try {
      console.log('[DEBUG] Llamando a updateContratoServicios...');
      await updateContratoServicios(empresaId, contractId, {
        soporteRemoto: serviciosIncluidos.soporteRemoto,
        soportePresencial: serviciosIncluidos.soportePresencial,
        mantenimientoPreventivo: serviciosIncluidos.mantenimientoPreventivo,
        gestionInventario: serviciosIncluidos.gestionInventario,
        gestionCredenciales: serviciosIncluidos.gestionCredenciales,
        monitoreo: serviciosIncluidos.monitoreo,
        informesMensuales: serviciosIncluidos.informesMensuales,
        gestionAccesos: serviciosIncluidos.gestionAccesos,
        horasMensualesIncluidas: serviciosIncluidos.horasMensualesIncluidas ? Number(serviciosIncluidos.horasMensualesIncluidas) : undefined,
        excesoHorasFacturable: serviciosIncluidos.excesoHorasFacturable,
        motivo,
      });
      console.log('[DEBUG] updateContratoServicios completado exitosamente');
      setContratoSuccess('✅ Servicios incluidos guardados');
      setServiciosGuardados(true);
      setEditModoServicios(false);
      await refreshContratoHistorial();
      setTimeout(() => setContratoSuccess(null), 3000);
    } catch (err) {
      console.error('[DEBUG] Error en updateContratoServicios:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar servicios';
      setError(errorMsg);
    } finally {
      console.log('[DEBUG] Reseteando flag savingServicios');
      setSavingServicios(false);
    }
  };

  const handleSavePreventivo = async () => {
    if (!empresaId) {
      setError('No se ha cargado la empresa');
      return;
    }
    if (!contractId) {
      alert('⚠️ Primero debes guardar los Datos del Contrato');
      return;
    }

    // Solo pedir motivo si ya fue guardado antes (edición)
    if (preventivoGuardado) {
      setSavingPreventivo(false);
      pedirMotivo((motivo) => {
        handleSavePreventivoConMotivo(motivo);
      });
      return;
    }

    // Primera vez: guardar sin pedir motivo
    handleSavePreventivoConMotivo('Configuración inicial de mantenimiento preventivo');
  };

  const handleSavePreventivoConMotivo = async (motivo: string) => {
    if (!empresaId || !contractId) {
      setError('No se ha cargado la empresa o contrato');
      return;
    }

    setSavingPreventivo(true);
    setError(null);
    setContratoSuccess(null);
    try {
      await updateContratoPreventivo(empresaId, contractId, {
        incluyePreventivo: preventivoData.incluyePreventivo,
        frecuencia: preventivoData.frecuencia,
        modalidad: preventivoData.modalidad,
        aplica: preventivoData.aplica,
        observaciones: preventivoData.observaciones,
        motivo,
      });
      setContratoSuccess('✅ Mantenimiento preventivo guardado');
      setPreventivoGuardado(true);
      setEditModoPreventivo(false);
      await refreshContratoHistorial();
      setTimeout(() => setContratoSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar preventivo';
      setError(errorMsg);
    } finally {
      setSavingPreventivo(false);
    }
  };

  const handleSaveEconomicos = async () => {
    if (!empresaId) {
      setError('No se ha cargado la empresa');
      return;
    }
    if (!contractId) {
      alert('⚠️ Primero debes guardar los Datos del Contrato');
      return;
    }

    // Solo pedir motivo si ya fue guardado antes (edición)
    if (economicosGuardados) {
      setSavingEconomicos(false);
      pedirMotivo((motivo) => {
        handleSaveEconomicosConMotivo(motivo);
      });
      return;
    }

    // Primera vez: guardar sin pedir motivo
    handleSaveEconomicosConMotivo('Configuración inicial de condiciones económicas');
  };

  const handleSaveEconomicosConMotivo = async (motivo: string) => {
    if (!empresaId || !contractId) {
      setError('No se ha cargado la empresa o contrato');
      return;
    }

    setSavingEconomicos(true);
    setError(null);
    setContratoSuccess(null);
    try {
      await updateContratoEconomicos(empresaId, contractId, {
        tipoFacturacion: economicasData.tipoFacturacion,
        moneda: economicasData.moneda,
        montoReferencial: economicasData.montoReferencial ? Number(economicasData.montoReferencial) : undefined,
        diaFacturacion: economicasData.diaFacturacion ? Number(economicasData.diaFacturacion) : undefined,
        observaciones: economicasData.observaciones,
        motivo,
      });
      setContratoSuccess('✅ Condiciones económicas guardadas');
      setEconomicosGuardados(true);
      setEditModoEconomicos(false);
      await refreshContratoHistorial();
      setTimeout(() => setContratoSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar condiciones económicas';
      setError(errorMsg);
    } finally {
      setSavingEconomicos(false);
    }
  };

  const handleUploadDocumentos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Agregar los archivos a la lista temporal con tipo por defecto
    const nuevosDocumentos = Array.from(files).map(file => ({
      file,
      tipo: 'otro',
    }));
    
    setDocumentosTemp(prev => [...prev, ...nuevosDocumentos]);
    setShowDocumentosModal(true);
  };
  
  const handleChangeTipoDocumento = (index: number, tipo: string) => {
    setDocumentosTemp(prev => {
      const updated = [...prev];
      updated[index].tipo = tipo;
      return updated;
    });
  };
  
  const handleRemoveDocumentoTemp = (index: number) => {
    setDocumentosTemp(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubirDocumentos = async () => {
    if (!empresaId || !contractId) {
      setError('No hay contrato activo para subir documentos');
      return;
    }
    
    if (documentosTemp.length === 0) {
      alert('Debe seleccionar al menos un documento');
      return;
    }
    
    setSavingContrato(true);
    setError(null);
    setContratoSuccess(null);
    
    try {
      // Subir cada documento
      for (const doc of documentosTemp) {
        const fileList = new DataTransfer();
        fileList.items.add(doc.file);
        await uploadContratoDocumentos(empresaId, contractId, fileList.files, doc.tipo, 'Carga de documentos del contrato');
      }
      
      // Refrescar contrato para obtener documentos actualizados
      const contratoActivo = await getContratoActivo(empresaId);
      if (contratoActivo?.documents) {
        setDocumentosContrato(contratoActivo.documents.map((doc: any) => {
          const fechaDoc = doc.fechaSubida || doc.fecha_subida || doc.createdAt || doc.created_at;
          const fecha = fechaDoc ? new Date(fechaDoc) : null;
          return {
            id: doc.id,
            _id: doc._id,
            archivo: doc.nombre || doc.archivo || doc.filename || doc.nombre_archivo || 'documento.pdf',
            url: doc.url || doc.ruta || doc.path || '',
            fecha: fecha && !isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-PE') : '—',
            hora: fecha && !isNaN(fecha.getTime()) ? fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—',
            usuario: doc.usuarioSubida || doc.usuario_subida || doc.usuario || doc.uploadedBy || 'Sistema',
            tipo: doc.tipo || doc.type || '',
          };
        }));
      }
      if (contratoActivo?.history) {
        mapHistorialContrato(contratoActivo.history);
      }
      
      setContratoSuccess('✅ Documentos subidos correctamente');
      setDocumentosTemp([]);
      setShowDocumentosModal(false);
      setTimeout(() => setContratoSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al subir documentos';
      setError(errorMsg);
    } finally {
      setSavingContrato(false);
    }
  };

  // Guardado global: crea/actualiza datos y luego servicios, preventivo y económicos
  const handleSaveContratoCompleto = async () => {
    if (!empresaId) {
      setError('No se ha cargado la empresa');
      return;
    }
    // Validar datos obligatorios
    if (!contratoData.tipoContrato || !contratoData.estadoContrato || !contratoData.fechaInicio || !contratoData.fechaFin) {
      alert('Completa Tipo de contrato, Estado, Fecha inicio y Fecha fin');
      return;
    }

    setSavingContratoTotal(true);
    setError(null);
    setContratoSuccess(null);
    try {
      let wasExisting = Boolean(contractId);
      let motivoAll: string | undefined = undefined;

      // Crear si no existe
      if (!contractId) {
        const nuevo = await createContrato(empresaId, {
          tipoContrato: contratoData.tipoContrato,
          estadoContrato: contratoData.estadoContrato,
          fechaInicio: contratoData.fechaInicio,
          fechaFin: contratoData.fechaFin,
          renovacionAutomatica: contratoData.renovacionAutomatica,
          responsableComercial: contratoData.responsableComercial,
          observaciones: contratoData.observacionesContractuales,
          motivo: 'Creación inicial del contrato',
        });
        const newId = nuevo?._id || nuevo?.id;
        if (newId) {
          setContractId(newId);
        } else {
          try {
            const activo = await getContratoActivo(empresaId);
            if (activo && (activo._id || activo.id)) {
              setContractId(activo._id || activo.id);
            }
          } catch (e) {
            console.warn('No se pudo obtener ID del contrato recién creado:', e);
          }
        }
      } else {
        // Si ya existe, pedir un único motivo para los cambios
        const m = prompt('Motivo del cambio (aplicará a todas las secciones):');
        if (!m || m.trim() === '') {
          alert('El motivo es obligatorio');
          setSavingContratoTotal(false);
          return;
        }
        motivoAll = m.trim();
      }

      const idToUse = contractId;
      if (!idToUse) {
        throw new Error('No se pudo determinar el ID del contrato');
      }

      // Actualizar Datos del contrato si es edición
      if (wasExisting) {
        await updateContratoDatos(empresaId, idToUse, {
          tipoContrato: contratoData.tipoContrato,
          fechaInicio: contratoData.fechaInicio,
          fechaFin: contratoData.fechaFin,
          renovacionAutomatica: contratoData.renovacionAutomatica,
          responsableComercial: contratoData.responsableComercial,
          observaciones: contratoData.observacionesContractuales,
          motivo: motivoAll!,
        });
      }

      // Servicios incluidos
      await updateContratoServicios(empresaId, idToUse, {
        soporteRemoto: serviciosIncluidos.soporteRemoto,
        soportePresencial: serviciosIncluidos.soportePresencial,
        mantenimientoPreventivo: serviciosIncluidos.mantenimientoPreventivo,
        gestionInventario: serviciosIncluidos.gestionInventario,
        gestionCredenciales: serviciosIncluidos.gestionCredenciales,
        monitoreo: serviciosIncluidos.monitoreo,
        informesMensuales: serviciosIncluidos.informesMensuales,
        gestionAccesos: serviciosIncluidos.gestionAccesos,
        horasMensualesIncluidas: serviciosIncluidos.horasMensualesIncluidas ? Number(serviciosIncluidos.horasMensualesIncluidas) : undefined,
        excesoHorasFacturable: serviciosIncluidos.excesoHorasFacturable,
        motivo: wasExisting ? motivoAll! : 'Configuración inicial de servicios',
      });

      // Preventivo
      await updateContratoPreventivo(empresaId, idToUse, {
        incluyePreventivo: preventivoData.incluyePreventivo,
        frecuencia: preventivoData.frecuencia,
        modalidad: preventivoData.modalidad,
        aplica: preventivoData.aplica,
        observaciones: preventivoData.observaciones,
        motivo: wasExisting ? motivoAll! : 'Configuración inicial de preventivo',
      });

      // Económicos
      await updateContratoEconomicos(empresaId, idToUse, {
        tipoFacturacion: economicasData.tipoFacturacion,
        moneda: economicasData.moneda,
        montoReferencial: economicasData.montoReferencial ? Number(economicasData.montoReferencial) : undefined,
        diaFacturacion: economicasData.diaFacturacion ? Number(economicasData.diaFacturacion) : undefined,
        observaciones: economicasData.observaciones,
        motivo: wasExisting ? motivoAll! : 'Configuración inicial de condiciones económicas',
      });

      setContratoSuccess(wasExisting ? 'Contrato actualizado correctamente' : 'Contrato creado y configurado');
      // Tras guardar todo, mostrar vista resumen (no edición)
      setEditModoDatos(false);
      setEditModoServicios(false);
      setEditModoPreventivo(false);
      setEditModoEconomicos(false);
      setTimeout(() => setContratoSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el contrato completo';
      setError(msg);
    } finally {
      setSavingContratoTotal(false);
    }
  };

  const handleDeleteDocumento = async (docId: string) => {
    if (!empresaId || !contractId) {
      setError('No hay contrato activo');
      return;
    }
    
    pedirMotivo((motivo) => {
      handleDeleteDocumentoConMotivo(docId, motivo);
    });
  };

  const handleDeleteDocumentoConMotivo = async (docId: string, motivo: string) => {
    if (!empresaId || !contractId) {
      setError('No hay contrato activo');
      return;
    }
    
    setSavingContrato(true);
    setError(null);
    setContratoSuccess(null);
    try {
      await deleteContratoDocumento(empresaId, contractId, docId, motivo);
      setDocumentosContrato(prev => prev.filter(doc => (doc._id || doc.id) !== docId));
      await refreshContratoHistorial();
      setContratoSuccess('✅ Documento eliminado correctamente');
      setTimeout(() => setContratoSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al eliminar documento';
      setError(errorMsg);
    } finally {
      setSavingContrato(false);
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
            onClick={() => navigate("/admin/empresas")}
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-50 px-4 py-8 md:p-8">
      {error && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
          </div>
        </div>
      )}

      {contratoSuccess && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">Éxito</p>
              <p className="text-sm mt-1">{contratoSuccess}</p>
            </div>
            <button onClick={() => setContratoSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">✕</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/admin/empresas")}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm mb-8 flex items-center gap-1 hover:gap-2 transition-all"
        >
          ← Volver a Empresas
        </button>

        {/* Header Card - NOT IN TABS */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-10 border border-slate-100">
          <div className="h-32 bg-linear-to-r from-blue-600 via-blue-500 to-indigo-600" />
          <div className="px-8 pb-8 -mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-6 flex-1">
              <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center ring-4 ring-white shrink-0">
                <div className="w-20 h-20 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold">
                  {getInitials(empresa.nombre)}
                </div>
              </div>
              <div className="flex-1 pt-2">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{empresa.nombre}</h1>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {empresa.codigoCliente && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-mono bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">Código: {empresa.codigoCliente}</span>
                  )}
                  {empresa.estadoContrato && (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide ${
                      empresa.estadoContrato === "activo"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : empresa.estadoContrato === "suspendido"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}>
                      {String(empresa.estadoContrato).replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                {empresa.paginaWeb && (
                  <a href={String(empresa.paginaWeb)} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                    🌐 {String(empresa.paginaWeb)}
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-3 flex-col sm:flex-row w-full md:w-auto">
              <button
                onClick={() => setShowEditEmpresaModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-md flex items-center justify-center gap-2"
              >
                ✏️ Editar
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Sticky */}
        <div className="bg-white rounded-xl shadow-md border border-slate-100 mb-8 sticky top-4 z-40">
          <div className="flex flex-wrap items-center gap-1 p-2 overflow-x-auto">
            {[
              { id: 'general', label: 'Información General', icon: '📋' },
              { id: 'sedes', label: 'Sedes', icon: '📍', badge: sedes.length },
              { id: 'contactos', label: 'Contactos', icon: '👥' },
              { id: 'contrato', label: 'Contrato', icon: '📄' },
              { id: 'sla', label: 'SLA', icon: '⚡' },
              { id: 'mantenimientos', label: 'Mantenimientos', icon: '🔧' },
              { id: 'historial', label: 'Historial', icon: '📊' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.icon} {tab.label}
                {tab.badge && <span className="ml-1 px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* TAB: Información General */}
          {activeTab === 'general' && (
            <>
            {/* Tarjeta Principal de Información */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-blue-200">
                <div className="p-3 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Información General de la Empresa</h2>
                  <p className="text-sm text-slate-500 mt-1">Datos esenciales para identificar al cliente</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Nombre de la Empresa */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre de la empresa <span className="text-red-600">*</span></label>
                  <p className="text-lg font-semibold text-slate-900 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">{empresa.nombre || "—"}</p>
                </div>

                {/* RUC */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">RUC <span className="text-red-600">*</span></label>
                  <p className="text-lg font-semibold text-slate-900 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">{empresa.ruc || "—"}</p>
                </div>

                {/* Código Cliente */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Código interno de cliente</label>
                  <p className="text-lg font-semibold text-slate-900 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">{empresa.codigoCliente || "—"}</p>
                </div>

                {/* Dirección Fiscal */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Dirección fiscal</label>
                  <p className="text-lg font-semibold text-slate-900 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">{empresa.direccionFiscal || "—"}</p>
                </div>

                {/* Dirección Operativa */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Dirección operativa</label>
                  <p className="text-lg font-semibold text-slate-900 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">{empresa.direccionOperativa || "—"}</p>
                </div>

                {/* Ciudad */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Ciudad <span className="text-red-600">*</span></label>
                  <p className="text-lg font-semibold text-slate-900 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">{empresa.ciudad || "—"}</p>
                </div>

                {/* Provincia */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Provincia</label>
                  <p className="text-lg font-semibold text-slate-900 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">{empresa.provincia || "—"}</p>
                </div>

                {/* Sector Empresarial */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Sector empresarial <span className="text-slate-400 text-xs">(opcional)</span></label>
                  <p className="text-lg font-semibold text-slate-900 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">{empresa.sector || "—"}</p>
                </div>
              </div>

              {/* Página Web y Estado del Contrato - 2 Columnas */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Página Web */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                  <p className="text-sm font-bold text-slate-700 mb-3">Página web (opcional):</p>
                  {empresa.paginaWeb ? (
                    <a href={String(empresa.paginaWeb)} target="_blank" rel="noopener noreferrer" className="text-base text-blue-600 hover:text-blue-700 break-all">
                      {String(empresa.paginaWeb)}
                    </a>
                  ) : (
                    <p className="text-base text-slate-500">—</p>
                  )}
                </div>

                {/* Estado del Contrato */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                  <p className="text-sm font-bold text-slate-700 mb-3">Estado del contrato:</p>
                  <span className={`inline-block text-base font-semibold ${
                    empresa.estadoContrato === "activo"
                      ? "text-emerald-700"
                      : empresa.estadoContrato === "suspendido"
                      ? "text-amber-700"
                      : "text-rose-700"
                  }`}>
                    {empresa.estadoContrato?.replace(/_/g, " ").toUpperCase() || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-indigo-200">
                <div className="p-3 bg-linear-to-br from-indigo-100 to-indigo-50 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h8m-8 4h6M5 6a2 2 0 012-2h10a2 2 0 012 2v12l-4-3H7a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Observaciones Generales</h2>
              </div>
              {empresa.observacionesGenerales || empresa.observaciones ? (
                <div className="p-6 bg-linear-to-br from-indigo-50 to-slate-50 rounded-xl border border-indigo-200 whitespace-pre-wrap text-slate-800 leading-relaxed font-medium min-h-32">
                  {empresa.observacionesGenerales || empresa.observaciones}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="text-slate-300 text-5xl mb-3">📝</div>
                  <p className="text-slate-500 font-medium">No hay observaciones registradas</p>
                  <p className="text-slate-400 text-sm mt-1">Las notas generales aparecerán aquí</p>
                </div>
              )}
            </div>
            </>
          )}

          {/* TAB: Contactos (Admin + Técnicos) */}
          {activeTab === 'contactos' && (
            <>
            {/* Contactos administrativos */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4m-2 4h12a2 2 0 002-2V11a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm2 0v1a4 4 0 008 0v-1" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Contactos Administrativos</h2>
                </div>
                <span className={`px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap ${
                  empresa.autorizacionFacturacion ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
                }`}>
                  📋 {empresa.autorizacionFacturacion ? "Facturación Autorizada" : "Facturación No Autorizada"}
                </span>
              </div>

              {Array.isArray(empresa.contactosAdmin) && empresa.contactosAdmin.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {empresa.contactosAdmin.map((c, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-10 hover:shadow-lg transition-all bg-linear-to-br from-slate-50 to-white hover:border-green-200">
                      <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-12">
                          <div>
                            <p className="text-sm font-semibold text-slate-500 mb-3">Nombre completo</p>
                            <p className="text-lg font-bold text-slate-900">{c.nombre || "—"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-500 mb-3">Cargo</p>
                            <p className="text-lg font-semibold text-slate-700">{c.cargo || "Sin cargo"}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-12 pt-6 border-t border-slate-200">
                          {c.telefono && (
                            <div>
                              <p className="text-sm font-semibold text-slate-500 mb-3">Teléfono</p>
                              <a href={`tel:${c.telefono}`} className="text-lg font-semibold text-green-600 hover:text-green-700 transition-colors">{c.telefono}</a>
                            </div>
                          )}
                          {c.email && (
                            <div>
                              <p className="text-sm font-semibold text-slate-500 mb-3">Email</p>
                              <a href={`mailto:${c.email}`} className="text-lg font-semibold text-green-600 hover:text-green-700 transition-colors break-all">{c.email}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</p>
                    <p className="text-lg text-slate-900 font-semibold">{empresa.adminNombre || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cargo</p>
                    <p className="text-lg text-slate-900 font-semibold">{empresa.adminCargo || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teléfono</p>
                    <p className="text-lg text-slate-900 font-semibold">{empresa.adminTelefono ? <a href={`tel:${empresa.adminTelefono}`} className="text-blue-600 hover:underline">{empresa.adminTelefono}</a> : "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="text-lg text-slate-900 font-semibold">
                      {empresa.adminEmail ? (
                        <a href={`mailto:${String(empresa.adminEmail)}`} className="text-blue-600 hover:underline">{String(empresa.adminEmail)}</a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Contactos técnicos */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                <div className="p-2.5 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Contactos Técnicos</h2>
              </div>

              {Array.isArray(empresa.contactosTecnicos) && empresa.contactosTecnicos.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {empresa.contactosTecnicos.map((c, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-10 hover:shadow-lg transition-all bg-linear-to-br from-slate-50 to-white hover:border-purple-200">
                      <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-12">
                          <div>
                            <p className="text-sm font-semibold text-slate-500 mb-3">Nombre completo</p>
                            <p className="text-lg font-bold text-slate-900">{c.nombre || "—"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-500 mb-3">Cargo</p>
                            <p className="text-lg font-semibold text-slate-700">{c.cargo || "Sin cargo"}</p>
                          </div>
                        </div>
                        
                        {(c.contactoPrincipal || c.autorizaCambiosCriticos || c.nivelAutorizacion) && (
                          <div className="flex flex-wrap gap-3">
                            {c.contactoPrincipal && <span className="px-4 py-2 rounded-full text-sm bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold whitespace-nowrap">⭐ Principal</span>}
                            {c.autorizaCambiosCriticos && <span className="px-4 py-2 rounded-full text-sm bg-rose-100 text-rose-800 border border-rose-200 font-semibold whitespace-nowrap">🔒 Cambios críticos</span>}
                            {c.nivelAutorizacion && <span className="px-4 py-2 rounded-full text-sm bg-amber-100 text-amber-800 border border-amber-200 font-semibold whitespace-nowrap">📊 {c.nivelAutorizacion.replace(/_/g, " ").toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-12 pt-6 border-t border-slate-200">
                          {c.telefono1 && (
                            <div>
                              <p className="text-sm font-semibold text-slate-500 mb-3">Teléfono principal</p>
                              <a href={`tel:${c.telefono1}`} className="text-lg font-semibold text-purple-600 hover:text-purple-700 transition-colors">{c.telefono1}</a>
                            </div>
                          )}
                          {c.telefono2 && (
                            <div>
                              <p className="text-sm font-semibold text-slate-500 mb-3">Teléfono alterno</p>
                              <a href={`tel:${c.telefono2}`} className="text-lg font-semibold text-purple-600 hover:text-purple-700 transition-colors">{c.telefono2}</a>
                            </div>
                          )}
                          {c.email && (
                            <div>
                              <p className="text-sm font-semibold text-slate-500 mb-3">Email</p>
                              <a href={`mailto:${c.email}`} className="text-lg font-semibold text-purple-600 hover:text-purple-700 transition-colors break-all">{c.email}</a>
                            </div>
                          )}
                          {c.horarioDisponible && (
                            <div>
                              <p className="text-sm font-semibold text-slate-500 mb-3">Horario disponible</p>
                              <p className="text-lg font-semibold text-slate-800">{c.horarioDisponible}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</p>
                    <p className="text-lg text-slate-900 font-semibold">{empresa.tecNombre || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cargo</p>
                    <p className="text-lg text-slate-900 font-semibold">{empresa.tecCargo || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teléfono 1</p>
                    <p className="text-lg text-slate-900 font-semibold">{empresa.tecTelefono1 ? <a href={`tel:${empresa.tecTelefono1}`} className="text-blue-600 hover:underline">{empresa.tecTelefono1}</a> : "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teléfono 2</p>
                    <p className="text-lg text-slate-900 font-semibold">{empresa.tecTelefono2 ? <a href={`tel:${empresa.tecTelefono2}`} className="text-blue-600 hover:underline">{empresa.tecTelefono2}</a> : "—"}</p>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="text-lg text-slate-900 font-semibold">
                      {empresa.tecEmail ? (
                        <a href={`mailto:${String(empresa.tecEmail)}`} className="text-blue-600 hover:underline">{String(empresa.tecEmail)}</a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nivel de Autorización</p>
                    <p className="text-lg text-slate-900 font-semibold">{empresa.nivelAutorizacion || "—"}</p>
                  </div>
                </div>
              )}
            </div>
            </>
          )}

          {/* TAB: Contrato - Placeholder */}
          {activeTab === 'contrato' && (
            <div className="space-y-8">
              {console.log('[DEBUG] Renderizando pestaña Contrato')}
              {/* Header */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gestión de Contratos</h2>
                    <p className="text-sm text-slate-500 mt-1">Administración centralizada del contrato activo</p>
                  </div>
                </div>
              </div>

              {/* Datos del Contrato */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">📋 Datos del Contrato</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Información principal del contrato activo (Campos obligatorios marcados con *)</p>
                    </div>
                  </div>
                  {contractId && !editModoDatos && (
                    <button
                      onClick={() => setEditModoDatos(true)}
                      className="px-4 py-2 rounded-lg font-semibold text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>

                {!contractId || editModoDatos ? (
                <div className="space-y-8">
                  {/* Fila 1: Tipo de Contrato y Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tipo de Contrato */}
                    <div className="bg-linear-to-br from-blue-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Tipo de contrato <span className="text-red-600">*</span></label>
                      <select 
                        value={contratoData.tipoContrato}
                        onChange={(e) => setContratoData({...contratoData, tipoContrato: e.target.value})}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- SELECCIONAR --</option>
                        <option value="servicios">Soporte Integral</option>
                        <option value="bolsa_horas">Bolsa de Horas</option>
                        <option value="proyecto">Proyecto</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>

                    {/* Estado del Contrato */}
                    <div className="bg-linear-to-br from-green-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Estado del contrato <span className="text-red-600">*</span></label>
                      <select 
                        value={contratoData.estadoContrato}
                        onChange={(e) => setContratoData({...contratoData, estadoContrato: e.target.value})}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">-- SELECCIONAR --</option>
                        <option value="activo">Activo</option>
                        <option value="suspendido">Suspendido</option>
                        <option value="vencido">Vencido</option>
                      </select>
                    </div>
                  </div>

                  {/* Fila 2: Fechas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fecha de Inicio */}
                    <div className="bg-linear-to-br from-amber-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Fecha de inicio <span className="text-red-600">*</span></label>
                      <input 
                        type="date"
                        value={contratoData.fechaInicio}
                        onChange={(e) => setContratoData({...contratoData, fechaInicio: e.target.value})}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Fecha de Fin */}
                    <div className="bg-linear-to-br from-amber-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Fecha de fin <span className="text-red-600">*</span></label>
                      <input 
                        type="date"
                        value={contratoData.fechaFin}
                        onChange={(e) => setContratoData({...contratoData, fechaFin: e.target.value})}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Vigencia y Renovación */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vigencia */}
                    <div className="bg-linear-to-br from-purple-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Vigencia</label>
                      <div className="px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-600 font-medium">
                        {contratoData.fechaInicio && contratoData.fechaFin 
                          ? Math.ceil((new Date(contratoData.fechaFin).getTime() - new Date(contratoData.fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) + ' días'
                          : '— días'
                        }
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Se calcula automáticamente</p>
                    </div>

                    {/* Renovación Automática */}
                    <div className="bg-linear-to-br from-indigo-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Renovación automática</label>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setContratoData({...contratoData, renovacionAutomatica: true})}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            contratoData.renovacionAutomatica 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          ✓ Sí
                        </button>
                        <button 
                          onClick={() => setContratoData({...contratoData, renovacionAutomatica: false})}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            !contratoData.renovacionAutomatica 
                              ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          ✕ No
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Responsable Comercial */}
                  <div className="bg-linear-to-br from-rose-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Responsable comercial (INTISCORP)</label>
                    <input 
                      type="text"
                      value={contratoData.responsableComercial}
                      onChange={(e) => setContratoData({...contratoData, responsableComercial: e.target.value})}
                      placeholder="Nombre del responsable"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {/* Observaciones */}
                  <div className="bg-linear-to-br from-teal-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Observaciones contractuales</label>
                    <textarea 
                      value={contratoData.observacionesContractuales}
                      onChange={(e) => setContratoData({...contratoData, observacionesContractuales: e.target.value})}
                      placeholder="Ingrese las observaciones importantes del contrato..."
                      rows={4}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setEditModoDatos(false)}
                      className="px-6 py-2 rounded-lg font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveDatosContrato}
                      disabled={savingDatos}
                      className="px-6 py-2 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {savingDatos ? 'Guardando...' : '💾 Guardar contenido'}
                    </button>
                  </div>
                </div>
                ) : contractId && (
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <p className="text-sm text-blue-800 font-semibold">✅ Contrato guardado</p>
                    <p className="text-xs text-blue-700 mt-1">Haz clic en "Editar" para realizar cambios</p>
                  </div>
                )}
              </div>

              {/* Servicios Incluidos */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-linear-to-br from-emerald-100 to-green-50 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">✅ Servicios Incluidos</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Define qué cubre el contrato (selección múltiple y parámetros clave).</p>
                    </div>
                  </div>
                  {contractId && !editModoServicios && (
                    <button
                      onClick={() => setEditModoServicios(true)}
                      className="px-4 py-2 rounded-lg font-semibold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>

                {editModoServicios && (
                <div className="space-y-8">
                  {/* Checkboxes principales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'soporteRemoto', label: 'Soporte remoto' },
                      { key: 'soportePresencial', label: 'Soporte presencial' },
                      { key: 'mantenimientoPreventivo', label: 'Mantenimiento preventivo' },
                      { key: 'gestionInventario', label: 'Gestión de inventario' },
                      { key: 'gestionCredenciales', label: 'Gestión de credenciales' },
                      { key: 'monitoreo', label: 'Monitoreo (si aplica)' },
                      { key: 'informesMensuales', label: 'Informes mensuales' },
                      { key: 'gestionAccesos', label: 'Gestión de accesos (recursos compartidos)' },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all bg-linear-to-br from-white to-slate-50 shadow-sm hover:border-emerald-300 ${
                          (serviciosIncluidos as any)[item.key] ? 'border-emerald-300 bg-emerald-50/60 shadow-md' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-emerald-600"
                          checked={(serviciosIncluidos as any)[item.key]}
                          onChange={() => setServiciosIncluidos({
                            ...serviciosIncluidos,
                            [item.key]: !(serviciosIncluidos as any)[item.key],
                          })}
                        />
                        <span className="text-slate-800 font-semibold text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Horas y exceso facturable */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-linear-to-br from-blue-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Horas mensuales incluidas (si es bolsa)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="Ej: 20"
                        value={serviciosIncluidos.horasMensualesIncluidas}
                        onChange={(e) => setServiciosIncluidos({ ...serviciosIncluidos, horasMensualesIncluidas: e.target.value })}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-400 mt-2">Solo aplica para contratos de bolsa de horas.</p>
                    </div>

                    <div className="bg-linear-to-br from-amber-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Exceso de horas facturable</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setServiciosIncluidos({ ...serviciosIncluidos, excesoHorasFacturable: true })}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            serviciosIncluidos.excesoHorasFacturable
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          ✓ Sí
                        </button>
                        <button
                          onClick={() => setServiciosIncluidos({ ...serviciosIncluidos, excesoHorasFacturable: false })}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            !serviciosIncluidos.excesoHorasFacturable
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          ✕ No
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setEditModoServicios(false)}
                      className="px-6 py-2 rounded-lg font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveServicios}
                      disabled={savingServicios}
                      className="px-6 py-2 rounded-lg font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {savingServicios ? 'Guardando...' : '💾 Guardar contenido'}
                    </button>
                  </div>
                </div>
                )}
              </div>

              {/* Mantenimientos Preventivos */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-linear-to-br from-amber-100 to-amber-50 rounded-lg">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">🔧 Mantenimientos Preventivos</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Política vinculada al contrato (define si se generan mantenimientos automáticos).</p>
                    </div>
                  </div>
                  {contractId && !editModoPreventivo && (
                    <button
                      onClick={() => setEditModoPreventivo(true)}
                      className="px-4 py-2 rounded-lg font-semibold text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>

                {editModoPreventivo && (
                <div className="space-y-8">
                  {/* Incluye preventivo */}
                  <div className="bg-linear-to-br from-amber-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                    <label className="text-sm font-bold text-slate-700 mb-3 block">¿Incluye mantenimiento preventivo?</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setPreventivoData({ ...preventivoData, incluyePreventivo: true })}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          preventivoData.incluyePreventivo
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        ✓ Sí
                      </button>
                      <button
                        onClick={() => setPreventivoData({ ...preventivoData, incluyePreventivo: false })}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          !preventivoData.incluyePreventivo
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        ✕ No
                      </button>
                    </div>
                    <p className="text-xs text-amber-600 mt-2">Regla: si el contrato no incluye preventivo, no se generan mantenimientos automáticos.</p>
                  </div>

                  {/* Frecuencia y Modalidad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-linear-to-br from-blue-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Frecuencia</label>
                      <select
                        value={preventivoData.frecuencia}
                        onChange={(e) => setPreventivoData({ ...preventivoData, frecuencia: e.target.value })}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!preventivoData.incluyePreventivo}
                      >
                        <option value="">-- SELECCIONAR --</option>
                        <option value="3m">Cada 3 meses</option>
                        <option value="6m">Cada 6 meses</option>
                        <option value="8m">Cada 8 meses</option>
                        <option value="12m">Cada 12 meses</option>
                      </select>
                    </div>

                    <div className="bg-linear-to-br from-indigo-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Modalidad</label>
                      <select
                        value={preventivoData.modalidad}
                        onChange={(e) => setPreventivoData({ ...preventivoData, modalidad: e.target.value })}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={!preventivoData.incluyePreventivo}
                      >
                        <option value="">-- SELECCIONAR --</option>
                        <option value="presencial">Presencial</option>
                        <option value="remoto">Remoto</option>
                        <option value="mixto">Mixto</option>
                      </select>
                    </div>
                  </div>

                  {/* Aplica a */}
                  <div className="bg-linear-to-br from-purple-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Aplica a</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: 'todos', label: 'Todos los activos' },
                        { value: 'categoria', label: 'Por categoría (PC, servidor, etc.)' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setPreventivoData({ ...preventivoData, aplica: item.value })}
                          disabled={!preventivoData.incluyePreventivo}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            preventivoData.aplica === item.value
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          } ${!preventivoData.incluyePreventivo ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="bg-linear-to-br from-teal-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Observaciones</label>
                    <textarea
                      value={preventivoData.observaciones}
                      onChange={(e) => setPreventivoData({ ...preventivoData, observaciones: e.target.value })}
                      placeholder="Notas adicionales sobre la política de preventivos"
                      rows={4}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                      disabled={!preventivoData.incluyePreventivo}
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setEditModoPreventivo(false)}
                      className="px-6 py-2 rounded-lg font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSavePreventivo}
                      disabled={savingPreventivo}
                      className="px-6 py-2 rounded-lg font-semibold text-sm bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {savingPreventivo ? 'Guardando...' : '💾 Guardar contenido'}
                    </button>
                  </div>
                </div>
                )}
              </div>

              {/* Condiciones Económicas */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-indigo-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-linear-to-br from-indigo-100 to-indigo-50 rounded-lg">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3v1a3 3 0 003 3m0-7c1.657 0 3 1.343 3 3v1a3 3 0 01-3 3m0-7V5m0 10v2m-7-5h14" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">💰 Condiciones Económicas</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Referencia operativa (no contable) para facturación.</p>
                    </div>
                  </div>
                  {contractId && !editModoEconomicos && (
                    <button
                      onClick={() => setEditModoEconomicos(true)}
                      className="px-4 py-2 rounded-lg font-semibold text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>

                {editModoEconomicos && (
                <div className="space-y-8">
                  {/* Tipo de facturación y moneda */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-linear-to-br from-indigo-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Tipo de facturación</label>
                      <select
                        value={economicasData.tipoFacturacion}
                        onChange={(e) => setEconomicasData({ ...economicasData, tipoFacturacion: e.target.value })}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- SELECCIONAR --</option>
                        <option value="mensual">Mensual</option>
                        <option value="por_evento">Por evento</option>
                        <option value="por_horas">Por horas</option>
                      </select>
                    </div>

                    <div className="bg-linear-to-br from-purple-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Moneda</label>
                      <select
                        value={economicasData.moneda}
                        onChange={(e) => setEconomicasData({ ...economicasData, moneda: e.target.value })}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">-- SELECCIONAR --</option>
                        <option value="PEN">PEN</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>

                  {/* Monto y día facturación */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-linear-to-br from-emerald-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Monto referencial</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Ej: 1500"
                        value={economicasData.montoReferencial}
                        onChange={(e) => setEconomicasData({ ...economicasData, montoReferencial: e.target.value })}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="bg-linear-to-br from-amber-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                      <label className="text-sm font-bold text-slate-700 mb-3 block">Día de facturación</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        placeholder="1 - 31"
                        value={economicasData.diaFacturacion}
                        onChange={(e) => setEconomicasData({ ...economicasData, diaFacturacion: e.target.value })}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="bg-linear-to-br from-teal-50 to-slate-50 rounded-lg border border-slate-200 p-6">
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Observaciones</label>
                    <textarea
                      value={economicasData.observaciones}
                      onChange={(e) => setEconomicasData({ ...economicasData, observaciones: e.target.value })}
                      placeholder="Notas operativas sobre facturación (no contable)"
                      rows={4}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-900 font-medium hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setEditModoEconomicos(false)}
                      className="px-6 py-2 rounded-lg font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveEconomicos}
                      disabled={savingEconomicos}
                      className="px-6 py-2 rounded-lg font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {savingEconomicos ? 'Guardando...' : '💾 Guardar contenido'}
                    </button>
                  </div>
                </div>
                )}
              </div>

              {/* Documentos del Contrato */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
                <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-purple-200">
                  <div className="p-3 bg-linear-to-br from-purple-100 to-purple-50 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-.552.336-1 .75-1h6.5c.414 0 .75.448.75 1v6c0 1.105-.672 2-1.5 2h-11C6.672 19 6 18.105 6 17v-5.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 6V5a2 2 0 00-2-2H7.5L4 6.5V15a2 2 0 002 2h1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">📎 Documentos del Contrato</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Sube contrato firmado, anexos y addendas. Se guarda automáticamente con fecha, hora y usuario.</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Botón de subida de documentos */}
                  <div className="bg-linear-to-br from-purple-50 to-slate-50 rounded-lg border border-dashed border-purple-300 p-8">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">Subir Contratos, Anexos, Addendas, etc.</p>
                        <p className="text-xs text-slate-500 mt-1">Selecciona uno o varios documentos para subir</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleUploadDocumentos(e.target.files);
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                        id="fileInput"
                        disabled={false}
                      />
                      <label
                        htmlFor="fileInput"
                        className={`px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors cursor-pointer shadow-md`}
                      >
                        📤 Subir Documentos
                      </label>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 italic mt-4 pt-4 border-t border-slate-200">
                    📌 Los documentos se suben automáticamente al seleccionarlos. No requieren guardado adicional.
                  </p>

                  {/* Tabla de documentos */}
                  {documentosContrato.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            <th className="px-6 py-3 text-left text-sm font-bold text-slate-700">Fecha y Hora</th>
                            <th className="px-6 py-3 text-left text-sm font-bold text-slate-700">Nombre del Documento</th>
                            <th className="px-6 py-3 text-left text-sm font-bold text-slate-700">Usuario</th>
                            <th className="px-6 py-3 text-center text-sm font-bold text-slate-700">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentosContrato.map((doc, idx) => (
                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                                {doc.fecha} • {doc.hora}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-900 font-semibold truncate">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  {doc.url ? (
                                    <a 
                                      href={doc.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-purple-600 hover:text-purple-700 hover:underline"
                                    >
                                      {doc.archivo}
                                    </a>
                                  ) : (
                                    <span>{doc.archivo}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">{doc.usuario}</td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => {
                                    const docId = doc._id || doc.id;
                                    if (docId) {
                                      handleDeleteDocumento(docId);
                                    } else {
                                      setDocumentosContrato(documentosContrato.filter((_, i) => i !== idx));
                                    }
                                  }}
                                  disabled={savingContrato}
                                  className="text-red-500 hover:text-red-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Eliminar documento"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {documentosContrato.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">No hay documentos subidos aún</p>
                    </div>
                  )}

                  <p className="text-sm text-slate-500 italic mt-4 pt-4 border-t border-slate-200">
                    📌 Los documentos se suben automáticamente al seleccionarlos. No requieren guardado adicional.
                  </p>
                 </div>
               </div>

              {/* Modal de Documentos */}
              {showDocumentosModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
                    <div className="bg-linear-to-r from-purple-600 to-purple-700 px-8 py-6 flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-white">📎 Configurar Documentos</h2>
                      <button
                        onClick={() => {
                          setShowDocumentosModal(false);
                          setDocumentosTemp([]);
                        }}
                        className="text-white hover:text-purple-100 text-2xl font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-8 space-y-6">
                      {documentosTemp.map((doc, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 truncate">{doc.file.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{(doc.file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                              onClick={() => handleRemoveDocumentoTemp(idx)}
                              className="text-red-500 hover:text-red-700 font-bold text-xl"
                              title="Remover documento"
                            >
                              ✕
                            </button>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de documento:</label>
                            <select
                              value={doc.tipo}
                              onChange={(e) => handleChangeTipoDocumento(idx, e.target.value)}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-white"
                            >
                              <option value="contrato_firmado">📄 Contrato Firmado</option>
                              <option value="anexo">📎 Anexo</option>
                              <option value="addenda">✏️ Addenda</option>
                              <option value="otro">📋 Otro</option>
                            </select>
                          </div>
                        </div>
                      ))}

                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 text-center">
                        <label htmlFor="fileInputModal" className="cursor-pointer">
                          <div className="flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-semibold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar más documentos
                          </div>
                        </label>
                        <input
                          type="file"
                          id="fileInputModal"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={(e) => {
                            if (e.target.files) {
                              const nuevos = Array.from(e.target.files).map(file => ({
                                file,
                                tipo: 'otro',
                              }));
                              setDocumentosTemp(prev => [...prev, ...nuevos]);
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-100 px-8 py-4 flex gap-3 justify-end border-t border-slate-200">
                      <button
                        onClick={() => {
                          setShowDocumentosModal(false);
                          setDocumentosTemp([]);
                        }}
                        className="px-6 py-2 bg-slate-400 text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSubirDocumentos}
                        disabled={savingContrato || documentosTemp.length === 0}
                        className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingContrato ? '⏳ Subiendo...' : '✅ Subir Documentos'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Historial del Contrato */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-300">
                  <div className="p-3 bg-linear-to-br from-slate-100 to-slate-50 rounded-lg">
                    <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 11h5M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-4l-2-2h-6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">📜 Historial del Contrato</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Registra automáticamente cambios de estado, fechas, servicios incluidos, renovaciones y más.</p>
                  </div>
                </div>

                {historialContrato.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-400 text-sm">Aún no hay registros en el historial del contrato</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Tipo</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Campo modificado</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Valor anterior</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Valor nuevo</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Motivo</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Fecha</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Usuario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialContrato.map((item, idx) => {
                          const getColorAccion = (tipo?: string) => {
                            switch(tipo) {
                              case 'CREACION':
                                return 'bg-green-100 text-green-800';
                              case 'EDICION':
                                return 'bg-blue-100 text-blue-800';
                              case 'ELIMINACION':
                                return 'bg-red-100 text-red-800';
                              default:
                                return 'bg-slate-100 text-slate-800';
                            }
                          };
                          
                          return (
                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getColorAccion(item.tipoAccion)}`}>
                                  {item.tipoAccion || 'EDICION'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-900 font-semibold">{item.campo}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{item.valorAnterior || '—'}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{item.valorNuevo || '—'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 italic">{item.motivo || '—'}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{item.fecha}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{item.usuario}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal para pedir motivo de cambios */}
          {showMotivoModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="bg-linear-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-xl font-bold text-white">📝 ¿Cuál es el motivo del cambio?</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowMotivoModal(false);
                      setMotivoInput('');
                      setMotivoCallback(null);
                    }}
                    className="text-white hover:text-blue-100 text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                  <p className="text-slate-600 text-sm">
                    Por favor describe brevemente el motivo por el que estás realizando este cambio.
                  </p>
                  
                  <textarea
                    value={motivoInput}
                    onChange={(e) => setMotivoInput(e.target.value)}
                    placeholder="Ej: Cambio solicitado por el cliente, actualización de presupuesto, cambio de responsable..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                    rows={4}
                    autoFocus
                  />

                  {motivoInput.length > 0 && (
                    <div className="text-xs text-slate-500 text-right">
                      {motivoInput.length} caracteres
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-slate-100 px-8 py-4 flex gap-3 justify-end border-t border-slate-200 rounded-b-2xl">
                  <button
                    onClick={() => {
                      setShowMotivoModal(false);
                      setMotivoInput('');
                      setMotivoCallback(null);
                    }}
                    className="px-6 py-2 bg-slate-400 text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarMotivo}
                    disabled={!motivoInput.trim()}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✓ Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SLA - Placeholder */}
          {activeTab === 'sla' && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                <div className="p-2.5 bg-amber-100 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SLA</h2>
              </div>
              <div className="py-16 text-center">
                <div className="text-slate-300 text-6xl mb-4">⚡</div>
                <p className="text-slate-500 font-medium text-lg">Acuerdos de nivel de servicio</p>
                <p className="text-slate-400 text-sm mt-2">Próximamente estará disponible la gestión de SLA</p>
              </div>
            </div>
          )}

          {/* TAB: Mantenimientos Preventivos - Placeholder */}
          {activeTab === 'mantenimientos' && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                <div className="p-2.5 bg-red-100 rounded-lg">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Mantenimientos Preventivos</h2>
              </div>
              <div className="py-16 text-center">
                <div className="text-slate-300 text-6xl mb-4">🔧</div>
                <p className="text-slate-500 font-medium text-lg">Plan de mantenimiento preventivo</p>
                <p className="text-slate-400 text-sm mt-2">Próximamente estará disponible la programación de mantenimientos</p>
              </div>
            </div>
          )}

          {/* TAB: Historial */}
          {activeTab === 'historial' && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                <div className="p-2.5 bg-indigo-100 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Historial</h2>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-slate-600 mb-4">Visualiza el historial completo de cambios y eventos de la empresa.</p>
                <button
                  onClick={() => navigate(`/admin/empresas/${empresaId}/historial`)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  📊 Ir al Historial Completo
                </button>
              </div>
            </div>
          )}

          {/* TAB: Sedes Registradas */}
          {activeTab === 'sedes' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Sedes Registradas</h2>
            </div>
            <button
              onClick={() => setShowCreateSedeModal(true)}
              className="bg-linear-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
            >
              + Nueva Sede
            </button>
          </div>
          {sedes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-slate-300 text-6xl mb-4">🏢</div>
              <p className="text-slate-500 font-medium text-lg">No hay sedes registradas</p>
              <p className="text-slate-400 text-sm mt-2">Crea tu primera sede para empezar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sedes.map((sede, index) => (
                <div 
                  key={index} 
                  className={`border rounded-xl p-6 transition-all group ${sede.activo === false ? "border-slate-300 bg-slate-200" : "bg-linear-to-br from-white to-slate-50 border-slate-200 hover:shadow-lg hover:border-orange-200"}`}
                >
                  <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100">
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-bold transition-colors mb-1 ${sede.activo === false ? "text-slate-500" : "text-slate-900 group-hover:text-orange-600"}`}
                      >
                        {String(sede.nombre) || "Sin nombre"}
                      </h3>
                      {sede.tipo && (
                        <span className="inline-block px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                          {String(sede.tipo).charAt(0).toUpperCase() + String(sede.tipo).slice(1)}
                        </span>
                      )}
                      {sede.activo === false && (
                        <span className="ml-2 inline-block px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-full border border-slate-300">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => {
                          setSelectedSede(sede);
                          setShowCreateSedeModal(true);
                        }}
                        disabled={sede.activo === false}
                        className={`inline-flex items-center gap-1.5 font-semibold py-1.5 px-3 rounded-lg transition-all text-xs ${sede.activo === false ? "text-slate-400 bg-slate-200 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100"}`}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => navigate(`/admin/empresas/${empresaId}/sedes/${sede._id ?? sede.id}/inventario`)}
                        disabled={sede.activo === false}
                        className={`inline-flex items-center gap-1.5 font-semibold py-1.5 px-3 rounded-lg transition-all text-xs ${sede.activo === false ? "text-slate-400 bg-slate-200 cursor-not-allowed" : "text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100"}`}
                      >
                        📦 Inventario
                      </button>
                      <button
                        onClick={() => setSedeToDelete(sede)}
                        className={`inline-flex items-center gap-1.5 font-semibold py-1.5 px-3 rounded-lg transition-all text-xs ${sede.activo === false ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "text-slate-700 bg-slate-100 hover:bg-slate-200"}`}
                      >
                        {sede.activo === false ? "✅ Activar" : "⏸️ Desactivar"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sede.direccion && (
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📍</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Dirección</p>
                          <p className={sede.activo === false ? "text-slate-500 font-medium" : "text-slate-700 font-medium"}>{String(sede.direccion)}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-4">
                      {sede.ciudad && (
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Ciudad</p>
                          <p className={sede.activo === false ? "text-slate-500" : "text-slate-700"}>{String(sede.ciudad)}</p>
                        </div>
                      )}
                      {sede.provincia && (
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Provincia</p>
                          <p className={sede.activo === false ? "text-slate-500" : "text-slate-700"}>{String(sede.provincia)}</p>
                        </div>
                      )}
                    </div>
                    
                    {sede.telefono && (
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📞</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Teléfono</p>
                          <a 
                            href={`tel:${String(sede.telefono)}`}
                            className={sede.activo === false ? "text-slate-500 font-medium" : "text-orange-600 hover:text-orange-700 font-medium transition-colors"}
                          >
                            {String(sede.telefono)}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {sede.email && (
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📧</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Email</p>
                          <a 
                            href={`mailto:${String(sede.email)}`} 
                            className={sede.activo === false ? "text-slate-500 font-medium break-all" : "text-orange-600 hover:text-orange-700 font-medium transition-colors break-all"}
                          >
                            {String(sede.email)}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-4 pt-2">
                      {sede.responsable && (
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Responsable</p>
                          <p className={sede.activo === false ? "text-slate-500" : "text-slate-700"}>{String(sede.responsable)}</p>
                        </div>
                      )}
                      {sede.cargoResponsable && (
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Cargo</p>
                          <p className={sede.activo === false ? "text-slate-500" : "text-slate-700"}>{String(sede.cargoResponsable)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          )}
        </div>

        {/* Modal para crear sede */}
        <CreateSedeModal
          isOpen={showCreateSedeModal}
          empresaId={empresaId || ""}
          sedeId={selectedSede?._id ?? selectedSede?.id}
          initialData={selectedSede ?? undefined}
          onClose={() => {
            setShowCreateSedeModal(false);
            setSelectedSede(null);
          }}
          onSuccess={() => {
            if (empresaId) {
              getSedesByEmpresa(empresaId)
                .then((sedesData) => {
                  setSedes(Array.isArray(sedesData) ? sedesData : sedesData.data || []);
                })
                .catch(err => console.error("Error al cargar sedes:", err));
            }
            setSelectedSede(null);
            setShowCreateSedeModal(false);
          }}
        />

        {/* Modal para editar/crear empresa */}
        <CreateEmpresaModal
          isOpen={showEditEmpresaModal}
          empresaId={empresaId}
          initialData={empresa ?? undefined}
          onClose={() => setShowEditEmpresaModal(false)}
          onSuccess={async () => {
            if (empresaId) {
              try {
                const updated = await getEmpresaById(empresaId);
                setEmpresa(updated);
              } catch (err) {
                console.error("Error al recargar empresa:", err);
              }
            }
            setShowEditEmpresaModal(false);
          }}
        />

        {/* Modal para desactivar/activar sede */}
        <DeleteSedeModal
          isOpen={!!sedeToDelete}
          sedeName={sedeToDelete?.nombre || ""}
          isActive={sedeToDelete?.activo !== false}
          onClose={() => setSedeToDelete(null)}
          onConfirm={handleToggleSede}
          isProcessing={isDeleting}
        />
      </div>
    </div>
  );
};

export default EmpresaDetailPage;
