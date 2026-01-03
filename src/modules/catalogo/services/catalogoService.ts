import axiosClient from "@/api/axiosClient";
import type { CatalogCategory, CatalogSubcategory } from "../types";
import type { TicketType } from "../components/TicketTypeForm";

// Datos de respaldo para desarrollo sin backend
const fallbackCategories: CatalogCategory[] = [
  {
    id: "1",
    codigo: "CAT-EMAIL",
    nombre: "Correo / Email",
    descripcion: "Problemas y solicitudes relacionadas al servicio de correo.",
    tipoTicket: "incidente",
    activo: true,
    visibleEnTickets: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    codigo: "CAT-RED",
    nombre: "Red y Conectividad",
    descripcion: "VPN, enlaces, WiFi y cableado.",
    tipoTicket: "solicitud",
    activo: true,
    visibleEnTickets: true,
    createdAt: new Date().toISOString(),
  },
];

const fallbackSubcategories: CatalogSubcategory[] = [
  {
    id: "10",
    codigo: "SUB-EMAIL-01",
    nombre: "No envía correos",
    descripcion: "El usuario no puede enviar correos a dominios externos.",
    tipoTicket: "incidente",
    requiereValidacion: false,
    activo: true,
    categoriaId: "1",
    heredaTipo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11",
    codigo: "SUB-RED-02",
    nombre: "Alta de acceso VPN",
    descripcion: "Solicitud de creación de usuario VPN corporativo.",
    tipoTicket: "solicitud",
    requiereValidacion: true,
    activo: true,
    categoriaId: "2",
    heredaTipo: false,
    createdAt: new Date().toISOString(),
  },
];

const safeReturn = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T;

export const getCatalogCategories = async (): Promise<CatalogCategory[]> => {
  try {
    const res = await axiosClient.get("/api/catalogo/categorias");
    return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : safeReturn(fallbackCategories);
  } catch (err) {
    console.warn("[catalogoService] usando fallback para categorías", err);
    return safeReturn(fallbackCategories);
  }
};

export const getCatalogSubcategories = async (): Promise<CatalogSubcategory[]> => {
  try {
    const res = await axiosClient.get("/api/catalogo/subcategorias");
    return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : safeReturn(fallbackSubcategories);
  } catch (err) {
    console.warn("[catalogoService] usando fallback para subcategorías", err);
    return safeReturn(fallbackSubcategories);
  }
};

export const createCatalogCategory = async (
  payload: Omit<CatalogCategory, "id" | "createdAt">,
): Promise<CatalogCategory> => {
  try {
    const res = await axiosClient.post("/api/catalogo/categorias", payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.warn("[catalogoService] create fallback categoría", err);
    const created: CatalogCategory = {
      ...payload,
      id: crypto.randomUUID?.() ?? String(Date.now()),
      createdAt: new Date().toISOString(),
    };
    fallbackCategories.push(created);
    return safeReturn(created);
  }
};

export const updateCatalogCategory = async (
  id: string,
  payload: Partial<CatalogCategory>,
): Promise<CatalogCategory> => {
  try {
    const res = await axiosClient.put(`/api/catalogo/categorias/${id}`, payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.warn("[catalogoService] update fallback categoría", err);
    const idx = fallbackCategories.findIndex((c) => c.id === id);
    if (idx >= 0) {
      fallbackCategories[idx] = { ...fallbackCategories[idx], ...payload } as CatalogCategory;
      return safeReturn(fallbackCategories[idx]);
    }
    throw err;
  }
};

export const toggleCatalogCategory = async (
  id: string,
  activo: boolean,
): Promise<CatalogCategory> => updateCatalogCategory(id, { activo });

export const createCatalogSubcategory = async (
  payload: Omit<CatalogSubcategory, "id" | "createdAt">,
): Promise<CatalogSubcategory> => {
  try {
    const res = await axiosClient.post("/api/catalogo/subcategorias", payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.warn("[catalogoService] create fallback subcategoría", err);
    const created: CatalogSubcategory = {
      ...payload,
      id: crypto.randomUUID?.() ?? String(Date.now()),
      createdAt: new Date().toISOString(),
    };
    fallbackSubcategories.push(created);
    return safeReturn(created);
  }
};

export const updateCatalogSubcategory = async (
  id: string,
  payload: Partial<CatalogSubcategory>,
): Promise<CatalogSubcategory> => {
  try {
    const res = await axiosClient.put(`/api/catalogo/subcategorias/${id}`, payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.warn("[catalogoService] update fallback subcategoría", err);
    const idx = fallbackSubcategories.findIndex((s) => s.id === id);
    if (idx >= 0) {
      fallbackSubcategories[idx] = { ...fallbackSubcategories[idx], ...payload } as CatalogSubcategory;
      return safeReturn(fallbackSubcategories[idx]);
    }
    throw err;
  }
};

export const toggleCatalogSubcategory = async (
  id: string,
  activo: boolean,
): Promise<CatalogSubcategory> => updateCatalogSubcategory(id, { activo });

export const ticketTypeLabel = (tipo: string | TicketType) => {
  const clean = String(tipo || "").trim();
  if (clean === "incidente") return "Incidente";
  if (clean === "solicitud") return "Solicitud";
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

// Persistencia de tipos personalizados: intenta usar backend, si no existe usa localStorage
export const LOCAL_TYPES_KEY = "catalogo:tipos";

export const getCatalogTypes = async (): Promise<string[]> => {
  try {
    const res = await axiosClient.get("/api/catalogo/tipos");
    const data = res.data;
    if (data && typeof data === "object" && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
  } catch (err) {
    console.warn("[catalogoService] /tipos endpoint no disponible, usando localStorage si existe", err);
  }

  try {
    const stored = localStorage.getItem(LOCAL_TYPES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* noop */
  }

  return ["incidente", "solicitud"];
};

export const createCatalogType = async (tipo: string): Promise<string> => {
  const normalized = String(tipo).trim().toLowerCase();
  try {
    const res = await axiosClient.post("/api/catalogo/tipos", { tipo: normalized });
    const data = res.data;
    // backend puede devolver { data: ['a','b'] } o directamente la cadena
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(data.data));
      return normalized;
    }
    if (typeof data === "string") {
      const list = await getCatalogTypes();
      const merged = Array.from(new Set([...list, data]));
      localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(merged));
      return data;
    }
    // fallback: persistir en localStorage
    const list = await getCatalogTypes();
    const merged = Array.from(new Set([...list, normalized]));
    localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(merged));
    return normalized;
  } catch (err) {
    console.warn("[catalogoService] createCatalogType fallo backend, guardando en localStorage", err);
    const list = await getCatalogTypes();
    const merged = Array.from(new Set([...list, normalized]));
    localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(merged));
    return normalized;
  }
};

export const deleteCatalogType = async (tipo: string): Promise<boolean> => {
  const normalized = String(tipo).trim().toLowerCase();
  try {
    // Backend: DELETE /api/catalogo/tipos/:tipo
    const res = await axiosClient.delete(`/api/catalogo/tipos/${encodeURIComponent(normalized)}`);
    const data = res.data;
    // Si backend devuelve una lista actualizada la persistimos
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(data.data));
      return true;
    }
    // Si no, eliminamos localmente del listado
    try {
      const list = await getCatalogTypes();
      const updated = list.filter((t) => t !== normalized);
      localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(updated));
    } catch {
      /* noop */
    }
    return true;
  } catch (err) {
    console.warn("[catalogoService] deleteCatalogType fallo backend, eliminando de localStorage", err);
    const list = (await getCatalogTypes()).filter((t) => t !== normalized);
    localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(list));
    return true;
  }
};
// ==================== CRUD TIPOS DE TICKET ====================

export const getTicketTypes = async (): Promise<TicketType[]> => {
  try {
    const res = await axiosClient.get("/api/catalogo/tipos-ticket");
    return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.warn("[catalogoService] getTicketTypes error:", err);
    return [];
  }
};

export const createTicketType = async (payload: Omit<TicketType, "id" | "createdAt">): Promise<TicketType> => {
  try {
    const res = await axiosClient.post("/api/catalogo/tipos-ticket", payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.error("[catalogoService] createTicketType error:", err);
    throw err;
  }
};

export const updateTicketType = async (
  id: string,
  payload: Partial<Omit<TicketType, "id" | "createdAt">>
): Promise<TicketType> => {
  try {
    const res = await axiosClient.put(`/api/catalogo/tipos-ticket/${id}`, payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.error("[catalogoService] updateTicketType error:", err);
    throw err;
  }
};

export const toggleTicketType = async (id: string): Promise<TicketType> => {
  try {
    const res = await axiosClient.patch(`/api/catalogo/tipos-ticket/${id}/toggle`);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.error("[catalogoService] toggleTicketType error:", err);
    throw err;
  }
};