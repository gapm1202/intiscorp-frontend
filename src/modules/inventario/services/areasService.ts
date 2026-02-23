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

export const updateArea = async (
  empresaId: string,
  areaId: string,
  name: string,
  responsable?: string
): Promise<Record<string, unknown>> => {
  const payload = {
    name,
    ...(responsable !== undefined && { responsable }),
  };

  try {
    const response = await axiosClient.put(`/api/empresas/${empresaId}/areas/${areaId}`, payload);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosErrorLike;

    if (err.response?.status === 404 || err.response?.status === 405) {
      try {
        const response = await axiosClient.patch(`/api/empresas/${empresaId}/areas/${areaId}`, payload);
        return response.data;
      } catch (patchError: unknown) {
        const patchErr = patchError as AxiosErrorLike;
        throw {
          status: patchErr.response?.status,
          body: patchErr.response?.data?.message || patchErr.message || "Error al actualizar área",
        };
      }
    }

    throw {
      status: err.response?.status,
      body: err.response?.data?.message || err.message || "Error al actualizar área",
    };
  }
};
