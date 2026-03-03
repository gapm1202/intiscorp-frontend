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
    setEditingCategoryId(null); setCategoryNameInput(''); setCategoryCodeInput(''); setCategoryGroupId(''); setNewCategoryFields([]); setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategoryId(cat.id ?? null);
    setCategoryNameInput(cat.nombre || '');
    setCategoryCodeInput(cat.codigo || generateCategoryCode(cat.nombre || ''));
    setCategoryGroupId((cat as any).grupoId || '');
    const mapped = normalizeCampos((cat as any).campos || []).map(f => ({ ...f, opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : (typeof f.opciones === 'string' ? f.opciones : '') }));
    setNewCategoryFields(mapped as any[]);
    setShowModal(true);
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = String(categoryNameInput || '').trim();
    if (!cat) { setErrorMessage('El nombre de la categoría es obligatorio'); setShowErrorToast(true); setTimeout(()=>setShowErrorToast(false),3000); return; }
    const cleanedCampos: CategoryField[] = (newCategoryFields || []).map((f) => {
      const rawOpts = (f as any).opciones || (f as any).options || (f as any).opcionesRaw || [];
      const opciones: string[] = Array.isArray(rawOpts)
        ? rawOpts.map((o: any) => (typeof o === 'string' ? o : String(o?.value ?? ''))).map((s: string) => s.trim()).filter(Boolean)
        : (typeof rawOpts === 'string' ? rawOpts.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      return { nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
    });
    setCategoryPreview({ nombre: cat, grupoId: categoryGroupId || undefined, campos: cleanedCampos, createdAt: new Date().toLocaleString(), subcategorias: subcategoriesInput.split(',').map(s=>s.trim()).filter(Boolean) });
    setShowPreview(true);
  };

  const handleSavePreview = async () => {
    try {
      if (editingCategoryId) {
        const finalCampos: CategoryField[] = (categoryPreview.campos || []).map((f: any) => ({ nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones: Array.isArray(f.opciones) ? f.opciones.map((o:any)=> String(o).trim()) : (typeof f.opciones === 'string' ? f.opciones.split(',').map((s:string)=>s.trim()) : []) }));
        const updated = await updateCategoria(editingCategoryId, { ...(categoryPreview.grupoId ? { grupoId: categoryPreview.grupoId } : {}), campos: finalCampos });
        setCategorias(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
        setSuccessMessage('Categoría actualizada exitosamente'); setShowSuccessToast(true); setTimeout(()=>setShowSuccessToast(false),3000);
      } else {
        const finalCampos: CategoryField[] = (categoryPreview.campos || []).filter((f:any)=>f.nombre && String(f.nombre).trim().length>0).map((f: any) => ({ nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones: Array.isArray(f.opciones) ? f.opciones.map((o:any)=> String(o).trim()) : (typeof f.opciones === 'string' ? f.opciones.split(',').map((s:string)=>s.trim()) : []) }));
        const payload: any = { nombre: categoryPreview.nombre.trim(), ...(categoryPreview.grupoId ? { grupoId: categoryPreview.grupoId } : {}), ...(finalCampos.length > 0 && { campos: finalCampos }) };
        const created = await createCategoria(payload);
        setCategorias(prev => [created, ...prev]);
        setSuccessMessage('Categoría creada exitosamente'); setShowSuccessToast(true); setTimeout(()=>setShowSuccessToast(false),3000);
      }
      setCategoryPreview(null); setShowPreview(false); setShowModal(false); setNewCategoryFields([]); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput('');
    } catch (err: any) {
      console.error('❌ Error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar la categoría';
      setErrorMessage(errorMsg); setShowErrorToast(true); setTimeout(()=>setShowErrorToast(false),4000);
    }
  };

  const tipoLabel: Record<string, string> = { text: 'Texto', number: 'Número', select: 'Selección', textarea: 'Texto largo' };
  const tipoColor: Record<string, string> = {
    text: 'bg-sky-50 text-sky-700 border-sky-200',
    number: 'bg-violet-50 text-violet-700 border-violet-200',
    select: 'bg-amber-50 text-amber-700 border-amber-200',
    textarea: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .ta-root { font-family: 'DM Sans', sans-serif; }
        .ta-root * { box-sizing: border-box; }

        /* Input base (improved contrast and emphasis) */
        .ta-input {
          width: 100%;
          padding: 0.55rem 0.85rem;
          border: 1.5px solid #b6e0f2;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: 'DM Sans', sans-serif;
          color: #06303a;
          font-weight: 500;
          background: #f7fbfe;
          transition: border-color 0.12s, box-shadow 0.12s, background 0.12s, transform 0.12s;
          outline: none;
        }
        .ta-input:focus {
          border-color: #0ea5e9;
          background: #ffffff;
          box-shadow: 0 6px 18px rgba(14,165,233,0.12);
          transform: translateY(-1px);
        }
        .ta-input::placeholder { color: #7faebb; opacity: 1; }
        .ta-input:read-only { background: #f1f8fb; cursor: not-allowed; color: #44636b; border-color: #cfeff8; }

        .ta-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2338b6e8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          padding-right: 2.5rem !important;
        }

        .ta-btn-primary {
          padding: 0.55rem 1.25rem;
          background: linear-gradient(135deg, #0ea5e9 0%, #38b6e8 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: opacity 0.18s, transform 0.12s, box-shadow 0.18s;
          box-shadow: 0 2px 8px rgba(14,165,233,0.25);
        }
        .ta-btn-primary:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(14,165,233,0.3); }
        .ta-btn-primary:active { transform: translateY(0); }

        .ta-btn-secondary {
          padding: 0.55rem 1.25rem;
          background: #fff;
          color: #0c7bb3;
          border: 1.5px solid #b6def0;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.18s, border-color 0.18s;
        }
        .ta-btn-secondary:hover { background: #f0f9ff; border-color: #38b6e8; }

        .ta-btn-ghost {
          padding: 0.45rem 0.9rem;
          background: transparent;
          color: #0b5f73;
          border: none;
          border-radius: 7px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.12s, color 0.12s, transform 0.12s;
        }
        .ta-btn-ghost:hover { background: #eaf8fb; color: #074a57; transform: translateY(-1px); }
        .ta-btn-ghost.danger:hover { background: #fff1f1; color: #e53e3e; }

        .ta-card {
          background: #fff;
          border: 1.5px solid #d8edf7;
          border-radius: 14px;
          overflow: hidden;
        }

        .ta-table th {
          padding: 0.85rem 1rem;
          text-align: left;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #0b4b59;
          background: #f7fcff;
          border-bottom: 1.5px solid #d7eef8;
        }
        .ta-table td {
          padding: 0.95rem 1rem;
          font-size: 0.95rem;
          color: #052a31;
          font-weight: 600;
          border-bottom: 1px solid #e8f6fb;
        }
        .ta-table tr:last-child td { border-bottom: none; }
        .ta-table tbody tr { transition: background 0.15s; }
        .ta-table tbody tr:hover td { background: #f0fbff; }

        .ta-badge {
          display: inline-flex; align-items: center;
          padding: 0.25rem 0.72rem;
          border-radius: 99px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          font-family: 'DM Mono', monospace;
          color: #053642;
        }
        .ta-badge-blue { background: #e6f6ff; color: #024e63; }
        .ta-badge-gray { background: #f7f8fa; color: #42545c; }

        .ta-modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          background: rgba(10, 30, 50, 0.55);
          backdrop-filter: blur(6px);
          padding: 1rem;
          overflow-y: auto;
        }
        .ta-modal {
          background: #fff;
          border-radius: 18px;
          width: 100%; max-width: 780px;
          margin: auto;
          box-shadow: 0 24px 80px rgba(14,80,130,0.18), 0 4px 20px rgba(0,0,0,0.08);
          border: 1.5px solid #cce9f5;
          overflow: hidden;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
        }
        .ta-modal-sm { max-width: 480px; }

        .ta-modal-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #0c7bb3 0%, #38b6e8 60%, #7dd3f7 100%);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .ta-modal-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 130px; height: 130px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }
        .ta-modal-header::after {
          content: '';
          position: absolute;
          bottom: -50px; left: -20px;
          width: 100px; height: 100px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }

        .ta-section-label {
          display: flex; align-items: center; gap: 0.6rem;
          margin-bottom: 1rem;
        }
        .ta-section-num {
          width: 22px; height: 22px;
          background: linear-gradient(135deg, #0ea5e9, #38b6e8);
          color: #fff;
          border-radius: 50%;
          font-size: 0.7rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ta-section-title {
          font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: #0c7bb3;
        }
        .ta-divider { border: none; border-top: 1.5px solid #e8f4fb; margin: 1.5rem 0; }

        .ta-fields-table th {
          padding: 0.6rem 0.85rem;
          font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: #6baac4;
          background: #f5fbff;
          border-bottom: 1.5px solid #d8edf7;
          text-align: left;
        }
        .ta-fields-table td {
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid #eaf4fb;
          vertical-align: middle;
        }
        .ta-fields-table tr:last-child td { border-bottom: none; }
        .ta-fields-table tr:hover td { background: #f8fcff; }

        .ta-toast {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.85rem 1.25rem;
          border-radius: 12px;
          font-size: 0.875rem; font-weight: 500;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          animation: slideUp 0.28s cubic-bezier(.22,.68,0,1.2);
        }
        @keyframes slideUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
        .ta-toast-success { background: #f0fdf4; color: #166534; border: 1.5px solid #bbf7d0; }
        .ta-toast-error { background: #fff5f5; color: #991b1b; border: 1.5px solid #fecaca; }

        .ta-checkbox-custom {
          width: 18px; height: 18px;
          accent-color: #0ea5e9;
          cursor: pointer;
        }

        .ta-empty {
          padding: 3.5rem 1rem;
          text-align: center;
          color: #8ab8cc;
        }
        .ta-empty-icon {
          width: 52px; height: 52px;
          background: #f0f9ff;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }

        .ta-tip {
          display: flex; align-items: flex-start; gap: 0.65rem;
          padding: 0.75rem 1rem;
          background: #f0f9ff;
          border: 1.5px solid #bae6fd;
          border-radius: 10px;
          font-size: 0.82rem; color: #0369a1;
        }

        .ta-preview-card {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1.5px solid #bae6fd;
          border-radius: 12px;
        }
        .ta-field-preview-card {
          padding: 0.85rem 1rem;
          background: #fff;
          border: 1.5px solid #d8edf7;
          border-radius: 10px;
          transition: box-shadow 0.15s;
        }
        .ta-field-preview-card:hover { box-shadow: 0 2px 12px rgba(14,165,233,0.1); }
      `}</style>

      <div className="ta-root" style={{ padding: '1.75rem', minHeight: '100vh', background: '#f5fbff' }}>
        <div style={{ maxWidth: '1050px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#0ea5e9,#38b6e8)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
                  <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0c2f4a', letterSpacing: '-0.01em', margin: 0 }}>Tipos de Activo</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#6baac4', margin: 0, paddingLeft: '0.25rem' }}>Administra las categorías y sus campos personalizados</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
              <button onClick={fetchCategorias} className="ta-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refrescar
              </button>
              <button onClick={openNew} className="ta-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Añadir tipo
              </button>
            </div>
          </div>

          {/* Table card */}
          <div className="ta-card">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6baac4' }}>
                <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #d8edf7', borderTopColor: '#38b6e8', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.875rem', margin: 0 }}>Cargando categorías...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <table className="ta-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Grupo</th>
                    <th style={{ width: '100px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map(c => (
                    <tr key={String(c.id ?? c.nombre)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#38b6e8)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, color: '#0c2f4a' }}>{c.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className="ta-badge ta-badge-blue">{c.codigo}</span>
                      </td>
                      <td>
                        {(c as any).grupoId
                          ? <span className="ta-badge ta-badge-gray">{(c as any).grupoId}</span>
                          : <span style={{ color: '#b0cdd9', fontSize: '0.8rem' }}>—</span>}
                      </td>
                      <td>
                        <button onClick={() => openEdit(c)} className="ta-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {categorias.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ border: 'none', padding: 0 }}>
                        <div className="ta-empty">
                          <div className="ta-empty-icon">
                            <svg width="22" height="22" fill="none" stroke="#7dd3f7" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          </div>
                          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#5fa8c8', marginBottom: '0.3rem' }}>Sin tipos registrados</p>
                          <p style={{ fontSize: '0.82rem', color: '#9cbfcf', margin: 0 }}>Pulsa "Añadir tipo" para comenzar</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ─── Add/Edit Category Modal ─── */}
      {showModal && (
        <div className="ta-modal-overlay">
          <div className="ta-modal">
            {/* Header */}
            <div className="ta-modal-header">
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.55rem', borderRadius: '10px', backdropFilter: 'blur(4px)' }}>
                    <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>{editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', margin: '0.2rem 0 0' }}>{editingCategoryId ? 'Actualiza subcategorías y campos personalizados.' : 'Define la categoría y sus campos para el formulario.'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowModal(false); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }} onMouseOver={e=>(e.currentTarget.style.background='rgba(255,255,255,0.25)')} onMouseOut={e=>(e.currentTarget.style.background='rgba(255,255,255,0.15)')}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.75rem 2rem' }}>
              <form onSubmit={handlePreview}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

                  {/* Tip */}
                  <div className="ta-tip" style={{ marginBottom: '1.5rem' }}>
                    <svg width="15" height="15" fill="none" stroke="#0ea5e9" viewBox="0 0 24 24" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span><strong style={{ fontWeight: 600 }}>Recomendación:</strong> usa un nombre claro y agrega marcas sólo si realmente ayudan al usuario a elegir mejor.</span>
                  </div>

                  {/* Section 1 */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div className="ta-section-label">
                      <span className="ta-section-num">1</span>
                      <span className="ta-section-title">Información básica</span>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#2b4a5e', marginBottom: '0.45rem' }}>Grupo de Activo</label>
                      <select value={categoryGroupId} onChange={(e) => setCategoryGroupId(e.target.value)} className="ta-input ta-select">
                        <option value="">— Seleccionar grupo —</option>
                        {groups.map(g => (<option key={g.id} value={g.id}>{g.nombre}</option>))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#2b4a5e', marginBottom: '0.45rem' }}>Nombre de categoría <span style={{ color: '#e53e3e' }}>*</span></label>
                        <input name="categoria" value={categoryNameInput} onChange={(e) => setCategoryNameInput(e.target.value)} className="ta-input" placeholder="ej: Laptop" readOnly={!!editingCategoryId} required />
                        {editingCategoryId && (<p style={{ fontSize: '0.75rem', color: '#8aacba', marginTop: '0.4rem' }}>El nombre no se edita para mantener consistencia.</p>)}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#2b4a5e', marginBottom: '0.45rem' }}>Código <span style={{ color: '#e53e3e' }}>*</span></label>
                        <input name="codigo" value={categoryCodeInput} onChange={(e) => setCategoryCodeInput(e.target.value)} className="ta-input" placeholder="ej: LAP-001" required style={{ fontFamily: "'DM Mono', monospace" }} />
                        <p style={{ fontSize: '0.75rem', color: '#8aacba', marginTop: '0.4rem' }}>Código único corto para la categoría.</p>
                      </div>
                    </div>
                  </div>

                  <hr className="ta-divider" />

                  {/* Section 2 - Marcas */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div className="ta-section-label">
                      <span className="ta-section-num">2</span>
                      <span className="ta-section-title">Marcas</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <input value={brandInput} onChange={(e) => setBrandInput(e.target.value)} className="ta-input" placeholder="Escribe una marca y pulsa Agregar" style={{ flex: 1 }} />
                      <button type="button" onClick={() => { const v = String(brandInput || '').trim(); if (v && !marcas.includes(v)) { setMarcas(prev => [...prev, v]); setBrandInput(''); } }} className="ta-btn-primary" style={{ flexShrink: 0 }}>Agregar</button>
                    </div>

                    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '32px' }}>
                      {marcas.length === 0
                        ? <span style={{ fontSize: '0.8rem', color: '#9cbfcf', fontStyle: 'italic', alignSelf: 'center' }}>No hay marcas agregadas</span>
                        : marcas.map((m, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.75rem', borderRadius: '99px', background: '#e0f2fe', border: '1.5px solid #bae6fd', color: '#0369a1', fontSize: '0.82rem', fontWeight: 500 }}>
                            {m}
                            <button type="button" onClick={() => setMarcas(prev => prev.filter(x => x !== m))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7dd3f7', padding: 0, display: 'flex', lineHeight: 1 }} onMouseOver={e=>(e.currentTarget.style.color='#e53e3e')} onMouseOut={e=>(e.currentTarget.style.color='#7dd3f7')}>✕</button>
                          </span>
                        ))}
                    </div>
                  </div>

                  <hr className="ta-divider" />

                  {/* Section 3 - Custom fields */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <div className="ta-section-label" style={{ marginBottom: 0 }}>
                        <span className="ta-section-num">3</span>
                        <div>
                          <span className="ta-section-title" style={{ display: 'block' }}>Campos personalizados</span>
                          <span style={{ fontSize: '0.75rem', color: '#8aacba', marginTop: '0.15rem', display: 'block' }}>Aparecerán al registrar un activo de este tipo.</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: '200px' }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#6baac4', marginBottom: '0.35rem' }}>Copiar campos desde categoría existente</label>
                          <select value={copyFromCategoryId} onChange={async (e) => {
                            const id = e.target.value; setCopyFromCategoryId(id); if (!id) return;
                            try { const cat = await getCategoriaById(id); const source = cat ?? (categorias || []).find(c => String(c.id ?? (c as any)._id ?? '') === String(id)); if (!source) return; const mapped = normalizeCampos((source as any).campos || []).map(f => ({ ...f, opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : (typeof f.opciones === 'string' ? f.opciones : '') })); setNewCategoryFields(mapped as any); } catch (err) { console.error('Error fetching category for copy:', err); }
                          }} className="ta-input ta-select">
                            <option value="">-- No copiar --</option>
                            {(categorias || []).map(c => (<option key={String(c.id ?? (c as any)._id ?? '')} value={String(c.id ?? (c as any)._id ?? '')}>{c.nombre}</option>))}
                          </select>
                        </div>
                        <button type="button" onClick={() => setNewCategoryFields([...newCategoryFields, { nombre: '', tipo: 'text', requerido: false, opcionesRaw: '' }])} className="ta-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          Agregar campo
                        </button>
                      </div>
                    </div>

                    <div style={{ border: '1.5px solid #d8edf7', borderRadius: '12px', overflow: 'hidden' }}>
                      <table className="ta-fields-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th style={{ textAlign: 'center', width: '60px' }}>Req.</th>
                            <th>Opciones</th>
                            <th style={{ width: '70px' }} />
                          </tr>
                        </thead>
                        <tbody>
                          {newCategoryFields.map((field, idx) => (
                            <tr key={idx}>
                              <td><input type="text" value={field.nombre} onChange={(e)=>{ const updated = [...newCategoryFields]; updated[idx] = { ...updated[idx], nombre: e.target.value }; setNewCategoryFields(updated); }} className="ta-input" placeholder="Ej: Procesador" /></td>
                              <td>
                                <select value={field.tipo} onChange={(e)=>{ const updated = [...newCategoryFields]; updated[idx] = { ...updated[idx], tipo: e.target.value as CategoryField['tipo'] }; if (e.target.value !== 'select') updated[idx].opciones = []; else (updated[idx] as any).opcionesRaw = ((updated[idx] as any).opciones || []).join(', '); setNewCategoryFields(updated); }} className="ta-input ta-select" style={{ minWidth: '120px' }}>
                                  <option value="text">Texto</option>
                                  <option value="number">Número</option>
                                  <option value="select">Selección</option>
                                  <option value="textarea">Texto largo</option>
                                </select>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={Boolean(field.requerido)} onChange={(e)=>{ const updated = [...newCategoryFields]; updated[idx] = { ...updated[idx], requerido: e.target.checked }; setNewCategoryFields(updated); }} className="ta-checkbox-custom" />
                              </td>
                              <td>
                                {field.tipo === 'select'
                                  ? <input type="text" value={((field as any).opcionesRaw ?? (field.opciones || []).join(', '))} onChange={(e)=>{ const updated = [...newCategoryFields]; updated[idx] = { ...updated[idx], opcionesRaw: e.target.value } as any; setNewCategoryFields(updated); }} onBlur={()=>{ const updated = [...newCategoryFields]; const raw = String((updated[idx] as any).opcionesRaw || ''); updated[idx] = { ...updated[idx], opciones: raw.split(',').map((s:string)=>s.trim()).filter(Boolean), opcionesRaw: raw } as any; setNewCategoryFields(updated); }} className="ta-input" placeholder="Ej: Intel, AMD" />
                                  : <span style={{ color: '#c8dde8', fontSize: '0.85rem' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button type="button" onClick={() => setNewCategoryFields(newCategoryFields.filter((_, i) => i !== idx))} className="ta-btn-ghost danger" style={{ padding: '0.3rem 0.5rem' }}>
                                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {newCategoryFields.length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9cbfcf', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                No hay campos personalizados. Pulsa "+ Agregar campo" para comenzar.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1.5px solid #eaf4fb' }}>
                    <button type="button" onClick={() => { setShowModal(false); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput(''); }} className="ta-btn-secondary">Cancelar</button>
                    <button type="submit" className="ta-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Previsualizar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview Modal ─── */}
      {showPreview && categoryPreview && (
        <div className="ta-modal-overlay" style={{ zIndex: 60 }}>
          <div className="ta-modal" style={{ maxWidth: '620px' }}>
            <div className="ta-modal-header">
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.55rem', borderRadius: '10px' }}>
                  <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>Vista previa</h3>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', margin: '0.2rem 0 0' }}>Revise la información antes de confirmar</p>
                </div>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="ta-preview-card">
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#0ea5e9', marginBottom: '0.3rem' }}>Nombre de categoría</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0c2f4a', margin: 0, letterSpacing: '-0.02em' }}>{categoryPreview.nombre}</p>
              </div>

              {categoryPreview.campos.length > 0 && (
                <div style={{ background: '#fff', border: '1.5px solid #d8edf7', borderRadius: '12px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6baac4', margin: 0 }}>Campos personalizados</p>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: '99px' }}>{categoryPreview.campos.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {categoryPreview.campos.map((campo: any, idx: number) => (
                      <div key={idx} className="ta-field-preview-card">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0c2f4a' }}>{campo.nombre}</span>
                          {campo.requerido && <span style={{ background: '#fff5f5', color: '#c53030', fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '6px', border: '1px solid #fed7d7', whiteSpace: 'nowrap', flexShrink: 0 }}>Req.</span>}
                        </div>
                        <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 500, padding: '0.15rem 0.6rem', borderRadius: '6px', border: '1.5px solid', textTransform: 'capitalize' }} className={tipoColor[campo.tipo] || 'bg-slate-50 text-slate-600 border-slate-200'}>{tipoLabel[campo.tipo] || campo.tipo}</span>
                        {campo.opciones && campo.opciones.length > 0 && (
                          <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid #eaf4fb' }}>
                            <p style={{ fontSize: '0.7rem', color: '#8aacba', marginBottom: '0.4rem' }}>Opciones:</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {campo.opciones.map((opt: any, oidx: number) => <span key={oidx} style={{ padding: '0.15rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', color: '#2b4a5e', background: '#f5fbff', border: '1.5px solid #d8edf7', fontFamily: "'DM Mono', monospace" }}>{typeof opt === 'string' ? opt : opt.value}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#f5fbff', borderTop: '1.5px solid #d8edf7', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button onClick={() => { setCategoryPreview(null); setShowPreview(false); }} className="ta-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Volver
              </button>
              <button onClick={handleSavePreview} className="ta-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Confirmar y guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Group Modal ─── */}
      {showGroupModal && (
        <div className="ta-modal-overlay">
          <div className="ta-modal ta-modal-sm">
            <div className="ta-modal-header">
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>{editingGroupId ? 'Editar Grupo' : 'Crear Grupo'}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', margin: '0.2rem 0 0' }}>Define un grupo que agrupará tipos de activo relacionados.</p>
                </div>
                <button type="button" onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div style={{ padding: '1.75rem 2rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#2b4a5e', marginBottom: '0.45rem' }}>Nombre del Grupo <span style={{ color: '#e53e3e' }}>*</span></label>
                  <input value={groupNameInput} onChange={e => { const val = e.target.value; setGroupNameInput(val); const generated = generateGroupCode(val); setGroupCodeInput(generated); }} className="ta-input" placeholder="Ej: Equipos de Computo" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#2b4a5e', marginBottom: '0.45rem' }}>Código (generado automáticamente)</label>
                  <input value={groupCodeInput} readOnly className="ta-input" placeholder="Se generará automáticamente" style={{ fontFamily: "'DM Mono', monospace" }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#2b4a5e', marginBottom: '0.45rem' }}>Descripción</label>
                  <textarea value={groupDescriptionInput} onChange={e => setGroupDescriptionInput(e.target.value)} className="ta-input" placeholder="Descripción del grupo (opcional)" rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem', color: '#2b4a5e', fontWeight: 500 }}>
                    <input type="checkbox" checked={groupActiveInput} onChange={e => setGroupActiveInput(e.target.checked)} className="ta-checkbox-custom" />
                    Activo
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1.5px solid #eaf4fb' }}>
                  <button onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }} className="ta-btn-secondary">Cancelar</button>
                  <button onClick={async () => {
                    const name = String(groupNameInput || '').trim();
                    if (!name) { setErrorMessage('El nombre del grupo es obligatorio'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false),3000); return; }
                    const descripcion = String(groupDescriptionInput || '').trim();
                    const activo = Boolean(groupActiveInput);
                    const payload: any = { nombre: name, descripcion, activo };
                    if (String(groupCodeInput || '').trim() !== '') payload.codigo = String(groupCodeInput || '').trim();
                    try {
                      if (editingGroupId) { await axiosClient.put(`/api/gestion-grupos-categorias/${editingGroupId}`, payload); setSuccessMessage('Grupo actualizado'); setShowSuccessToast(true); setTimeout(()=>setShowSuccessToast(false),3000); }
                      else { await axiosClient.post('/api/gestion-grupos-categorias', payload); setSuccessMessage('Grupo creado'); setShowSuccessToast(true); setTimeout(()=>setShowSuccessToast(false),3000); }
                      await fetchGroups(); setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true);
                    } catch (err: any) {
                      const status = err?.response?.status; const serverMsg = err?.response?.data?.message || err?.response?.data || err?.message || 'Error';
                      if (status === 409) setErrorMessage(typeof serverMsg === 'string' ? serverMsg : 'El código ya existe');
                      else if (status === 400) setErrorMessage(typeof serverMsg === 'string' ? serverMsg : 'Datos inválidos');
                      else setErrorMessage('Error al guardar grupo'); setShowErrorToast(true); setTimeout(()=>setShowErrorToast(false),5000);
                    }
                  }} className="ta-btn-primary">{editingGroupId ? 'Actualizar' : 'Crear'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toasts ─── */}
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