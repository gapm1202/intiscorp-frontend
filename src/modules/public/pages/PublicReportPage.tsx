import React, { useEffect, useState, useRef } from 'react';
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
  const [reporterEmail, setReporterEmail] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [description, setDescription] = useState('');
  const [operational, setOperational] = useState<string>('Sí');
  const [anydesk, setAnydesk] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo'|'video'|null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment'|'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [streamInfo, setStreamInfo] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [reportStatus, setReportStatus] = useState<'none'|'enviado'|'en-progreso'|'finalizado'>('none');
  const [error, setError] = useState<string | null>(null);
  const CORP_COLOR = '#0ea5e9';

  useEffect(() => {
    const load = async () => {
      if (!token && !assetIdParam) return;
      setLoading(true); setError(null);
      try {
        const raw = await fetchPublicAsset({ token, assetId: assetIdParam });
        // response normalized below

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
        if (normUsers.length > 0) {
          setSelectedUser(normUsers[0].value ?? '');
          setReporterEmail(normUsers[0].email ?? '');
        }
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

  const handleDrop = (ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault(); ev.stopPropagation(); setDragActive(false); setError(null);
    const dt = ev.dataTransfer;
    const chosen = dt?.files ? Array.from(dt.files) : [];
    const invalid = chosen.find(f => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE);
    if (invalid) return setError('Archivo no permitido o demasiado grande (máx 10MB, jpg/png/mp4)');
    setFiles(prev => [...prev, ...chosen].slice(0, 10));
  };

  const handleDragOver = (ev: React.DragEvent<HTMLDivElement>) => { ev.preventDefault(); ev.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (ev: React.DragEvent<HTMLDivElement>) => { ev.preventDefault(); ev.stopPropagation(); setDragActive(false); };

  // Camera / recording helpers
  const openCamera = async (mode: 'photo'|'video', facing?: 'environment'|'user') => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Tu navegador no soporta acceso a la cámara');
      return;
    }
    try {
      const useFacing = facing ?? cameraFacing ?? 'environment';
      const baseConstraints: any = { video: { facingMode: useFacing } };
      if (mode === 'video') baseConstraints.audio = true;
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
      } catch (innerErr) {
        // fallback: try without facingMode (some desktops don't support 'environment')
        try {
          const fallback: any = { video: true };
          if (mode === 'video') fallback.audio = true;
          stream = await navigator.mediaDevices.getUserMedia(fallback);
        } catch (ferr) {
          throw innerErr || ferr;
        }
      }
      if (!stream) throw new Error('No se obtuvo flujo de cámara');
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          videoRef.current.muted = true;
          videoRef.current.playsInline = true as any;
          videoRef.current.setAttribute('autoplay','');
          await videoRef.current.play();
        } catch(playErr) {
          console.warn('No se pudo iniciar reproducción automática:', playErr);
        }
      }
      // gather some diagnostics
      try {
        const tracks = stream.getVideoTracks();
        const t0 = tracks[0];
        const settings = t0?.getSettings ? t0.getSettings() : undefined;
        setStreamInfo(JSON.stringify({ tracks: tracks.length, label: t0?.label ?? null, settings }, null, 2));
        console.debug('Camera stream info', { tracks: tracks.length, label: t0?.label, settings });
      } catch (dErr) {
        setStreamInfo(null);
      }
      setCameraMode(mode);
      setCameraFacing(useFacing);
      setIsCameraOpen(true);
    } catch (e: any) {
      console.error('getUserMedia error', e);
      setError(e?.message ?? 'No se pudo acceder a la cámara');
    }
  };

  const restartCameraWithFacing = async (facing: 'environment'|'user') => {
    // stop current stream then re-open with new facing
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    } catch (e) {}
    // reopen with same mode if present
    if (cameraMode) await openCamera(cameraMode, facing);
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
    setCameraMode(null);
    setIsRecording(false);
    try {
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
        mediaRecorderRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      recordedChunksRef.current = [];
    } catch (e) {
      // ignore
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current || !mediaStreamRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.9));
    if (!blob) return setError('No se pudo capturar la imagen');
    const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
    setFiles(prev => [...prev, file].slice(0, 10));
    setIsCameraOpen(false);
    // previews will be created by effect
    closeCamera();
  };

  const handleDataAvailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return setError('No hay cámara abierta');
    recordedChunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp8,opus' } as any;
    let mr: any;
    try {
      mr = new MediaRecorder(mediaStreamRef.current, options);
    } catch (e) {
      mr = new MediaRecorder(mediaStreamRef.current);
    }
    mediaRecorderRef.current = mr;
    mr.ondataavailable = handleDataAvailable;
    mr.start();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    return new Promise<void>((resolve) => {
      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: recordedChunksRef.current[0]?.type ?? 'video/webm' });
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `video_${Date.now()}.${ext}`, { type: blob.type });
        setFiles(prev => [...prev, file].slice(0, 10));
        setIsRecording(false);
        closeCamera();
        resolve();
      };
      try { mr.stop(); } catch (e) { resolve(); }
    });
  };

  const onSubmit = async (ev?: React.FormEvent) => {
    if (ev) ev.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!asset && !assetIdParam) {
      setError('Activo no especificado');
      return;
    }

    const errors: Record<string,string> = {};
    if (users.length > 0 && !selectedUser) errors.selectedUser = 'Selecciona el usuario que reporta';
    if (users.length === 0 && !reporterName) errors.reporterName = 'Escribe tu nombre para reportar';
    if (!reporterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) errors.reporterEmail = 'Introduce un correo válido';
    if (!description || !description.trim()) errors.description = 'Describe el problema';
    if (!anydesk || !anydesk.trim()) errors.anydesk = 'Indica el ID de Anydesk';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const fd = new FormData();
    if (token) fd.append('token', token);
    if (asset?.assetId) fd.append('assetId', asset.assetId);
    if (assetIdParam) fd.append('assetId', assetIdParam);
    if (selectedUser) fd.append('reporterUserId', selectedUser);
    else fd.append('reporterName', reporterName);
    if (reporterEmail) fd.append('reporterEmail', reporterEmail);
    fd.append('description', description);
    fd.append('operational', operational);
    fd.append('anydesk', anydesk);
    files.forEach((f,i) => fd.append('attachments', f, f.name));

    try {
      // set status to "enviado" immediately after successful validation
      setReportStatus('enviado');
      setSubmitting(true); setProgress(0);
      const res = await submitPublicReport(fd, (p) => {
        setProgress(p);
        if (p > 0) setReportStatus('en-progreso');
      });
      setResult(res);
      setReportStatus('finalizado');
    } catch (e: any) {
      setError(e?.message || 'Error enviando el ticket');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans">
      <div className="relative mb-6 flex items-start justify-between">
        <div className="min-w-0">
          {/* decorative bar directly behind the title with width matching the title */}
          <div className="relative inline-block">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-3 bg-[#0ea5e9] opacity-10 rounded-md z-0" />
            <h1 className="relative text-3xl font-extrabold mb-1 text-slate-900 tracking-tight z-10 inline-block" style={{fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}}>
              Reporte de Incidencia
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">Rellena el formulario para reportar una incidencia en el activo identificado.</p>
        </div>
        <img src="/logo.png" alt="logo" className="w-20 h-20 object-contain ml-6 flex-shrink-0 rounded" />
      </div>
      {loading ? <div>Cargando...</div> : error ? <div className="text-red-600">{error}</div> : null}

      {/* Status steps (Tailwind, lowered connector and animated fill) */}
      <div className="mb-6">
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-100">
          <div className="relative py-8">
            {/* background connector line (lowered) */}
            <div className="absolute left-8 right-8 top-1/2 translate-y-2 h-1 rounded bg-sky-100" />
            {/* animated fill */}
            {(() => {
              const steps = ['Enviado','En progreso','Finalizado'];
              const idx = reportStatus === 'enviado' ? 0 : reportStatus === 'en-progreso' ? 1 : reportStatus === 'finalizado' ? 2 : 0;
              const pct = Math.round((idx / Math.max(1, steps.length - 1)) * 100);
              return (
                <div className="absolute left-8 right-8 top-1/2 translate-y-2 h-1 rounded overflow-hidden">
                  <div className="h-1 bg-[#0ea5e9] transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              );
            })()}

            <div className="flex items-center justify-between relative">
              {(() => {
                const steps = ['Enviado','En progreso','Finalizado'];
                const idx = reportStatus === 'enviado' ? 0 : reportStatus === 'en-progreso' ? 1 : reportStatus === 'finalizado' ? 2 : -1;
                return steps.map((label, i) => {
                  const completed = i < idx;
                  const active = i === idx;
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center z-20">
                      <div className="relative w-full flex items-center justify-center -translate-y-8">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border ${completed ? 'bg-[#0ea5e9] border-[#0ea5e9]' : active ? 'bg-white border-[#cfeffc]' : 'bg-gray-50 border-gray-200'}`}>
                          {completed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.071 7.071a1 1 0 01-1.414 0L3.293 9.95a1 1 0 011.414-1.414L9 12.828l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                          ) : (
                            <span className={`${active ? 'text-[#0ea5e9]' : 'text-gray-500'} font-medium`}>{i + 1}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-gray-600 font-medium">{label}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {result ? (
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <h3 className="font-semibold">Reporte enviado</h3>
          <div>ID: <strong>{result.ticketId ?? result.id ?? '—'}</strong></div>
          <div className="mt-2 text-sm text-gray-600">Gracias. Si corresponde, el equipo asignado dará seguimiento.</div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-md border border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-sky-700">Formulario de Reporte</h2>
              </div>
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
              <div className="mt-1 flex flex-col md:flex-row md:items-center md:gap-4">
                <select value={selectedUser} onChange={e => {
                  const val = e.target.value;
                  setSelectedUser(val);
                  const found = users.find(u => u.value === val);
                  setReporterEmail(found?.email ?? '');
                }} className="flex-1 block w-full p-3 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9]">
                  <option value="">-- Seleccionar --</option>
                  {users.map(u => <option key={u.value} value={u.value}>{u.nombre}</option>)}
                </select>
                {fieldErrors.selectedUser && <div className="text-sm text-red-600 mt-1">{fieldErrors.selectedUser}</div>}
                <div className="md:w-1/2">
                    <input type="email" value={reporterEmail} onChange={e => { setReporterEmail(e.target.value); setFieldErrors(prev => { const c = {...prev}; delete c.reporterEmail; return c; }); }} placeholder="Correo electrónico" className="mt-3 md:mt-0 w-full p-3 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9]" />
                    {fieldErrors.reporterEmail && <div className="text-sm text-red-600 mt-1">{fieldErrors.reporterEmail}</div>}
                  </div>
              </div>
            ) : (
              <div className="mt-1 flex flex-col md:flex-row md:gap-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">No hay usuarios asignados al activo. Escribe tu nombre para reportar.</div>
                  <input value={reporterName} onChange={e => { setReporterName(e.target.value); setFieldErrors(prev => { const c = {...prev}; delete c.reporterName; return c; }); }} placeholder="Tu nombre" className="block w-full p-3 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9]" />
                  {fieldErrors.reporterName && <div className="text-sm text-red-600 mt-1">{fieldErrors.reporterName}</div>}
                </div>
                <input type="email" value={reporterEmail} onChange={e => setReporterEmail(e.target.value)} placeholder="Correo electrónico (opcional)" className="mt-3 md:mt-0 md:w-1/2 p-3 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9]" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Describe tu problema</label>
              <textarea value={description} onChange={e => { setDescription(e.target.value); setFieldErrors(prev => { const c = {...prev}; delete c.description; return c; }); }} rows={4} className="mt-1 block w-full p-3 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9]" />
              {fieldErrors.description && <div className="text-sm text-red-600 mt-1">{fieldErrors.description}</div>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Adjuntar imágenes o video (jpg/png/mp4, máx 10MB por archivo) o capturar desde tu cámara</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-1 relative flex flex-col items-center justify-center border-2 rounded-md p-6 cursor-pointer transition-colors bg-white ${dragActive ? 'border-sky-400 bg-sky-50' : 'border-dashed border-gray-200'}`}
            >
              <input id="file-upload" type="file" multiple accept=".jpg,.jpeg,.png,.mp4,image/*,video/mp4" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="flex flex-col items-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#06b6d4] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V8m0 0l5-5m-5 5l5 5M17 8v8" /></svg>
                <div className="text-sm text-slate-700 font-medium">Arrastra y suelta aquí o haz clic para subir</div>
                <div className="text-xs text-slate-400 mt-2">JPG, PNG, MP4 — hasta 10MB por archivo</div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => openCamera('photo')} className="px-3 py-2 bg-white border border-gray-200 rounded shadow-sm text-sm hover:bg-sky-50">📷 Tomar foto</button>
              <button type="button" onClick={() => openCamera('video')} className="px-3 py-2 bg-white border border-gray-200 rounded shadow-sm text-sm hover:bg-sky-50">🎥 Grabar video</button>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              {previews.map((p,i) => (
                <div key={i} className="w-28 h-28 border p-1 bg-gray-50 flex items-center justify-center rounded">
                  {files[i] && files[i].type.startsWith('image') ? <img src={p} className="max-w-full max-h-full rounded" alt="preview" /> : <video src={p} className="max-w-full max-h-full rounded" />}
                </div>
              ))}
            </div>

            {isCameraOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-lg overflow-hidden max-w-3xl w-full">
                        <div className="p-4 border-b flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">{cameraMode === 'photo' ? 'Tomar foto' : 'Grabar video'}</div>
                            <div className="text-sm text-slate-500">(Cámara: <strong className="text-slate-700">{cameraFacing === 'environment' ? 'Trasera' : 'Frontal'}</strong>)</div>
                            <div className="flex items-center gap-1 ml-3">
                              <button type="button" onClick={() => restartCameraWithFacing('environment')} className={`px-2 py-1 rounded text-sm ${cameraFacing==='environment' ? 'bg-sky-100' : 'bg-white border'}`}>Trasera</button>
                              <button type="button" onClick={() => restartCameraWithFacing('user')} className={`px-2 py-1 rounded text-sm ${cameraFacing==='user' ? 'bg-sky-100' : 'bg-white border'}`}>Frontal</button>
                            </div>
                          </div>
                          <button onClick={closeCamera} className="text-sm text-gray-600">Cerrar</button>
                        </div>
                  <div className="p-4 flex flex-col items-center">
                    <video ref={videoRef} className="w-full max-h-[60vh] bg-black" playsInline muted />
                    <div className="mt-3 flex items-center gap-3">
                      {cameraMode === 'photo' ? (
                        <button onClick={takePhoto} className="px-4 py-2 bg-[#0ea5e9] text-white rounded">Tomar foto</button>
                      ) : (
                        <>
                              {!isRecording ? (
                                <>
                                  <button onClick={startRecording} className="px-4 py-2 bg-red-600 text-white rounded">Iniciar grabación</button>
                                </>
                              ) : (
                                <button onClick={stopRecording} className="px-4 py-2 bg-gray-800 text-white rounded">Detener grabación</button>
                              )}
                          {isRecording && <div className="ml-2 text-sm text-red-500">● Grabando...</div>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
            <input value={anydesk} onChange={e => { setAnydesk(e.target.value); setFieldErrors(prev => { const c = {...prev}; delete c.anydesk; return c; }); }} className="mt-1 block w-full p-3 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9]" />
            {fieldErrors.anydesk && <div className="text-sm text-red-600 mt-1">{fieldErrors.anydesk}</div>}
          </div>

          {progress > 0 && submitting && (
            <div className="w-full bg-gray-100 rounded overflow-hidden">
              <div style={{ width: `${progress}%` }} className="bg-[#0ea5e9] text-white text-xs text-center">{progress}%</div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-red-600">{error}</div>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-linear-to-r from-cyan-500 to-sky-500 hover:scale-[0.995] transform text-white rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-transform" onClick={onSubmit}>{submitting ? 'Enviando...' : 'Enviar Ticket'}</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PublicReportPage;
