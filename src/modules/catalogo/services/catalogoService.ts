import axiosClient from "@/api/axiosClient";
import type { CatalogCategory, CatalogSubcategory, TicketType } from "../types";

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

export const ticketTypeLabel = (tipo: TicketType) => {
  if (tipo === "incidente") return "Incidente";
  if (tipo === "solicitud") return "Solicitud";
  if (!tipo) return "";
  const clean = String(tipo).trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};
