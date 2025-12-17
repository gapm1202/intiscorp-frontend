import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getInventarioByEmpresa, getInventarioBySede, getOrCreateAssetToken, getTokensForAssets } from "@/modules/inventario/services/inventarioService";
import { getEmpresaById } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import QRCode from 'qrcode';
import { formatAssetCode } from "@/utils/helpers";

interface InventarioItem {
  id?: number;
  _id?: string;
  assetId?: string;
  codigo?: string;
  nombre?: string;
  categoria?: string;
  area?: string;
  sede?: string;
  [key: string]: unknown;
}

const EtiquetasPage = () => {
  const { empresaId, sedeId } = useParams<{ empresaId: string; sedeId?: string }>();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresaName, setEmpresaName] = useState<string | null>(null);
  const [sedesMap, setSedesMap] = useState<Record<string,string>>({});

  useEffect(() => {
    if (!empresaId) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: any;
        if (sedeId) {
          data = await getInventarioBySede(empresaId, sedeId);
        } else {
          data = await getInventarioByEmpresa(empresaId);
        }
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setItems(list);
        const initial: Record<string, boolean> = {};
        list.forEach((it: any) => {
          const key = String(it.id ?? it._id ?? it.assetId ?? it.codigo ?? it.codigo ?? Math.random());
          initial[key] = false;
        });
        setSelected(initial);

        // Obtener nombre de empresa y lista de sedes para mostrar en etiquetas
        try {
          const [empresaData, sedesData] = await Promise.all([
            getEmpresaById(empresaId),
            getSedesByEmpresa(empresaId)
          ]);
          setEmpresaName(empresaData?.nombre ?? null);
          const sedesList = Array.isArray(sedesData) ? sedesData : sedesData?.data ?? [];
          const map: Record<string,string> = {};
          sedesList.forEach((s: any) => {
            const id = String(s._id ?? s.id ?? '');
            if (id) map[id] = s.nombre ?? s.name ?? '';
          });
          setSedesMap(map);
        } catch (e) {
          // no crítico
          console.warn('No se pudieron cargar empresa/sedes para etiquetas', e);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [empresaId, sedeId]);

  const toggle = (key: string) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    Object.keys(selected).forEach(k => next[k] = value);
    setSelected(next);
  };

  const getSelectedItems = () => {
    return items.filter(it => {
      const key = String(it.id ?? it._id ?? it.assetId ?? it.codigo ?? it.codigo ?? Math.random());
      return !!selected[key];
    });
  };

  const generatePrint = async () => {
    const chosen = getSelectedItems();
    if (!chosen || chosen.length === 0) return alert('Selecciona al menos un activo');

    // Primero pedir tokens en batch para evitar N llamadas individuales.
    // Preferir enviar códigos de activo (assetId / codigo) al backend, ya que los tokens suelen mapearse por ese valor.
    const ids = chosen.map(it => String(it.assetId ?? it.codigo ?? it.id ?? it._id ?? ''));
    let tokensMap: Record<string, string | null> = {};
    try {
      const batch = await getTokensForAssets(ids);
      // Normalizar respuestas envueltas: si backend devolvió { data: {...} } o similar,
      // el servicio debería haber normalizado, pero defensivamente extraemos también aquí.
      if (batch && typeof batch === 'object' && ('data' in batch) && typeof (batch as any).data === 'object') {
        tokensMap = (batch as any).data ?? {};
      } else if (batch && typeof batch === 'object' && ('tokens' in batch) && typeof (batch as any).tokens === 'object') {
        tokensMap = (batch as any).tokens ?? {};
      } else {
        tokensMap = batch || {};
      }
      console.log('Batch tokensMap keys sample:', Object.keys(tokensMap).slice(0,10));
    } catch (err) {
      console.warn('Batch token request falló, se intentará individualmente:', err);
      tokensMap = {};
    }

    const chosenWithQr = await Promise.all(chosen.map(async (it, idx) => {

      // Determine candidate keys for token lookup in the returned map
      const candidateKeys = [
        String(it.assetId ?? ''),
        String(it.codigo ?? ''),
        String(it.id ?? ''),
        String(it._id ?? ''),
        String(ids[idx] ?? '')
      ].filter(Boolean);

      let token: string | null = null;
      let matchedKey: string | null = null;

      // Try explicit lookups in a robust order and also try numeric/string variants
      for (const k of candidateKeys) {
        if (!k) continue;
        // direct match
        if (typeof tokensMap[k] !== 'undefined' && tokensMap[k]) { token = tokensMap[k] as string; matchedKey = k; break; }
        // numeric fallback (e.g., backend may have numeric keys)
        const asNum = Number(k);
        if (!Number.isNaN(asNum) && typeof tokensMap[String(asNum)] !== 'undefined' && tokensMap[String(asNum)]) { token = tokensMap[String(asNum)]; matchedKey = String(asNum); break; }
      }

      // If still not found, try looking up by normalized assetCode (uppercase/lowercase)
      if (!token && it.assetId) {
        const alt = String(it.assetId).toUpperCase();
        if (typeof tokensMap[alt] !== 'undefined' && tokensMap[alt]) { token = tokensMap[alt] as string; matchedKey = alt; }
      }

      // Si batch no devolvió token para este id, pedir individualmente usando la mejor key disponible
      if (!token) {
        try {
          const lookupId = candidateKeys.find(k => !!k) ?? String(ids[idx] ?? '');
          token = await getOrCreateAssetToken(String(lookupId));
        } catch (err) {
          console.error('Error obteniendo token para activo', { candidateKeys, idx }, err);
        }
      }

      // Build public URL that the QR will point to. The backend expects a token parameter.
      const FRONTEND_BASE = (import.meta.env.VITE_FRONTEND_URL as string) || 'http://localhost:5173';
      const publicUrl = token
        ? `${FRONTEND_BASE}/public/activos?token=${encodeURIComponent(token)}`
        : `${FRONTEND_BASE}/public/activos`;

      if (!token) {
        console.warn('No token encontrado para activo', { candidateKeys, idx, it });
      } else {
        console.log('Token matched for', matchedKey, token?.slice?.(0,8) ?? token);
      }

      let qrDataUrl: string | null = null;
      try {
        qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 200 });
      } catch (e) {
        console.error('Error generando QR:', e);
      }

      return { item: it, token, publicUrl, qrDataUrl };
    }));

    const style = `
      <style>
        @page { size: A4; margin: 8mm; }
        body{font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:6mm; color: #0f172a}
        /* 3-column layout to fit more labels per A4 page */
        .labels{display:grid;grid-template-columns: repeat(3, 1fr);gap:10px;align-items:start}
        /* compact label so 3 fit per row */
        .label{border:1px solid #e6e9ee;background:#fff;padding:10px;box-sizing:border-box;display:flex;align-items:center;min-height:88px;border-radius:6px}
        .label .left{flex:1;display:flex;flex-direction:column;gap:4px;padding-right:8px}
        .label .code{font-weight:800;font-size:13px;letter-spacing:0.4px;color:#0f172a}
        /* removed .type (static 'PC') — not needed */
        .label .name{font-size:12px;color:#0f172a;font-weight:600}
        .label .meta{font-size:11px;color:#334155;display:flex;flex-direction:column;gap:2px;margin-top:4px}
        .label .meta div{line-height:1.1}
        .label .meta strong{font-weight:700;color:#0f172a;margin-right:6px}
        .label .year{font-size:11px;color:#0f172a;font-weight:700;margin-bottom:4px}
        /* reduce QR size to fit 3 columns */
        .label .qr{width:72px;flex:0 0 72px;display:flex;align-items:center;justify-content:center}
        .label img{width:68px;height:68px;object-fit:contain}
        /* token and public URL are intentionally not printed for privacy */
        @media print{
          body{padding:0}
          .labels{gap:8px}
          .label{page-break-inside:avoid;break-inside:avoid}
        }
      </style>
    `;

    const inventoryYear = new Date().getFullYear();
    const body = `<div class="labels">${chosenWithQr.map(entry => {
      const it = entry.item;
      const code = formatAssetCode(String(it.assetId ?? it.codigo ?? it._id ?? it.id ?? ''));
      const name = String(it.nombre ?? '-');
      const cat = String(it.categoria ?? '-');
      const area = String(it.area ?? it.areaNombre ?? it.area_name ?? '-');
      const qr = entry.qrDataUrl ? `<img src="${entry.qrDataUrl}" alt="QR" />` : '';
      const tokenInfo = entry.token ? `<div class="token">Token: ${escapeHtml(String(entry.token).slice(0,16))}...</div>` : '';

      // Empresa / Sede: preferir campos del activo si existen, si no usar valores cargados desde el servidor
      const empresaText = String(it.empresaNombre ?? it.empresa ?? empresaName ?? '-');
      const sedeText = String(it.sedeNombre ?? it.sede ?? (it.sedeId ? (sedesMap[String(it.sedeId)] ?? '') : '') ?? sedeId ?? '-');

      return `<div class="label"><div class="left"><div class="year">Inventario ${inventoryYear}</div><div class="code">${code}</div><div class="name">${escapeHtml(name)}</div><div class="meta"><div><strong>Empresa:</strong> ${escapeHtml(empresaText)}</div><div><strong>Sede:</strong> ${escapeHtml(sedeText)}</div><div><strong>Área:</strong> ${escapeHtml(area)}</div></div></div><div class="qr">${qr}</div></div>`;
    }).join('')}</div>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return alert('No se pudo abrir la ventana de impresión (bloqueador?)');
    w.document.write(`<!doctype html><html><head><title>Etiquetas</title>${style}</head><body>${body}</body></html>`);
    w.document.close();
    // Esperar a que el contenido esté completamente cargado
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"} as Record<string,string>)[c];
    });
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Generar Etiquetas</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => selectAll(true)} className="px-3 py-2 bg-slate-100 rounded">Seleccionar todo</button>
            <button onClick={() => selectAll(false)} className="px-3 py-2 bg-slate-100 rounded">Deseleccionar todo</button>
            <button onClick={generatePrint} className="px-4 py-2 bg-indigo-600 text-white rounded">Generar etiquetas PDF</button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-600">Cargando activos...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No se encontraron activos para esta selección.</div>
        ) : (
          <div className="bg-white rounded shadow p-4">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="py-2">#</th>
                  <th className="py-2">Seleccionar</th>
                  <th className="py-2">Código</th>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Categoría</th>
                  <th className="py-2">Área</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const key = String(it.id ?? it._id ?? it.assetId ?? it.codigo ?? idx);
                  return (
                    <tr key={key} className="border-t">
                      <td className="py-2 text-sm text-gray-600">{idx + 1}</td>
                      <td className="py-2">
                        <input type="checkbox" checked={!!selected[key]} onChange={() => toggle(key)} />
                      </td>
                      <td className="py-2 font-mono text-sm">{formatAssetCode(String(it.assetId ?? it.codigo ?? it._id ?? it.id ?? ''))}</td>
                      <td className="py-2 text-sm">{String(it.nombre ?? '-')}</td>
                      <td className="py-2 text-sm">{String(it.categoria ?? '-')}</td>
                      <td className="py-2 text-sm">{String(it.area ?? '-')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EtiquetasPage;
