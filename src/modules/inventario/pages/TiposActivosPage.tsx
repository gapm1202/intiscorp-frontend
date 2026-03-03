import { useEffect, useState } from 'react';
import { getCategorias, createCategoria, updateCategoria, getCategoriaById } from '@/modules/inventario/services/categoriasService';
import axiosClient from '@/api/axiosClient';
import type { Category, CategoryField } from '@/modules/inventario/services/categoriasService';

const generateGroupCode = (rawName: string): string => {
  if (!rawName) return '';
  const withoutAccents = rawName.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const cleaned = withoutAccents.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const stopWords = new Set(['de','del','la','las','los','el','y','e','en','para','por','con','a','al']);
  const words = cleaned.split(/\s+/).map(w => w.toLowerCase()).filter(Boolean).filter(w => !stopWords.has(w));
  if (words.length === 0) return '';
  const take = (s: string, n: number) => s.substring(0, Math.min(n, s.length)).toUpperCase();
  let part1 = take(words[0], 4);
  let part2 = '';
  if (words.length >= 2) part2 = take(words[1], 5);
  else {
    const single = words[0];
    if (single.length <= 4) part1 = take(single, 4);
    else { part1 = take(single, 4); part2 = take(single.substring(4), 5); }
  }
  return part2 ? `${part1}-${part2}` : part1;
};

const generateCategoryCode = (rawName: string): string => {
  if (!rawName) return '';
  const withoutAccents = rawName.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const cleaned = withoutAccents.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).map(w => w.trim()).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0].toUpperCase();
  let second = '';
  if (words.length >= 2) second = words[1].substring(0, Math.min(4, words[1].length)).toUpperCase();
  return second ? `${first}-${second}` : first;
};

const normalizeCampos = (campos: any[] = []): CategoryField[] => {
  return (campos || []).map((f: any) => {
    const opcionesRaw = f.opciones || f.options || [];
    const opciones: string[] = Array.isArray(opcionesRaw)
      ? opcionesRaw.map((o: any) => (typeof o === 'string' ? o : String(o?.value ?? ''))).map((s: string) => s.trim()).filter(Boolean)
      : (typeof opcionesRaw === 'string' ? opcionesRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    return { nombre: String(f.nombre || f.name || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
  });
};

const TiposActivosPage = () => {
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryCodeInput, setCategoryCodeInput] = useState('');
  const [categoryGroupId, setCategoryGroupId] = useState('');
  const [groups, setGroups] = useState<Array<{ id: string; nombre: string }>>([]);
  const [brandInput, setBrandInput] = useState('');
  const [marcas, setMarcas] = useState<string[]>([]);
  const [subcategoriesInput, setSubcategoriesInput] = useState('');
  const [newCategoryFields, setNewCategoryFields] = useState<CategoryField[] & any[]>([]);
  const [copyFromCategoryId, setCopyFromCategoryId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [categoryPreview, setCategoryPreview] = useState<any>(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [groupDescriptionInput, setGroupDescriptionInput] = useState('');
  const [groupActiveInput, setGroupActiveInput] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchCategorias = async () => {
    setLoading(true);
    try { const data = await getCategorias(); setCategorias(Array.isArray(data) ? data : []); }
    catch (err) { console.error('Error fetching categorias', err); setCategorias([]); }
    finally { setLoading(false); }
  };

  const fetchGroups = async () => {
    try {
      const res = await axiosClient.get('/api/gestion-grupos-categorias');
      let data: any = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.data)) data = data.data;
        else if (Array.isArray(data.results)) data = data.results;
      }
      if (!Array.isArray(data)) data = [];
      setGroups(data.map((g: any) => ({ id: String(g.id ?? g._id ?? ''), nombre: g.nombre })));
    } catch (err) { setGroups([]); }
  };

  useEffect(() => { fetchCategorias(); fetchGroups(); }, []);

  const openNew = () => {
    setEditingCategoryId(null); setCategoryNameInput(''); setCategoryCodeInput('');
    setCategoryGroupId(''); setNewCategoryFields([]); setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategoryId(cat.id ?? null);
    setCategoryNameInput(cat.nombre || '');
    setCategoryCodeInput(cat.codigo || generateCategoryCode(cat.nombre || ''));
    setCategoryGroupId((cat as any).grupoId || (cat as any).grupo_id || '');
    const mapped = normalizeCampos((cat as any).campos || []).map(f => ({
      ...f,
      opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : (typeof f.opciones === 'string' ? f.opciones : '')
    }));
    setNewCategoryFields(mapped as any[]);
    setShowModal(true);
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = String(categoryNameInput || '').trim();
    if (!cat) { setErrorMessage('El nombre de la categoría es obligatorio'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
    const cleanedCampos: CategoryField[] = (newCategoryFields || []).map((f) => {
      const rawOpts = (f as any).opciones || (f as any).options || (f as any).opcionesRaw || [];
      const opciones: string[] = Array.isArray(rawOpts)
        ? rawOpts.map((o: any) => (typeof o === 'string' ? o : String(o?.value ?? ''))).map((s: string) => s.trim()).filter(Boolean)
        : (typeof rawOpts === 'string' ? rawOpts.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      return { nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
    });
    setCategoryPreview({
      nombre: cat, grupoId: categoryGroupId || undefined, campos: cleanedCampos,
      createdAt: new Date().toLocaleString(),
      subcategorias: subcategoriesInput.split(',').map(s => s.trim()).filter(Boolean)
    });
    setShowPreview(true);
  };

  const handleSavePreview = async () => {
    try {
      if (editingCategoryId) {
        const finalCampos: CategoryField[] = (categoryPreview.campos || []).map((f: any) => ({ nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones: Array.isArray(f.opciones) ? f.opciones.map((o: any) => String(o).trim()) : (typeof f.opciones === 'string' ? f.opciones.split(',').map((s: string) => s.trim()) : []) }));
        const updated = await updateCategoria(editingCategoryId, { ...(categoryPreview.grupoId ? { grupo_id: categoryPreview.grupoId } : {}), campos: finalCampos });
        setCategorias(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
        setSuccessMessage('Categoría actualizada exitosamente'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        const finalCampos: CategoryField[] = (categoryPreview.campos || []).filter((f: any) => f.nombre && String(f.nombre).trim().length > 0).map((f: any) => ({ nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones: Array.isArray(f.opciones) ? f.opciones.map((o: any) => String(o).trim()) : (typeof f.opciones === 'string' ? f.opciones.split(',').map((s: string) => s.trim()) : []) }));
        const payload: any = { nombre: categoryPreview.nombre.trim(), ...(categoryPreview.grupoId ? { grupo_id: categoryPreview.grupoId } : {}), ...(finalCampos.length > 0 && { campos: finalCampos }) };
        const created = await createCategoria(payload);
        setCategorias(prev => [created, ...prev]);
        setSuccessMessage('Categoría creada exitosamente'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
      }
      setCategoryPreview(null); setShowPreview(false); setShowModal(false);
      setNewCategoryFields([]); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput('');
    } catch (err: any) {
      console.error('Error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar la categoría';
      setErrorMessage(errorMsg); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 4000);
    }
  };

  const tipoLabel: Record<string, string> = { text: 'Texto', number: 'Número', select: 'Selección', textarea: 'Texto largo' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .ta-root { font-family: 'DM Sans', sans-serif; }
        .ta-root * { box-sizing: border-box; }
        @keyframes ta-spin { to { transform: rotate(360deg); } }
        @keyframes ta-modalIn { from { opacity:0; transform:scale(0.94) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes ta-slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

        .ta-input {
          width: 100%; padding: .62rem .9rem;
          border: 1.5px solid #cce2fa; border-radius: 8px;
          font-size: .9rem; font-family: 'DM Sans', sans-serif;
          color: #0d2d5e; font-weight: 500; background: #f4f8fe;
          transition: border-color .15s, box-shadow .15s, background .15s; outline: none;
        }
        .ta-input:focus { border-color: #1458b8; background: #fff; box-shadow: 0 0 0 3px rgba(20,88,184,.12); }
        .ta-input::placeholder { color: #a0bdda; }
        .ta-input[readonly] { background: #f4f8fe; color: #5a7fa8; cursor: default; border-color: #d8eaf8; }
        .ta-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%231458b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right .75rem center; padding-right: 2.5rem !important;
        }

        .ta-btn-primary {
          display: inline-flex; align-items: center; gap: .45rem;
          padding: .62rem 1.25rem; background: #1458b8; color: #fff;
          border: none; border-radius: 8px; font-weight: 600; font-size: .875rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .18s, box-shadow .18s, transform .1s;
          box-shadow: 0 2px 8px rgba(20,88,184,.25);
        }
        .ta-btn-primary:hover { background: #0d45a0; box-shadow: 0 4px 16px rgba(20,88,184,.35); transform: translateY(-1px); }
        .ta-btn-primary:active { transform: translateY(0); }

        .ta-btn-secondary {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .62rem 1.1rem; background: #fff; color: #1458b8;
          border: 1.5px solid #b8d4f8; border-radius: 8px; font-weight: 600; font-size: .875rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .15s, border-color .15s, transform .1s;
        }
        .ta-btn-secondary:hover { background: #eef5ff; border-color: #1458b8; transform: translateY(-1px); }

        .ta-btn-ghost {
          display: inline-flex; align-items: center; gap: .35rem;
          padding: .35rem .75rem; background: #eef5ff; color: #1458b8;
          border: 1px solid #b8d4f8; border-radius: 6px;
          font-size: .8rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .12s, border-color .12s;
        }
        .ta-btn-ghost:hover { background: #ddeeff; border-color: #1458b8; }
        .ta-btn-ghost.danger:hover { background: #fff1f1; color: #c53030; border-color: #fca5a5; }

        .ta-card { background: #fff; border: 1px solid #d4e5f9; border-radius: 14px; box-shadow: 0 2px 20px rgba(13,45,94,.06); overflow: hidden; }

        .ta-table { width: 100%; border-collapse: collapse; }
        .ta-table thead { background: #f0f6ff; border-bottom: 2px solid #cce2fa; }
        .ta-table th { padding: .85rem 1.25rem; text-align: left; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: #3572b0; }
        .ta-table td { padding: .9rem 1.25rem; color: #1a2f55; font-weight: 500; border-bottom: 1px solid #e8f1fb; vertical-align: middle; }
        .ta-table tbody tr:last-child td { border-bottom: none; }
        .ta-table tbody tr { transition: background .15s; }
        .ta-table tbody tr:hover td { background: #f5f9ff; }

        .ta-badge { font-family: 'DM Mono', monospace; font-size: .78rem; font-weight: 500; padding: .25rem .6rem; border-radius: 5px; display: inline-block; letter-spacing: .05em; }
        .ta-badge-blue { background: #e8f1fb; color: #1458b8; }
        .ta-badge-gray { background: #eef5ff; color: #3572b0; }

        .ta-modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          background: rgba(10,30,70,.45); backdrop-filter: blur(3px);
          padding: 1rem; overflow-y: auto;
        }
        .ta-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 790px; margin: auto;
          box-shadow: 0 20px 60px rgba(13,45,94,.22); border: 1px solid #d4e5f9;
          overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;
          animation: ta-modalIn .22s cubic-bezier(.34,1.5,.64,1);
        }
        .ta-modal-sm { max-width: 500px; }

        .ta-modal-header {
          background: linear-gradient(135deg, #0d2d5e 0%, #1458b8 100%);
          padding: 1.4rem 1.75rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .ta-modal-header-icon { background: rgba(255,255,255,.15); padding: .55rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .ta-modal-title { font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0; letter-spacing: -.01em; }
        .ta-modal-sub { font-size: .78rem; color: rgba(255,255,255,.7); margin: .2rem 0 0; }
        .ta-modal-close {
          background: rgba(255,255,255,.12); border: none; color: #fff;
          width: 32px; height: 32px; border-radius: 8px; font-size: 1rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background .15s; flex-shrink: 0;
        }
        .ta-modal-close:hover { background: rgba(255,255,255,.22); }
        .ta-modal-body { overflow-y: auto; flex: 1; padding: 1.75rem 2rem; }
        .ta-modal-footer {
          background: #f8fbff; border-top: 1px solid #e8f1fb;
          padding: 1rem 1.75rem; display: flex; justify-content: space-between; align-items: center; gap: .75rem; flex-shrink: 0;
        }

        .ta-form-label { display: block; font-size: .78rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #3572b0; margin-bottom: .45rem; }
        .ta-form-hint { font-size: .73rem; color: #7da0c4; margin-top: .3rem; }
        .ta-form-group { margin-bottom: 1.1rem; }
        .ta-divider { border: none; border-top: 1.5px solid #e8f1fb; margin: 1.4rem 0; }

        .ta-section-label { display: flex; align-items: center; gap: .6rem; margin-bottom: 1rem; }
        .ta-section-num { width: 22px; height: 22px; background: #1458b8; color: #fff; border-radius: 50%; font-size: .68rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ta-section-title { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #1458b8; }

        .ta-tip {
          display: flex; align-items: flex-start; gap: .65rem;
          padding: .75rem 1rem; background: #eef5ff; border: 1.5px solid #b8d4f8; border-radius: 10px;
          font-size: .82rem; color: #1458b8; margin-bottom: 1.5rem;
        }

        .ta-fields-wrap { border: 1.5px solid #d4e5f9; border-radius: 12px; overflow: hidden; }
        .ta-fields-table { width: 100%; border-collapse: collapse; }
        .ta-fields-table th { padding: .65rem .9rem; text-align: left; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #3572b0; background: #f0f6ff; border-bottom: 1.5px solid #d4e5f9; }
        .ta-fields-table td { padding: .6rem .75rem; border-bottom: 1px solid #e8f1fb; vertical-align: middle; }
        .ta-fields-table tr:last-child td { border-bottom: none; }
        .ta-fields-table tbody tr { transition: background .12s; }
        .ta-fields-table tbody tr:hover td { background: #f5f9ff; }

        .ta-preview-hero { padding: 1.25rem 1.5rem; background: linear-gradient(135deg,#eef5ff 0%,#ddeeff 100%); border: 1.5px solid #b8d4f8; border-radius: 12px; margin-bottom: 1.25rem; }
        .ta-field-card { padding: .9rem 1rem; background: #fff; border: 1.5px solid #d4e5f9; border-radius: 10px; transition: box-shadow .15s; }
        .ta-field-card:hover { box-shadow: 0 2px 12px rgba(20,88,184,.1); }

        .ta-toast {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
          display: flex; align-items: center; gap: .75rem;
          padding: .85rem 1.25rem; border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-size: .875rem; font-weight: 500;
          box-shadow: 0 8px 30px rgba(0,0,0,.12);
          animation: ta-slideUp .28s cubic-bezier(.22,.68,0,1.2);
        }
        .ta-toast-success { background: #f0fdf4; color: #166534; border: 1.5px solid #bbf7d0; }
        .ta-toast-error { background: #fff5f5; color: #991b1b; border: 1.5px solid #fecaca; }

        .ta-empty { padding: 4rem 2rem; text-align: center; }
        .ta-empty-icon { width: 52px; height: 52px; background: #eef5ff; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
      `}</style>

      <div className="ta-root" style={{ padding: '2.5rem 2rem', minHeight: '100vh', background: '#f0f6ff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* PAGE HEADER */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '.7rem', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: '#38a3d1', marginBottom: '.3rem' }}>
                Gestión de Activos
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0d2d5e', letterSpacing: '-.03em', margin: 0, lineHeight: 1.1 }}>
                Tipos de Activo
                {!loading && (
                  <span style={{ fontSize: '.75rem', fontWeight: 700, background: '#ddeeff', color: '#1458b8', borderRadius: '20px', padding: '.15rem .6rem', marginLeft: '.5rem', verticalAlign: 'middle' }}>
                    {categorias.length}
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '.85rem', color: '#5a7fa8', margin: '.35rem 0 0', fontWeight: 400 }}>
                Administra las categorías y sus campos personalizados
              </p>
            </div>
            <div style={{ display: 'flex', gap: '.6rem', flexShrink: 0 }}>
              <button onClick={fetchCategorias} className="ta-btn-secondary">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Actualizar
              </button>
              <button onClick={openNew} className="ta-btn-primary">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Añadir tipo
              </button>
            </div>
          </div>

          {/* TABLE CARD */}
          <div className="ta-card">
            {loading ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#7da0c4' }}>
                <div style={{ display: 'inline-block', width: '22px', height: '22px', border: '2.5px solid #b8d4f8', borderTopColor: '#1458b8', borderRadius: '50%', animation: 'ta-spin .7s linear infinite', marginRight: '.6rem', verticalAlign: 'middle' }} />
                <span style={{ fontWeight: 500, fontSize: '.875rem' }}>Cargando categorías...</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Código</th>
                      <th>Grupo</th>
                      <th style={{ width: '110px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map(c => (
                      <tr key={String(c.id ?? c.nombre)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1458b8', flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, color: '#0d2d5e', fontSize: '.9rem' }}>{c.nombre}</span>
                          </div>
                        </td>
                        <td><span className="ta-badge ta-badge-blue">{c.codigo}</span></td>
                        <td>
                          {(c as any).grupoId
                            ? <span className="ta-badge ta-badge-gray">{(c as any).grupoId}</span>
                            : <span style={{ color: '#b0c8e0' }}>—</span>}
                        </td>
                        <td>
                          <button onClick={() => openEdit(c)} className="ta-btn-ghost">
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {categorias.length === 0 && (
                      <tr><td colSpan={4} style={{ border: 'none', padding: 0 }}>
                        <div className="ta-empty">
                          <div className="ta-empty-icon">
                            <svg width="22" height="22" fill="none" stroke="#7da0c4" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          </div>
                          <p style={{ fontSize: '.95rem', fontWeight: 600, color: '#5a7fa8', marginBottom: '.25rem' }}>Sin tipos registrados</p>
                          <p style={{ fontSize: '.82rem', color: '#9bbcd4', margin: 0 }}>Pulsa "Añadir tipo" para comenzar</p>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="ta-modal-overlay">
          <div className="ta-modal">
            <div className="ta-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                <div className="ta-modal-header-icon">
                  <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <p className="ta-modal-title">{editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}</p>
                  <p className="ta-modal-sub">{editingCategoryId ? 'Actualiza subcategorías y campos personalizados.' : 'Define la categoría y sus campos para el formulario.'}</p>
                </div>
              </div>
              <button type="button" className="ta-modal-close" onClick={() => { setShowModal(false); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput(''); }}>✕</button>
            </div>

            <div className="ta-modal-body">
              <form onSubmit={handlePreview}>
                <div className="ta-tip">
                  <svg width="15" height="15" fill="none" stroke="#1458b8" viewBox="0 0 24 24" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span><strong style={{ fontWeight: 700 }}>Recomendación:</strong> usa un nombre claro y agrega marcas sólo si ayudan al usuario a elegir mejor.</span>
                </div>

                {/* Section 1 */}
                <div className="ta-section-label">
                  <span className="ta-section-num">1</span>
                  <span className="ta-section-title">Información básica</span>
                </div>

                <div className="ta-form-group">
                  <label className="ta-form-label">Grupo de Activo</label>
                  <select value={categoryGroupId} onChange={(e) => setCategoryGroupId(e.target.value)} className="ta-input ta-select">
                    <option value="">— Seleccionar grupo —</option>
                    {groups.map(g => (<option key={g.id} value={g.id}>{g.nombre}</option>))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
                  <div>
                    <label className="ta-form-label">Nombre de categoría <span style={{ color: '#e53e3e' }}>*</span></label>
                    <input name="categoria" value={categoryNameInput} onChange={(e) => setCategoryNameInput(e.target.value)} className="ta-input" placeholder="ej: Laptop" readOnly={!!editingCategoryId} required />
                    {editingCategoryId && <p className="ta-form-hint">El nombre no se edita para mantener consistencia.</p>}
                  </div>
                  <div>
                    <label className="ta-form-label">Código <span style={{ color: '#e53e3e' }}>*</span></label>
                    <input name="codigo" value={categoryCodeInput} onChange={(e) => setCategoryCodeInput(e.target.value)} className="ta-input" placeholder="ej: LAP-001" required style={{ fontFamily: "'DM Mono', monospace" }} />
                    <p className="ta-form-hint">Código único corto para la categoría.</p>
                  </div>
                </div>

                <hr className="ta-divider" />

                {/* Section 2 - Marcas */}
                <div className="ta-section-label">
                  <span className="ta-section-num">2</span>
                  <span className="ta-section-title">Marcas</span>
                </div>

                <div style={{ display: 'flex', gap: '.6rem', marginBottom: '.75rem' }}>
                  <input value={brandInput} onChange={(e) => setBrandInput(e.target.value)} className="ta-input" placeholder="Escribe una marca y pulsa Agregar" style={{ flex: 1 }} />
                  <button type="button" onClick={() => { const v = String(brandInput || '').trim(); if (v && !marcas.includes(v)) { setMarcas(p => [...p, v]); setBrandInput(''); } }} className="ta-btn-primary" style={{ flexShrink: 0 }}>
                    Agregar
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', minHeight: '32px', marginBottom: '.5rem' }}>
                  {marcas.length === 0
                    ? <span style={{ fontSize: '.8rem', color: '#9bbcd4', fontStyle: 'italic', alignSelf: 'center' }}>No hay marcas agregadas</span>
                    : marcas.map((m, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem', padding: '.25rem .75rem', borderRadius: '99px', background: '#ddeeff', border: '1.5px solid #b8d4f8', color: '#1458b8', fontSize: '.82rem', fontWeight: 500 }}>
                        {m}
                        <button type="button" onClick={() => setMarcas(p => p.filter(x => x !== m))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7da0c4', padding: 0, display: 'flex', fontSize: '.85rem' }} onMouseOver={e => (e.currentTarget.style.color = '#e53e3e')} onMouseOut={e => (e.currentTarget.style.color = '#7da0c4')}>✕</button>
                      </span>
                    ))}
                </div>

                <hr className="ta-divider" />

                {/* Section 3 - Campos */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div className="ta-section-label" style={{ marginBottom: 0 }}>
                    <span className="ta-section-num">3</span>
                    <div>
                      <span className="ta-section-title" style={{ display: 'block' }}>Campos personalizados</span>
                      <span style={{ fontSize: '.73rem', color: '#7da0c4', marginTop: '.1rem', display: 'block' }}>Aparecerán al registrar un activo de este tipo.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.75rem', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '210px' }}>
                      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.05em', color: '#7da0c4', marginBottom: '.35rem' }}>Copiar desde categoría</label>
                      <select value={copyFromCategoryId} onChange={async (e) => {
                        const id = e.target.value; setCopyFromCategoryId(id); if (!id) return;
                        try {
                          const cat = await getCategoriaById(id);
                          const source = cat ?? (categorias || []).find(c => String(c.id ?? (c as any)._id ?? '') === String(id));
                          if (!source) return;
                          const mapped = normalizeCampos((source as any).campos || []).map(f => ({ ...f, opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : (typeof f.opciones === 'string' ? f.opciones : '') }));
                          setNewCategoryFields(mapped as any);
                        } catch (err) { console.error('Error:', err); }
                      }} className="ta-input ta-select">
                        <option value="">-- No copiar --</option>
                        {(categorias || []).map(c => (<option key={String(c.id ?? (c as any)._id ?? '')} value={String(c.id ?? (c as any)._id ?? '')}>{c.nombre}</option>))}
                      </select>
                    </div>
                    <button type="button" onClick={() => setNewCategoryFields([...newCategoryFields, { nombre: '', tipo: 'text', requerido: false, opcionesRaw: '' }])} className="ta-btn-secondary" style={{ whiteSpace: 'nowrap' as const }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Agregar campo
                    </button>
                  </div>
                </div>

                <div className="ta-fields-wrap">
                  <table className="ta-fields-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th style={{ textAlign: 'center', width: '60px' }}>Req.</th>
                        <th>Opciones</th>
                        <th style={{ width: '60px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {newCategoryFields.map((field, idx) => (
                        <tr key={idx}>
                          <td><input type="text" value={field.nombre} onChange={(e) => { const u = [...newCategoryFields]; u[idx] = { ...u[idx], nombre: e.target.value }; setNewCategoryFields(u); }} className="ta-input" placeholder="Ej: Procesador" /></td>
                          <td>
                            <select value={field.tipo} onChange={(e) => { const u = [...newCategoryFields]; u[idx] = { ...u[idx], tipo: e.target.value as CategoryField['tipo'] }; if (e.target.value !== 'select') u[idx].opciones = []; else (u[idx] as any).opcionesRaw = ((u[idx] as any).opciones || []).join(', '); setNewCategoryFields(u); }} className="ta-input ta-select" style={{ minWidth: '120px' }}>
                              <option value="text">Texto</option>
                              <option value="number">Número</option>
                              <option value="select">Selección</option>
                              <option value="textarea">Texto largo</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={Boolean(field.requerido)} onChange={(e) => { const u = [...newCategoryFields]; u[idx] = { ...u[idx], requerido: e.target.checked }; setNewCategoryFields(u); }} style={{ width: '16px', height: '16px', accentColor: '#1458b8', cursor: 'pointer' }} />
                          </td>
                          <td>
                            {field.tipo === 'select'
                              ? <input type="text" value={((field as any).opcionesRaw ?? (field.opciones || []).join(', '))} onChange={(e) => { const u = [...newCategoryFields]; u[idx] = { ...u[idx], opcionesRaw: e.target.value } as any; setNewCategoryFields(u); }} onBlur={() => { const u = [...newCategoryFields]; const raw = String((u[idx] as any).opcionesRaw || ''); u[idx] = { ...u[idx], opciones: raw.split(',').map((s: string) => s.trim()).filter(Boolean), opcionesRaw: raw } as any; setNewCategoryFields(u); }} className="ta-input" placeholder="Ej: Intel, AMD" />
                              : <span style={{ color: '#b0c8e0' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button type="button" onClick={() => setNewCategoryFields(newCategoryFields.filter((_, i) => i !== idx))} className="ta-btn-ghost danger" style={{ padding: '.3rem .5rem' }}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {newCategoryFields.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9bbcd4', fontSize: '.85rem', fontStyle: 'italic' }}>No hay campos. Pulsa "+ Agregar campo" para comenzar.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1.5px solid #e8f1fb' }}>
                  <button type="button" onClick={() => { setShowModal(false); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput(''); }} className="ta-btn-secondary">Cancelar</button>
                  <button type="submit" className="ta-btn-primary">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Previsualizar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && categoryPreview && (
        <div className="ta-modal-overlay" style={{ zIndex: 60 }}>
          <div className="ta-modal" style={{ maxWidth: '640px' }}>
            <div className="ta-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                <div className="ta-modal-header-icon">
                  <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <p className="ta-modal-title">Vista previa</p>
                  <p className="ta-modal-sub">Revisa la información antes de confirmar</p>
                </div>
              </div>
            </div>

            <div className="ta-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="ta-preview-hero">
                <p style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#1458b8', marginBottom: '.3rem' }}>Nombre de categoría</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0d2d5e', margin: 0, letterSpacing: '-.02em' }}>{categoryPreview.nombre}</p>
              </div>

              {categoryPreview.campos.length > 0 && (
                <div style={{ background: '#fff', border: '1.5px solid #d4e5f9', borderRadius: '12px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#3572b0', margin: 0 }}>Campos personalizados</p>
                    <span style={{ background: '#ddeeff', color: '#1458b8', fontSize: '.72rem', fontWeight: 700, padding: '.15rem .6rem', borderRadius: '99px' }}>{categoryPreview.campos.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '.75rem' }}>
                    {categoryPreview.campos.map((campo: any, idx: number) => (
                      <div key={idx} className="ta-field-card">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem', marginBottom: '.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '.875rem', color: '#0d2d5e' }}>{campo.nombre}</span>
                          {campo.requerido && <span style={{ background: '#fff5f5', color: '#c53030', fontSize: '.68rem', fontWeight: 700, padding: '.15rem .5rem', borderRadius: '6px', border: '1px solid #fecaca', whiteSpace: 'nowrap', flexShrink: 0 }}>Req.</span>}
                        </div>
                        <span style={{ display: 'inline-block', fontSize: '.72rem', fontWeight: 600, padding: '.2rem .6rem', borderRadius: '6px', background: '#eef5ff', color: '#1458b8', border: '1.5px solid #b8d4f8' }}>{tipoLabel[campo.tipo] || campo.tipo}</span>
                        {campo.opciones && campo.opciones.length > 0 && (
                          <div style={{ marginTop: '.6rem', paddingTop: '.6rem', borderTop: '1px solid #e8f1fb' }}>
                            <p style={{ fontSize: '.7rem', color: '#7da0c4', marginBottom: '.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Opciones:</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                              {campo.opciones.map((opt: any, oidx: number) => (
                                <span key={oidx} style={{ padding: '.15rem .55rem', borderRadius: '6px', fontSize: '.72rem', color: '#0d2d5e', background: '#f0f6ff', border: '1.5px solid #d4e5f9', fontFamily: "'DM Mono', monospace" }}>{typeof opt === 'string' ? opt : opt.value}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="ta-modal-footer">
              <button onClick={() => { setCategoryPreview(null); setShowPreview(false); }} className="ta-btn-secondary">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Volver
              </button>
              <button onClick={handleSavePreview} className="ta-btn-primary">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Confirmar y guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GROUP MODAL */}
      {showGroupModal && (
        <div className="ta-modal-overlay">
          <div className="ta-modal ta-modal-sm">
            <div className="ta-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                <div className="ta-modal-header-icon">
                  <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <p className="ta-modal-title">{editingGroupId ? 'Editar Grupo' : 'Crear Grupo'}</p>
                  <p className="ta-modal-sub">Define un grupo para agrupar tipos de activo relacionados.</p>
                </div>
              </div>
              <button type="button" className="ta-modal-close" onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }}>✕</button>
            </div>

            <div className="ta-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="ta-form-group">
                  <label className="ta-form-label">Nombre del Grupo <span style={{ color: '#e53e3e' }}>*</span></label>
                  <input value={groupNameInput} onChange={e => { const v = e.target.value; setGroupNameInput(v); setGroupCodeInput(generateGroupCode(v)); }} className="ta-input" placeholder="Ej: Equipos de Computo" />
                </div>
                <div className="ta-form-group">
                  <label className="ta-form-label">Código</label>
                  <input value={groupCodeInput} readOnly className="ta-input" placeholder="Se generará automáticamente" style={{ fontFamily: "'DM Mono', monospace" }} />
                  <p className="ta-form-hint">Generado automáticamente a partir del nombre.</p>
                </div>
                <div className="ta-form-group">
                  <label className="ta-form-label">Descripción</label>
                  <textarea value={groupDescriptionInput} onChange={e => setGroupDescriptionInput(e.target.value)} className="ta-input" placeholder="Descripción del grupo (opcional)" rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.85rem 1rem', background: '#f4f8fe', border: '1.5px solid #cce2fa', borderRadius: '8px' }}>
                  <input type="checkbox" id="grp-activo" checked={groupActiveInput} onChange={e => setGroupActiveInput(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1458b8', cursor: 'pointer' }} />
                  <label htmlFor="grp-activo" style={{ fontSize: '.875rem', fontWeight: 600, color: '#0d2d5e', cursor: 'pointer' }}>Grupo activo</label>
                </div>
              </div>
            </div>

            <div className="ta-modal-footer">
              <button onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }} className="ta-btn-secondary">Cancelar</button>
              <button onClick={async () => {
                const name = String(groupNameInput || '').trim();
                if (!name) { setErrorMessage('El nombre del grupo es obligatorio'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
                const descripcion = String(groupDescriptionInput || '').trim();
                const activo = Boolean(groupActiveInput);
                const payload: any = { nombre: name, descripcion, activo };
                if (String(groupCodeInput || '').trim() !== '') payload.codigo = String(groupCodeInput || '').trim();
                try {
                  if (editingGroupId) {
                    await axiosClient.put(`/api/gestion-grupos-categorias/${editingGroupId}`, payload);
                    setSuccessMessage('Grupo actualizado'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
                  } else {
                    await axiosClient.post('/api/gestion-grupos-categorias', payload);
                    setSuccessMessage('Grupo creado'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
                  }
                  await fetchGroups(); setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true);
                } catch (err: any) {
                  const status = err?.response?.status;
                  const serverMsg = err?.response?.data?.message || err?.response?.data || err?.message || 'Error';
                  if (status === 409) setErrorMessage(typeof serverMsg === 'string' ? serverMsg : 'El código ya existe');
                  else if (status === 400) setErrorMessage(typeof serverMsg === 'string' ? serverMsg : 'Datos inválidos');
                  else setErrorMessage('Error al guardar grupo');
                  setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 5000);
                }
              }} className="ta-btn-primary">{editingGroupId ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      {showSuccessToast && (
        <div className="ta-toast ta-toast-success">
          <svg width="16" height="16" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {successMessage}
        </div>
      )}
      {showErrorToast && (
        <div className="ta-toast ta-toast-error">
          <svg width="16" height="16" fill="none" stroke="#dc2626" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          {errorMessage}
        </div>
      )}
    </>
  );
};

export default TiposActivosPage;