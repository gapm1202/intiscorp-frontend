import React, { useEffect, useRef, useState } from 'react';
import { getWarrantyInfo } from '@/modules/inventario/utils/warranty';
import useAuth from '../../../hooks/useAuth';
import { formatAssetCode } from '@/utils/helpers';
import { signatureDefault } from '../../../config';
import axiosClient from '@/api/axiosClient';
import Toast from '@/components/ui/Toast';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  // Minimal typed shape for the asset. The component accesses many possible
  // fields from the backend, so keep it permissive but typed to avoid `any`.
  asset?: Asset;
  empresaNombre?: string;
  sedeNombre?: string;
};

// Local minimal types to avoid `any` across the file while remaining flexible.
type UsuarioItem = {
  nombre?: string;
  correo?: string;
  cargo?: string;
  [k: string]: unknown;
};

type FotoItem = {
  url?: string;
  description?: string;
  descripcion?: string;
  name?: string;
  nombre?: string;
  [k: string]: unknown;
};

type DocItem = {
  url?: string;
  name?: string;
  description?: string;
  [k: string]: unknown;
};

type Asset = Record<string, unknown>;


const getStringField = (obj: unknown, keys: string[]) => {
  if (typeof obj !== 'object' || obj === null) return '';
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return '';
};

const capitalize = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : (v == null ? '' : String(v));
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const computeAntiguedad = (a: unknown) => {
  try {
    const rec = a as Record<string, unknown> | null | undefined;
    const fechaCompra = getStringField(rec, ['fechaCompra','fecha_compra','fechaCompraAprox','fechaCompraAproxYear','fecha_compra_aprox']);
    if (!fechaCompra) return '';
    // If it's a year only
    const maybeYear = Number(String(fechaCompra).slice(0,4));
    const now = new Date();
    if (!Number.isNaN(maybeYear) && String(fechaCompra).length <= 4) {
      const years = now.getFullYear() - maybeYear;
      return years > 0 ? `${years} año${years > 1 ? 's' : ''}` : '0 años';
    }
    const d = new Date(String(fechaCompra));
    if (isNaN(d.getTime())) return '';
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();
    if (months < 0) { years -= 1; months += 12; }
    if (years <= 0 && months <= 0) return '0 meses';
    if (years <= 0) return `${months} mes${months > 1 ? 'es' : ''}`;
    if (months <= 0) return `${years} año${years > 1 ? 's' : ''}`;
    return `${years} año${years > 1 ? 's' : ''} ${months} mes${months > 1 ? 'es' : ''}`;
  } catch {
    return '';
  }
};

// Formatea valores de componentes para evitar '[object Object]'.
const formatComponentValue = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return (v as unknown[]).map(formatComponentValue).filter(Boolean).join(' • ');
  if (typeof v === 'object') {
    try {
      const rec = v as Record<string, unknown>;
      return Object.entries(rec).map(([k, val]) => `${k}: ${val ?? ''}`).join(' • ');
    } catch {
      try { return JSON.stringify(v); } catch { return String(v); }
    }
  }
  return String(v);
};

const InitialSupportReportModal: React.FC<Props> = ({ isOpen, onClose, asset: assetRaw, empresaNombre, sedeNombre }) => {
  // Local cast: the `asset` object comes in many shapes from the backend
  // and is used extensively below. Keep a single localized `any` cast to
  // avoid sprinkling casts everywhere while keeping the rest of the file typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = assetRaw as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user } = useAuth() as any || {};
  // Firma escaneada: si existe una firma predeterminada (perfil o config), usarla por defecto.
  const defaultSig = user?.signature || user?.firmaUrl || signatureDefault || null;
  const [scannedSignature, setScannedSignature] = useState<string | null>(defaultSig);
  // Si hay una firma predeterminada la usamos automáticamente; si no, se muestra el canvas.
  const [useScannedSignature, setUseScannedSignature] = useState<boolean>(!!defaultSig);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [tests, setTests] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [configurations, setConfigurations] = useState('');
  const [softwareInstalled, setSoftwareInstalled] = useState('');
  const [actionsObservations, setActionsObservations] = useState('');
  const [techEmail, setTechEmail] = useState(user?.email ?? '');
  const [techName, setTechName] = useState(user?.nombre ?? user?.name ?? '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().slice(0, 10));
      setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0,5));
      setTechEmail(user?.email ?? '');
      setTechName(user?.nombre ?? user?.name ?? '');
      // Dejar los campos vacíos al abrir; usamos placeholders para ejemplos no editables
      setDiagnosis('');
      setTests('');
      setRecommendations('');
      setConfigurations('');
      setSoftwareInstalled('');
      setActionsObservations('');
      // Resetear estado de generación
      setIsGenerating(false);
      setShowToast(false);
      clearCanvas();
      // Debug: log warranty-related raw fields to help diagnose missing display
      try {
      } catch {
        // noop
      }
    }
  }, [isOpen, user, asset]);

  // Normalize users and photos for rendering
  const usuariosRaw = asset?.usuariosAsignados || asset?.usuario_asignado || [];
  const usuariosArrayRender = Array.isArray(usuariosRaw) ? usuariosRaw : (typeof usuariosRaw === 'string' ? JSON.parse(usuariosRaw || '[]') : []);
  // Detailed users for modal: include correo and cargo/position when available
  const usuariosDetailed = usuariosArrayRender.map((u: unknown) => {
    const uu = u as UsuarioItem;
    return {
      nombre: getStringField(uu, ['nombre', 'nombreUsuario', 'name']),
      correo: getStringField(uu, ['correo', 'email', 'mail']),
      cargo: getStringField(uu, ['cargo', 'role', 'puesto'])
    } as { nombre: string; correo: string; cargo: string };
  });

  const fotosRaw = asset?.fotos || [];
  const fotosArrayRender = Array.isArray(fotosRaw) ? fotosRaw : (typeof fotosRaw === 'string' ? JSON.parse(fotosRaw || '[]') : []);
  // Normalizar fotos conservando la descripción/caption/descripcion/desc para mostrarlas en el formulario
  const fotosNormalizedForUI = fotosArrayRender.map((f: FotoItem) => {
    let url = getStringField(f, ['url']) || (typeof f === 'string' ? String(f) : '');
    const caption = getStringField(f, ['description', 'descripcion', 'caption', 'desc', 'name']);
    try {
      if (url && !url.startsWith('http')) {
        const decoded = decodeURIComponent(url);
        url = `http://localhost:4000/uploads/${encodeURIComponent(decoded)}`;
      } else if (url) {
        const match = url.match(/\/uploads\/(.+)$/);
        if (match) {
          const filename = match[1];
          url = `http://localhost:4000/uploads/${encodeURIComponent(decodeURIComponent(filename))}`;
        }
      }
    } catch {
      // leave as-is
    }
    return { url, caption };
  }).filter((p: { url?: string } | undefined): p is { url: string; caption?: string } => Boolean(p?.url)) as Array<{ url: string; caption?: string }>;

  // Normalizar documento de compra y documento de garantía (si existen)
  const normalizeDoc = (docAny: DocItem | unknown): DocItem | null => {
    if (!docAny) return null;
    let url = getStringField(docAny, ['url', 'documentUrl']) || (typeof docAny === 'string' ? String(docAny) : '');
    const name = getStringField(docAny, ['name', 'documentName', 'filename']) || '';
    const desc = getStringField(docAny, ['description', 'descripcion', 'documentDescription', 'desc', 'purchaseDocumentDescription', 'purchaseDocumentDesc', 'warrantyDocumentDescription', 'warrantyDocumentDesc', 'documentDesc', 'descripcionDocumento', 'descripcion_compra', 'descripcion_garantia']) || '';
    try {
      if (url && !url.startsWith('http')) {
        const decoded = decodeURIComponent(url);
        url = `http://localhost:4000/uploads/${encodeURIComponent(decoded)}`;
      } else if (url) {
        const match = url.match(/\/uploads\/(.+)$/);
        if (match) {
          const filename = match[1];
          url = `http://localhost:4000/uploads/${encodeURIComponent(decodeURIComponent(filename))}`;
        }
      }
    } catch {
      // noop
    }
    if (!url) return null;
    return { url, name: name || url.split('/').pop() || '', desc };
  };

  const purchaseDoc = normalizeDoc(asset?.purchaseDocumentUrl ?? asset?.purchase_document_url ?? asset?.purchaseDocument ?? asset?.purchase_document ?? asset?.purchaseDoc);
  const warrantyDoc = normalizeDoc(asset?.warrantyDocumentUrl ?? asset?.warranty_document_url ?? asset?.warrantyDocument ?? asset?.warranty_document ?? asset?.warrantyDoc);

  // If the doc object didn't include a description, try common top-level fields on the asset
  if (purchaseDoc && !purchaseDoc.desc) {
    purchaseDoc.desc = getStringField(asset, ['purchaseDocumentDescription','purchase_document_description','purchaseDocDescription','purchaseDocDesc','descripcion_compra','descripcionDocumento','purchaseDocumentDesc','documento_compra_descripcion']);
    if (!purchaseDoc.name) purchaseDoc.name = getStringField(asset, ['purchaseDocumentName','purchase_document_name','purchaseDocName','purchase_doc_name']);
  }
  if (warrantyDoc && !warrantyDoc.desc) {
    warrantyDoc.desc = getStringField(asset, ['warrantyDocumentDescription','warranty_document_description','warrantyDocDescription','warrantyDocDesc','descripcion_garantia','descripcionGarantia','warrantyDocumentDesc','documento_garantia_descripcion']);
    if (!warrantyDoc.name) warrantyDoc.name = getStringField(asset, ['warrantyDocumentName','warranty_document_name','warrantyDocName','warranty_doc_name']);
  }

  // Condición física: buscar en múltiples nombres posibles
  const condicion = getStringField(asset, ['condicionFisica','condicion_fisica','condicion','estadoFisico','estado_fisico','estadoActivo','estado_activo']);
  // Antiguedad calculada a partir de fecha de compra o año aproximado
  const antiguedadComputed = computeAntiguedad(asset) || getStringField(asset, ['antiguedad','antiguedad_anios','antiguedad_meses']);

  // Parse componentes (campos con arrays) and custom fields, merge defensively
  const camposArrayRaw = asset?.camposPersonalizadosArray || asset?.campos_personalizados_array || asset?.camposArray || null;
  let componentes: Record<string, unknown> = {};
  try {
    componentes = (typeof camposArrayRaw === 'string' ? JSON.parse(camposArrayRaw || '{}') : (camposArrayRaw || {})) as Record<string, unknown>;
  } catch {
    componentes = (camposArrayRaw || {}) as Record<string, unknown>;
  }

  const camposPersonalizadosRaw = asset?.camposPersonalizados || asset?.campos_personalizados || asset?.campos || {};
  let parsedCamposPersonalizados: Record<string, unknown> = {};
  try {
    parsedCamposPersonalizados = (typeof camposPersonalizadosRaw === 'string' ? JSON.parse(camposPersonalizadosRaw || '{}') : (camposPersonalizadosRaw || {})) as Record<string, unknown>;
  } catch {
    parsedCamposPersonalizados = (camposPersonalizadosRaw || {}) as Record<string, unknown>;
  }

  // Merge: if parsedCamposPersonalizados contains arrays/objects that look like componentes, add them to componentes
  Object.entries(parsedCamposPersonalizados || {}).forEach(([k, v]) => {
    if (!v) return;
    if (Array.isArray(v)) {
      if (!componentes[k]) componentes[k] = v;
    } else if (typeof v === 'object') {
      if (!componentes[k]) componentes[k] = [v];
    } else {
      // Valor primitivo: si la clave parece corresponder a un componente (heurística), la convertimos
      const keyLower = String(k).toLowerCase();
      if (/tarjeta\s*de\s*video|tarjeta.*video|gpu|tarjeta\s*video|vga/i.test(keyLower)) {
        if (!componentes[k]) componentes[k] = [{ Valor: v }];
      }
      // De lo contrario, se mantiene como campo simple (handled later)
    }
  });

  // Simple custom fields (primitives) excluding those that are present in componentes
  const componentKeysSet = new Set(Object.keys(componentes || {}).map(k => String(k).toLowerCase()));
  // Keys already shown in the 'Datos del activo' main area - used to avoid duplicates
  const displayedKeys = new Set([
    'area','categoría','categoria','marca','fabricante','modelo','antigüedad','antiguedad','codigo interno','codigo','código interno','número de serie','numero de serie','serie','estado físico','estado fisico','estado operativo','disco duro','disco','tarjeta de video','tarjeta','memoria ram','memoria','garantía','garantia','tipo documento','tipo_documento','observaciones'
  ].map(k => k.toLowerCase()));
  const simpleCustomFields: Record<string, string | number | boolean> = {};
  Object.entries(parsedCamposPersonalizados || {}).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    const lower = String(k).toLowerCase();
    if (componentKeysSet.has(lower)) return; // skip duplicates
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      // Skip simple custom fields that are already displayed in the main metadata
      if (displayedKeys.has(lower)) return;
      simpleCustomFields[k] = v as string | number | boolean;
    }
  });
  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  // Helper: find component by key case-insensitive
  const findComponent = (key: string) => {
    if (!componentes) return undefined;
    const exact = (componentes as Record<string, unknown>)[key];
    if (exact) return exact;
    const lower = key.toLowerCase();
    const foundKey = Object.keys(componentes).find(k => k.toLowerCase() === lower);
    return foundKey ? (componentes as Record<string, unknown>)[foundKey] : undefined;
  };

  // Disco Duro and Tarjeta de video values formatted (used for PDF generation)
  const rawDisco = asset?.discoOAlmacenamiento ?? asset?.disco ?? (findComponent('Disco Duro') ?? findComponent('disco') ?? findComponent('disco duro'));
  const rawTarjeta = simpleCustomFields['Tarjeta de video'] ?? simpleCustomFields['tarjeta_de_video'] ?? (findComponent('Tarjeta de video') ?? findComponent('tarjeta_de_video') ?? findComponent('Tarjeta'));
  const rawMemoria = asset?.memoria ?? asset?.ram ?? (simpleCustomFields['Memoria RAM'] ?? simpleCustomFields['memoria_ram'] ?? (findComponent('Memoria RAM') ?? findComponent('memoria') ?? findComponent('ram')));

  // Build a renderable list of ALL component entries (mostrar todos como en la vista Ver activo)
  const componentesRenderEntries: Array<[string, unknown]> = (() => {
    const entries: Array<[string, unknown]> = Object.entries(componentes || {});
    return entries;
  })();

  // Warranty info (try backend-provided fields first, then infer)
  const _wInfo = getWarrantyInfo({
    estado_garantia: asset?.estado_garantia ?? asset?.estadoGarantia,
    warranty_expires_at: asset?.warranty_expires_at ?? asset?.warrantyExpiresAt,
    fechaFinGarantia: asset?.fechaFinGarantia ?? asset?.fecha_fin_garantia,
    garantiaDuracion: asset?.garantia ?? asset?.garantiaDuracion,
    garantia: asset?.garantia,
    fechaCompra: asset?.fechaCompra ?? asset?.fecha_compra ?? asset?.fechaCompraAprox ?? asset?.fechaCompraAproxYear ?? asset?.fecha_compra_aprox
  });
    const warrantyHtml = (() => {
      const estado = _wInfo.estado ?? '-';
      // Only include warranty block in printable HTML when the user explicitly selected Vigente or No vigente
      if (!(estado === 'Vigente' || estado === 'No vigente')) return '';
      const expires = _wInfo.expiresAt ? new Date(_wInfo.expiresAt).toLocaleDateString('es-ES') : null;
      const duration = String(asset?.garantia ?? asset?.garantiaDuracion ?? asset?.garantia_duracion ?? '').trim() || '-';
      if (expires) {
        const label = estado === 'No vigente' ? 'Venció' : 'Vence';
        // Render duration and expiry on a single line separated by ' - '
        return `<div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Garantía</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${duration} - ${label}: ${expires}</div></div>`;
      }
      return `<div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Garantía</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${duration} - Estado: ${estado}</div></div>`;
    })();

  const draw = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };


  // Nota: subida de firma removida por decisión del cliente; si en el futuro quieres
  // permitir subida, puedes reintroducir esta función.

  /**
   * Nueva función: Llama al endpoint del backend para generar el PDF
   * POST /api/informes/soporte-inicial/:assetId
   */
  const generatePDFFromBackend = async () => {
    // Prevenir múltiples clicks
    if (isGenerating) return;
    
    setIsGenerating(true);
    setShowToast(false);
    
    try {
      const assetId = asset?.assetId || asset?.codigo || asset?._id || asset?.id;
      
      if (!assetId) {
        setToastMessage('No se pudo identificar el ID del activo');
        setToastType('error');
        setShowToast(true);
        return;
      }

      // Preparar firma (preferir escaneada si está activa)
      const firmaUrl = (useScannedSignature && scannedSignature) 
        ? scannedSignature 
        : (canvasRef.current?.toDataURL() || '');

      // Payload según especificación del backend
      const payload = {
        diagnostico: diagnosis || '',
        solucionesAplicadas: `
**Pruebas realizadas:**
${tests || '-'}

**Recomendaciones:**
${recommendations || '-'}

**Configuraciones iniciales:**
${configurations || '-'}

**Software instalado:**
${softwareInstalled || '-'}
        `.trim(),
        observaciones: actionsObservations || '',
        firmaUrl: firmaUrl || undefined
      };

      console.log('[PDF Backend] Enviando solicitud:', { assetId, payload });

      // Llamada al endpoint del backend
      const response = await axiosClient.post(
        `/api/informes/soporte-inicial/${assetId}`,
        payload,
        {
          timeout: 30000 // 30 segundos de timeout
        }
      );

      console.log('[PDF Backend] Respuesta:', response.data);

      if (response.data?.ok && response.data?.data?.pdfUrl) {
        const pdfUrl = response.data.data.pdfUrl;
        
        // Abrir el PDF en nueva pestaña
        const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        
        if (!newWindow) {
          setToastMessage('Por favor permite las ventanas emergentes para ver el informe');
          setToastType('info');
          setShowToast(true);
          return;
        }
        
        // Mostrar mensaje de éxito con toast bonito
        setToastMessage('Informe generado correctamente');
        setToastType('success');
        setShowToast(true);
        
        // Cerrar el modal después de un breve delay
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        throw new Error(response.data?.message || 'Error al generar el PDF');
      }
    } catch (error: any) {
      console.error('[PDF Backend] Error:', error);
      
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || 'Error al generar el informe. Por favor intente nuevamente.';
      
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
    } finally {
      // Asegurar que siempre se resetea el estado de cargando
      setIsGenerating(false);
    }
  };

  // Función antigua (mantener como fallback por si el backend falla)
  const generatePrintableFallback = async () => {
    setIsGenerating(true);
    // Open a popup synchronously to preserve the user gesture so browsers
    // allow `print()` later. We write a minimal placeholder while we build
    // the report; this increases the chance the print dialog will appear.
    let userPopup: Window | null = null;
    try {
      userPopup = window.open('', '_blank');
      if (userPopup) {
        try {
          userPopup.document.open();
          userPopup.document.write('<html><head><title>Generando informe...</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;padding:20px">Generando informe... por favor espera.</div></body></html>');
          userPopup.document.close();
        } catch {
          // ignore write errors; we'll still reuse the window reference
        }
      }
    } catch {
      userPopup = null;
    }
    // Preferir firma escaneada si está activa
    const signature = (useScannedSignature && scannedSignature) ? scannedSignature : (canvasRef.current?.toDataURL() || '');
    const usuarios = asset?.usuariosAsignados || asset?.usuario_asignado || [];
    const usuariosArray = Array.isArray(usuarios) ? usuarios : (typeof usuarios === 'string' ? JSON.parse(usuarios || '[]') : []);
    const usuariosDetailedArray: { nombre: string; correo: string; cargo: string }[] = usuariosArray.map((u: unknown) => {
      const uu = u as UsuarioItem;
      return {
        nombre: getStringField(uu, ['nombre', 'nombreUsuario', 'name']),
        correo: getStringField(uu, ['correo', 'email', 'mail']),
        cargo: getStringField(uu, ['cargo', 'role', 'puesto'])
      };
    });
      // Build HTML table-like structure for usuarios (3 columns) for the PDF
      // Build usuarios as a neat table for the PDF: Usuario | Correo | Cargo
      const usuariosHtml = usuariosDetailedArray.length === 0 ? '' : `
        <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:13px">
          <thead>
            <tr style="background:#f3f4f6;color:#0b3e82;font-weight:700">
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eef2f6">Usuario</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eef2f6">Correo</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eef2f6">Cargo</th>
            </tr>
          </thead>
          <tbody>
            ${usuariosDetailedArray.map(u => `
              <tr>
                <td style="padding:8px;border-bottom:1px solid #eef2f6">${String(u.nombre || '-')}</td>
                <td style="padding:8px;border-bottom:1px solid #eef2f6">${String(u.correo || '-')}</td>
                <td style="padding:8px;border-bottom:1px solid #eef2f6">${String(u.cargo || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

    // photos + docs (preserve caption/description). Each item -> { type: 'image'|'doc', url, caption, name }
    const fotos = asset?.fotos || [];
    const fotosArray = Array.isArray(fotos) ? fotos : (typeof fotos === 'string' ? JSON.parse(fotos || '[]') : []);
    const normalizedPhotos = fotosArray.map((f: FotoItem): { type: 'image'; url: string; caption?: string } | null => {
      let url = getStringField(f, ['url']) || (typeof f === 'string' ? String(f) : '');
      const caption = getStringField(f, ['description', 'descripcion', 'caption', 'desc', 'name']);
      if (!url) return null;
      try {
        if (!url.startsWith('http')) {
          const decoded = decodeURIComponent(url);
          url = `http://localhost:4000/uploads/${encodeURIComponent(decoded)}`;
        } else {
          const match = url.match(/\/uploads\/(.+)$/);
          if (match) {
            const filename = match[1];
            url = `http://localhost:4000/uploads/${encodeURIComponent(decodeURIComponent(filename))}`;
          }
        }
      } catch {
        // fallback leave url as-is
      }
      return { type: 'image', url, caption };
    }).filter((x: { type: 'image'; url: string; caption?: string } | null): x is { type: 'image'; url: string; caption?: string } => Boolean(x));

    const annexItems: Array<{type: 'image'|'doc', url: string, caption?: string, name?: string}> = [];
    annexItems.push(...normalizedPhotos.map((p: { type: 'image'; url: string; caption?: string }) => ({ type: 'image', url: p.url, caption: p.caption })));
    if (purchaseDoc) annexItems.push({ type: 'doc', url: String(purchaseDoc.url ?? ''), caption: String(purchaseDoc.desc ?? ''), name: String(purchaseDoc.name ?? '') });
    if (warrantyDoc) annexItems.push({ type: 'doc', url: String(warrantyDoc.url ?? ''), caption: String(warrantyDoc.desc ?? ''), name: String(warrantyDoc.name ?? '') });

    // Logo: buscar en asset o usar logo por defecto en public
    let logoSrc = asset?.empresaLogo || asset?.logo || '/logo.png';
    // Fondo (watermark) para las páginas del informe: puede venir del activo o usar uno por defecto
    let backgroundSrc = asset?.fondoInforme || asset?.empresaBackground || '/signatures/fondoinforme.png';

    // Asegurar que rutas relativas a `public/` sean absolutas para que Puppeteer en el servidor pueda resolverlas
    // prepare absolute paths for server-side rendering
    let signatureForPayload = signature;
    try {
      const origin = window.location?.origin || '';
      if (logoSrc && typeof logoSrc === 'string' && logoSrc.startsWith('/')) logoSrc = origin + logoSrc;
      if (backgroundSrc && typeof backgroundSrc === 'string' && backgroundSrc.startsWith('/')) backgroundSrc = origin + backgroundSrc;
      // signature puede ser dataURL o ruta; si es ruta relativa, convertirla también
      if (signatureForPayload && typeof signatureForPayload === 'string' && signatureForPayload.startsWith('/')) {
        signatureForPayload = origin + signatureForPayload;
      }
    } catch {
      // noop
    }

    // Helper to render values as HTML blocks (one key:val per line, split bullets into lines)
    const valueToHtml = (val: unknown): string => {
      try {
        if (val === null || val === undefined || val === '') return '-';
        if (Array.isArray(val)) {
          return (val as unknown[]).map(v => valueToHtml(v)).join('');
        }
        if (typeof val === 'object') {
          const rec = val as Record<string, unknown>;
          return Object.entries(rec).map(([k, v]) => `<div style="margin-top:4px;font-size:13px;color:#374151">${k}: ${v ?? ''}</div>`).join('');
        }
        const sRaw = String(val ?? '');
        const s = sRaw.replace(/\u00A0/g, ' ').trim();
        const tokens = s.split(/\s*[•·\u2022\u00B7]\s*/).map(t => t.replace(/[\u00A0\s]+/g, ' ').trim()).filter(Boolean);
        if (tokens.length > 1) return tokens.map(t => `<div style="margin-top:4px;font-size:13px;color:#374151">${t}</div>`).join('');
        return `<div style="font-size:13px;color:#374151">${s}</div>`;
      } catch {
        return `<div style="font-size:13px;color:#374151">${String(val)}</div>`;
      }
    };

    // Helper to compute how many items a component value represents
    const countItems = (val: unknown): number => {
      if (val === null || val === undefined || val === '') return 0;
      if (Array.isArray(val)) return val.length;
      if (typeof val === 'object') return 1;
      const s = String(val);
      const tokens = s.split(/\s*[•·\u2022\u00B7]\s*/).map(t => t.replace(/[\u00A0\s]+/g, ' ').trim()).filter(Boolean);
      return tokens.length > 0 ? tokens.length : 1;
    };

    // Helper to extract a concise model string from a component value (used for Tarjeta de video)
    const extractModel = (val: unknown): string | null => {
      try {
        if (val === null || val === undefined) return null;
        if (Array.isArray(val)) {
          for (const v of val) {
            const r = extractModel(v);
            if (r) return r;
          }
          return null;
        }
        if (typeof val === 'object') {
          const rec = val as Record<string, unknown>;
          const prefer = ['valor','value','modelo','model','name','marca','marca_modelo'];
          for (const pk of prefer) {
            const foundKey = Object.keys(rec).find(x => x.toLowerCase() === pk.toLowerCase());
            if (foundKey) {
              const v = rec[foundKey];
              if (v) return String(v).trim();
            }
          }
          for (const vv of Object.values(rec)) {
            if (!vv) continue;
            const s = String(vv).trim();
            if (/^tipo[:\s]/i.test(s)) continue;
            if (/^\d+$/.test(s)) continue;
            return s;
          }
          return null;
        }
        let s = String(val).replace(/\u00A0/g, ' ').trim();
        s = s.replace(/^Valor:\s*/i, '').replace(/^Value:\s*/i, '');
        const tokens = s.split(/\s*[•·\u2022\u00B7]\s*/).map(t => t.trim()).filter(Boolean);
        for (const t of tokens) {
          if (!/^tipo[:\s]/i.test(t)) return t;
        }
        return tokens[0] || null;
      } catch {
        return null;
      }
    };

    // Compute total memory in GB for Memoria RAM entries
    const computeMemorySummary = (val: unknown): { count: number; totalGB: number } => {
      let items: unknown[] = [];
      if (val === null || val === undefined || val === '') return { count: 0, totalGB: 0 };
      if (Array.isArray(val)) items = val as unknown[];
      else items = [val];

      let totalGB = 0;
      let count = 0;

      const numberFrom = (s: string): {n: number; unit?: string} | null => {
        if (!s) return null;
        const str = String(s).replace(/\u00A0/g, ' ').trim();
        // look for patterns like '16 GB', '16GB', '16g', '16384 MB'
        const m = str.match(/(\d+[.,]?\d*)\s*(gb|g|mb|m)?/i);
        if (!m) return null;
        const num = parseFloat(m[1].replace(',', '.'));
        const unit = (m[2] || '').toLowerCase();
        if (Number.isNaN(num)) return null;
        return { n: num, unit };
      };

      for (const it of items) {
        if (it === null || it === undefined) continue;
        // If object, try to find a 'cantidad' or numeric field
        if (typeof it === 'object') {
            try {
            const rec = it as Record<string, unknown>;
            // Prefer explicit numeric keys (cantidad, capacidad, size, value) to avoid
            // accidentally parsing digits inside strings like 'DDR4'.
            let found: number | null = null;
            let foundUnit: string | undefined = undefined;
            const preferred = ['cantidad', 'capacidad', 'size', 'value', 'valor', 'cantidad_gb', 'cantidad_mb'];
            // find a preferred key (case-insensitive)
            const foundKey = Object.keys(rec).find(k => preferred.includes(k.toLowerCase()));
            if (foundKey) {
              const v = rec[foundKey];
              const nf = numberFrom(String(v));
              if (nf) { found = nf.n; foundUnit = nf.unit; }
            }
            // fallback: try to scan all values individually, then combined
            if (found == null) {
              for (const k of Object.keys(rec)) {
                const v = rec[k];
                if (v === null || v === undefined) continue;
                const nf = numberFrom(String(v));
                if (nf) { found = nf.n; foundUnit = nf.unit; break; }
              }
            }
            if (found == null) {
              const combined = Object.values(rec).join(' ');
              const nf = numberFrom(combined);
              if (nf) { found = nf.n; foundUnit = nf.unit; }
            }
            if (found != null) {
              count += 1;
              if (foundUnit && foundUnit.startsWith('m')) {
                totalGB += found / 1024;
              } else {
                totalGB += found;
              }
            } else {
              // object counts as one item even if we couldn't parse a number
              count += 1;
            }
          } catch {
            count += 1;
          }
        } else {
          // string or number
          const s = String(it);
          // split bullets into tokens
          const tokens = s.split(/\s*[•·\u2022\u00B7]\s*/).map(t => t.trim()).filter(Boolean);
          if (tokens.length > 1) {
            for (const tk of tokens) {
              const nf = numberFrom(tk);
              if (nf) {
                count += 1;
                if (nf.unit && nf.unit.startsWith('m')) totalGB += nf.n / 1024; else totalGB += nf.n;
              } else {
                // token without numeric part still counts as an item
                count += 1;
              }
            }
          } else {
            const nf = numberFrom(s);
            if (nf) {
              count += 1;
              if (nf.unit && nf.unit.startsWith('m')) totalGB += nf.n / 1024; else totalGB += nf.n;
            } else {
              count += 1;
            }
          }
        }
      }

      return { count, totalGB };
    };

    // Build HTML snippet for componentes and simple custom fields
    // Use the same meta-grid / meta-pair styling as the activo data so font sizes and order match
    let componentesHtml = '';
    try {
      if (componentes && Object.keys(componentes).length > 0) {
        // Exclude keys that are already shown in the main meta-grid (to avoid duplication)
        const skipIfContains = ['disco', 'tarjeta', 'antig', 'modelo', 'marca', 'memoria', 'ram', 'garantia', 'garantía', 'serie', 'codigo', 'código', 'area', 'categoria', 'fabricante', 'estado', 'observaciones', 'video'];
        Object.entries(componentes).forEach(([k, items]) => {
          const keyLower = String(k).toLowerCase().trim();
          if (skipIfContains.some(ex => keyLower.includes(ex))) return; // skip duplicate-like keys
          if (displayedKeys.has(keyLower)) return; // skip exact matches of displayed metadata

          const arr = Array.isArray(items) ? items : [items];
          // Build a compact blue header with the component label (left) and count (right)
          const count = arr.length;
          // Special handling for some component types to produce concise summaries

          // RAM/Memoria: skip entirely (already shown in main grid)
          if (keyLower.includes('memoria') || keyLower.includes('ram')) {
            return; // skip - already shown
          }

          // Disco Duro: skip entirely (already shown in main grid)
          if (keyLower.includes('disco')) {
            return; // skip - already shown
          }

          // Tarjeta de video: skip entirely (already shown in main grid)
          if (keyLower.includes('tarjeta') || keyLower.includes('video')) {
            return; // skip - already shown
          }

          let block = `<div style="margin-top:12px;page-break-inside:avoid">`;
          block += `<div style="display:flex;justify-content:space-between;align-items:center;background:var(--blue-700);color:#fff;padding:8px 10px;border-radius:6px"><div style="font-size:12px;font-weight:700">${k}:</div><div style="font-weight:700">${count}</div></div>`;
          block += `<div style="margin-top:8px;color:#475569">`;

          // Render each original item exactly like the form: if it's an object, render each key/value on its own line;
          // if it's a string, render it as-is (but split common bullet separators into separate lines for readability).
          arr.forEach((it) => {
            // Each item should appear as in the UI: a block per item, and within an object
            // each key:value on its own line. Strings containing bullets are split into lines.
            if (it && typeof it === 'object') {
              try {
                const entries = Object.entries(it as Record<string, unknown>);
                block += `<div style="margin-top:6px;margin-bottom:8px">`;
                entries.forEach(([sk, sv]) => {
                  block += `<div style="font-size:13px;color:#374151">${sk}: ${sv ?? ''}</div>`;
                });
                block += `</div>`;
              } catch {
                block += `<div style="margin-top:6px;margin-bottom:8px;font-size:13px;color:#374151">${String(it)}</div>`;
              }
            } else {
              const sRaw = String(it ?? '');
              const s = sRaw.replace(/\u00A0/g, ' ').trim();
              const hasBullet = /[•·\u2022\u00B7]/.test(s);
              if (hasBullet) {
                const tokens = s.split(/\s*[•·\u2022\u00B7]\s*/).map(t => t.replace(/[\u00A0\s]+/g, ' ').trim()).filter(Boolean).map(t => t.replace(/[•·\u2022\u00B7]/g, '').trim());
                block += `<div style="margin-top:6px;margin-bottom:8px">`;
                tokens.forEach(tk => block += `<div style="font-size:13px;color:#374151">${tk}</div>`);
                block += `</div>`;
              } else {
                block += `<div style="margin-top:6px;margin-bottom:8px;font-size:13px;color:#374151">${s}</div>`;
              }
            }
          });

          block += `</div></div>`;
          componentesHtml += block;
        });
      }
    } catch {
      componentesHtml = '';
    }

    let simpleCamposHtml = '';
    try {
      if (simpleCustomFields && Object.keys(simpleCustomFields).length > 0) {
        simpleCamposHtml += `<div style="margin-top:10px"><strong>Campos Personalizados:</strong><div style="margin-top:6px">`;
        Object.entries(simpleCustomFields).forEach(([k, v]) => {
          simpleCamposHtml += `<div><strong>${k}:</strong> ${String(v)}</div>`;
        });
        simpleCamposHtml += `</div></div>`;
      }
    } catch {
      simpleCamposHtml = '';
    }

    // Prefetch anexos: fetch each annex and only include items that successfully download.
    let annexHtml = '';
    // will hold successfully downloaded anexos (images and docs)
    let fetchedAnexosResults: Array<{idx:number;blob:Blob;filename:string;isImage:boolean;dataUrl:string|null;type:string}> = [];
    try {
      const fetched = await Promise.all(annexItems.map(async (it, idx) => {
        if (!it.url) return null;
        try {
          const r = await fetch(it.url);
          if (!r.ok) return null;
          const blob = await r.blob();
          const mime = blob.type || '';
          const isImage = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(it.url || ''));
          let dataUrl: string | null = null;
          if (isImage) {
            const array = new Uint8Array(await blob.arrayBuffer());
            let binary = '';
            for (let i = 0; i < array.length; i++) binary += String.fromCharCode(array[i]);
            const base64 = btoa(binary);
            dataUrl = `data:${mime || 'image/png'};base64,${base64}`;
          }
          const filename = it.name || `anexo-${idx}${mime ? ('.' + mime.split('/').pop()) : ''}`;
          return { idx, blob, filename, isImage, dataUrl, type: it.type };
        } catch (e) {
          console.warn('No se pudo descargar anexo para inclusión en HTML:', it.url, e);
          return null;
        }
      }));

      const valid = (fetched.filter(Boolean) as Array<{idx:number;blob:Blob;filename:string;isImage:boolean;dataUrl:string|null;type:string}>);
      fetchedAnexosResults = valid;
      if (valid.length > 0) {
        // Separate images from documents
        const imageItems = valid.filter(x => x.isImage);
        // Show the ANEXOS title only when there are images — keep the strip with the photos
        if (imageItems.length > 0) {
          annexHtml += `<div><div class="annex-title">ANEXOS</div>`;

          // Images: include only those we downloaded, embedded as data URLs; include caption if available
          for (const v of imageItems) {
            const item = annexItems[v.idx];
            annexHtml += `
              <div style="margin-top:12px;page-break-inside:avoid;">
                <div style="width:100%;overflow:hidden;border:1px solid #e6eef6;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;padding:6px">
                  <img src="${v.dataUrl}" style="width:100%;height:auto;object-fit:contain;display:block" />
                </div>
                ${item.caption ? `<div style="margin-top:8px;font-size:14px;color:#374151">${(item.caption || '').replace(/\n/g, '<br/>')}</div>` : ''}
              </div>
            `;
          }

          annexHtml += `</div>`;
        }

        // NOTE: intentionally do NOT render placeholder blocks for attached document files here.
        // PDFs (purchase/warranty docs) are sent as files and will be merged server-side —
        // rendering placeholders in the HTML caused duplicate icon blocks in the final PDF.
      }
    } catch (e) {
      console.warn('Error construyendo anexos para HTML:', e);
      annexHtml = '';
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Informe de soporte inicial</title>
            <style>
            /* Aggressive margins reduction and layout tweaks to better use printable area */
            @page { size: A4; margin: 6mm; }
            /* Ensure browsers attempt to print background colors when possible */
            @media print {
              * { -webkit-print-color-adjust: exact; color-adjust: exact; print-color-adjust: exact; }
              img { -webkit-print-color-adjust: exact; }
            }
            :root{--blue-900:#032b56;--blue-700:#0b57a4;--gray-300:#d1d5db}
            html,body{height:100%;width:100%;}
            body{font-family: "Segoe UI", Roboto, Inter, system-ui, -apple-system, "Helvetica Neue", Arial; color:var(--blue-900); margin:0; padding:0; background:#fff;font-size:12px}
            /* Make the page container span full available printable width and reduce internal padding */
            .page{padding:7mm; width:100%; box-sizing:border-box; max-width:none; position:relative; z-index:2; background:#fff}
            /* Fondo fijo que aparecerá detrás de todo el contenido. En navegadores, la opción "Imprimir fondos" debe estar activa para verlo. */
            .report-bg{position:fixed;top:0;left:0;right:0;bottom:0;z-index:0;pointer-events:none;background-repeat:no-repeat;background-position:center center;background-size:75% auto;opacity:0.28;filter:none;background-color:transparent}
            /* Header uses full width; align items at start to remove extra top spacing */
            .header{display:grid;grid-template-columns:120px 1fr 140px;align-items:start;padding:6px 0;border-bottom:1px solid rgba(3,43,86,0.08);column-gap:10px}
            .header-left{display:flex;align-items:center;gap:12px}
            .logo{height:64px;object-fit:contain;display:block}
            .doc-title{font-size:18px;font-weight:800;margin:0;color:var(--blue-900);letter-spacing:0.25px}
            .doc-sub{font-size:12px;color:#4b5563;margin-top:2px}
            .meta{font-size:12px;color:#475569;text-align:right}
            .meta div{margin-bottom:4px}
            .section{margin-top:10px}
            /* Match ANEXOS stripe: visual header with strong color. Keep a pseudo-element
               to provide the colored stripe when backgrounds are honored. */
            .section h2{font-size:12px;color:#fff;background:var(--blue-700);padding:8px 10px;border-radius:4px;margin-top:10px;font-weight:700;display:block;position:relative}
            .annex-title{font-size:13px;color:#fff;background:var(--blue-700);padding:10px 12px;border-radius:4px;margin-top:18px;font-weight:700}

            /* Use direct background on the H2 and annex title. Avoid pseudo-elements
               that may introduce layout surprises in different rendering engines. */
            .section h2, .annex-title { background: var(--blue-700); color: #fff; padding: 10px 12px; border-radius: 4px; font-weight:700; display:block }

            /* Printing: keep the page background white and ask browsers to respect
               background painting only for the header stripes. Do not apply global
               adjustments that may alter other elements. */
            @media print {
              html, body, .page { background: #fff !important; }
              .section h2, .annex-title { background: var(--blue-700) !important; color: #fff !important; }
            }
            /* New compact two-column layout for asset metadata to use full printable width */
            .meta-grid{display:grid;gap:6px 12px;align-items:start;margin-top:6px}
            .meta-column{display:grid;gap:6px}
            .meta-pair{display:flex;gap:8px;align-items:flex-start}
            .meta-label{font-size:12px;color:var(--blue-900);font-weight:700;width:120px}
            .meta-value{font-size:13px;color:#374151}
            .photos{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:10px}
            .photo{width:100%;height:140px;object-fit:cover;border:1px solid #e6eef6;background:#fff}
            .content-block{font-size:13px;color:var(--blue-900);line-height:1.45}
            /* Reduce font size for diagnostic and following sections to save vertical space */
            .compact-section .content-block{font-size:12px;line-height:1.35;color:#1f2937}
            .compact-section h3{font-size:12px;margin:6px 0 4px 0;color:#0b3e82}
            .compact-section div{font-size:12px;color:#374151}
            .signature-area{display:flex;justify-content:space-between;align-items:center;margin-top:16px}
            .signature-box{width:360px;border-top:1px solid var(--gray-300);padding-top:8px;text-align:center}
            .signature-label{font-size:12px;color:#475569;margin-bottom:6px}
            .footer{margin-top:26px;font-size:11px;color:#6b7280;border-top:1px solid #eef2f6;padding-top:8px;text-align:right}
            .annex-title{font-size:13px;color:#fff;background:var(--blue-700);padding:10px 12px;border-radius:4px;margin-top:18px;font-weight:700}
          </style>
        </head>
          <body>
            <div class="report-bg" style="background-image:url('${backgroundSrc}')"></div>
          <div class="page">
            <div class="header">
              <div class="header-left">
                <img src="${logoSrc}" class="logo" alt="Logo"/>
              </div>
              <div style="text-align:center;">
                <div class="doc-title">INFORME TÉCNICO DE SOPORTE INICIAL</div>
                <div class="doc-sub">Registro técnico inicial — Activo: ${formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? asset?._id ?? asset?.id ?? ''))}</div>
              </div>
              <div class="meta" style="text-align:right;">
                <div><strong>Empresa:</strong> ${empresaNombre ?? asset?.empresaNombre ?? asset?.empresa ?? '-'}</div>
                <div><strong>Sede:</strong> ${sedeNombre ?? asset?.sedeNombre ?? asset?.sede ?? '-'}</div>
                <div><strong>Fecha:</strong> ${date} ${time}</div>
              </div>
            </div>

              <div class="section">
                <h2>DATOS DEL ACTIVO</h2>
                <!-- Render datos del activo como lista en dos columnas para PDF (sin cubitos) -->
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px 12px;margin-top:6px">
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Área</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${asset?.area ?? asset?.area_nombre ?? '-'}</div></div>
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Categoría</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${asset?.categoria ?? '-'}</div></div>
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Marca</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${asset?.fabricante ?? '-'}</div></div>
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Modelo</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${asset?.modelo ?? '-'}</div></div>
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Antigüedad</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${antiguedadComputed || '-'}</div></div>
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Código interno</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? asset?._id ?? asset?.id ?? ''))}</div></div>
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Número de serie</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${asset?.serie ?? '-'}</div></div>
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Estado físico</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${(capitalize(condicion || asset?.estadoActivo) || 'Regular')}</div></div>
                  <div style="display:flex;flex-direction:column"><div style="font-size:11px;color:#6b7280">Estado operativo</div><div style="font-weight:700;color:#0b3e82;margin-top:6px">${(capitalize(asset?.estadoOperativo) || '-')}</div></div>
                  <div style="display:flex;flex-direction:column">
                    <div style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:8px">
                      <span>Disco Duro</span>
                      <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--blue-700);color:#fff;font-size:11px;font-weight:700">${countItems(rawDisco)}</span>
                    </div>
                    <div style="font-weight:700;color:#0b3e82;margin-top:6px">${(() => { const c = countItems(rawDisco); if (!c) return '-'; return `Tiene ${c} ${c===1 ? 'disco' : 'discos'}`; })()}</div>
                  </div>
                  <div style="display:flex;flex-direction:column">
                    <div style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:8px">
                      <span>Tarjeta de video</span>
                      <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--blue-700);color:#fff;font-size:11px;font-weight:700">${countItems(rawTarjeta)}</span>
                    </div>
                    <div style="font-weight:700;color:#0b3e82;margin-top:6px">${(() => { const m = extractModel(rawTarjeta); return m ? m : valueToHtml(rawTarjeta); })()}</div>
                  </div>
                  <div style="display:flex;flex-direction:column">
                    <div style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:8px">
                      <span>Memoria RAM</span>
                      <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--blue-700);color:#fff;font-size:11px;font-weight:700">${countItems(rawMemoria)}</span>
                    </div>
                    <div style="font-weight:700;color:#0b3e82;margin-top:6px">
                      ${(() => {
                        try {
                          const mem = computeMemorySummary(rawMemoria);
                          if (mem.totalGB && mem.totalGB > 0) {
                            const total = Number.isInteger(mem.totalGB) ? String(mem.totalGB) : String(Number(mem.totalGB.toFixed(1)));
                            return `Cantidad total: ${total} gb`;
                          }
                        } catch {
                          // noop
                        }
                        return `${valueToHtml(rawMemoria)}`;
                      })()}
                    </div>
                  </div>
                  ${warrantyHtml}

                  <!-- Componentes renderizados como pares meta (evitando duplicados) -->
                  ${componentesHtml}

                  <!-- Usuarios y Observaciones ocupan todo el ancho; usuarios se muestran como tabla organizada -->
                  <div style="grid-column:1 / -1; margin-top:8px">
                    <div style="margin-bottom:8px">${usuariosHtml || '-'}</div>
                    <div style="margin-top:6px" class="meta-pair"><div class="meta-label">Observaciones</div><div class="meta-value">${asset?.observaciones ?? '-'}</div></div>
                  </div>

                  ${simpleCamposHtml}
                </div>
              </div>

            <div class="section compact-section">
              <h2>DIAGNÓSTICO Y PRUEBAS</h2>
              <div class="content-block" style="display:block;line-height:1.25;">
                <div>
                  <h3 style="margin:8px 0 4px 0">Diagnóstico inicial</h3>
                  <div>${(diagnosis || '-').replace(/\s+/g, ' ')}</div>
                </div>
                <div style="margin-top:8px">
                  <h3 style="margin:8px 0 4px 0">Resultados de pruebas</h3>
                  <div>${(tests || '-').replace(/\s+/g, ' ')}</div>
                </div>
                <div style="margin-top:8px">
                  <h3 style="margin:8px 0 4px 0">Recomendaciones</h3>
                  <div>${(recommendations || '-').replace(/\n/g, '<br/>')}</div>
                </div>
              </div>
            </div>

            <div class="section compact-section">
              <h2>SOLUCIÓN / ACCIONES</h2>
              <div class="content-block">
                <h3 style="margin:8px 0 4px 0">Configuraciones iniciales</h3>
                <div>${(configurations || '-').replace(/\n/g, '<br/>')}</div>
                <h3 style="margin:10px 0 4px 0">Software instalado</h3>
                <div>${(softwareInstalled || '-').replace(/\n/g, '<br/>')}</div>
                <h3 style="margin:10px 0 4px 0">Observaciones</h3>
                <div>${(actionsObservations || '-').replace(/\n/g, '<br/>')}</div>
              </div>
            </div>

            <div class="section compact-section">
              <h2>DATOS DEL TÉCNICO</h2>
              <div class="content-block">
                <div><strong>Nombre:</strong> ${techName || '-'}</div>
                <div style="margin-top:6px"><strong>Correo:</strong> ${techEmail || '-'}</div>
              </div>
            </div>
              <!-- Firma: se ubicará en la última página, en el pie, alineada a la derecha -->
              <!-- (Se genera más abajo para garantizar que quede en la última hoja del documento) -->

              <!-- ANEXOS en página propia -->
              <div style="page-break-before:always;break-before:page;"></div>
              ${annexHtml}

            <!-- Firma: se ubicará en la última página, en el pie, alineada a la derecha -->
            <!-- (Se genera más abajo para garantizar que quede en la última hoja del documento) -->

            

            <!-- La firma se inserta ahora desde el servidor (evitamos duplicarla aquí) -->

            <!-- Footer removed per user request -->
          </div>
        </body>
      </html>
    `;

    // Debug preview: abrir el HTML generado en la ventana ya creada (si existe).
    // Escribimos una página wrapper que contiene el HTML en un iframe `srcdoc`
    // y un script inline que intenta invocar `print()` cuando el iframe carga.
    try {
      const debugWin = userPopup || window.open('', '_blank');
      if (debugWin) {
        try {
          const wrapper = `<!doctype html><html><head><title>Vista previa - Informe</title></head><body style="margin:0;padding:0;">` +
            `<iframe id="__preview_frame" srcdoc="${html.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}" style="border:0;width:100%;height:100vh"></iframe>` +
            `<script>function _tryPrint(){try{var f=document.getElementById('__preview_frame'); if(f && f.contentWindow){f.contentWindow.focus(); setTimeout(function(){try{f.contentWindow.print();}catch(e){try{window.print();}catch(e2){}}},300);}else{setTimeout(function(){try{window.print();}catch(e){}},300);}}catch(e){try{window.print();}catch(e){} }} window.addEventListener('load',function(){setTimeout(_tryPrint,250);});</script></body></html>`;
          debugWin.document.open(); debugWin.document.write(wrapper); debugWin.document.close();
        } catch {
          /* noop */
        }
      } else {
        console.warn('Vista previa de depuración bloqueada por el navegador');
      }
    } catch (e) {
      console.warn('Error abriendo la vista previa debug:', e);
    }

    // Primero intentar generar el PDF en el servidor Puppeteer local (más fiable para posicionado de firma)
    const serverUrl = ((window as unknown) as { __INFORME_PDF_SERVER_URL__?: string }).__INFORME_PDF_SERVER_URL__ || 'http://localhost:4001/api/informes';

    // Helper: lightweight reachability check using fetch+AbortController.
    // We avoid using Image ping because failed image GETs can generate noisy
    // console errors (ERR_CONNECTION_REFUSED) in some browsers.
    const checkServerReachable = async (url: string, timeout = 2500): Promise<boolean> => {
      let probeUrl = url;
      try {
        const u = new URL(url);
        probeUrl = `${u.origin}/`;
      } catch {
        probeUrl = url;
      }

      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        // Try a minimal fetch; network/CORS errors will throw and be caught below.
        const resp = await fetch(probeUrl, { method: 'GET', signal: controller.signal, cache: 'no-store' });
        clearTimeout(id);
        // If response is okay (2xx/3xx/4xx) consider server reachable; many servers
        // will return 404 on origin root but that still means the host is up.
        return resp !== null;
      } catch {
        return false;
      }
    };
    try {
      const reachable = await checkServerReachable(serverUrl, 2500);
      if (!reachable) {
      } else {
        // proceed to attempt sending
        // Prepare metadata payload that includes html + asset + user/tech info + anexos metadata
        const payloadMeta: Record<string, unknown> = { html, signature: signatureForPayload, techName, asset: asset || {}, annexItems };

        // Intentar descargar los anexos y enviarlos como FormData para adjuntarlos en el servidor
        const formData = new FormData();
        const token = localStorage.getItem('token');
        formData.append('data', JSON.stringify(payloadMeta));

        // Adjuntar al FormData sólo los PDFs que descargamos previamente (evitamos volver a descargar)
        const anexosMeta: Array<Record<string, unknown>> = [];
        try {
          (fetchedAnexosResults || []).forEach(fa => {
            if (!fa) return;
            const fname = String(fa.filename || '').toLowerCase();
            const faRec = fa as unknown as Record<string, unknown>;
            const looksLikePdf = fname.endsWith('.pdf') || /application\/pdf/i.test(String(faRec.type || '')) || (faRec.type === 'doc');
            // si no es imagen OR parece un PDF por nombre/tipo, lo añadimos para que el servidor pueda fusionarlo
            if (!fa.isImage || looksLikePdf) {
              try {
                formData.append('anexosFiles', fa.blob as Blob, fa.filename);
                anexosMeta.push({ name: fa.filename, type: 'doc' });
              } catch (e) {
                console.warn('No se pudo adjuntar anexo al FormData:', fa.filename, e);
              }
            }
          });
        } catch (e) {
          console.warn('Error adjuntando anexos al FormData desde resultados descargados:', e);
        }
        formData.append('anexosMeta', JSON.stringify(anexosMeta));

        // Enviar FormData al servidor PDF
        const resp = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
            // NO establecer Content-Type: el navegador lo hace automáticamente para FormData
          },
          body: formData
        });

        if (resp.ok) {
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          // Abrir el PDF en una nueva pestaña y pedir impresión automática mediante un iframe.
          try {
            const win = userPopup || window.open('', '_blank');
            if (!win) {
              // Si el navegador bloqueó la ventana, ofrecer descarga
              const a = document.createElement('a');
              a.href = url;
              a.download = `informe-${formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? asset?._id ?? asset?.id ?? ''))}.pdf`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 15000);
              setIsGenerating(false);
              return;
            }

            // Escribir un documento minimal que contiene un iframe apuntando al blob,
            // esperar al evento load del iframe y luego invocar print() sobre su contentWindow.
            const filename = `informe-${formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? asset?._id ?? asset?.id ?? ''))}.pdf`;
            // Escribimos una página que contiene el PDF en un iframe y un script
            // que intenta activar el diálogo de impresión automáticamente.
            const wrapperPdf = `<!doctype html><html><head><title>${filename}</title></head><body style="margin:0;padding:0;">` +
              `<iframe id="__pdf_frame" src="${url}" style="border:0;width:100%;height:100vh"></iframe>` +
              `<script>function _triggerPrint(){try{var f=document.getElementById('__pdf_frame'); if(f && f.contentWindow){f.contentWindow.focus(); setTimeout(function(){try{f.contentWindow.print();}catch(e){try{window.print();}catch(e2){}}},300);}else{setTimeout(function(){try{window.print();}catch(e){}},300);} }catch(e){try{window.print();}catch(e){}} } window.addEventListener('load',function(){setTimeout(_triggerPrint,250);});</script></body></html>`;

            try { win.document.open(); win.document.write(wrapperPdf); win.document.close(); } catch { /* noop */ }

            // Revocar el objeto tras cierto tiempo y salir; la página hija hará el print
            setTimeout(() => URL.revokeObjectURL(url), 15000);
            setIsGenerating(false);
            return;
          } catch (err) {
            console.warn('No se pudo abrir ventana para PDF; iniciando descarga:', err);
            const a = document.createElement('a');
            a.href = url;
            a.download = `informe-${formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? asset?._id ?? asset?.id ?? ''))}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 15000);
            setIsGenerating(false);
            return;
          }
        } else {
          console.warn('Servidor PDF devolvió error al recibir anexos, intentando fallback JSON:', resp.status, await resp.text());
        }
      }
    } catch (err) {
      // Improve error logging: network failures throw TypeError in fetch; include name/message
      try {
        const eUnknown = err as unknown as { name?: string; message?: string };
        const name = eUnknown?.name ?? 'Error';
        const message = eUnknown?.message ?? String(err);
        console.warn('Error enviando anexos al servidor PDF, fallback a envío JSON/impresión cliente:', name + ': ' + message, err);
        if (eUnknown?.name === 'AbortError') console.warn('[PDF SERVER] Request timed out or was aborted');
      } catch {
        console.warn('Error desconocido al intentar enviar al servidor PDF:', err);
      }
    }

    // Fallback: abrir la vista previa en nueva ventana y llamar a print().
    // Si la ventana emergente está bloqueada, intentamos imprimir en un iframe
    // oculto dentro de la misma página; si todo falla, forzamos la descarga del HTML.
    const w = window.open('', '_blank');
    if (!w) {
      try {
        // Intentar imprimir en un iframe oculto
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        // usar srcdoc para inyectar HTML completo
        (iframe as HTMLIFrameElement).srcdoc = html;
        document.body.appendChild(iframe);

        const cleanup = () => { try { document.body.removeChild(iframe); } catch { /* noop */ } };

        const doNothingAndCleanup = () => {
          // No crear ni forzar descargas HTML automáticas.
          // Limpiamos el iframe y notificamos que la generación terminó.
          try { cleanup(); } catch { /* noop */ }
          console.warn('Descarga automática de HTML deshabilitada por configuración. Mostrar vista previa en ventana si está disponible.');
          setIsGenerating(false);
        };

        iframe.addEventListener('load', () => {
          // Cuando el iframe cargue, no forzamos descarga; intentamos enfocar/print desde la misma página si procede.
          try { doNothingAndCleanup(); } catch { doNothingAndCleanup(); }
        });

        // Fallback: cleanup tras 1500ms si load no se dispara
        setTimeout(() => doNothingAndCleanup(), 1500);
        return;
      } catch {
        // Como último recurso, forzar descarga del HTML
        // No forzamos descarga HTML como último recurso. Limpiamos y terminamos la generación.
        console.warn('Descarga automática de HTML deshabilitada. No se realizará ninguna descarga.');
        setIsGenerating(false);
        return;
      }
    }

    try {
      w.document.open();
      w.document.write(html);
      w.document.close();

      const tryPrint = () => {
        try {
          w.focus();
          try { w.print(); } catch (e) { console.error('Error al invocar print() en fallback cliente:', e); }
        } catch (err) {
          console.error('Error al invocar print():', err);
        } finally {
          setIsGenerating(false);
        }
      };

      // Si el documento ya está listo, imprimir; si no, escuchar 'load' y también tener un timeout
      try {
        if (w.document.readyState === 'complete') {
          tryPrint();
        } else {
          // Algunos navegadores disparan load en el window o en el document
          w.addEventListener?.('load', tryPrint);
          // Fallback: forzar print tras 2000ms
          setTimeout(() => tryPrint(), 2000);
        }
      } catch {
        // En cualquier caso, intentar imprimir tras un pequeño delay
        setTimeout(() => tryPrint(), 800);
      }
    } catch (err) {
      console.error('Error generando la vista previa de impresión:', err);
      try { w.close(); } catch { /* noop */ }
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;
  
  return (
    <>
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
          duration={4000}
        />
      )}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      {isGenerating && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-lg">
            <svg className="animate-spin w-5 h-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
            <div className="text-sm font-medium">Cargando ...</div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-md w-full max-w-4xl p-4 my-6 max-h-[90vh] overflow-y-auto shadow-lg border border-gray-100">
        <header className="flex items-center justify-between mb-4">
            <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-md bg-indigo-600 flex items-center justify-center shadow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Informe de soporte inicial</h3>
              <p className="text-sm text-slate-500">Registro técnico inicial del activo — datos, diagnóstico y acciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} aria-label="Cerrar" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50">Cerrar</button>
          </div>
        </header>

        <div className="space-y-4">
          <section className="bg-linear-to-br from-slate-50 to-gray-100 p-5 rounded-xl border-2 border-slate-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h4 className="font-bold text-xl text-slate-900">1. Datos del activo</h4>
            </div>
            
            {/* Información General */}
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-slate-200">
              <h5 className="font-bold text-sm text-blue-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Información General
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">Empresa</label>
                  <div className="mt-1 p-3 bg-linear-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg text-sm font-bold text-slate-900">{empresaNombre ?? asset?.empresaNombre ?? asset?.empresa ?? '-'}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">Sede</label>
                  <div className="mt-1 p-3 bg-linear-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg text-sm font-bold text-slate-900">{sedeNombre ?? asset?.sedeNombre ?? asset?.sede ?? '-'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Área</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{asset?.area ?? '-'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Categoría</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{asset?.categoria ?? '-'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Marca / Fabricante</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{asset?.fabricante ?? '-'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Modelo</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{asset?.modelo ?? '-'}</div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Número de serie</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{asset?.serie ?? '-'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Código interno</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono font-bold text-blue-900">{formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? asset?._id ?? asset?.id ?? ''))}</div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Fecha de compra</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{asset?.fechaCompra ? new Date(String(asset.fechaCompra)).toLocaleDateString('es-ES') : (asset?.fechaCompraAprox ?? asset?.fecha_compra_aprox ?? asset?.fechaCompraAproxYear ?? '-')}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Antigüedad</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{antiguedadComputed || '-'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Tipo / N° documento</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{String(asset?.tipoDocumentoCompra ?? asset?.tipo_documento_compra ?? '-')}{asset?.numeroDocumentoCompra || asset?.numero_documento_compra || asset?.numero_documento ? ` • ${asset?.numeroDocumentoCompra ?? asset?.numero_documento_compra ?? asset?.numero_documento}` : ''}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Garantía</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                    <div className="font-bold text-slate-900">{String(asset?.garantia ?? asset?.garantiaDuracion ?? asset?.garantia_duracion ?? '-')}</div>
                    {(_wInfo && (_wInfo.estado === 'Vigente' || _wInfo.estado === 'No vigente')) && (
                      <div className="mt-2 inline-flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${(_wInfo.estado === 'Vigente') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{_wInfo.estado}</span>
                        {_wInfo.expiresAt && <span className="text-xs text-slate-600">{_wInfo.estado === 'No vigente' ? 'Venció:' : 'Vence:'} {new Date(_wInfo.expiresAt).toLocaleDateString('es-ES')}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Estado físico</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{(capitalize(condicion || asset?.estadoActivo) || 'Regular')}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Estado operativo</label>
                  <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-slate-900">{capitalize(asset?.estadoOperativo) || '-'}</div>
                </div>
              </div>
            </div>

            {/* Componentes Múltiples */}
            {componentesRenderEntries && componentesRenderEntries.length > 0 && (
              <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-slate-200">
                <h5 className="font-bold text-sm text-blue-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Componentes Múltiples
                </h5>
                <div className="space-y-4">
                  {componentesRenderEntries.map(([key, items]) => {
                    const arr = Array.isArray(items) ? items : [items];
                    return (
                      <div key={key} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-base font-bold text-blue-900">{key}</p>
                            <span className="text-xs font-bold text-white bg-blue-600 px-2.5 py-1 rounded-full shadow-sm">{arr.length}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {arr.map((it, idx) => (
                            <div key={idx} className="bg-linear-to-br from-blue-50 to-cyan-50 p-3 rounded-lg border-2 border-blue-200 hover:shadow-md transition-shadow">
                              {it && typeof it === 'object' ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {Object.entries(it as Record<string, unknown>).map(([sk, sv]) => (
                                    <div key={sk}>
                                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">{sk}</p>
                                      <p className="font-bold text-gray-900">{String(sv ?? '-')}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="font-bold text-gray-900">{String(it ?? '-')}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Usuarios y Observaciones */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
              <h5 className="font-bold text-sm text-blue-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Adicional
              </h5>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wide block mb-2">Usuarios asignados</label>
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                    {usuariosDetailed.length === 0 ? (
                      <div className="text-slate-500 text-sm">-</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {usuariosDetailed.map((u: { nombre?: string; correo?: string; cargo?: string }, i: number) => (
                          <div key={i} className="p-3 border-2 border-blue-200 rounded-lg bg-linear-to-br from-blue-50 to-cyan-50 hover:shadow-md transition-shadow">
                            <div className="font-bold text-slate-900 mb-1">{u.nombre || '-'}</div>
                            <div className="text-xs text-blue-600 mb-0.5">{u.correo || '-'}</div>
                            <div className="text-xs text-slate-600">{u.cargo || '-'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wide block mb-2">Observaciones</label>
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-slate-900 whitespace-pre-wrap min-h-[60px]">{asset?.observaciones ?? '-'}</div>
                </div>
              </div>
            </div>

            {/* Campos Personalizados Simples */}
            {Object.keys(simpleCustomFields).length > 0 && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                <h5 className="font-bold text-sm text-amber-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Campos Personalizados
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(simpleCustomFields).map(([key, value]) => (
                    <div key={key} className="bg-linear-to-br from-amber-50 to-yellow-50 p-3 rounded-lg border-2 border-amber-200 hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">{key}</p>
                      <p className="font-bold text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fotos y Documentos */}
            {(fotosNormalizedForUI.length > 0 || purchaseDoc || warrantyDoc) && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                <h5 className="font-bold text-sm text-purple-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Archivos Adjuntos
                </h5>
                
                {fotosNormalizedForUI.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Fotos del activo</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {fotosNormalizedForUI.map((p, i) => (
                      <div key={i} className="flex flex-col items-start">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="block h-20 w-full overflow-hidden rounded border border-gray-200">
                          <img src={p.url} alt={p.caption || `foto-${i}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect fill="%23ddd" width="200" height="120"/></svg>'; }} />
                        </a>
                        {p.caption && <div className="mt-1 text-xs text-slate-500 whitespace-pre-wrap w-full">{p.caption}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

                {(purchaseDoc || warrantyDoc) && (
                  <div>
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Documentos</p>
                    <div className="space-y-3">
                      {purchaseDoc && (
                        <div className="flex items-center justify-between p-3 bg-linear-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-white border-2 border-purple-300">
                              {purchaseDoc.url?.toLowerCase().endsWith('.pdf') ? (
                                <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2v6h6"/></svg>
                              ) : (
                                <img src={purchaseDoc.url} alt={purchaseDoc.name} className="w-full h-full object-cover rounded" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">Documento de compra</div>
                              <div className="text-xs text-purple-700">{purchaseDoc.name}</div>
                              {purchaseDoc && purchaseDoc.desc ? <div className="text-xs text-slate-600 mt-1">{String(purchaseDoc.desc as string)}</div> : null}
                              <div className="mt-2">
                                <a href={purchaseDoc.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline">Abrir documento</a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {warrantyDoc && (
                        <div className="flex items-center justify-between p-3 bg-linear-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-white border-2 border-purple-300">
                              {warrantyDoc.url?.toLowerCase().endsWith('.pdf') ? (
                                <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2v6h6"/></svg>
                              ) : (
                                <img src={warrantyDoc.url} alt={warrantyDoc.name} className="w-full h-full object-cover rounded" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">Documento de garantía</div>
                              <div className="text-xs text-purple-700">{warrantyDoc.name}</div>
                              {warrantyDoc && warrantyDoc.desc ? <div className="text-xs text-slate-600 mt-1">{String(warrantyDoc.desc as string)}</div> : null}
                              <div className="mt-2">
                                <a href={warrantyDoc.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline">Abrir documento</a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 text-slate-800">2. Datos técnicos del soporte inicial</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Fecha</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Hora</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Diagnóstico inicial</label>
                <textarea placeholder="Ej: equipo lento; ruidos en disco" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm min-h-24 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Resultados de pruebas realizadas</label>
                <textarea placeholder="Ej: SMART 35% — Memtest OK" value={tests} onChange={e => setTests(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm min-h-24 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Recomendaciones iniciales</label>
                <textarea placeholder="Ej: cambiar HDD por SSD; actualizar SO" value={recommendations} onChange={e => setRecommendations(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm min-h-24 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </section>

          <section className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 text-slate-800">3. Datos del técnico</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Nombre del técnico</label>
                <input value={techName} onChange={e => setTechName(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Nombre del técnico" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Correo electrónico</label>
                <input value={techEmail} onChange={e => setTechEmail(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Correo técnico" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Firma del técnico</label>
                <div className="mt-1 space-y-2">
                  {/* Mostrar firma predeterminada si existe; si no, mostrar canvas */}
                  {useScannedSignature && scannedSignature ? (
                    <div className="border border-gray-200 rounded-md p-2 bg-white inline-block">
                      <img src={scannedSignature} alt="Firma escaneada" className="h-24 object-contain" />
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-md bg-white p-2">
                      <canvas
                        ref={canvasRef}
                        width={700}
                        height={150}
                        onPointerDown={start}
                        onPointerMove={draw}
                        onPointerUp={end}
                        onPointerLeave={end}
                        className="w-full h-36"
                        aria-label="Área para firma"
                        style={{ touchAction: 'none' }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => { clearCanvas(); setScannedSignature(null); setUseScannedSignature(false); }} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-slate-700 rounded-md hover:bg-slate-50">Borrar firma</button>
                    <span className="text-xs text-slate-500">Si la firma predeterminada no debe usarse, pulsa "Borrar firma" y dibuja aquí.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 text-slate-800">4. Acciones realizadas</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Configuraciones iniciales</label>
                <textarea value={configurations} onChange={e => setConfigurations(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm min-h-20 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: correo configurado; políticas aplicadas" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Software instalado</label>
                <textarea value={softwareInstalled} onChange={e => setSoftwareInstalled(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm min-h-20 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Office, Chrome, CrystalDiskInfo" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Observaciones</label>
                <textarea value={actionsObservations} onChange={e => setActionsObservations(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full text-sm min-h-20 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: entregado con usuario configurado" />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-white border border-gray-200 text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button 
              onClick={generatePDFFromBackend} 
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-linear-to-r from-indigo-600 to-indigo-700 text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Generar informe (PDF)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default InitialSupportReportModal;
