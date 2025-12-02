const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000';

export async function fetchPublicAsset(tokenOrAssetId: { token?: string; assetId?: string }){
  const params = new URLSearchParams();
  if (tokenOrAssetId.token) params.set('token', tokenOrAssetId.token);
  if (tokenOrAssetId.assetId) params.set('assetId', tokenOrAssetId.assetId);
  const url = `${API_BASE}/public/activos?${params.toString()}`;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Error fetching asset: ${res.status}`);
  return res.json();
}

export function submitPublicReport(formData: FormData, onProgress?: (p: number) => void){
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/public/activos/report`);
    xhr.withCredentials = false;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(json);
      } catch (e) {
        if (xhr.status >= 200 && xhr.status < 300) resolve({});
        else reject(new Error('Server error'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}
