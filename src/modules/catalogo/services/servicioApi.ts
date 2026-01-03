import axiosClient from "@/api/axiosClient";
import type { CatalogServicio, ServicioStats } from "../types/servicio.types";

const BASE_URL = "/api/catalogo/servicios";

export const getServicios = async (): Promise<CatalogServicio[]> => {
  const response = await axiosClient.get(BASE_URL);
  return response.data;
};

export const getServicioById = async (id: number): Promise<CatalogServicio> => {
  const response = await axiosClient.get(`${BASE_URL}/${id}`);
  return response.data;
};

export const createServicio = async (data: Partial<CatalogServicio>): Promise<CatalogServicio> => {
  const response = await axiosClient.post(BASE_URL, data);
  return response.data;
};

export const updateServicio = async (id: number, data: Partial<CatalogServicio>): Promise<CatalogServicio> => {
  const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const getStats = async (): Promise<ServicioStats> => {
  const response = await axiosClient.get(`${BASE_URL}/stats`);
  return response.data;
};

export const getTiposServicio = async (): Promise<string[]> => {
  const response = await axiosClient.get("/api/catalogo/servicios/tipos");
  return response.data;
};

export const addTipoServicio = async (nombre: string): Promise<void> => {
  await axiosClient.post("/api/catalogo/servicios/tipos", { nombre });
};
