import axiosClient from "@/api/axiosClient";

type AxiosErrorLike = {
  response?: { status?: number; data?: { message?: string } };
  message?: string;
};

export const getAreasByEmpresa = async (empresaId: string): Promise<Record<string, unknown> | unknown[]> => {
  try {
    const response = await axiosClient.get(`/api/empresas/${empresaId}/areas`);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosErrorLike;
    throw {
      status: err.response?.status,
      body: err.response?.data?.message || err.message || "Error al cargar áreas",
    };
  }
};

export const createArea = async (
  empresaId: string,
  name: string,
  sedeId?: string,
  responsable?: string
): Promise<Record<string, unknown>> => {
  try {
    const payload = {
      name,
      ...(sedeId && { sedeId }),
      ...(responsable && { responsable }),
    };
    const response = await axiosClient.post(`/api/empresas/${empresaId}/areas`, payload);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosErrorLike;
    throw {
      status: err.response?.status,
      body: err.response?.data?.message || err.message || "Error al crear área",
    };
  }
};
