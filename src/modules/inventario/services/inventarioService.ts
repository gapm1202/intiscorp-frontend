const _metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const API_BASE = _metaEnv?.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("token");
}

// Tipos locales mínimos para evitar `any` generalizado en este servicio.
type ActivoPayload = Record<string, unknown>;
type FileLike = Blob & { name?: string };
type ServiceError = Error & { status?: number; body?: string };

export async function getInventarioByEmpresa(empresaId: string | number) {
  const url = `${API_BASE}/api/empresas/${empresaId}/inventario`;
  
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    const err = new Error(`Error fetching inventario: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
  return data;
}

export async function getInventarioBySede(
  empresaId: string | number, 
  sedeId: string | number,
  soloSedeActual: boolean = true
) {
  const queryParam = soloSedeActual ? '?soloSedeActual=true' : '';
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes/${sedeId}/inventario${queryParam}`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error:", text);
    const err = new Error(`Error fetching inventario sede: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
  return data;
}

export async function createActivo(empresaId: string | number, sedeId: string | number, activoData: ActivoPayload) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes/${sedeId}/inventario`;
  const token = getToken();

  const payload = activoData as ActivoPayload;

  // Si hay fotos con archivos File, usar FormData
  const fotosFilesVal = payload['fotosFiles'];
  if (Array.isArray(fotosFilesVal) && fotosFilesVal.length > 0) {
    const formData = new FormData();

    // Agregar archivos de fotos
    fotosFilesVal.forEach((fotoObj) => {
      const file = (fotoObj as Record<string, unknown>)['file'] as FileLike | undefined;
      if (file) formData.append('files', file as unknown as File);
    });

    // Agregar el resto de datos como JSON string, pero extraer archivos específicos
    const restDataRaw: Record<string, unknown> = { ...payload };
    delete restDataRaw['fotosFiles'];
    delete restDataRaw['purchaseDocumentFile'];
    delete restDataRaw['warrantyDocumentFile'];

    // Copiar restDataRaw para manipular antes de stringify
    const restData: Record<string, unknown> = { ...restDataRaw };

    // Normalizar fechas a formato YYYY-MM-DD
    if (restData['fechaCompra']) {
      restData['fechaCompra'] = new Date(String(restData['fechaCompra'])).toISOString().split('T')[0];
    }
    if (restData['fechaFinGarantia']) {
      restData['fechaFinGarantia'] = new Date(String(restData['fechaFinGarantia'])).toISOString().split('T')[0];
    }

    // Si existe un año aproximado en fechaCompraAprox (ej: '2022'), enviarlo también como fechaCompraAproxYear
    if (restData['fechaCompraAprox'] && /^\d{4}$/.test(String(restData['fechaCompraAprox']))) {
      const year = Number(restData['fechaCompraAprox']);
      restData['fechaCompraAproxYear'] = year;
      // Añadir variantes snake_case y (por si acaso) versión con typo observed en la BD
      restData['fecha_compra_aprox_year'] = year;
      restData['feha_compra_aprox_year'] = year; // backward-compat / typo
    }

    // Asegurar que las descripciones de los documentos estén presentes (pueden ser empty string)
    const pDesc = payload['purchaseDocumentDescription'];
    if (typeof pDesc !== 'undefined') {
      restData['purchaseDocumentDescription'] = pDesc;
      restData['purchase_document_description'] = pDesc;
    }
    const wDesc = payload['warrantyDocumentDescription'];
    if (typeof wDesc !== 'undefined') {
      restData['warrantyDocumentDescription'] = wDesc;
      restData['warranty_document_description'] = wDesc;
    }

    const purchaseDocumentFile = payload['purchaseDocumentFile'] ?? payload['purchaseDocument'];
    const warrantyDocumentFile = payload['warrantyDocumentFile'] ?? payload['warrantyDocument'];

    // Adjuntar los archivos específicos de compra/garantía si vienen como File
    if (purchaseDocumentFile && (purchaseDocumentFile as FileLike).name) {
      formData.append('purchaseDocument', purchaseDocumentFile as unknown as File);
      // Compat: añadir variantes de key que el backend podría esperar
      formData.append('purchase_document', purchaseDocumentFile as unknown as File);
      formData.append('purchaseDocumentFile', purchaseDocumentFile as unknown as File);
      formData.append('purchase_document_file', purchaseDocumentFile as unknown as File);
    }
    if (warrantyDocumentFile && (warrantyDocumentFile as FileLike).name) {
      formData.append('warrantyDocument', warrantyDocumentFile as unknown as File);
      // Compat: añadir variantes de key que el backend podría esperar
      formData.append('warranty_document', warrantyDocumentFile as unknown as File);
      formData.append('warrantyDocumentFile', warrantyDocumentFile as unknown as File);
      formData.append('warranty_document_file', warrantyDocumentFile as unknown as File);
    }


    // Asegurar campo garantía (duplica en snake_case también)
    if (typeof restData['garantia'] !== 'undefined') {
      restData['garantia_duracion'] = restData['garantia'];
    }

    // Asegurar campo condicionFisica en variantes camelCase + snake_case
    if (typeof restData['condicionFisica'] !== 'undefined') {
      restData['condicion_fisica'] = restData['condicionFisica'];
    }

    // Asegurar campo codigoAccesoRemoto en variantes camelCase + snake_case
    if (typeof restData['codigoAccesoRemoto'] !== 'undefined') {
      restData['codigo_acceso_remoto'] = restData['codigoAccesoRemoto'];
    }

    const jsonData = JSON.stringify(restData);
    // Añadir condicion_fisica también como campo top-level en FormData (compatibilidad)
    if (typeof restData['condicion_fisica'] !== 'undefined') {
      formData.append('condicion_fisica', String(restData['condicion_fisica']));
    }
    formData.append('data', jsonData);
    // Mostrar las entradas de FormData para depuración (nombre, valor/file)
    try {
      for (const entry of (formData as unknown as FormData).entries()) {
        // Para archivos mostramos el nombre
        const value = entry[1] && (entry[1] as FileLike).name ? (entry[1] as FileLike).name : entry[1];
      }
    } catch (e) {
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { "Authorization": `Bearer ${token}` })
        // NO incluir Content-Type - el navegador lo establece con boundary
      },
      body: formData
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Error creando activo:", text);
      const err = new Error(`Error creating activo: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
      err.status = res.status;
      err.body = text;
      throw err;
    }

    const data = await res.json();
    return data;
  } else {
    // Sin fotos: si hay archivos de purchase/warranty, enviar FormData para no serializar File en JSON
    const hasPurchaseFile = !!payload['purchaseDocumentFile'] || !!payload['purchaseDocument'];
    const hasWarrantyFile = !!payload['warrantyDocumentFile'] || !!payload['warrantyDocument'];

    // Normalizar fechas
    if (payload['fechaCompra']) {
      payload['fechaCompra'] = new Date(String(payload['fechaCompra'])).toISOString().split('T')[0];
    }
    if (payload['fechaFinGarantia']) {
      payload['fechaFinGarantia'] = new Date(String(payload['fechaFinGarantia'])).toISOString().split('T')[0];
    }

    if (hasPurchaseFile || hasWarrantyFile) {
      const formData = new FormData();

      const purchaseDocumentFile = payload['purchaseDocumentFile'] ?? payload['purchaseDocument'];
      const warrantyDocumentFile = payload['warrantyDocumentFile'] ?? payload['warrantyDocument'];
      const rest: Record<string, unknown> = { ...payload };
      delete rest['purchaseDocumentFile'];
      delete rest['warrantyDocumentFile'];

      const restCopy: Record<string, unknown> = { ...rest };
      if (restCopy['fechaCompraAprox'] && /^\d{4}$/.test(String(restCopy['fechaCompraAprox']))) {
        const year = Number(restCopy['fechaCompraAprox']);
        restCopy['fechaCompraAproxYear'] = year;
        restCopy['fecha_compra_aprox_year'] = year;
        restCopy['feha_compra_aprox_year'] = year; // typo fallback
      }
      const pDesc2 = payload['purchaseDocumentDescription'];
      if (typeof pDesc2 !== 'undefined') {
        restCopy['purchaseDocumentDescription'] = pDesc2;
        restCopy['purchase_document_description'] = pDesc2;
      }
      const wDesc2 = payload['warrantyDocumentDescription'];
      if (typeof wDesc2 !== 'undefined') {
        restCopy['warrantyDocumentDescription'] = wDesc2;
        restCopy['warranty_document_description'] = wDesc2;
      }

      if (typeof restCopy['garantia'] !== 'undefined') {
        restCopy['garantia_duracion'] = restCopy['garantia'];
      }

      // Asegurar campo codigoAccesoRemoto en variantes camelCase + snake_case
      if (typeof restCopy['codigoAccesoRemoto'] !== 'undefined') {
        restCopy['codigo_acceso_remoto'] = restCopy['codigoAccesoRemoto'];
      }

      const jsonData2 = JSON.stringify(restCopy);

      if (purchaseDocumentFile && (purchaseDocumentFile as FileLike).name) {
        formData.append('purchaseDocument', purchaseDocumentFile as unknown as File);
        formData.append('purchase_document', purchaseDocumentFile as unknown as File);
        formData.append('purchaseDocumentFile', purchaseDocumentFile as unknown as File);
        formData.append('purchase_document_file', purchaseDocumentFile as unknown as File);
      }
      if (warrantyDocumentFile && (warrantyDocumentFile as FileLike).name) {
        formData.append('warrantyDocument', warrantyDocumentFile as unknown as File);
        formData.append('warranty_document', warrantyDocumentFile as unknown as File);
        formData.append('warrantyDocumentFile', warrantyDocumentFile as unknown as File);
        formData.append('warranty_document_file', warrantyDocumentFile as unknown as File);
      }

      // Añadir condicion_fisica también como campo top-level en FormData (compatibilidad con backends que no parsean 'data')
      if (typeof restCopy['condicionFisica'] !== 'undefined') {
        restCopy['condicion_fisica'] = restCopy['condicionFisica'];
      }
      if (typeof restCopy['condicion_fisica'] !== 'undefined') {
        formData.append('condicion_fisica', String(restCopy['condicion_fisica']));
      }

      formData.append('data', JSON.stringify(restCopy));

      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Error creando activo (con docs):", text);
        const err = new Error(`Error creating activo: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
        err.status = res.status;
        err.body = text;
        throw err;
      }

      const data = await res.json();
      return data;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` })
      },
      body: JSON.stringify((() => {
        // Asegurar que enviamos tanto camelCase como snake_case en el JSON puro
        const copy: Record<string, unknown> = { ...payload };
        if (typeof copy['condicionFisica'] !== 'undefined') {
          copy['condicion_fisica'] = copy['condicionFisica'];
        }
        if (typeof copy['codigoAccesoRemoto'] !== 'undefined') {
          copy['codigo_acceso_remoto'] = copy['codigoAccesoRemoto'];
        }
        return copy;
      })())
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Error creando activo:", text);
      const err = new Error(`Error creating activo: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
      err.status = res.status;
      err.body = text;
      throw err;
    }

    const data = await res.json();
    return data;
  }
}

/**
 * Obtiene o crea (si no existe) un token público asociado a un activo.
 * El backend debe exponer un endpoint que retorne { token: string } y
 * que cree el token permanentemente la primera vez. Ej: POST /api/activos/:assetId/token
 */
export async function getOrCreateAssetToken(assetId: string | number) {
  const url = `${API_BASE}/api/activos/${assetId}/token`;
  const token = getToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Error fetching/creating asset token: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
  // Esperamos { token: '...' }
  return data?.token ?? null;
}

/**
 * Solicita tokens para varios activos en un solo llamado.
 * Endpoint backend: POST /api/activos/tokens with body { ids: [id...] }
 * Devuelve un objeto mapa { [id]: token }
 */
export async function getTokensForAssets(ids: Array<string | number>) {
  const url = `${API_BASE}/api/activos/tokens`;
  const token = getToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify({ ids })
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Error fetching asset tokens batch: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
  // Esperamos un mapa { id: token }
  // Algunos backends devuelven { data: { ... } } — normalizamos para retornar siempre el mapa interno.
  if (data && typeof data === 'object') {
    if ('data' in data && typeof (data as any).data === 'object') return (data as any).data ?? {};
    if ('tokens' in data && typeof (data as any).tokens === 'object') return (data as any).tokens ?? {};
  }
  return data ?? {};
}

export async function updateActivo(empresaId: string | number, sedeId: string | number, activoId: string | number, activoData: ActivoPayload) {
  const url = `${API_BASE}/api/empresas/${empresaId}/sedes/${sedeId}/inventario/${activoId}`;
  const token = getToken();

  const payload = activoData as ActivoPayload;

  // Si hay fotos nuevas con archivos File, usar FormData
  const fotosFilesVal = payload['fotosFiles'];
  if (Array.isArray(fotosFilesVal) && fotosFilesVal.length > 0) {
    const formData = new FormData();

    // Agregar archivos de fotos nuevas
    fotosFilesVal.forEach((fotoObj) => {
      const file = (fotoObj as Record<string, unknown>)['file'] as FileLike | undefined;
      if (file) formData.append('files', file as unknown as File);
    });

    // Agregar el resto de datos como JSON string en 'data', pero extraer archivos específicos
    const restDataRaw2: Record<string, unknown> = { ...payload };
    delete restDataRaw2['fotosFiles'];
    delete restDataRaw2['purchaseDocumentFile'];
    delete restDataRaw2['warrantyDocumentFile'];
    const restData2: Record<string, unknown> = { ...restDataRaw2 };

    // Normalizar fechas a formato YYYY-MM-DD para input[type="date"]
    if (restData2['fechaCompra']) {
      restData2['fechaCompra'] = new Date(String(restData2['fechaCompra'])).toISOString().split('T')[0];
    }
    if (restData2['fechaFinGarantia']) {
      restData2['fechaFinGarantia'] = new Date(String(restData2['fechaFinGarantia'])).toISOString().split('T')[0];
    }

    if (restData2['fechaCompraAprox'] && /^\d{4}$/.test(String(restData2['fechaCompraAprox']))) {
      const year = Number(restData2['fechaCompraAprox']);
      restData2['fechaCompraAproxYear'] = year;
      restData2['fecha_compra_aprox_year'] = year;
      restData2['feha_compra_aprox_year'] = year; // typo fallback
    }

    if (typeof payload['purchaseDocumentDescription'] !== 'undefined') {
      restData2['purchaseDocumentDescription'] = payload['purchaseDocumentDescription'];
      restData2['purchase_document_description'] = payload['purchaseDocumentDescription'];
    }
    if (typeof payload['warrantyDocumentDescription'] !== 'undefined') {
      restData2['warrantyDocumentDescription'] = payload['warrantyDocumentDescription'];
      restData2['warranty_document_description'] = payload['warrantyDocumentDescription'];
    }

    if (typeof restData2['garantia'] !== 'undefined') {
      restData2['garantia_duracion'] = restData2['garantia'];
    }

    if (typeof restData2['codigoAccesoRemoto'] !== 'undefined') {
      restData2['codigo_acceso_remoto'] = restData2['codigoAccesoRemoto'];
    }

    const purchaseDocumentFile = payload['purchaseDocumentFile'] ?? payload['purchaseDocument'];
    const warrantyDocumentFile = payload['warrantyDocumentFile'] ?? payload['warrantyDocument'];

    if (purchaseDocumentFile && (purchaseDocumentFile as FileLike).name) {
      formData.append('purchaseDocument', purchaseDocumentFile as unknown as File);
      formData.append('purchase_document', purchaseDocumentFile as unknown as File);
      formData.append('purchaseDocumentFile', purchaseDocumentFile as unknown as File);
      formData.append('purchase_document_file', purchaseDocumentFile as unknown as File);
    }
    if (warrantyDocumentFile && (warrantyDocumentFile as FileLike).name) {
      formData.append('warrantyDocument', warrantyDocumentFile as unknown as File);
      formData.append('warranty_document', warrantyDocumentFile as unknown as File);
      formData.append('warrantyDocumentFile', warrantyDocumentFile as unknown as File);
      formData.append('warranty_document_file', warrantyDocumentFile as unknown as File);
    }

    const jsonData3 = JSON.stringify(restData2);
    formData.append('data', jsonData3);

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        ...(token && { "Authorization": `Bearer ${token}` })
        // NO incluir Content-Type - el navegador lo establece con boundary
      },
      body: formData
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Error actualizando activo:", text);
      const err = new Error(`Error updating activo: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
      err.status = res.status;
      err.body = text;
      throw err;
    }

    const data = await res.json();
    return data;
  } else {
    // Sin fotos nuevas - si hay archivos de purchase/warranty, enviar FormData para no serializar File en JSON
    const hasPurchaseFile = !!payload['purchaseDocumentFile'] || !!payload['purchaseDocument'];
    const hasWarrantyFile = !!payload['warrantyDocumentFile'] || !!payload['warrantyDocument'];

    // Normalizar fechas
    if (payload['fechaCompra']) {
      payload['fechaCompra'] = new Date(String(payload['fechaCompra'])).toISOString().split('T')[0];
    }
    if (payload['fechaFinGarantia']) {
      payload['fechaFinGarantia'] = new Date(String(payload['fechaFinGarantia'])).toISOString().split('T')[0];
    }

    if (hasPurchaseFile || hasWarrantyFile) {
      const formData = new FormData();

      const purchaseDocumentFile = payload['purchaseDocumentFile'] ?? payload['purchaseDocument'];
      const warrantyDocumentFile = payload['warrantyDocumentFile'] ?? payload['warrantyDocument'];
      const rest: Record<string, unknown> = { ...payload };
      delete rest['purchaseDocumentFile'];
      delete rest['warrantyDocumentFile'];
      const restCopy: Record<string, unknown> = { ...rest };
      if (restCopy['fechaCompraAprox'] && /^\d{4}$/.test(String(restCopy['fechaCompraAprox']))) {
        const year = Number(restCopy['fechaCompraAprox']);
        restCopy['fechaCompraAproxYear'] = year;
        restCopy['fecha_compra_aprox_year'] = year;
        restCopy['feha_compra_aprox_year'] = year; // typo fallback
      }
      const pDesc3 = payload['purchaseDocumentDescription'];
      if (typeof pDesc3 !== 'undefined') {
        restCopy['purchaseDocumentDescription'] = pDesc3;
        restCopy['purchase_document_description'] = pDesc3;
      }
      const wDesc3 = payload['warrantyDocumentDescription'];
      if (typeof wDesc3 !== 'undefined') {
        restCopy['warrantyDocumentDescription'] = wDesc3;
        restCopy['warranty_document_description'] = wDesc3;
      }

      if (typeof restCopy['garantia'] !== 'undefined') {
        restCopy['garantia_duracion'] = restCopy['garantia'];
      }

      if (typeof restCopy['codigoAccesoRemoto'] !== 'undefined') {
        restCopy['codigo_acceso_remoto'] = restCopy['codigoAccesoRemoto'];
      }

      const jsonData4 = JSON.stringify(restCopy);

      if (purchaseDocumentFile && (purchaseDocumentFile as FileLike).name) {
        formData.append('purchaseDocument', purchaseDocumentFile as unknown as File);
        formData.append('purchase_document', purchaseDocumentFile as unknown as File);
        formData.append('purchaseDocumentFile', purchaseDocumentFile as unknown as File);
        formData.append('purchase_document_file', purchaseDocumentFile as unknown as File);
      }
      if (warrantyDocumentFile && (warrantyDocumentFile as FileLike).name) {
        formData.append('warrantyDocument', warrantyDocumentFile as unknown as File);
        formData.append('warranty_document', warrantyDocumentFile as unknown as File);
        formData.append('warrantyDocumentFile', warrantyDocumentFile as unknown as File);
        formData.append('warranty_document_file', warrantyDocumentFile as unknown as File);
      }

      try {
        for (const entry of (formData as unknown as FormData).entries()) {
          const value = entry[1] && (entry[1] as FileLike).name ? (entry[1] as FileLike).name : entry[1];
        }
      } catch (e) {
      }

      formData.append('data', jsonData4);

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Error actualizando activo (con docs):", text);
        const err = new Error(`Error updating activo: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
        err.status = res.status;
        err.body = text;
        throw err;
      }

      const data = await res.json();
      return data;
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` })
      },
      body: JSON.stringify((() => {
        const copy: Record<string, unknown> = { ...payload };
        if (typeof copy['codigoAccesoRemoto'] !== 'undefined') {
          copy['codigo_acceso_remoto'] = copy['codigoAccesoRemoto'];
        }
        return copy;
      })())
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Error actualizando activo:", text);
      const err = new Error(`Error updating activo: ${res.status} ${res.statusText} - ${text}`) as ServiceError;
      err.status = res.status;
      err.body = text;
      throw err;
    }

    const data = await res.json();
    return data;
  }
}

// Obtener un activo específico por ID
export async function getActivoById(activoId: string | number) {
  const url = `${API_BASE}/api/activos/${activoId}`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Error getting activo:", text);
    const err = new Error(`Error fetching activo: ${res.status} ${res.statusText}`) as ServiceError;
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
  // Retornar directamente los datos si es un objeto, o acceder a .data si es una respuesta envuelta
  return data.data || data;
}
