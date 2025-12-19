// Utilitarios de diffs y mapeo de etiquetas para la sección "Alcance" del SLA
// Objetivo: Alinear frontend y backend con etiquetas legibles y registrar SOLO cambios reales.

export type TipoServicioCubierto = 'incidente' | 'incidenteCritico';
export type ActivosCubiertosTipo = 'todos' | 'porCategoria';
export type SedesCubiertasTipo = 'todas' | 'seleccionadas';

export interface ServiciosCubiertos {
  soporteRemoto: boolean;
  soportePresencial: boolean;
  atencionEnSede: boolean;
}

export interface ActivosCubiertos {
  tipo: ActivosCubiertosTipo;
  categorias?: string[];
  categoriasPersonalizadas?: string[];
}

export interface SedesCubiertas {
  tipo: SedesCubiertasTipo;
  sedes?: string[]; // ids
}

export interface AlcanceSLAData {
  slaActivo: boolean;
  aplicaA: 'incidentes';
  tipoServicioCubierto: TipoServicioCubierto;
  serviciosCubiertos: ServiciosCubiertos;
  activosCubiertos: ActivosCubiertos;
  sedesCubiertas: SedesCubiertas;
  observaciones: string;
}

export interface DiffContext {
  // Mapa id->nombre para sedes, útil para mostrar etiquetas legibles
  sedesMap?: Record<string, string>;
}

export interface CampoChange {
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
}

// Etiquetas legibles por campo
export const AlcanceLabels = {
  slaActivo: 'Alcance SLA: SLA Activo',
  observaciones: 'Alcance SLA: Observaciones del alcance',
  tipoServicioCubierto: 'Alcance SLA: Tipo de servicio cubierto',
  serviciosCubiertos: 'Alcance SLA: Servicios cubiertos',
  activosCubiertos_modo: 'Alcance SLA: Activos cubiertos (modo)',
  activosCubiertos_categorias: 'Alcance SLA: Categorías cubiertas',
  sedesCubiertas_modo: 'Alcance SLA: Sedes cubiertas (modo)',
  sedesCubiertas_sedes: 'Alcance SLA: Sedes cubiertas',
} as const;

// Formateadores
export const formatBoolActivo = (v?: boolean) => (v ? 'Activo' : 'Inactivo');
export const formatTipoServicio = (v?: TipoServicioCubierto) =>
  v === 'incidenteCritico' ? 'Incidente crítico' : 'Incidente';

const SERVICE_LABELS: Record<keyof ServiciosCubiertos, string> = {
  soporteRemoto: 'Soporte Remoto',
  soportePresencial: 'Soporte Presencial',
  atencionEnSede: 'Atención en Sede',
};

export const listServicios = (s?: ServiciosCubiertos) => {
  if (!s) return [] as string[];
  const out: string[] = [];
  for (const k of Object.keys(SERVICE_LABELS) as (keyof ServiciosCubiertos)[]) {
    if (s[k]) out.push(SERVICE_LABELS[k]);
  }
  return out.sort();
};

export const formatActivosModo = (t?: ActivosCubiertosTipo) => (t === 'porCategoria' ? 'Por categoría' : 'Todos');

export const mergeCategorias = (ac?: ActivosCubiertos) => {
  const base = [...(ac?.categorias || [])];
  const pers = [...(ac?.categoriasPersonalizadas || [])];
  const merged = [...base, ...pers].map((x) => x.trim()).filter(Boolean);
  // Normalizar: quitar duplicados y ordenar
  return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b));
};

export const formatSedesModo = (t?: SedesCubiertasTipo) => (t === 'seleccionadas' ? 'Seleccionadas' : 'Todas');

export const mapSedes = (ids: string[] = [], ctx?: DiffContext) => {
  const names = ids.map((id) => ctx?.sedesMap?.[id] || id);
  // Normalizar y ordenar alfabéticamente
  return Array.from(new Set(names.map((n) => n.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
};

// Diffs de listas: compara contenido sin importar orden
export const diffLists = (prev: string[] = [], next: string[] = []) => {
  const p = new Set(prev);
  const n = new Set(next);
  const added = Array.from(n).filter((x) => !p.has(x)).sort();
  const removed = Array.from(p).filter((x) => !n.has(x)).sort();
  const equal = added.length === 0 && removed.length === 0;
  return { added, removed, equal };
};

// Genera cambios por campo para Alcance
export function diffAlcance(prev: Partial<AlcanceSLAData> | undefined, next: Partial<AlcanceSLAData> | undefined, ctx?: DiffContext): CampoChange[] {
  const changes: CampoChange[] = [];
  if (!next) return changes;

  // 1) SLA Activo
  if (typeof next.slaActivo === 'boolean') {
    const p = formatBoolActivo(prev?.slaActivo ?? false);
    const n = formatBoolActivo(next.slaActivo);
    if (p !== n) {
      changes.push({ campo: AlcanceLabels.slaActivo, valorAnterior: p, valorNuevo: n });
    }
  }

  // 2) Observaciones (normalizar trim)
  if (typeof next.observaciones === 'string') {
    const p = String(prev?.observaciones ?? '').trim();
    const n = String(next.observaciones ?? '').trim();
    if (p !== n) {
      changes.push({ campo: AlcanceLabels.observaciones, valorAnterior: p || '—', valorNuevo: n || '—' });
    }
  }

  // 3) Tipo de servicio cubierto
  if (next.tipoServicioCubierto) {
    const p = formatTipoServicio(prev?.tipoServicioCubierto ?? 'incidente');
    const n = formatTipoServicio(next.tipoServicioCubierto);
    if (p !== n) {
      changes.push({ campo: AlcanceLabels.tipoServicioCubierto, valorAnterior: p, valorNuevo: n });
    }
  }

  // 4) Servicios cubiertos (lista)
  if (next.serviciosCubiertos) {
    const pList = listServicios(prev?.serviciosCubiertos);
    const nList = listServicios(next.serviciosCubiertos);
    const { equal, added, removed } = diffLists(pList, nList);
    if (!equal) {
      const prevTxt = pList.length ? pList.join(', ') : '—';
      const nextTxt = nList.length ? nList.join(', ') : '—';
      // Opcional: incluir agregados/removidos para mayor claridad
      const extra: string[] = [];
      if (added.length) extra.push(`+ Añadidos: ${added.join(', ')}`);
      if (removed.length) extra.push(`− Removidos: ${removed.join(', ')}`);
      const nuevo = extra.length ? `${nextTxt} (${extra.join(' | ')})` : nextTxt;
      changes.push({ campo: AlcanceLabels.serviciosCubiertos, valorAnterior: prevTxt, valorNuevo: nuevo });
    }
  }

  // 5) Activos cubiertos (modo)
  if (next.activosCubiertos?.tipo) {
    const p = formatActivosModo(prev?.activosCubiertos?.tipo ?? 'todos');
    const n = formatActivosModo(next.activosCubiertos.tipo);
    if (p !== n) {
      changes.push({ campo: AlcanceLabels.activosCubiertos_modo, valorAnterior: p, valorNuevo: n });
    }
  }

  // 6) Categorías cubiertas (incluye personalizadas)
  if (next.activosCubiertos) {
    const pList = mergeCategorias(prev?.activosCubiertos);
    const nList = mergeCategorias(next.activosCubiertos);
    const { equal, added, removed } = diffLists(pList, nList);
    if (!equal) {
      const prevTxt = pList.length ? pList.join(', ') : '—';
      const nextTxt = nList.length ? nList.join(', ') : '—';
      const extra: string[] = [];
      if (added.length) extra.push(`+ Añadidas: ${added.join(', ')}`);
      if (removed.length) extra.push(`− Removidas: ${removed.join(', ')}`);
      const nuevo = extra.length ? `${nextTxt} (${extra.join(' | ')})` : nextTxt;
      changes.push({ campo: AlcanceLabels.activosCubiertos_categorias, valorAnterior: prevTxt, valorNuevo: nuevo });
    }
  }

  // 7) Sedes cubiertas (modo)
  if (next.sedesCubiertas?.tipo) {
    const p = formatSedesModo(prev?.sedesCubiertas?.tipo ?? 'todas');
    const n = formatSedesModo(next.sedesCubiertas.tipo);
    if (p !== n) {
      changes.push({ campo: AlcanceLabels.sedesCubiertas_modo, valorAnterior: p, valorNuevo: n });
    }
  }

  // 8) Sedes cubiertas (lista)
  if (next.sedesCubiertas) {
    const pList = mapSedes(prev?.sedesCubiertas?.sedes || [], ctx);
    const nList = mapSedes(next.sedesCubiertas.sedes || [], ctx);
    const { equal, added, removed } = diffLists(pList, nList);
    if (!equal) {
      const prevTxt = pList.length ? pList.join(', ') : '—';
      const nextTxt = nList.length ? nList.join(', ') : '—';
      const extra: string[] = [];
      if (added.length) extra.push(`+ Añadidas: ${added.join(', ')}`);
      if (removed.length) extra.push(`− Removidas: ${removed.join(', ')}`);
      const nuevo = extra.length ? `${nextTxt} (${extra.join(' | ')})` : nextTxt;
      changes.push({ campo: AlcanceLabels.sedesCubiertas_sedes, valorAnterior: prevTxt, valorNuevo: nuevo });
    }
  }

  return changes;
}

// Utilidad para saber si hubo cambios reales
export const hasRealChanges = (prev?: Partial<AlcanceSLAData>, next?: Partial<AlcanceSLAData>, ctx?: DiffContext) => {
  return diffAlcance(prev, next, ctx).length > 0;
};
