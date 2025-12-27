import React, { useEffect, useRef, useState } from 'react';
import { getWarrantyInfo } from '@/modules/inventario/utils/warranty';
import useAuth from '../../../hooks/useAuth';
import { formatAssetCode } from '@/utils/helpers';
import { signatureDefault } from '../../../config';

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
      // primitive - keep as simple campo (handled later)
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

  // Disco Duro and Tarjeta de video values formatted
  const rawDisco = asset?.discoOAlmacenamiento ?? asset?.disco ?? (findComponent('Disco Duro') ?? findComponent('disco') ?? findComponent('disco duro'));
  const rawTarjeta = simpleCustomFields['Tarjeta de video'] ?? simpleCustomFields['tarjeta_de_video'] ?? (findComponent('Tarjeta de video') ?? findComponent('tarjeta_de_video') ?? findComponent('Tarjeta'));
  const rawMemoria = asset?.memoria ?? asset?.ram ?? (simpleCustomFields['Memoria RAM'] ?? simpleCustomFields['memoria_ram'] ?? (findComponent('Memoria RAM') ?? findComponent('memoria') ?? findComponent('ram')));
  const discoValue = rawDisco && typeof rawDisco === 'string' ? rawDisco : formatComponentValue(rawDisco);
  const tarjetaValue = rawTarjeta && typeof rawTarjeta === 'string' ? rawTarjeta : formatComponentValue(rawTarjeta);
  const memoriaValue = rawMemoria && typeof rawMemoria === 'string' ? rawMemoria : formatComponentValue(rawMemoria);

  // Build a renderable list of component entries. Ensure top-level disco/tarjeta/memoria are included
  const componentesRenderEntries: Array<[string, unknown]> = (() => {
    const entries: Array<[string, unknown]> = Object.entries(componentes || {});
    const lowerKeys = entries.map(([k]) => String(k).toLowerCase());

    const pushIfMissing = (label: string, val: unknown) => {
      if (!val) return;
      const lower = label.toLowerCase();
      if (lowerKeys.some(k => k.includes(lower.split(' ')[0]))) return; // roughly match by word
      entries.push([label, Array.isArray(val) ? val : [val]]);
    };

    pushIfMissing('Disco Duro', discoValue);
    pushIfMissing('Tarjeta de video', tarjetaValue);
    pushIfMissing('Memoria RAM', memoriaValue);

    return entries;
  })();

  // Flags to detect whether top-level fields were promoted into the render entries
  const hasMemoriaInComponents = componentesRenderEntries.some(([k]) => String(k).toLowerCase().includes('memoria'));

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

  const generatePrintable = async () => {
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
        const skipIfContains = ['disco', 'tarjeta', 'antig', 'modelo', 'marca', 'memoria', 'garantia', 'garantía', 'serie', 'codigo', 'código', 'area', 'categoria', 'fabricante', 'estado', 'observaciones'];
        Object.entries(componentes).forEach(([k, items]) => {
          const keyLower = String(k).toLowerCase();
          if (skipIfContains.some(ex => keyLower.includes(ex))) return; // skip duplicate-like keys
          if (displayedKeys.has(keyLower)) return; // skip exact matches of displayed metadata

          const arr = Array.isArray(items) ? items : [items];
          // Build a compact blue header with the component label (left) and count (right)
          const count = arr.length;
          // Special handling for some component types to produce concise summaries

          // Disco Duro: show "Disco Duro" then "Tiene X discos"
          if (keyLower.includes('disco')) {
            let block = `<div style="margin-top:12px;page-break-inside:avoid">`;
            block += `<div style="display:flex;justify-content:flex-start;align-items:center;background:var(--blue-700);color:#fff;padding:8px 10px;border-radius:6px"><div style="font-size:12px;font-weight:700">${k}</div></div>`;
            block += `<div style="margin-top:8px;color:#475569">`;
            const discoLabel = count === 1 ? 'disco' : 'discos';
            block += `<div style="margin-top:6px;font-size:13px;color:#374151">Tiene ${count} ${discoLabel}</div>`;
            block += `</div></div>`;
            componentesHtml += block;
            return; // skip default rendering
          }

          // Tarjeta de video: show header and a single line with the detected model (e.g., NVIDIA 3070)
          if (keyLower.includes('tarjeta') || keyLower.includes('video')) {
            // try to extract a concise model string from entries
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
                  // prefer keys that likely contain model name
                  const prefer = ['valor','value','modelo','model','name','marca','marca_modelo'];
                  for (const pk of prefer) {
                    const foundKey = Object.keys(rec).find(x => x.toLowerCase() === pk.toLowerCase());
                    if (foundKey) {
                      const v = rec[foundKey];
                      if (v) return String(v).trim();
                    }
                  }
                  // fallback: look for any string value that is not like 'Tipo: DDR4'
                  for (const vv of Object.values(rec)) {
                    if (!vv) continue;
                    const s = String(vv).trim();
                    if (/^tipo[:\s]/i.test(s)) continue;
                    if (/^\d+$/.test(s)) continue;
                    return s;
                  }
                  return null;
                }
                // string: remove prefixes like 'Valor:' and return remainder
                let s = String(val).replace(/\u00A0/g, ' ').trim();
                s = s.replace(/^Valor:\s*/i, '').replace(/^Value:\s*/i, '');
                // if contains bullet, take the first token that looks like a model
                const tokens = s.split(/\s*[•·\u2022\u00B7]\s*/).map(t => t.trim()).filter(Boolean);
                for (const t of tokens) {
                  if (!/^tipo[:\s]/i.test(t)) return t;
                }
                return tokens[0] || null;
              } catch {
                return null;
              }
            };

            let model: string | null = null;
            for (const it of arr) {
              const m = extractModel(it);
              if (m) { model = m; break; }
            }

            let block = `<div style="margin-top:12px;page-break-inside:avoid">`;
            block += `<div style="display:flex;justify-content:flex-start;align-items:center;background:var(--blue-700);color:#fff;padding:8px 10px;border-radius:6px"><div style="font-size:12px;font-weight:700">${k}</div></div>`;
            block += `<div style="margin-top:8px;color:#475569">`;
            if (model) block += `<div style="margin-top:6px;font-size:13px;color:#374151">${model}</div>`;
            else block += `<div style="margin-top:6px;font-size:13px;color:#374151">${valueToHtml(arr)}</div>`;
            block += `</div></div>`;
            componentesHtml += block;
            return; // skip default rendering
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
          <section className="bg-white p-3 rounded-md border border-gray-200">
            <h4 className="font-semibold mb-2 text-slate-800 text-base">1. Datos del activo</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Empresa</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-slate-800">{empresaNombre ?? asset?.empresaNombre ?? asset?.empresa ?? '-'}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Sede</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-slate-800">{sedeNombre ?? asset?.sedeNombre ?? asset?.sede ?? '-'}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Área</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm">{asset?.area ?? '-'}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Categoría</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm">{asset?.categoria ?? '-'}</div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Marca</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm text-slate-800">{asset?.fabricante ?? '-'}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Modelo</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm text-slate-800">{asset?.modelo ?? '-'}</div>
              </div>

              {!hasMemoriaInComponents && (
                <div>
                  <label className="text-xs font-medium text-slate-700">Memoria RAM</label>
                  <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm text-slate-800">{memoriaValue || '-'}</div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-700">Número de serie</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm text-slate-800">{asset?.serie ?? '-'}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Código interno</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm font-mono text-slate-800">{formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? asset?._id ?? asset?.id ?? ''))}</div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Fecha de compra</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm">{asset?.fechaCompra ? new Date(String(asset.fechaCompra)).toLocaleDateString('es-ES') : (asset?.fechaCompraAprox ?? asset?.fecha_compra_aprox ?? asset?.fechaCompraAproxYear ?? '-')}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Tipo / N° documento</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm">{String(asset?.tipoDocumentoCompra ?? asset?.tipo_documento_compra ?? '-')}{asset?.numeroDocumentoCompra || asset?.numero_documento_compra || asset?.numero_documento ? ` • ${asset?.numeroDocumentoCompra ?? asset?.numero_documento_compra ?? asset?.numero_documento}` : ''}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Garantía</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm">
                  <div className="font-semibold text-slate-800">{String(asset?.garantia ?? asset?.garantiaDuracion ?? asset?.garantia_duracion ?? '-')}</div>
                  {/* Mostrar estado de garantía y fecha junto al campo Garantía (si existe estado explícito) */}
                  {(_wInfo && (_wInfo.estado === 'Vigente' || _wInfo.estado === 'No vigente')) && (
                    <div className="mt-2 inline-flex items-center gap-3">
                      <span className={`text-sm font-semibold px-2 py-1 rounded ${(_wInfo.estado === 'Vigente') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{_wInfo.estado}</span>
                      {_wInfo.expiresAt && <span className="text-sm text-slate-600">{_wInfo.estado === 'No vigente' ? 'Venció:' : 'Vence:'} {new Date(_wInfo.expiresAt).toLocaleDateString('es-ES')}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Render componentes como pares meta (label + value) similares a Modelo/Antigüedad */}
              {componentesRenderEntries && componentesRenderEntries.length > 0 && (
                componentesRenderEntries.map(([key, items]) => {
                  const arr = Array.isArray(items) ? items : [items];
                  return (
                    <div key={key} className="">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-600">{key}</label>
                        <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{arr.length}</div>
                      </div>
                      <div className="mt-1 p-2 bg-white border border-gray-200 rounded text-sm text-slate-800">
                        {arr.length === 0 && <div className="text-slate-500">-</div>}
                        {arr.map((it, idx) => (
                          <div key={idx} className={arr.length > 1 ? 'mb-2' : ''}>
                            {it && typeof it === 'object' ? (
                              Object.entries(it as Record<string, unknown>).map(([sk, sv]) => (
                                <div key={sk} className="text-sm text-slate-700">{`${sk}: ${sv ?? ''}`}</div>
                              ))
                            ) : (
                              <div className="text-sm text-slate-700">{String(it ?? '')}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Usuarios asignados</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded text-sm text-slate-800">
                  {usuariosDetailed.length === 0 ? '-' : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {usuariosDetailed.map((u: { nombre?: string; correo?: string; cargo?: string }, i: number) => (
                        <div key={i} className="p-2 border rounded bg-white text-xs">
                          <div className="font-semibold text-slate-800">{u.nombre || '-'}</div>
                          <div className="text-xs text-slate-500">{u.correo || '-'}</div>
                          <div className="text-xs text-slate-500">{u.cargo || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Estado físico</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded text-sm text-slate-800">{(capitalize(condicion || asset?.estadoActivo) || 'Regular')}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Estado operativo</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded text-sm text-slate-800">{capitalize(asset?.estadoOperativo) || '-'}</div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Observaciones</label>
                <div className="mt-1 p-2 bg-white border border-gray-200 rounded text-sm text-slate-800 whitespace-pre-wrap">{asset?.observaciones ?? '-'}</div>
              </div>

              {/* Información adicional eliminada por petición del usuario: se removió el estado de garantía (Vigente/No vigente y fecha) */}

              {fotosNormalizedForUI.length > 0 && (
                <div className="col-span-1 md:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fotos del activo</p>
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
                <div className="col-span-1 md:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Documentos</p>
                  <div className="space-y-3">
                    {purchaseDoc && (
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 flex items-center justify-center rounded bg-gray-50 border border-gray-200">
                            {purchaseDoc.url?.toLowerCase().endsWith('.pdf') ? (
                              <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2v6h6"/></svg>
                            ) : (
                              <img src={purchaseDoc.url} alt={purchaseDoc.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">Documento de compra</div>
                            <div className="text-sm text-slate-500">{purchaseDoc.name}</div>
                            {purchaseDoc && purchaseDoc.desc ? <div className="text-sm text-slate-400 mt-1">{String(purchaseDoc.desc as string)}</div> : null}
                            <div className="mt-2">
                              <a href={purchaseDoc.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 underline">Abrir</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {warrantyDoc && (
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 flex items-center justify-center rounded bg-gray-50 border border-gray-200">
                            {warrantyDoc.url?.toLowerCase().endsWith('.pdf') ? (
                              <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2v6h6"/></svg>
                            ) : (
                              <img src={warrantyDoc.url} alt={warrantyDoc.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">Documento de garantía</div>
                            <div className="text-sm text-slate-500">{warrantyDoc.name}</div>
                            {warrantyDoc && warrantyDoc.desc ? <div className="text-sm text-slate-400 mt-1">{String(warrantyDoc.desc as string)}</div> : null}
                            <div className="mt-2">
                              <a href={warrantyDoc.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 underline">Abrir</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              

              {/* Campos personalizdos simples (primitivos) */}
              {Object.keys(simpleCustomFields || {}).length > 0 && (
                <div className="md:col-span-2 bg-white rounded-lg p-3 border border-gray-200">
                  <h5 className="text-sm font-semibold mb-2">Campos Personalizados</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(simpleCustomFields).map(([k, v]) => (
                      <div key={k} className="p-2 bg-gray-50 rounded border">
                        <div className="text-xs text-slate-500 uppercase">{k}</div>
                        <div className="font-semibold text-slate-800">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
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
            <button onClick={generatePrintable} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-linear-to-r from-indigo-600 to-indigo-700 text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800">Generar informe (Imprimir)</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitialSupportReportModal;
