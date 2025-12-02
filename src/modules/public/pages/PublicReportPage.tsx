import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPublicAsset, submitPublicReport } from '@/modules/public/services/publicService';

type AssignedUser = { id?: string; nombre: string; email?: string; cargo?: string; value: string };

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg','image/png','video/mp4'];

const PublicReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? undefined;
  const assetIdParam = searchParams.get('assetId') ?? undefined;

  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('');
  const [description, setDescription] = useState('');
  const [operational, setOperational] = useState<string>('Sí');
  const [anydesk, setAnydesk] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token && !assetIdParam) return;
      setLoading(true); setError(null);
      try {
        const raw = await fetchPublicAsset({ token, assetId: assetIdParam });
        console.log('Public asset raw response:', raw);

        // Normalize common wrapper shapes
        const payload = (raw && typeof raw === 'object' && ('data' in raw) && raw.data) ? raw.data : raw;

        // Helper to read possible fields
        const read = (obj: any, ...keys: string[]) => {
          for (const k of keys) {
            if (!obj) continue;
            if (k in obj && typeof obj[k] !== 'undefined' && obj[k] !== null) return obj[k];
          }
          return undefined;
        };

        const normalized: any = {};
        normalized.assetId = read(payload, 'assetId', 'asset_id', 'assetCode', 'codigo', 'code') || assetIdParam;
        normalized.assetCode = normalized.assetId;

        // Empresa may be object or string or fields like empresaNombre
        const empresaObj = read(payload, 'empresa', 'empresaData') ?? undefined;
        if (empresaObj) {
          if (typeof empresaObj === 'string') normalized.empresa = { id: undefined, nombre: empresaObj };
          else normalized.empresa = { id: read(empresaObj, 'id', '_id') ?? read(payload, 'empresaId', 'empresa_id'), nombre: read(empresaObj, 'nombre', 'name') ?? empresaObj };
        } else {
          const empresaNombre = read(payload, 'empresaNombre', 'empresa_name', 'empresa');
          if (empresaNombre && typeof empresaNombre === 'string') normalized.empresa = { id: undefined, nombre: empresaNombre };
        }

        // Sede similar
        const sedeObj = read(payload, 'sede') ?? undefined;
        if (sedeObj) {
          if (typeof sedeObj === 'string') normalized.sede = { id: undefined, nombre: sedeObj };
          else normalized.sede = { id: read(sedeObj, 'id', '_id') ?? read(payload, 'sedeId', 'sede_id'), nombre: read(sedeObj, 'nombre', 'name') ?? sedeObj };
        } else {
          const sedeNombre = read(payload, 'sedeNombre', 'sede_name', 'sede');
          if (sedeNombre && typeof sedeNombre === 'string') normalized.sede = { id: undefined, nombre: sedeNombre };
        }

        // Users assigned: try many possible keys
        let usersRaw = read(payload, 'usuariosAsignados', 'usuarios', 'assignedUsers', 'users', 'usuarios_asignados', 'usuariosAsignadosList');
        // If backend returned a JSON string or comma-separated list, normalize to array
        if (typeof usersRaw === 'string') {
          try {
            const parsed = JSON.parse(usersRaw);
            if (Array.isArray(parsed)) usersRaw = parsed;
            else if (typeof parsed === 'object' && parsed !== null) usersRaw = [parsed];
          } catch (e) {
            // not JSON, try comma-separated
            usersRaw = usersRaw.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        const usuariosArray = Array.isArray(usersRaw) ? usersRaw : [];
        const normUsers: AssignedUser[] = usuariosArray.map((u: any) => {
          // If the item is a primitive (string/number) treat as nombre only
          if (typeof u === 'string' || typeof u === 'number') {
            const nombre = String(u);
            return { id: undefined, nombre, value: nombre };
          }
          const idRaw = u?.id ?? u?._id ?? u?.userId ?? u?.usuarioId ?? u?.usuario ?? u?.username ?? null;
          const email = u?.email ?? u?.correo ?? u?.user_email ?? null;
          const nombre = u?.nombre ?? u?.name ?? u?.fullName ?? u?.displayName ?? email ?? idRaw ?? '';
          const cargo = u?.cargo ?? u?.role ?? u?.puesto ?? null;
          const id = idRaw ? String(idRaw) : undefined;
          const value = id ?? (email ? String(email) : String(nombre ?? ''));
          return { id, nombre: String(nombre ?? ''), email: email ? String(email) : undefined, cargo: cargo ? String(cargo) : undefined, value };
        });

        setAsset(normalized);
        setUsers(normUsers);
        if (normUsers.length > 0) setSelectedUser(normUsers[0].value ?? '');
      } catch (e: any) {
        console.error('Error loading public asset:', e);
        setError(e?.message ?? 'No se pudo cargar la información del activo');
      } finally { setLoading(false); }
    };
    load();
  }, [token, assetIdParam]);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  const onFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const chosen = ev.target.files ? Array.from(ev.target.files) : [];
    const invalid = chosen.find(f => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE);
    if (invalid) return setError('Archivo no permitido o demasiado grande (máx 10MB, jpg/png/mp4)');
    setFiles(chosen.slice(0, 10));
  };

  const onSubmit = async (ev?: React.FormEvent) => {
    if (ev) ev.preventDefault();
    setError(null);
    if (!asset && !assetIdParam) return setError('Activo no especificado');
    if (users.length > 0 && !selectedUser) return setError('Selecciona el usuario que reporta');
    if (users.length === 0 && !reporterName) return setError('Escribe tu nombre para reportar');

    const fd = new FormData();
    if (token) fd.append('token', token);
    if (asset?.assetId) fd.append('assetId', asset.assetId);
    if (assetIdParam) fd.append('assetId', assetIdParam);
    if (selectedUser) fd.append('reporterUserId', selectedUser);
    else fd.append('reporterName', reporterName);
    fd.append('description', description);
    fd.append('operational', operational);
    fd.append('anydesk', anydesk);
    files.forEach((f,i) => fd.append('attachments', f, f.name));

    try {
      setSubmitting(true); setProgress(0);
      const res = await submitPublicReport(fd, (p) => setProgress(p));
      setResult(res);
    } catch (e: any) {
      setError(e?.message || 'Error enviando el ticket');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reporte Público de Incidencia</h1>
      {loading ? <div>Cargando...</div> : error ? <div className="text-red-600">{error}</div> : null}

      {result ? (
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <h3 className="font-semibold">Reporte enviado</h3>
          <div>ID: <strong>{result.ticketId ?? result.id ?? '—'}</strong></div>
          <div className="mt-2 text-sm text-gray-600">Gracias. Si corresponde, el equipo asignado dará seguimiento.</div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 bg-white p-4 rounded shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700">Empresa</label>
            <div className="mt-1 text-sm text-gray-900">{asset?.empresa?.nombre ?? asset?.empresaNombre ?? asset?.empresa ?? '-'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Sede</label>
            <div className="mt-1 text-sm text-gray-900">{asset?.sede?.nombre ?? asset?.sedeNombre ?? asset?.sede ?? '-'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Código del activo</label>
            <div className="mt-1 text-sm text-gray-900 font-mono">{asset?.assetCode ?? asset?.assetId ?? asset?.codigo ?? assetIdParam ?? '-'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Usuario que reporta</label>
            {users.length > 0 ? (
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="mt-1 block w-full p-2 border rounded">
                <option value="">-- Seleccionar --</option>
                {users.map(u => <option key={u.value} value={u.value}>{u.nombre}</option>)}
              </select>
            ) : (
              <div className="mt-1">
                <div className="text-sm text-gray-600 mb-2">No hay usuarios asignados al activo. Escribe tu nombre para reportar.</div>
                <input value={reporterName} onChange={e => setReporterName(e.target.value)} placeholder="Tu nombre" className="block w-full p-2 border rounded" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Describe tu problema</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Adjuntar imágenes o video (jpg/png/mp4, máx 10MB por archivo)</label>
            <input type="file" multiple accept=".jpg,.jpeg,.png,.mp4,image/*,video/mp4" onChange={onFileChange} className="mt-1" />
            <div className="flex gap-2 mt-2 flex-wrap">
              {previews.map((p,i) => (
                <div key={i} className="w-24 h-24 border p-1 bg-gray-50 flex items-center justify-center">
                  {files[i].type.startsWith('image') ? <img src={p} className="max-w-full max-h-full" alt="preview" /> : <div className="text-xs">Video</div>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">¿Tu PC está operativa?</label>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center"><input type="radio" name="op" checked={operational==='Sí'} onChange={() => setOperational('Sí')} className="mr-2"/>Sí</label>
              <label className="flex items-center"><input type="radio" name="op" checked={operational==='No'} onChange={() => setOperational('No')} className="mr-2"/>No</label>
              <label className="flex items-center"><input type="radio" name="op" checked={operational==='A veces'} onChange={() => setOperational('A veces')} className="mr-2"/>A veces</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Anydesk</label>
            <input value={anydesk} onChange={e => setAnydesk(e.target.value)} className="mt-1 block w-full p-2 border rounded" />
          </div>

          {progress > 0 && submitting && (
            <div className="w-full bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${progress}%` }} className="bg-indigo-600 text-white text-xs text-center">{progress}%</div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-red-600">{error}</div>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={onSubmit}>{submitting ? 'Enviando...' : 'Enviar Ticket'}</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PublicReportPage;
