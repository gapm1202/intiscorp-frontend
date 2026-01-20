import { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, Building2, Tag, Wrench, Clock, User, CheckCircle2, XCircle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEmpresas, getEmpresaById } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getCategorias } from '@/modules/inventario/services/categoriasService';
import { getInventarioBySede } from '@/modules/inventario/services/inventarioService';
import { getUsuariosInternos } from '@/modules/auth/services/userService';
import { getSLAByEmpresa } from '@/modules/sla/services/slaService';
import { getContratoActivo } from '@/modules/empresas/services/contratosService';
import { getCatalogCategories, getCatalogSubcategories, getTicketTypes } from '@/modules/catalogo/services/catalogoService';
import { getServicios } from '@/modules/catalogo/services/servicioApi';
import { portalService, type UsuarioDetalle } from '@/modules/public/services/portalService';
import type { PrioridadTicket } from '../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: any) => Promise<void>;
  // Modo configurar: usar este modal existente para mostrar datos del ticket público
  isConfigurar?: boolean;
  // Datos iniciales para prellenar (cuando viene del portal)
  initialData?: Partial<any>;
  // Adjuntos provenientes del ticket (strings o objetos)
  initialAdjuntos?: any[];
  // Callback cuando se actualiza en modo configurar (para recargar padre)
  onUpdated?: () => Promise<void> | void;
}

type Impacto = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
type Urgencia = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

import { editarTicket } from '@/modules/tickets/services/ticketsService';

const CreateTicketModal = ({ isOpen, onClose, onSubmit, isConfigurar, initialData, initialAdjuntos, onUpdated }: CreateTicketModalProps) => {
  // Estados del formulario
  const isConfigMode = Boolean(isConfigurar);
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [usuariosActivo, setUsuariosActivo] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [subcategorias, setSubcategorias] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [slaActivo, setSlaActivo] = useState<any>(null);
  const [contratoActivo, setContratoActivo] = useState<any>(null);
  const [slaStatus, setSlaStatus] = useState<'loading' | 'sin-configurar' | 'contrato-inactivo' | 'activo' | null>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [searchActivos, setSearchActivos] = useState('');
  const [searchUsuarios, setSearchUsuarios] = useState('');
  const [tiposTicket, setTiposTicket] = useState<any[]>([]);
  const [catalogoCategorias, setCatalogoCategorias] = useState<any[]>([]);
  const [catalogoSubcategorias, setCatalogoSubcategorias] = useState<any[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<any[]>([]);
  const [tipoSoporte, setTipoSoporte] = useState<'activos' | 'gestion-ti' | ''>('');
  const [dniBuscado, setDniBuscado] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<UsuarioDetalle | null>(null);
  const [buscandoUsuario, setBuscandoUsuario] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const navigate = useNavigate();

  // Datos del ticket
  const [formData, setFormData] = useState({
    // Identificación
    empresa_id: '',
    sede_id: '',
    
    // Clasificación
    tipo_ticket: '',
    categoria_id: '',
    subcategoria_id: '',
    
    // Descripción
    titulo: '',
    descripcion: '',
    activos_codigos: [] as string[], // Array de códigos de activos seleccionados
    ubicacion: '',
    usuarios_reporta_ids: [] as string[], // Array de IDs de usuarios que reportan
    
    // Servicio
    servicio_id: '',
    tipo_servicio: '', // Solo lectura, se llena automáticamente
    
    // ITIL
    impacto: '' as Impacto | '',
    urgencia: '' as Urgencia | '',
    prioridad: '' as PrioridadTicket | '',
    
    // Servicio
    modalidad: '',
    
    // SLA
    aplica_sla: true,
    
    // Gestión
    tecnico_asignado_id: '',
    
    // Control
    estado: 'ABIERTO' as const,
    
    // Origen
    origen: 'INTERNO' as const // Automático: INTERNO desde sistema, QR desde formulario público
  });

  // Helpers para seleccionar / deseleccionar activos usando la misma ruta
  // que usan los inputs/checkboxes del formulario (asimilar a selección manual)
  const selectActivo = (codigoActivo: string | number) => {
    const codeStr = String(codigoActivo);
    setFormData(prev => {
      const exists = Array.isArray(prev.activos_codigos) && prev.activos_codigos.some((c: any) => String(c) === codeStr);
      if (exists) return prev;
      return { ...prev, activos_codigos: [...(prev.activos_codigos || []), codeStr] };
    });
  };

  const deselectActivo = (codigoActivo: string | number) => {
    const codeStr = String(codigoActivo);
    setFormData(prev => ({ ...prev, activos_codigos: (prev.activos_codigos || []).filter((c: any) => String(c) !== codeStr) }));
  };

  // Selección que recibe el objeto completo del inventario (igual que la selección manual)
  const handleSelectActivoObject = (activoObj: any) => {
    if (!activoObj) return;
    const codigo = String(activoObj.asset_id ?? activoObj.assetId ?? activoObj.codigo ?? activoObj.id);
    // Añadir a activos_codigos si no existe
    setFormData(prev => {
      const exists = (prev.activos_codigos || []).some((c: any) => String(c) === codigo);
      return exists ? prev : { ...prev, activos_codigos: [...(prev.activos_codigos || []), codigo] };
    });

    try {
      const users = activoObj.usuariosAsignados || activoObj.usuarios_asignados || activoObj.usuarios || (activoObj.usuarioAsignado ? [activoObj.usuarioAsignado] : []) || [];
      if (Array.isArray(users) && users.length > 0) {
        const normalized = users.map((u: any) => ({
          id: u?.id ?? u?.usuario_id ?? u?.userId ?? null,
          nombre: u?.nombre ?? u?.nombreCompleto ?? u?.fullName ?? u?.usuario_nombre ?? u?.name ?? '',
          correo: u?.correo ?? u?.email ?? u?.usuario_correo ?? '' ,
          telefono: u?.telefono ?? u?.phone ?? u?.celular ?? u?.mobile ?? '',
          cargo: u?.cargo ?? u?.puesto ?? '',
          activo_codigo: codigo,
          activo_area: activoObj?.area ?? activoObj?.sede ?? activoObj?.ubicacion ?? ''
        }));

        // Merge into usuariosActivo uniquely by correo or id
        setUsuariosActivo(prev => {
          const mapa = new Map<string, any>();
          (prev || []).forEach((p: any) => mapa.set(p.correo || String(p.id), p));
          normalized.forEach((n: any) => mapa.set(n.correo || String(n.id), { ...(mapa.get(n.correo || String(n.id)) || {}), ...n }));
          return Array.from(mapa.values());
        });

        // Preseleccionar correos (o ids) en usuarios_reporta_ids
        setFormData(prev => {
          const existing = prev.usuarios_reporta_ids || [];
          const nuevos = normalized.map((u: any) => (u.correo || (u.id ? String(u.id) : null))).filter(Boolean);
          const merged = [...new Set([...existing, ...nuevos])];
          return { ...prev, usuarios_reporta_ids: merged };
        });
      }
    } catch (err) {
      console.warn('⚠️ Error al seleccionar activo objeto:', err);
    }
  };

  // Adjuntos que vienen del ticket público (solo lectura en modo configurar)
  const [initialAdjuntosLocal, setInitialAdjuntosLocal] = useState<any[]>([]);
  const [prefilledActivosDetails, setPrefilledActivosDetails] = useState<any[]>([]);

  // Si abrimos en modo configurar, prellenar formData con initialData y cargar adjuntos
  useEffect(() => {
    if (isOpen && isConfigMode) {
      const init = initialData || {};
      setFormData(prev => ({ ...prev,
        empresa_id: init.empresa_id ?? prev.empresa_id,
        sede_id: init.sede_id ?? prev.sede_id,
        tipo_ticket: init.tipo_ticket ?? prev.tipo_ticket,
        categoria_id: init.categoria_id ?? prev.categoria_id,
        subcategoria_id: init.subcategoria_id ?? prev.subcategoria_id,
        titulo: init.titulo ?? prev.titulo,
        descripcion: init.descripcion ?? prev.descripcion,
        activos_codigos: init.activos_codigos ?? prev.activos_codigos,
        usuarios_reporta_ids: init.usuarios_reporta_ids ?? prev.usuarios_reporta_ids,
        servicio_id: init.servicio_id ?? prev.servicio_id,
        tipo_servicio: init.tipo_servicio ?? prev.tipo_servicio,
        modalidad: init.modalidad ?? prev.modalidad,
        prioridad: init.prioridad ?? prev.prioridad,
        tecnico_asignado_id: init.tecnico_asignado_id ?? prev.tecnico_asignado_id,
      }));

      setInitialAdjuntosLocal(initialAdjuntos || []);
      // Si el payload incluye la tabla intermedia `ticket_activos`, usar `activo_codigo`
      // (el campo `id` en ticket_activos es solo el id de la relación, no del activo)
      const ticketActivos = init.ticket_activos || init.ticketActivos || undefined;
      if (Array.isArray(ticketActivos) && ticketActivos.length > 0) {
        const fromTicketActivos = ticketActivos.map((t: any) => (
          t.activo_codigo ?? t.activoCodigo ?? t.asset_id ?? t.assetId ?? t.codigo ?? t.id
        )).filter(Boolean).map(String);
        if (fromTicketActivos.length > 0) {
          setFormData(prev => ({ ...prev, activos_codigos: fromTicketActivos }));
          setPrefilledActivosDetails(ticketActivos);
          console.log('🔁 Mapeados activos desde ticket_activos (activo_codigo):', fromTicketActivos);
        }
      }
      // Detalles de activos del ticket serán detectados más abajo

      // Log para depuración: ayuda a inspeccionar la estructura del ticket en la consola
      console.log('🔁 CreateTicketModal prefill initialData:', initialData);

      // Normalizar y detectar activos disponibles en el ticket (varias propiedades posibles)
      const activosDesdeTicket = init.activos || init.assets || init.activos_detalle || init.activos_detalles || init.activosInfo || init.activos_codigos || init.activos_ids || (init.data && init.data.activos) || undefined;
      let mappedActivosList: string[] = [];
      if (Array.isArray(activosDesdeTicket) && activosDesdeTicket.length > 0) {
        if (typeof activosDesdeTicket[0] === 'string' || typeof activosDesdeTicket[0] === 'number') {
          mappedActivosList = activosDesdeTicket.map(String);
        } else if (typeof activosDesdeTicket[0] === 'object') {
          // Preferir `activo_codigo`/`activoCodigo` (tabla intermedia), luego
          // `asset_id` (base de datos), luego `assetId` (camelCase),
          // luego `codigo`, y por último los ids internos.
          mappedActivosList = activosDesdeTicket.map((a: any) => (
            a.activo_codigo ?? a.activoCodigo ?? a.asset_id ?? a.assetId ?? a.codigo ?? a.codigo_activo ?? a.codigoActivo ?? a.code ?? a.codeId ?? a.id ?? ''
          )).filter(Boolean).map(String);
        }
      }

      if (mappedActivosList.length > 0) {
        setFormData(prev => ({ ...prev, activos_codigos: mappedActivosList }));
        setPrefilledActivosDetails(Array.isArray(activosDesdeTicket) ? activosDesdeTicket : []);
        console.log('🔁 Mapeados activos para prefill:', mappedActivosList);

        // Si el ticket vino con detalles completos de activos, inicializar el estado
        // exactamente como si el usuario los hubiera seleccionado en el formulario
        // Nuevo Ticket: setear `activos_codigos`, `usuariosActivo` y `usuarios_reporta_ids`.
        try {
          if (isConfigMode && Array.isArray(activosDesdeTicket) && activosDesdeTicket.length > 0) {
            const prefillAssets = activosDesdeTicket as any[];
            const selectedFromPrefill = prefillAssets.map(a => (a?.activo_codigo ?? a?.activoCodigo ?? a?.asset_id ?? a?.assetId ?? a?.codigo ?? a?.id)).filter(Boolean).map(String);
            if (selectedFromPrefill.length > 0) {
              // Forzar selección de activos en el formulario usando la misma ruta de selección
              selectedFromPrefill.forEach(c => {
                // intentar usar el objeto del inventario si ya está disponible
                const foundObj = activos.find((a: any) => {
                  const candidates = [a.activo_codigo, a.activoCodigo, a.assetId, a.asset_id, a.codigo, a.codigo_activo, a.codigoActivo, a.id, a.serial, a.serie].filter(Boolean).map(String);
                  return candidates.some((x: string) => String(x).toLowerCase() === String(c).toLowerCase());
                });
                if (foundObj) handleSelectActivoObject(foundObj);
                else selectActivo(c);
              });
              console.log('🔁 Forzando activos seleccionados desde prefill (vía selectActivo/handleSelect):', selectedFromPrefill);
            }

            // Normalizar y asociar usuarios desde los detalles del activo
            const normalizedUsers: any[] = [];
            prefillAssets.forEach((a: any) => {
              const assetCode = a?.activo_codigo ?? a?.activoCodigo ?? a?.asset_id ?? a?.assetId ?? a?.codigo ?? a?.id ?? null;
              const users = a?.usuariosAsignados || a?.usuarios_asignados || a?.usuarios || a?.usuarioAsignado || a?.usuario_asignado || [];
              if (Array.isArray(users) && users.length > 0) {
                users.forEach((u: any) => {
                  normalizedUsers.push({
                    id: u?.id ?? u?.usuario_id ?? u?.userId ?? null,
                    nombre: u?.nombre ?? u?.nombreCompleto ?? u?.fullName ?? u?.usuario_nombre ?? u?.name ?? '',
                    correo: u?.correo ?? u?.email ?? u?.usuario_correo ?? '' ,
                    telefono: u?.telefono ?? u?.phone ?? u?.celular ?? u?.mobile ?? '',
                    cargo: u?.cargo ?? u?.puesto ?? '',
                    activo_codigo: assetCode ? String(assetCode) : undefined,
                    activo_area: a?.area ?? a?.sede ?? a?.ubicacion ?? ''
                  });
                });
              }
            });

            if (normalizedUsers.length > 0) {
              setUsuariosActivo(normalizedUsers);
              const preselected = [...new Set(normalizedUsers.map(u => (u.correo || (u.id ? String(u.id) : null))).filter(Boolean))];
              if (preselected.length > 0) {
                setFormData(prev => ({ ...prev, usuarios_reporta_ids: preselected }));
                console.log('🔁 Prefill usuarios desde activos del portal (forzado):', preselected);
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Error forzando prefill desde activos completos:', err);
        }

        // Si el ticket vino con detalles de activos que incluyen usuarios asignados,
        // precargar los usuarios reportan para que aparezcan preseleccionados.
        try {
          if (Array.isArray(activosDesdeTicket) && activosDesdeTicket.length > 0) {
            const normalizedUsers: any[] = [];
            activosDesdeTicket.forEach((a: any) => {
              const assetCode = a?.asset_id ?? a?.assetId ?? a?.codigo ?? a?.id ? String(a?.asset_id ?? a?.assetId ?? a?.codigo ?? a?.id) : null;
              const assetArea = a?.area || a?.sede || a?.ubicacion || a?.area_nombre || '';
              const users = a.usuariosAsignados || a.usuarios_asignados || a.usuarios || a.usuarioAsignado || a.usuario_asignado || [];
              if (Array.isArray(users) && users.length > 0) {
                users.forEach((u: any) => {
                  const userCorreo = u?.correo ?? u?.email ?? u?.usuario_correo ?? u?.mail ?? '';
                  const userNombre = u?.nombre ?? u?.nombreCompleto ?? u?.fullName ?? u?.usuario_nombre ?? u?.name ?? '';
                  const userCargo = u?.cargo ?? u?.puesto ?? '';
                  const userId = u?.id ?? u?.usuario_id ?? u?.userId ?? null;
                  normalizedUsers.push({
                    id: userId,
                    nombre: userNombre,
                    correo: userCorreo,
                    telefono: u?.telefono ?? u?.phone ?? u?.celular ?? u?.mobile ?? '',
                    cargo: userCargo,
                    activo_codigo: assetCode,
                    activo_area: assetArea
                  });
                });
              }
            });

            if (normalizedUsers.length > 0) {
              setUsuariosActivo(normalizedUsers);
              const preselected = [...new Set(normalizedUsers.map(u => (u.correo || (u.id ? String(u.id) : null))).filter(Boolean))];
              if (preselected.length > 0) {
                setFormData(prev => ({ ...prev, usuarios_reporta_ids: preselected }));
                console.log('🔁 Prefill usuarios desde activos del portal:', preselected);
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Error prellenando usuarios desde activos prefill:', err);
        }
      }

      // Detectar posible DNI / número de documento en varias propiedades posibles
      // EXCLUIMOS campos como 'reporte_portal_id' que no son DNI
      const posibleDniRaw = init.usuario_dni || init.numero_documento || init.dni || init.documento || init.numeroDocumento || init.usuario?.numero_documento || init.usuario?.dni || init.usuario?.documento || undefined;

      // Detectar si realmente parece un DNI: 8 dígitos (ajustable según país)
      const posibleDniStr = posibleDniRaw ? String(posibleDniRaw).replace(/\D/g, '') : '';
      const hasDni = posibleDniStr.length === 8;
      const hasActivos = mappedActivosList.length > 0;

      // Preferir activos cuando hay activos en el ticket; si no, usar DNI
      if (hasActivos) {
        setTipoSoporte('activos');
      } else if (hasDni) {
        setTipoSoporte('gestion-ti');
        setDniBuscado(posibleDniStr);
      } else {
        // Si no hay activos ni DNI identificable, respetar rawTipoSoporte si viene
        const rawTipoSoporte = init.tipo_soporte ?? init.tipoSoporte ?? init.tipo ?? '';
        if (rawTipoSoporte) {
          const t = String(rawTipoSoporte).toLowerCase().trim();
          if (t.includes('activo')) {
            setTipoSoporte('activos');
          } else if (t.includes('gestion') || t.includes('gestion-ti') || t.includes('gestion_ti') || t.includes('ti') || t.includes('gestionti')) {
            setTipoSoporte('gestion-ti');
          } else if (t === 'activos' || t === 'gestion-ti') {
            setTipoSoporte(t as any);
          } else {
            setTipoSoporte('');
          }
        }
      }

      // Si ya vienen datos de usuario en el payload, normalizarlos (solo si hay campos relevantes)
      const posibleUsuarioData = init.usuario_dni_data || init.usuario || init.usuario_data || init.usuarioDetalle || init.usuario_detalle || init.usuario_data_detail || init.usuario_detalles;
      if (posibleUsuarioData) {
        const u = posibleUsuarioData as any;
        const normalized = {
          id: u?.id ?? u?.usuarioId ?? u?._id ?? null,
          nombre: u?.nombre ?? u?.fullName ?? u?.usuario_nombre ?? u?.usuarioNombre ?? u?.name ?? '',
          dni: u?.dni ?? u?.numero_documento ?? u?.usuario_dni ?? u?.numeroDocumento ?? u?.documento ?? '',
          cargo: u?.cargo ?? u?.puesto ?? u?.position ?? '',
          telefono: u?.telefono ?? u?.phone ?? u?.celular ?? u?.mobile ?? u?.usuario_telefono ?? '',
          correoPrincipal: u?.correoPrincipal ?? u?.correo ?? u?.email ?? u?.usuario_correo ?? ''
        };
        setUsuarioEncontrado(normalized as any);
      } else if (init.usuario_nombre || init.usuario_correo || init.usuario_telefono || init.usuario_dni) {
        const normalizedTop = {
          id: init.usuario_id ?? init.usuario?.id ?? null,
          nombre: init.usuario_nombre ?? init.usuario?.nombre ?? '',
          dni: init.usuario_dni ?? init.usuario?.dni ?? init.numero_documento ?? '',
          cargo: init.usuario_cargo ?? init.usuario?.cargo ?? '',
          telefono: init.usuario_telefono ?? init.usuario?.telefono ?? '',
          correoPrincipal: init.usuario_correo ?? init.usuario?.correo ?? init.usuario?.email ?? ''
        };
        setUsuarioEncontrado(normalizedTop as any);
      }

      // Si vienen usuarios_reportan (nombre según backend), mapear a usuarios_reporta_ids
      if (Array.isArray(init.usuarios_reportan) && init.usuarios_reportan.length > 0) {
        const userIds = init.usuarios_reportan.map((u: any) => u.id || u.usuario_id || u.userId || u.uid || u.email || u.usuario_correo || u.usuario || '').filter(Boolean).map(String);
        if (userIds.length > 0) {
          setFormData(prev => ({ ...prev, usuarios_reporta_ids: userIds }));
          console.log('🔁 Prefill usuarios_reporta_ids:', userIds);
        }
        // si hay usuario detallado, prellenar usuarioEncontrado con el primero (normalizado)
        const u0 = init.usuarios_reportan[0];
        if (u0) {
          const normalized = {
            id: u0?.id ?? u0?.usuario_id ?? u0?.userId ?? null,
            nombre: u0?.usuario_nombre ?? u0?.usuarioNombre ?? u0?.nombre ?? u0?.name ?? '',
            dni: u0?.usuario_dni ?? u0?.dni ?? u0?.numero_documento ?? u0?.documento ?? '',
            cargo: u0?.cargo ?? u0?.puesto ?? '',
            telefono: u0?.usuario_telefono ?? u0?.telefono ?? u0?.phone ?? '',
            correoPrincipal: u0?.usuario_correo ?? u0?.email ?? ''
          };
          setUsuarioEncontrado(normalized as any);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isConfigMode]);

  // En modo configurar: si el portal ya envió un DNI y empresa_id, buscar usuario automáticamente
  // Ejecutar sólo cuando el tipo de soporte sea gestión-ti (DNI flow)
  useEffect(() => {
    if (!isOpen || !isConfigMode) return;
    if (tipoSoporte !== 'gestion-ti') return;
    console.log('🔁 Auto-search effect (gestion-ti):', { tipoSoporte, dniBuscado, empresa_id: formData.empresa_id, usuarioEncontrado });

    // Si ya tenemos usuario, no hacemos nada
    if (usuarioEncontrado) return;

    // Necesitamos DNI válido y empresa para buscar
    if (!dniBuscado || dniBuscado.length !== 8) {
      console.log('🔁 Auto-search: DNI inválido o ausente, no se ejecuta búsqueda');
      return;
    }

    if (!formData.empresa_id) {
      console.log('🔁 Auto-search: empresa_id ausente, no se ejecuta búsqueda');
      return;
    }

    console.log('🔁 Auto-search: ejecutando buscarUsuarioPorDNI automáticamente');
    buscarUsuarioPorDNI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isConfigMode, tipoSoporte, dniBuscado, formData.empresa_id]);

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Al cambiar empresa, cargar sus datos relacionados
  useEffect(() => {
    const empresaIdNum = Number(formData.empresa_id);
    
    if (formData.empresa_id && !isNaN(empresaIdNum) && empresaIdNum > 0) {
      console.log('🏢 Cargando datos para empresa ID:', empresaIdNum);
      loadEmpresaRelatedData(empresaIdNum);
    } else {
      console.log('🏢 Limpiando datos de empresa');
      setSedes([]);
      setActivos([]);
      setUsuariosActivo([]);
      setSlaActivo(null);
      setFormData(prev => ({ ...prev, sede_id: '', activos_codigos: [], usuarios_reporta_ids: [], aplica_sla: true }));
    }
  }, [formData.empresa_id]);

  // Al cambiar sede, cargar activos
  useEffect(() => {
    const empresaIdNum = Number(formData.empresa_id);
    const sedeIdNum = Number(formData.sede_id);
    
    console.log('🔄 useEffect sede_id ejecutado:', { 
      empresa_id: formData.empresa_id, 
      sede_id: formData.sede_id,
      empresaIdNum,
      sedeIdNum,
      isEmpresaValid: !isNaN(empresaIdNum) && empresaIdNum > 0,
      isSedeValid: !isNaN(sedeIdNum) && sedeIdNum > 0
    });
    
    if (formData.empresa_id && formData.sede_id && !isNaN(empresaIdNum) && !isNaN(sedeIdNum) && empresaIdNum > 0 && sedeIdNum > 0) {
      console.log('📦 Cargando activos para sede:', sedeIdNum, 'de empresa:', empresaIdNum);
      loadActivosBySede(empresaIdNum, sedeIdNum);
    } else {
      console.log('❌ No se pueden cargar activos - condiciones no cumplidas');
      setActivos([]);
      setUsuariosActivo([]);
      setFormData(prev => ({ ...prev, activos_codigos: [], usuarios_reporta_ids: [] }));
    }
  }, [formData.sede_id, formData.empresa_id]);

  // Al cambiar activos seleccionados, cargar usuarios asignados de todos los activos
  useEffect(() => {
    if (formData.activos_codigos.length > 0 && activos.length > 0) {
      // Recolectar todos los usuarios de todos los activos seleccionados
      const todosLosUsuarios: any[] = [];
      const usuariosUnicos = new Map();
      
      formData.activos_codigos.forEach(codigoActivo => {
        const codigoStr = String(codigoActivo);
        const activoSeleccionado = activos.find(a => String(a.asset_id ?? a.assetId ?? a.id) === codigoStr);
        
        console.log('🔍 Activo seleccionado:', activoSeleccionado);
        console.log('🔍 usuariosAsignados:', activoSeleccionado?.usuariosAsignados);
        console.log('🔍 area:', activoSeleccionado?.area);
        
        // Usar usuariosAsignados (camelCase) que es como viene del backend
        if (activoSeleccionado?.usuariosAsignados?.length) {

          activoSeleccionado.usuariosAsignados.forEach((usuario: any) => {
            // Usar correo como clave única (los usuarios tienen: cargo, correo, nombre)
            const key = usuario.correo || usuario.email || usuario.nombre;
            
            if (key && !usuariosUnicos.has(key)) {
              // Agregar información del activo al usuario
              const usuarioConActivo = {
                ...usuario,
                activo_codigo: activoSeleccionado.asset_id ?? activoSeleccionado.assetId ?? activoSeleccionado.id,
                activo_area: activoSeleccionado.area || 'Sin área'
              };
              usuariosUnicos.set(key, usuarioConActivo);
              todosLosUsuarios.push(usuarioConActivo);
            }
          });
        }
      });
      
      console.log('👥 Usuarios asignados a los activos seleccionados:', todosLosUsuarios);
      
      setUsuariosActivo(todosLosUsuarios);
   
      // Seleccionar automáticamente a todos los usuarios asignados
      setFormData(prev => {
        const nuevosCorreos = todosLosUsuarios.map(u => u.correo);
        // Unir con los usuarios ya seleccionados (evitar duplicados)
        const correosUnicos = [...new Set([...prev.usuarios_reporta_ids, ...nuevosCorreos])];
        // Filtrar solo los que siguen disponibles
        const usuariosDisponibles = todosLosUsuarios.map(u => u.correo);
        const correosFinales = correosUnicos.filter(correo => usuariosDisponibles.includes(correo));
        
        return { 
          ...prev, 
          usuarios_reporta_ids: correosFinales
        };
      });
    } else {
      // En modo configurar, si ya vinieron usuarios desde `prefilledActivosDetails`,
      // no sobreescribirlos aquí (evitamos limpiar usuarios cuando la reconciliación
      // contra inventario no encuentra coincidencias numéricas pero el portal
      // ya envió los detalles completos).
      const hasPrefilledUsers = isConfigMode && Array.isArray(prefilledActivosDetails) && prefilledActivosDetails.some((a: any) => {
        const users = a?.usuariosAsignados || a?.usuarios_asignados || a?.usuarios || a?.usuarioAsignado || a?.usuario_asignado;
        return Array.isArray(users) && users.length > 0;
      });

      if (!hasPrefilledUsers) {
        setUsuariosActivo([]);
      }
    }
  }, [formData.activos_codigos, activos]);

  // Al cambiar tipo de ticket, resetear categoría si había una seleccionada
  useEffect(() => {
    if (formData.tipo_ticket) {
      setFormData(prev => ({ ...prev, categoria_id: '', subcategoria_id: '' }));
    }
  }, [formData.tipo_ticket]);

  // Al cambiar tipo de soporte, resetear datos relevantes
  useEffect(() => {
    if (tipoSoporte === 'activos') {
      // Limpiar datos de DNI
      setDniBuscado('');
      setUsuarioEncontrado(null);
      setFormData(prev => ({ ...prev, usuarios_reporta_ids: [] }));
    } else if (tipoSoporte === 'gestion-ti') {
      // Limpiar datos de activos
      setFormData(prev => ({ 
        ...prev, 
        activos_codigos: [],
        usuarios_reporta_ids: []
      }));
      setUsuariosActivo([]);
    }
  }, [tipoSoporte]);

  // Al cambiar categoría, cargar subcategorías del catálogo
  useEffect(() => {
    console.log('🔍 categoria_id seleccionado:', formData.categoria_id);
    console.log('🔍 Tipo de categoria_id:', typeof formData.categoria_id);
    console.log('🔍 Total subcategorías del catálogo:', catalogoSubcategorias.length);
    
    if (catalogoSubcategorias.length > 0) {
      console.log('🔍 Primera subcategoría:', catalogoSubcategorias[0]);
      console.log('🔍 categoriaId de primera subcategoría:', catalogoSubcategorias[0]?.categoriaId);
      console.log('🔍 Tipo de categoriaId:', typeof catalogoSubcategorias[0]?.categoriaId);
    }
    
    if (formData.categoria_id && catalogoSubcategorias.length > 0) {
      // Convertir categoria_id a número para comparar
      const categoriaIdNum = Number(formData.categoria_id);
      const subcategoriasFiltradas = catalogoSubcategorias.filter(sub => {
        console.log(`🔍 Comparando: sub.categoriaId (${sub.categoriaId}) === categoriaIdNum (${categoriaIdNum})`);
        return sub.categoriaId === categoriaIdNum;
      });
      console.log('📋 Subcategorías filtradas para categoría:', formData.categoria_id, subcategoriasFiltradas);
      setSubcategorias(subcategoriasFiltradas);
    } else {
      setSubcategorias([]);
      setFormData(prev => ({ ...prev, subcategoria_id: '' }));
    }
  }, [formData.categoria_id, catalogoSubcategorias]);

  // Al seleccionar servicio, actualizar automáticamente el tipo de servicio
  useEffect(() => {
    if (formData.servicio_id && serviciosDisponibles.length > 0) {
      const servicioSeleccionado = serviciosDisponibles.find(
        s => String(s.id) === String(formData.servicio_id)
      );
      if (servicioSeleccionado) {
        setFormData(prev => ({ 
          ...prev, 
          tipo_servicio: servicioSeleccionado.tipoServicio || '' 
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, tipo_servicio: '' }));
    }
  }, [formData.servicio_id, serviciosDisponibles]);

  // Calcular prioridad automáticamente (ITIL)
  useEffect(() => {
    if (formData.impacto && formData.urgencia) {
      const prioridad = calcularPrioridad(formData.impacto, formData.urgencia);
      setFormData(prev => ({ ...prev, prioridad }));
    }
  }, [formData.impacto, formData.urgencia]);

  const loadInitialData = async () => {
    try {
      const [empData, catData, tecData, catalogoData, subcatalogoData, tiposData, serviciosData] = await Promise.all([
        getEmpresas(),
        getCategorias(),
        getUsuariosInternos(),
        getCatalogCategories(),
        getCatalogSubcategories(),
        getTicketTypes(),
        getServicios()
      ]);
      
      console.log('📊 Empresas cargadas:', empData);
      console.log('📊 Primera empresa completa:', empData[0]);
      console.log('📊 Cantidad de empresas:', Array.isArray(empData) ? empData.length : 'No es array');
      console.log('📊 Catálogo cargado (raw):', catalogoData);
      console.log('📊 Total categorías en catálogo:', catalogoData.length);
      console.log('📊 Subcategorías del catálogo:', subcatalogoData);
      console.log('📊 Tipos de ticket cargados:', tiposData);
      console.log('📊 Usuarios cargados (raw):', tecData);
      console.log('📊 Tipo de datos usuarios:', typeof tecData);
      console.log('📊 Es array?:', Array.isArray(tecData));
      
      // Normalizar respuesta de usuarios - puede venir como array o como objeto con propiedad
      let usuariosArray = [];
      if (Array.isArray(tecData)) {
        usuariosArray = tecData;
      } else if (tecData?.usuarios && Array.isArray(tecData.usuarios)) {
        usuariosArray = tecData.usuarios;
      } else if (tecData?.data && Array.isArray(tecData.data)) {
        usuariosArray = tecData.data;
      } else if (typeof tecData === 'object' && tecData !== null) {
        // Si es un objeto, intentar extraer el primer array que encontremos
        const valores = Object.values(tecData);
        const primerArray = valores.find(v => Array.isArray(v));
        if (primerArray) {
          usuariosArray = primerArray as any[];
        }
      }
      
      console.log('📊 Usuarios normalizados:', usuariosArray);
      console.log('📊 Cantidad total de usuarios:', usuariosArray.length);
      if (usuariosArray.length > 0) {
        console.log('📊 Primer usuario ejemplo:', usuariosArray[0]);
        console.log('📊 Campos del usuario:', Object.keys(usuariosArray[0]));
      }
      console.log('📊 Servicios cargados:', serviciosData);
      
      setEmpresas(empData);
      setCategorias(catData);
      
      // Filtrar solo tipos activos
      const tiposActivos = tiposData.filter((tipo: any) => tipo.activo === true);
      console.log('📊 Tipos de ticket activos:', tiposActivos);
      setTiposTicket(tiposActivos);
      
      // Filtrar solo usuarios internos con rol de Técnico o Administrador
      console.log('🔍 Iniciando filtrado de técnicos...');
      const tecnicosFiltrados = usuariosArray.filter((u: any) => {
        console.log(`  Usuario: ${u.nombre || u.usuario} - Rol: "${u.rol}" (tipo: ${typeof u.rol})`);
        const rol = String(u.rol || '').toLowerCase().trim();
        const esTecnicoOAdmin = (rol === 'tecnico' || rol === 'técnico' || rol === 'administrador');
        if (esTecnicoOAdmin) {
          console.log(`    ✅ INCLUIDO: ${u.nombre} - ${u.rol}`);
        }
        return esTecnicoOAdmin;
      });
      console.log('📊 Técnicos y administradores filtrados:', tecnicosFiltrados);
      console.log('📊 Total técnicos disponibles:', tecnicosFiltrados.length);
      setTecnicos(tecnicosFiltrados);
      
      // Guardar categorías del catálogo activas
      const categoriasActivas = catalogoData.filter((cat: any) => cat.activo);
      console.log('📊 Categorías del catálogo (activas):', categoriasActivas);
      setCatalogoCategorias(categoriasActivas);
      
      // Guardar subcategorías del catálogo activas
      const subcategoriasActivas = subcatalogoData.filter((sub: any) => sub.activo);
      setCatalogoSubcategorias(subcategoriasActivas);
      
      // Filtrar servicios: activos y visibles en tickets
      const serviciosFiltrados = serviciosData.filter((serv: any) => 
        serv.activo === true && serv.visibleEnTickets === true
      );
      console.log('📊 Servicios disponibles para tickets:', serviciosFiltrados);
      setServiciosDisponibles(serviciosFiltrados);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const loadEmpresaRelatedData = async (empresaId: number) => {
    try {
      setSlaStatus('loading');
      
      const [sedesData, slaData, empresaData] = await Promise.all([
        getSedesByEmpresa(empresaId),
        getSLAByEmpresa(empresaId).catch(() => null),
        getEmpresaById(empresaId).catch(() => null)
      ]);
      
      console.log('📍 Sedes recibidas (raw):', sedesData);
      console.log('📋 SLA recibido:', slaData);
      console.log('🏢 Empresa recibida:', empresaData);
      console.log('📄 Contrato de empresa:', empresaData?.contrato);
      console.log('📄 Estado contrato (campo contrato):', empresaData?.contrato?.estadoContrato);
      console.log('📄 Estado contrato (campo estado_contrato):', empresaData?.contrato?.estado_contrato);
      console.log('📄 Estado contrato directo en empresa:', empresaData?.estadoContrato);
      console.log('📄 Estado contrato snake_case en empresa:', empresaData?.estado_contrato);
      
      // Normalizar sedes: puede venir como array directo o como { data: [...] }
      const sedesArray = Array.isArray(sedesData) ? sedesData : (sedesData?.data || []);
      
      console.log('📍 Sedes normalizadas:', sedesArray);
      console.log('📍 Cantidad de sedes:', sedesArray.length);
      if (sedesArray[0]) {
        console.log('📍 Primera sede completa:', JSON.stringify(sedesArray[0], null, 2));
        console.log('📍 Campos de primera sede:', Object.keys(sedesArray[0]));
        console.log('📍 sede_id de primera sede:', sedesArray[0].sede_id);
        console.log('📍 id de primera sede:', sedesArray[0].id);
      }
      
      setSedes(sedesArray);
      setSlaActivo(slaData);
      setContratoActivo(empresaData?.contrato || null);
      
      // Evaluar estado del SLA usando el contrato de la empresa
      evaluateSLAStatus(slaData, empresaData?.contrato);
      
    } catch (error) {
      console.error('Error cargando datos de empresa:', error);
      setSedes([]);
      setSlaActivo(null);
      setContratoActivo(null);
      setSlaStatus(null);
    }
  };

  const evaluateSLAStatus = (sla: any, contrato: any) => {
    console.log('🔍 Evaluando SLA Status - SLA:', sla);
    console.log('🔍 Evaluando SLA Status - Contrato:', contrato);
    
    // 1️⃣ Sin SLA configurado (debe tener las 6 secciones guardadas)
    // Verificar que existan las 6 secciones: alcance, tiempos, horarios, requisitos, exclusiones, alertas
    const seccionesRequeridas = ['alcance', 'tiempos', 'horarios', 'requisitos', 'exclusiones', 'alertas'];
    const isEmptyObject = (obj: any) => !obj || typeof obj !== 'object' || Object.keys(obj).length === 0;
    
    const seccionesConfiguraDas = seccionesRequeridas.filter(seccion => !isEmptyObject(sla?.[seccion]));
    const slaCompleto = seccionesConfiguraDas.length === 6;
    
    if (!sla || !slaCompleto) {
      console.log('⚠️ SLA no configurado - Secciones encontradas:', seccionesConfiguraDas.length, '/ 6');
      setSlaStatus('sin-configurar');
      setFormData(prev => ({ ...prev, aplica_sla: false }));
      return;
    }

    // 2️⃣ Verificar estado del contrato (buscar en múltiples ubicaciones posibles)
    const estadoContratoRaw = contrato?.estado_contrato || contrato?.estadoContrato || contrato?.estado || null;
    const estadoContrato = estadoContratoRaw ? String(estadoContratoRaw).toUpperCase() : null;
    
    console.log('🔍 Estado del contrato detectado:', estadoContrato);
    console.log('🔍 Contrato completo para debug:', JSON.stringify(contrato, null, 2));
    
    // Si no hay contrato o estado es null/vacío, vencido o suspendido → bloquear
    if (!contrato || !estadoContrato || estadoContrato === 'VENCIDO' || estadoContrato === 'SUSPENDIDO') {
      console.log('🔴 Contrato inactivo - Estado:', estadoContrato || 'SIN CONFIGURAR');
      setSlaStatus('contrato-inactivo');
      setFormData(prev => ({ ...prev, aplica_sla: false }));
      return;
    }

    // 3️⃣ SLA configurado y contrato ACTIVO
    if (estadoContrato === 'ACTIVO') {
      console.log('🟢 SLA activo');
      setSlaStatus('activo');
      setFormData(prev => ({ ...prev, aplica_sla: true }));
      return;
    }

    // Caso por defecto (no debería llegar aquí)
    console.log('⚠️ Estado del contrato no reconocido:', estadoContrato);
    setSlaStatus('contrato-inactivo');
    setFormData(prev => ({ ...prev, aplica_sla: false }));
  };

  const loadActivosBySede = async (empresaId: number, sedeId: number) => {
    try {
      const activosData = await getInventarioBySede(empresaId, sedeId, true);
      console.log('📦 Activos recibidos:', activosData);
      
      // Normalizar activos - el backend puede devolver {ok, data} o directo el array
      let activosArray = [];
      if (activosData?.ok && activosData?.data) {
        activosArray = activosData.data;
      } else if (Array.isArray(activosData)) {
        activosArray = activosData;
      } else if (activosData?.data) {
        activosArray = activosData.data;
      }
      
      console.log('📦 Activos normalizados:', activosArray);
      console.log('📦 Cantidad de activos:', activosArray.length);
      if (activosArray[0]) {
        console.log('📦 Primer activo:', activosArray[0]);
        console.log('📦 Campos del activo:', Object.keys(activosArray[0]));
        console.log('📦 assetId:', activosArray[0].assetId);
        console.log('📦 categoria:', activosArray[0].categoria);
        console.log('📦 fabricante:', activosArray[0].fabricante);
        console.log('📦 modelo:', activosArray[0].modelo);
      }
      
      setActivos(activosArray);
      // Si venimos en modo configurar y el portal envió objetos completos de activos,
      // simular la selección manual usando los objetos cargados del inventario.
      try {
        if (isConfigMode && Array.isArray(prefilledActivosDetails) && prefilledActivosDetails.length > 0) {
          prefilledActivosDetails.forEach((pref: any) => {
            const prefCandidates = [pref.activo_codigo, pref.activoCodigo, pref.asset_id, pref.assetId, pref.codigo, pref.codigo_activo, pref.codigoActivo, pref.id, pref.serial, pref.serie].filter(Boolean).map(String);
            if (prefCandidates.length === 0) return;

            const found = activosArray.find((act: any) => {
              const actCandidates = [act.activo_codigo, act.activoCodigo, act.asset_id, act.assetId, act.codigo, act.codigo_activo, act.codigoActivo, act.id, act.serial, act.serie].filter(Boolean).map(String);
              return prefCandidates.some(pc => actCandidates.some(ac => ac && ac.toLowerCase() === pc.toLowerCase()));
            });

            if (found) {
              const codigoActivo = found.asset_id ?? found.assetId ?? found.id;
              handleSelectActivoObject(found);
              console.log('🔁 Seleccionando activo (simulado) desde prefill usando inventory object (via handleSelectActivoObject):', codigoActivo);
            }
          });
        }
      } catch (err) {
        console.warn('⚠️ Error simulando selección desde prefilledActivosDetails:', err);
      }
      // Si estamos en modo configurar y ya teníamos códigos prellenados,
      // intentar reconciliarlos con los activos cargados para que la UI los muestre.
      try {
        if (isConfigMode && Array.isArray(formData.activos_codigos) && formData.activos_codigos.length > 0) {
            const reconciled: string[] = [];
          formData.activos_codigos.forEach((code) => {
            const codeStr = String(code).toLowerCase();
            const found = activosArray.find((a: any) => {
              const candidates = [
                a.id,
                  a.asset_id,
                  a.assetId,
                a.codigo,
                a.codigoActivo,
                a.codigo_activo,
                a.code,
                a.serial,
                a.serie,
                a.asset_id_local
              ].filter(Boolean).map(String);
              return candidates.some((c: string) => c.toLowerCase() === codeStr);
            });
            if (found) {
              // Preferir `asset_id` si existe, sino `assetId`, sino `id`
              reconciled.push(found.asset_id ? String(found.asset_id) : (found.assetId ? String(found.assetId) : String(found.id)));
            } else {
              reconciled.push(String(code));
            }
          });

          console.log('🔁 Activos reconciliados tras cargar inventario:', reconciled);
          setFormData(prev => ({ ...prev, activos_codigos: reconciled }));
        }
                  // Además: si el ticket vino con detalles completos de activos (prefilledActivosDetails),
                  // intentar mapear cada activo prefill al activo cargado en inventario buscando por
                  // `codigo`, `assetId`, `id`, `serial`, etc. Esto asegura que `activos_codigos`
                  // use los `assetId`/`codigo` que el formulario Nuevo Ticket espera y por tanto
                  // se carguen sus usuarios asignados correctamente.
                  if (isConfigMode && Array.isArray(prefilledActivosDetails) && prefilledActivosDetails.length > 0) {
                    const reconciledFromPrefill: string[] = [];
                    prefilledActivosDetails.forEach((a: any) => {
                      const candidates = [a.activo_codigo, a.activoCodigo, a.codigo, a.codigo_activo, a.codigoActivo, a.asset_id, a.assetId, a.id, a.serial, a.serie].filter(Boolean).map(String);
                      if (candidates.length === 0) return;

                      const found = activosArray.find((act: any) => {
                        const actCandidates = [act.activo_codigo, act.activoCodigo, act.codigo, act.codigo_activo, act.codigoActivo, act.asset_id, act.assetId, act.id, act.serial, act.serie].filter(Boolean).map(String);
                        return candidates.some(c => actCandidates.some(ac => ac && ac.toLowerCase() === c.toLowerCase()));
                      });

                      if (found) {
                        reconciledFromPrefill.push(found.asset_id ? String(found.asset_id) : (found.assetId ? String(found.assetId) : String(found.id)));
                      } else {
                        // Si no encontramos match, preferir el `codigo` del prefill cuando exista,
                        // sino empujar la primera candidate (por compatibilidad con lo que vino del portal).
                        const prefer = a.activo_codigo ?? a.activoCodigo ?? a.codigo ?? a.asset_id ?? a.assetId ?? a.id;
                        if (prefer) reconciledFromPrefill.push(String(prefer));
                      }
                    });

                    if (reconciledFromPrefill.length > 0) {
                      console.log('🔁 Activos reconciliados desde prefilledActivosDetails:', reconciledFromPrefill);
                      setFormData(prev => ({ ...prev, activos_codigos: reconciledFromPrefill }));
                    }
                  }
      } catch (err) {
        console.warn('⚠️ Error al reconciliar activos prefill:', err);
      }
    } catch (error) {
      console.error('Error cargando activos:', error);
      setActivos([]);
    }
  };

  const buscarUsuarioPorDNI = async () => {
    if (!dniBuscado.trim() || !formData.empresa_id) {
      return;
    }

    setBuscandoUsuario(true);
    try {
      const usuario = await portalService.buscarUsuarioPorDNI(Number(formData.empresa_id), dniBuscado);
      console.log('👤 Usuario raw encontrado desde portalService:', usuario);

      // Normalizar posibles variantes de nombres de campo del backend
      const normalized = {
        id: usuario?.id ?? usuario?.usuarioId ?? usuario?.userId ?? usuario?._id ?? null,
        nombre: usuario?.nombre ?? usuario?.fullName ?? usuario?.nombre_completo ?? usuario?.name ?? usuario?.usuario_nombre ?? '',
        dni: usuario?.dni ?? usuario?.numero_documento ?? usuario?.numeroDocumento ?? usuario?.documento ?? '',
        cargo: usuario?.cargo ?? usuario?.puesto ?? usuario?.position ?? '',
        telefono: usuario?.telefono ?? usuario?.phone ?? usuario?.celular ?? usuario?.mobile ?? '',
        correoPrincipal: usuario?.correoPrincipal ?? usuario?.correo ?? usuario?.email ?? usuario?.usuario_correo ?? ''
      };

      console.log('👤 Usuario normalizado:', normalized);
      setUsuarioEncontrado(normalized as any);

      // Agregar el correo del usuario encontrado a usuarios_reporta_ids si existe
      if (normalized.correoPrincipal) {
        setFormData(prev => ({ ...prev, usuarios_reporta_ids: [normalized.correoPrincipal] }));
      } else if (normalized.id) {
        // fallback: usar id como identificador si no hay correo
        setFormData(prev => ({ ...prev, usuarios_reporta_ids: [String(normalized.id)] }));
      }
    } catch (error: any) {
      console.error('Error buscando usuario por DNI:', error);
      setErrorBusqueda({
        show: true,
        message: error?.response?.data?.message || 'No se encontró usuario con ese DNI en la empresa'
      });
      setUsuarioEncontrado(null);
    } finally {
      setBuscandoUsuario(false);
    }
  };

  // Matriz de Prioridad ITIL (Impacto x Urgencia)
  const calcularPrioridad = (impacto: Impacto, urgencia: Urgencia): PrioridadTicket => {
    const matriz: Record<Impacto, Record<Urgencia, PrioridadTicket>> = {
      CRITICO: { CRITICA: 'CRITICA', ALTA: 'CRITICA', MEDIA: 'ALTA', BAJA: 'MEDIA' },
      ALTO: { CRITICA: 'CRITICA', ALTA: 'ALTA', MEDIA: 'ALTA', BAJA: 'MEDIA' },
      MEDIO: { CRITICA: 'ALTA', ALTA: 'ALTA', MEDIA: 'MEDIA', BAJA: 'BAJA' },
      BAJO: { CRITICA: 'MEDIA', ALTA: 'MEDIA', MEDIA: 'BAJA', BAJA: 'BAJA' }
    };
    
    return matriz[impacto][urgencia];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setArchivos(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Si estamos en modo configurar, solo enviamos los cambios de clasificación mediante editarTicket
    if (isConfigMode) {
      const ticketId = Number(initialData?.id || initialData?.ticketId);
      if (!ticketId) {
        alert('ID del ticket no disponible para configuración');
        return;
      }

      // Construir objeto de cambios con formato esperado por `editarTicket`
      const cambios: Record<string, { valorAnterior: any; valorNuevo: any }> = {};
      const addCambio = (key: string, nuevo: any) => {
        const anterior = (initialData as any)?.[key];
        // comparar como strings para evitar diferencias de tipo
        if ((anterior ?? null) !== (nuevo ?? null)) {
          cambios[key] = { valorAnterior: anterior ?? null, valorNuevo: nuevo ?? null };
        }
      };

      addCambio('servicio_id', formData.servicio_id ? Number(formData.servicio_id) : null);
      addCambio('tipo_ticket', formData.tipo_ticket || null);
      addCambio('categoria_id', formData.categoria_id ? Number(formData.categoria_id) : null);
      addCambio('subcategoria_id', formData.subcategoria_id ? Number(formData.subcategoria_id) : null);
      addCambio('impacto', formData.impacto || null);
      addCambio('urgencia', formData.urgencia || null);
      addCambio('prioridad', formData.prioridad || null);
      addCambio('modalidad', formData.modalidad || null);
      addCambio('tecnico_asignado_id', formData.tecnico_asignado_id ? Number(formData.tecnico_asignado_id) : null);

      setLoading(true);
      try {
        await editarTicket(ticketId, cambios, 'Configuración desde portal público');
        if (onUpdated) await onUpdated();
        onClose();
      } catch (error: any) {
        console.error('❌ Error configurando ticket:', error);
        alert(error?.response?.data?.message || 'Error al configurar ticket');
      } finally {
        setLoading(false);
      }

      return;
    }

    // Validaciones obligatorias para creación normal
    // Validaciones obligatorias
    if (!formData.empresa_id) {
      alert('Debe seleccionar una empresa');
      return;
    }

    if (!formData.sede_id) {
      alert('Debe seleccionar una sede');
      return;
    }

    if (!tipoSoporte) {
      alert('Debe seleccionar el tipo de soporte (Soporte Técnico a Activos o Gestión TI/Seguridad)');
      return;
    }

    if (!formData.titulo || !formData.descripcion) {
      alert('Título y descripción son obligatorios');
      return;
    }

    if (formData.usuarios_reporta_ids.length === 0) {
      alert('Debe haber al menos un usuario que reporta el incidente');
      return;
    }

    if (!formData.tipo_ticket || !formData.categoria_id || !formData.subcategoria_id) {
      alert('Debe completar la clasificación del ticket (Tipo, Categoría y Subcategoría)');
      return;
    }

    if (!formData.impacto || !formData.urgencia) {
      alert('Debe completar los datos ITIL (Impacto y Urgencia)');
      return;
    }

    if (!formData.servicio_id || !formData.modalidad) {
      alert('Debe seleccionar el servicio y la modalidad');
      return;
    }

    // Validación específica por tipo de soporte
    if (tipoSoporte === 'activos' && formData.activos_codigos.length === 0) {
      alert('Para Soporte Técnico a Activos debe seleccionar al menos un activo');
      return;
    }

    setLoading(true);
    try {
      const ticketData = {
        // Identificación
        empresa_id: Number(formData.empresa_id),
        sede_id: Number(formData.sede_id),
        
        // Tipo de soporte
        tipo_soporte: tipoSoporte,
        
        // Descripción
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        
        // Activos y usuarios
        activos_codigos: formData.activos_codigos,
        usuarios_reporta_ids: formData.usuarios_reporta_ids,
        
        // Clasificación
        tipo_ticket: formData.tipo_ticket,
        categoria_id: Number(formData.categoria_id),
        subcategoria_id: Number(formData.subcategoria_id),
        
        // ITIL
        impacto: formData.impacto,
        urgencia: formData.urgencia,
        prioridad: formData.prioridad,
        
        // Servicio
        servicio_id: Number(formData.servicio_id),
        tipo_servicio: formData.tipo_servicio,
        modalidad: formData.modalidad,
        
        // SLA
        aplica_sla: formData.aplica_sla,
        
        // Gestión (opcional)
        tecnico_asignado_id: formData.tecnico_asignado_id ? Number(formData.tecnico_asignado_id) : undefined,
        
        // Control
        estado: formData.estado,
        origen: formData.origen,
        
        // Archivos (opcional)
        archivos: archivos.length > 0 ? archivos : undefined
      };
      
      console.log('📤 Enviando ticket al backend:', ticketData);
      
      await onSubmit(ticketData);
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('❌ Error creando ticket:', error);
      console.error('❌ Error response:', error?.response?.data);
      console.error('❌ Error status:', error?.response?.status);
      
      const errorMessage = error?.response?.data?.message || error?.response?.data?.errors?.join(', ') || 'Error al crear ticket';
      alert(`Error al crear ticket:\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      empresa_id: '',
      sede_id: '',
      tipo_ticket: '',
      categoria_id: '',
      subcategoria_id: '',
      titulo: '',
      descripcion: '',
      activos_codigos: [],
      ubicacion: '',
      usuarios_reporta_ids: [],
      servicio_id: '',
      tipo_servicio: '',
      impacto: '',
      urgencia: '',
      prioridad: '',
      modalidad: '',
      aplica_sla: true,
      tecnico_asignado_id: '',
      estado: 'ABIERTO',
      origen: 'INTERNO'
    });
    setTipoSoporte('');
    setDniBuscado('');
    setUsuarioEncontrado(null);
    setArchivos([]);
    setSedes([]);
    setActivos([]);
    setUsuariosActivo([]);
    setSubcategorias([]);
    setSlaActivo(null);
    setSearchActivos('');
    setSearchUsuarios('');
  };

  const getPrioridadColor = (prioridad: PrioridadTicket | '') => {
    if (!prioridad) return 'text-gray-400';
    const colors = {
      BAJA: 'text-blue-600',
      MEDIA: 'text-yellow-600',
      ALTA: 'text-orange-600',
      CRITICA: 'text-red-600'
    };
    return colors[prioridad];
  };

  if (!isOpen) return null;

  // Determinar si el formulario debe estar bloqueado
  const isFormBlocked = Boolean(formData.empresa_id && (slaStatus === 'sin-configurar' || slaStatus === 'contrato-inactivo'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">{isConfigMode ? 'Configurar Ticket' : 'Crear Nuevo Ticket'}</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* 🔹 IDENTIFICACIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Identificación</h3>
                <span className="text-red-500 text-sm">* Obligatorio</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Empresa - OBLIGATORIO */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.empresa_id}
                    onChange={(e) => {
                      console.log('📝 Select onChange - Valor seleccionado:', e.target.value);
                      setFormData({ ...formData, empresa_id: e.target.value });
                    }}
                    disabled={isFormBlocked || isConfigMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar empresa...</option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                  
                  {/* Estado del SLA */}
                  {formData.empresa_id && (
                    <div className="mt-3">
                      {slaStatus === 'loading' && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-blue-700">Verificando SLA...</span>
                        </div>
                      )}
                      
                      {slaStatus === 'sin-configurar' && (
                        <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-800">
                                ⚠️ SLA no ha sido configurado
                              </p>
                              <p className="text-xs text-yellow-700 mt-1">
                                Por favor complete la configuración del SLA para esta empresa.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/admin/empresas/${formData.empresa_id}?tab=sla`);
                            }}
                            className="mt-2 w-full px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                          >
                            Revisar SLA
                          </button>
                        </div>
                      )}
                      
                      {slaStatus === 'contrato-inactivo' && (
                        <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-red-800">
                                🔴 SLA no aplica — contrato suspendido o vencido
                              </p>
                              <p className="text-xs text-red-700 mt-1">
                                No se pueden crear tickets para esta empresa debido al estado del contrato.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/admin/empresas/${formData.empresa_id}?tab=contrato`);
                            }}
                            className="mt-2 w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Revisar Contrato
                          </button>
                        </div>
                      )}
                      
                      {slaStatus === 'activo' && (
                        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-300 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-800">
                              🟢 SLA Activo
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              El ticket se asociará automáticamente al SLA configurado.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sede */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sede <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    disabled={(isFormBlocked || isConfigMode) || !formData.empresa_id || sedes.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.empresa_id 
                        ? 'Seleccione primero una empresa...' 
                        : sedes.length === 0 
                          ? 'Esta empresa no tiene sedes registradas' 
                          : 'Seleccionar sede...'}
                    </option>
                    {sedes.map(sede => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                  {formData.empresa_id && sedes.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Esta empresa aún no tiene sedes registradas
                    </p>
                  )}
                </div>
              </div>

              {/* SLA Info */}
              {slaActivo?.activo && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock size={16} />
                    <span className="text-sm font-medium">SLA Activo para esta empresa</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Los tiempos de respuesta y resolución se calcularán automáticamente
                  </p>
                </div>
              )}
            </div>

            {/* 🎯 TIPO DE SOPORTE */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Tipo de Soporte</h3>
                <span className="text-red-500 text-sm">* Obligatorio</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoSoporte('activos')}
                  disabled={isFormBlocked || isConfigMode}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    tipoSoporte === 'activos'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      tipoSoporte === 'activos' ? 'border-blue-500' : 'border-gray-400'
                    }`}>
                      {tipoSoporte === 'activos' && (
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">Soporte Técnico a Activos</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Seleccione uno o más activos con sus usuarios asignados
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoSoporte('gestion-ti')}
                  disabled={isFormBlocked || isConfigMode}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    tipoSoporte === 'gestion-ti'
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-300 hover:border-green-300 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      tipoSoporte === 'gestion-ti' ? 'border-green-500' : 'border-gray-400'
                    }`}>
                      {tipoSoporte === 'gestion-ti' && (
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">Gestión TI/Seguridad</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Busque usuario por DNI para reportes generales
                  </p>
                </button>
              </div>
            </div>

            {/* Condicional: Soporte Técnico a Activos */}
            {tipoSoporte === 'activos' && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Package className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Activos y Usuarios</h3>
              </div>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activos relacionados (Opcional - Múltiple selección)
                    </label>
                    
                    {/* Chips de activos seleccionados */}
                    {/* Si venimos de portal y trajimos detalles de activos, mostrarlos aquí */}
                    {isConfigMode && prefilledActivosDetails && prefilledActivosDetails.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {prefilledActivosDetails.map((a: any, i: number) => (
                          <div key={`prefill-${i}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{a.assetId || a.codigo || a.asset_id || a.codigo_activo || a.nombre || `Activo ${i+1}`}</p>
                              <p className="text-xs text-gray-500">{(a.categoria || a.categoria_nombre) ? `${a.categoria || a.categoria_nombre} • ${a.fabricante || a.marca || a.modelo || ''}` : (a.usuarioAsignado || a.usuario_asignado || '')}</p>
                            </div>
                            <div className="text-sm text-gray-600">{a.usuariosAsignados?.length ? `${a.usuariosAsignados.length} usuarios` : ''}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.activos_codigos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {formData.activos_codigos.map(codigo => {
                          const activo = activos.find(a => String(a.asset_id ?? a.assetId ?? a.id) === String(codigo));
                          return (
                            <div
                              key={codigo}
                              className="inline-flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 rounded-lg text-xs border-2 border-blue-200 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                {/* Información del activo */}
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{activo ? (activo.asset_id ?? activo.assetId ?? activo.codigo ?? activo.id) : codigo}</span>
                                  {activo && (
                                    <>
                                      <span className="text-blue-700">{activo.categoria} - {activo.fabricante} {activo.modelo}</span>
                                      <span className="text-blue-600 italic flex items-center gap-1 mt-0.5">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        {activo.area || 'Sin área'}
                                      </span>
                                    </>
                                  )}
                                </div>
                                
                                {/* Código de Acceso Remoto - Destacado al costado */}
                                {activo?.codigoAccesoRemoto && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md border border-indigo-700 shadow-md">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                    </svg>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">Acceso Remoto</span>
                                      <span className="font-bold text-sm">{activo.codigoAccesoRemoto}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => deselectActivo(codigo)}
                                className="ml-2 hover:bg-red-100 hover:text-red-600 rounded-full p-1.5 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Buscador de activos */}
                    {formData.sede_id && activos.length > 0 && (
                      <div className="mb-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Buscar activo por código, categoría, fabricante o modelo..."
                          value={searchActivos}
                          onChange={(e) => setSearchActivos(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const activosFiltrados = activos.filter(activo => {
                                if (!searchActivos) return true;
                                const searchLower = searchActivos.toLowerCase();
                                const codigoActivo = (activo.assetId || activo.id || '').toString().toLowerCase();
                                const categoria = (activo.categoria || '').toLowerCase();
                                const fabricante = (activo.fabricante || '').toLowerCase();
                                const modelo = (activo.modelo || '').toLowerCase();
                                return codigoActivo.includes(searchLower) || 
                                       categoria.includes(searchLower) || 
                                       fabricante.includes(searchLower) || 
                                       modelo.includes(searchLower);
                              });
                              // seleccionar uno por uno vía la ruta que recibe el objeto completo
                              activosFiltrados.forEach(act => handleSelectActivoObject(act));
                            }}
                            disabled={isFormBlocked || isConfigMode}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Seleccionar todos
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // deseleccionar todos usando la misma ruta
                              const actuales = [...(formData.activos_codigos || [])];
                              actuales.forEach(c => deselectActivo(c));
                            }}
                            disabled={isFormBlocked || isConfigMode}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Limpiar selección
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista con checkboxes */}
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                      {!formData.sede_id ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Primero seleccione una sede
                        </div>
                      ) : activos.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Esta sede no tiene activos registrados
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {activos.filter(activo => {
                            if (!searchActivos) return true;
                            const searchLower = searchActivos.toLowerCase();
                            const codigoActivo = (activo.assetId || activo.id || '').toString().toLowerCase();
                            const categoria = (activo.categoria || '').toLowerCase();
                            const fabricante = (activo.fabricante || '').toLowerCase();
                            const modelo = (activo.modelo || '').toLowerCase();
                            return codigoActivo.includes(searchLower) || 
                                   categoria.includes(searchLower) || 
                                   fabricante.includes(searchLower) || 
                                   modelo.includes(searchLower);
                          }).map(activo => {
                            const codigoActivo = activo.assetId || activo.id;
                            const isSelected = formData.activos_codigos.includes(codigoActivo);
                            return (
                              <label
                                key={codigoActivo}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleSelectActivoObject(activo);
                                    } else {
                                      deselectActivo(codigoActivo);
                                    }
                                  }}
                                  disabled={isFormBlocked || isConfigMode}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {codigoActivo}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {activo.categoria} - {activo.fabricante} {activo.modelo}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                          {activos.filter(activo => {
                            if (!searchActivos) return true;
                            const searchLower = searchActivos.toLowerCase();
                            const codigoActivo = (activo.assetId || activo.id || '').toString().toLowerCase();
                            const categoria = (activo.categoria || '').toLowerCase();
                            const fabricante = (activo.fabricante || '').toLowerCase();
                            const modelo = (activo.modelo || '').toLowerCase();
                            return codigoActivo.includes(searchLower) || 
                                   categoria.includes(searchLower) || 
                                   fabricante.includes(searchLower) || 
                                   modelo.includes(searchLower);
                          }).length === 0 && searchActivos && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No se encontraron activos que coincidan con "{searchActivos}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {formData.sede_id && activos.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Esta sede aún no tiene activos registrados
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuarios que reportan (Opcional - Múltiple selección)
                    </label>
                    
                    {/* Chips de usuarios seleccionados */}
                    {formData.usuarios_reporta_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {formData.usuarios_reporta_ids.map(usuarioCorreo => {
                          const usuario = usuariosActivo.find(u => u.correo === usuarioCorreo);
                          return (
                            <div
                              key={usuarioCorreo}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-xs border border-green-200"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold">{usuario ? usuario.nombre : usuarioCorreo}</span>
                                {usuario && (
                                  <>
                                    <span className="text-green-700">{usuario.correo}</span>
                                    <span className="text-green-600 italic">{usuario.cargo}</span>
                                    <span className="text-blue-700 font-semibold flex items-center gap-1 mt-0.5">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                      </svg>
                                      {usuario.activo_codigo}
                                    </span>
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    usuarios_reporta_ids: formData.usuarios_reporta_ids.filter(c => c !== usuarioCorreo)
                                  });
                                }}
                                className="ml-1 hover:bg-green-200 rounded-full p-1 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Buscador de usuarios */}
                    {formData.activos_codigos.length > 0 && usuariosActivo.length > 0 && (
                      <div className="mb-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Buscar usuario por nombre, correo o cargo..."
                          value={searchUsuarios}
                          onChange={(e) => setSearchUsuarios(e.target.value)}
                          disabled={isFormBlocked || isConfigMode}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const usuariosFiltrados = usuariosActivo.filter(usuario => {
                                if (!searchUsuarios) return true;
                                const searchLower = searchUsuarios.toLowerCase();
                                const nombre = (usuario.nombre || '').toLowerCase();
                                const correo = (usuario.correo || '').toLowerCase();
                                const cargo = (usuario.cargo || '').toLowerCase();
                                return nombre.includes(searchLower) || 
                                       correo.includes(searchLower) || 
                                       cargo.includes(searchLower);
                              });
                              const todosLosCorreos = usuariosFiltrados.map(u => u.correo);
                              setFormData({
                                ...formData,
                                usuarios_reporta_ids: todosLosCorreos
                              });
                            }}
                            disabled={isFormBlocked || isConfigMode}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Seleccionar todos
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                usuarios_reporta_ids: []
                              });
                            }}
                            disabled={isFormBlocked || isConfigMode}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Limpiar selección
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista con checkboxes */}
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                      {formData.activos_codigos.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Primero seleccione al menos un activo
                        </div>
                      ) : usuariosActivo.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Los activos seleccionados no tienen usuarios asignados
                        </div>
                      ) : (
                        <>
                          {/* Lista de usuarios individuales */}
                          <div className="divide-y divide-gray-200">
                            {usuariosActivo.filter(usuario => {
                              if (!searchUsuarios) return true;
                              const searchLower = searchUsuarios.toLowerCase();
                              const nombre = (usuario.nombre || '').toLowerCase();
                              const correo = (usuario.correo || '').toLowerCase();
                              const cargo = (usuario.cargo || '').toLowerCase();
                              return nombre.includes(searchLower) || 
                                     correo.includes(searchLower) || 
                                     cargo.includes(searchLower);
                            }).map(usuario => {
                              const usuarioCorreo = usuario.correo;
                              const isSelected = formData.usuarios_reporta_ids.includes(usuarioCorreo);
                              const esUnicoUsuario = usuariosActivo.length === 1;
                              return (
                                <label
                                  key={usuarioCorreo}
                                  className={`flex items-center gap-3 p-3 transition-colors ${
                                    esUnicoUsuario 
                                      ? 'bg-green-50 border-l-4 border-green-500' 
                                      : 'hover:bg-gray-50 cursor-pointer'
                                  }`}
                                >
                                  <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        usuarios_reporta_ids: [...formData.usuarios_reporta_ids, usuarioCorreo]
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        usuarios_reporta_ids: formData.usuarios_reporta_ids.filter(c => c !== usuarioCorreo)
                                      });
                                    }
                                  }}
                                  disabled={(isFormBlocked || isConfigMode) || esUnicoUsuario}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    {usuario.nombre}
                                    {esUnicoUsuario && (
                                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                        Requerido
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {usuario.correo} • {usuario.cargo}
                                  </div>
                                  <div className="text-xs text-blue-700 font-semibold flex items-center gap-1 mt-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                    </svg>
                                    {usuario.activo_codigo} ({usuario.activo_area})
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                          {usuariosActivo.filter(usuario => {
                            if (!searchUsuarios) return true;
                            const searchLower = searchUsuarios.toLowerCase();
                            const nombre = (usuario.nombre || '').toLowerCase();
                            const correo = (usuario.correo || '').toLowerCase();
                            const cargo = (usuario.cargo || '').toLowerCase();
                            return nombre.includes(searchLower) || 
                                   correo.includes(searchLower) || 
                                   cargo.includes(searchLower);
                          }).length === 0 && searchUsuarios && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No se encontraron usuarios que coincidan con "{searchUsuarios}"
                            </div>
                          )}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {formData.activos_codigos.length > 0 && usuariosActivo.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Los activos seleccionados no tienen usuarios asignados
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

                {/* Condicional: Gestión TI/Seguridad - Búsqueda por DNI */}
                {tipoSoporte === 'gestion-ti' && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-green-600" size={20} />
                    <h3 className="text-lg font-semibold text-gray-800">Búsqueda de Usuario</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Usuario por DNI
                    </label>
                    
                    {/* Buscador de DNI */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={dniBuscado}
                        onChange={(e) => setDniBuscado(e.target.value.replace(/\D/g, ''))}
                        maxLength={8}
                        placeholder="Ingrese DNI (8 dígitos)"
                        disabled={(isFormBlocked || isConfigMode) || !formData.empresa_id}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={buscarUsuarioPorDNI}
                        disabled={(isFormBlocked || isConfigMode) || buscandoUsuario || !dniBuscado.trim() || !formData.empresa_id || dniBuscado.length !== 8}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {buscandoUsuario ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>

                    {/* Usuario encontrado */}
                    {usuarioEncontrado && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-green-900 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Usuario Encontrado
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setUsuarioEncontrado(null);
                              setDniBuscado('');
                              setFormData(prev => ({ ...prev, usuarios_reporta_ids: [] }));
                            }}
                            disabled={isFormBlocked || isConfigMode}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nombre Completo</p>
                            <p className="font-bold text-gray-900">{usuarioEncontrado.nombre}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">DNI</p>
                            <p className="font-mono font-bold text-green-600">{usuarioEncontrado.dni}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Correo</p>
                            <p className="font-semibold text-gray-900 text-sm">{usuarioEncontrado.correoPrincipal}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Teléfono</p>
                            <p className="font-semibold text-gray-900">{usuarioEncontrado.telefono}</p>
                          </div>
                          {usuarioEncontrado.cargo && (
                            <div className="col-span-2 bg-white rounded-lg p-3">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cargo</p>
                              <p className="font-semibold text-gray-900">{usuarioEncontrado.cargo}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!formData.empresa_id && (
                      <p className="text-xs text-amber-600 mt-2">
                        💡 Primero seleccione una empresa para buscar usuarios
                      </p>
                    )}
                  </div>
                </div>
                )}

            {/* 📝 DESCRIPCIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="text-purple-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Descripción del Evento/Incidente</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ej: Impresora no funciona en área de contabilidad"
                    disabled={isFormBlocked || isConfigMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción detallada <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describa el evento/incidente con el mayor detalle posible..."
                    rows={4}
                    disabled={isFormBlocked || isConfigMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

              </div>
            </div>

            {/* 🏷️ CLASIFICACIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="text-green-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Clasificación</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Ticket *
                  </label>
                  <select
                    value={formData.tipo_ticket}
                    onChange={(e) => setFormData({ ...formData, tipo_ticket: e.target.value })}
                    disabled={isFormBlocked || isConfigMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar tipo...</option>
                    {tiposTicket.map(tipo => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    disabled={isFormBlocked || isConfigMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {catalogoCategorias.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subcategoría
                  </label>
                  <select
                    value={formData.subcategoria_id}
                    onChange={(e) => setFormData({ ...formData, subcategoria_id: e.target.value })}
                    disabled={(isFormBlocked || isConfigMode) || !formData.categoria_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar subcategoría...</option>
                    {subcategorias.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Servicio
                  </label>
                  <select
                    value={formData.servicio_id}
                    onChange={(e) => setFormData({ ...formData, servicio_id: e.target.value })}
                    disabled={isFormBlocked || isConfigMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar servicio...</option>
                    {serviciosDisponibles.map(servicio => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Servicio
                  </label>
                  <input
                    type="text"
                    value={formData.tipo_servicio}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    placeholder="Se asigna automáticamente"
                  />
                </div>
              </div>
            </div>

            {/* ⚡ ITIL - PRIORIZACIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-orange-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Priorización ITIL</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impacto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.impacto}
                    onChange={(e) => setFormData({ ...formData, impacto: e.target.value as Impacto })}
                    disabled={isFormBlocked || isConfigMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar impacto...</option>
                    <option value="BAJO">Bajo - Afecta a un usuario</option>
                    <option value="MEDIO">Medio - Afecta a un área</option>
                    <option value="ALTO">Alto - Afecta a múltiples áreas</option>
                    <option value="CRITICO">Crítico - Afecta a toda la organización</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgencia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.urgencia}
                    onChange={(e) => setFormData({ ...formData, urgencia: e.target.value as Urgencia })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar urgencia...</option>
                    <option value="BAJA">Baja - Puede esperar</option>
                    <option value="MEDIA">Media - Resolver en días</option>
                    <option value="ALTA">Alta - Resolver en horas</option>
                    <option value="CRITICA">Crítica - Inmediata</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad (Calculada)
                  </label>
                  <div className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold ${getPrioridadColor(formData.prioridad)}`}>
                    {formData.prioridad || 'Seleccione Impacto y Urgencia'}
                  </div>
                </div>
              </div>

              {formData.prioridad && (
                <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                  💡 <strong>Matriz ITIL:</strong> La prioridad se calcula automáticamente combinando Impacto y Urgencia
                </div>
              )}
            </div>

            {/* 🔧 SERVICIO Y GESTIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <User className="text-indigo-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Servicio y Asignación</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modalidad de Servicio
                  </label>
                  <select
                    value={formData.modalidad}
                    onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar modalidad...</option>
                    <option value="REMOTO">Remoto</option>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="HIBRIDO">Híbrido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asignar Técnico (Opcional)
                  </label>
                  <select
                    value={formData.tecnico_asignado_id}
                    onChange={(e) => setFormData({ ...formData, tecnico_asignado_id: e.target.value })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Sin asignar</option>
                    {tecnicos.length === 0 ? (
                      <option disabled>No hay técnicos disponibles</option>
                    ) : (
                      tecnicos.map(tec => {
                        // Intentar diferentes nombres de campos posibles
                        const nombre = tec.nombre || tec.nombreCompleto || tec.usuario || tec.username || tec.email || 'Sin nombre';
                        const rol = tec.rol || 'Sin rol';
                        return (
                          <option key={tec.usuario_id || tec.id} value={tec.usuario_id || tec.id}>
                            {nombre} - {rol}
                          </option>
                        );
                      })
                    )}
                  </select>
                  {tecnicos.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Solo usuarios internos con rol Administrador o Técnico
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 📎 ADJUNTOS */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="text-gray-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Adjuntos (Opcional)</h3>
              </div>
              
              <div>
                <label className="block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    disabled={isFormBlocked || isConfigMode}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      cursor-pointer
                      disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
                
                {archivos.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {archivos.map((file, index) => (
                      <li key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Adjuntos provenientes del ticket público (solo lectura) */}
                {isConfigMode && initialAdjuntosLocal && initialAdjuntosLocal.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Adjuntos del ticket</h4>
                    <div className="space-y-2">
                      {initialAdjuntosLocal.map((adj: any, idx: number) => {
                        let fileName = `Adjunto ${idx + 1}`;
                        let href = '#';
                        const isObj = typeof adj === 'object' && adj !== null;
                        if (isObj) {
                          fileName = adj.nombre || adj.name || fileName;
                          href = adj.id && initialData?.id ? `/api/tickets/${initialData.id}/adjuntos/${adj.id}/download` : (adj.url || '#');
                        } else if (typeof adj === 'string') {
                          fileName = adj.split('/').pop() || fileName;
                          href = adj;
                        }

                        return (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                            <div className="text-sm text-gray-800 truncate">{fileName}</div>
                            <a href={href} download className="text-xs text-blue-600 hover:underline">Ver / Descargar</a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? (isConfigMode ? 'Guardando...' : 'Creando...') : (isConfigMode ? 'Guardar cambios' : 'Crear Ticket')}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Error - Usuario No Encontrado */}
      {errorBusqueda.show && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform animate-scale-in">
            {/* Header con gradiente rojo */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 rounded-full p-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Usuario No Encontrado</h3>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 text-base leading-relaxed">
                    {errorBusqueda.message}
                  </p>
                  <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">DNI buscado:</span> {dniBuscado}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sugerencias */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-blue-900 mb-2">💡 Sugerencias:</p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                  <li>Verifique que el DNI sea correcto (8 dígitos)</li>
                  <li>Asegúrese que el usuario esté registrado en esta empresa</li>
                  <li>Contacte al administrador si el problema persiste</li>
                </ul>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setErrorBusqueda({ show: false, message: '' });
                    setDniBuscado('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold shadow-md transition-all"
                >
                  Intentar de Nuevo
                </button>
                <button
                  onClick={() => setErrorBusqueda({ show: false, message: '' })}
                  className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTicketModal;
