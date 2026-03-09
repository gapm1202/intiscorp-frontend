import React, { useEffect, useState } from 'react';
import ComponentsModal from '@/modules/inventario/components/ComponentsModal';
import { useLocation, useNavigate } from 'react-router-dom';
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
    if (Array.isArray(opcionesRaw) && opcionesRaw.length > 0 && typeof opcionesRaw[0] === 'object') {
      const opcionesDetalladas = opcionesRaw.map((o: any) => ({
        value: String(o.value ?? o.nombre ?? o.name ?? '').trim(),
        opcionesRaw: Array.isArray(o.opciones) ? o.opciones.join(', ') : (typeof o.opciones === 'string' ? o.opciones : ''),
        subcampos: Array.isArray(o.subcampos || o.subfields || o.children) ? (o.subcampos || o.subfields || o.children).map((s: any) => ({ nombre: String(s.nombre || s.name || '').trim(), tipo: s.tipo || 'text', requerido: Boolean(s.requerido), opciones: Array.isArray(s.opciones) ? s.opciones.map((x:any)=>String(x).trim()) : (typeof s.opciones === 'string' ? s.opciones.split(',').map((x:string)=>x.trim()).filter(Boolean) : []) })) : []
      }));
      return { nombre: String(f.nombre || f.name || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), dependiente: true, opciones: opcionesDetalladas } as any;
    }
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

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showComponentsModal, setShowComponentsModal] = useState(false);
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

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if ((location as any)?.state?.autoOpenNew) {
        const gid = String((location as any).state.groupId || '');
        setCategoryGroupId(gid);
        setShowModal(true);
        navigate(location.pathname, { replace: true, state: {} });
      }
    } catch (e) {}
  }, []);

  const openNew = () => {
    setEditingCategoryId(null); setCategoryNameInput(''); setCategoryCodeInput('');
    setCategoryGroupId(''); setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategoryId(cat.id ?? null);
    setCategoryNameInput(cat.nombre || '');
    setCategoryCodeInput(cat.codigo || generateCategoryCode(cat.nombre || ''));
    setCategoryGroupId((cat as any).grupoId || (cat as any).grupo_id || '');
    setShowModal(true);
  };

  const handleSaveBasic = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    try {
      const cat = String(categoryNameInput || '').trim();
      if (!cat) { setErrorMessage('El nombre de la categoría es obligatorio'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
      if (!categoryGroupId) { setErrorMessage('Selecciona un Grupo de Activo'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false), 3000); return; }
      if (editingCategoryId) {
        const updatePayload: any = { nombre: cat, ...(categoryGroupId ? { grupo_id: categoryGroupId } : {}) };
        const updated = await updateCategoria(editingCategoryId, updatePayload);
        setCategorias(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
        setSuccessMessage('Categoría actualizada exitosamente'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        const payload: any = { nombre: cat, ...(categoryGroupId ? { grupo_id: categoryGroupId } : {}) };
        const created = await createCategoria(payload);
        setCategorias(prev => [created, ...prev]);
        setSuccessMessage('Categoría creada exitosamente'); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
        try {
          if ((location as any)?.state?.autoOpenNew) {
            const catId = String(created.id ?? created._id ?? created);
            navigate('/admin/grupos-activos/marcas', { state: { autoOpenNewMarca: true, categoriaId: catId } });
          }
        } catch (e) {}
      }
      setShowModal(false); setEditingCategoryId(null); setCategoryNameInput(''); setCategoryCodeInput(''); setCategoryGroupId('');
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');

        .ta-root { font-family: 'DM Sans', sans-serif; }
        .ta-root * { box-sizing: border-box; }

        @keyframes ta-spin { to { transform: rotate(360deg); } }
        @keyframes ta-modalIn { from { opacity:0; transform:scale(0.97) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes ta-slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ta-fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes ta-rowIn { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }

        /* ── INPUTS ── */
        .ta-input {
          width: 100%;
          padding: .72rem 1rem;
          border: 1.5px solid #c8ddf5;
          border-radius: 9px;
          font-size: .925rem;
          font-family: 'DM Sans', sans-serif;
          color: #0d2d5e;
          font-weight: 600;
          background: #ffffff;
          transition: border-color .15s, box-shadow .15s;
          outline: none;
          line-height: 1.4;
        }
        .ta-input:focus { border-color: #1458b8; box-shadow: 0 0 0 3px rgba(20,88,184,.12); }
        .ta-input::placeholder { color: #a8c0d8; font-weight: 400; }
        .ta-input[readonly], .ta-input:disabled {
          background: #f5f8fc; color: #8aaac8;
          cursor: default; border-color: #dce9f5; font-weight: 500;
        }
        .ta-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7' viewBox='0 0 11 7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%231458b8' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right .85rem center;
          padding-right: 2.6rem !important;
        }
        .ta-select:not([disabled]) { background-color: #ffffff; }

        /* ── BUTTONS ── */
        .ta-btn-primary {
          display: inline-flex; align-items: center; gap: .45rem;
          padding: .62rem 1.25rem;
          background: #1458b8; color: #fff;
          border: none; border-radius: 8px;
          font-weight: 700; font-size: .845rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .18s, box-shadow .18s, transform .1s;
          box-shadow: 0 1px 8px rgba(20,88,184,.28);
          letter-spacing: .01em;
          white-space: nowrap;
        }
        .ta-btn-primary:hover { background: #0d45a0; box-shadow: 0 4px 14px rgba(20,88,184,.36); transform: translateY(-1px); }
        .ta-btn-primary:active { transform: translateY(0); }

        .ta-btn-secondary {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .62rem 1.1rem;
          background: #fff; color: #1458b8;
          border: 1.5px solid #c8ddf5; border-radius: 8px;
          font-weight: 600; font-size: .845rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .15s, border-color .15s, transform .1s;
          white-space: nowrap;
        }
        .ta-btn-secondary:hover { background: #eef5ff; border-color: #1458b8; transform: translateY(-1px); }

        .ta-btn-outline-sm {
          display: inline-flex; align-items: center; gap: .35rem;
          padding: .38rem .85rem;
          background: transparent; color: #3a6199;
          border: 1.5px solid #c8ddf5; border-radius: 7px;
          font-size: .79rem; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all .15s;
          white-space: nowrap;
        }
        .ta-btn-outline-sm:hover { background: #eef5ff; border-color: #94bef0; color: #1458b8; }

        .ta-btn-edit {
          display: inline-flex; align-items: center; gap: .35rem;
          padding: .35rem .75rem;
          background: #f0f6ff; color: #1050a8;
          border: 1.5px solid #c8ddf5; border-radius: 7px;
          font-size: .78rem; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all .15s;
        }
        .ta-btn-edit:hover { background: #ddeeff; border-color: #94bef0; }

        /* ── LAYOUT ── */
        .ta-page {
          padding: 2.5rem 2.5rem 3rem;
          min-height: 100vh;
          background: #f0f5fb;
        }
        .ta-page-inner { max-width: 1100px; margin: 0 auto; }

        /* ── PAGE HEADER ── */
        .ta-page-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.75rem; gap: 1rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #dae6f5;
        }
        .ta-page-header-left { display: flex; align-items: center; gap: 1rem; }
        .ta-page-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #0a2550 0%, #1458b8 100%);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 12px rgba(20,88,184,.28);
        }
        .ta-page-title {
          font-size: 1.45rem; font-weight: 800;
          color: #0a2550; margin: 0; letter-spacing: -.025em; line-height: 1.15;
        }
        .ta-page-subtitle {
          font-size: .82rem; color: #6a91b8; margin: .2rem 0 0; font-weight: 400;
        }
        .ta-count-pill {
          display: inline-flex; align-items: center;
          background: #e0ecff; color: #1050a8;
          border: 1px solid #c0d9f8;
          border-radius: 20px; padding: .15rem .6rem;
          font-size: .72rem; font-weight: 700;
          margin-left: .5rem; vertical-align: middle;
          letter-spacing: .02em;
        }

        /* ── HEADER ACTIONS ── */
        .ta-page-actions {
          display: flex; align-items: center; gap: .6rem;
        }
        .ta-action-divider {
          width: 1px; height: 24px;
          background: #d4e5f5;
          margin: 0 .1rem;
          flex-shrink: 0;
        }

        /* ── TOOLBAR (secondary row) ── */
        .ta-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.1rem; gap: 1rem;
        }
        .ta-toolbar-left { display: flex; align-items: center; gap: .5rem; }
        .ta-toolbar-label {
          font-size: .7rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: .12em;
          color: #7da0c4;
        }

        /* ── CARD ── */
        .ta-card {
          background: #fff;
          border: 1px solid #d4e5f9;
          border-radius: 14px;
          box-shadow: 0 1px 18px rgba(13,45,94,.06);
          overflow: hidden;
        }

        /* ── TABLE ── */
        .ta-table { width: 100%; border-collapse: collapse; }
        .ta-table thead {
          background: #f7fafd;
          border-bottom: 1.5px solid #dce9f5;
        }
        .ta-table th {
          padding: .85rem 1.5rem;
          text-align: left;
          font-size: .67rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: .14em;
          color: #5a87ba;
        }
        .ta-table td {
          padding: 1rem 1.5rem;
          color: #1a2f55; font-weight: 500;
          border-bottom: 1px solid #eef4fb;
          vertical-align: middle;
        }
        .ta-table tbody tr:last-child td { border-bottom: none; }
        .ta-table tbody tr {
          transition: background .1s;
          animation: ta-rowIn .22s ease both;
        }
        .ta-table tbody tr:hover td { background: #f5f9ff; }

        /* ── STATUS DOT ── */
        .ta-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #3b82f6;
          flex-shrink: 0;
          box-shadow: 0 0 0 2.5px rgba(59,130,246,.18);
        }

        /* ── BADGES ── */
        .ta-badge {
          font-family: 'DM Mono', monospace;
          font-size: .74rem; font-weight: 500;
          padding: .22rem .65rem;
          border-radius: 6px;
          display: inline-block;
          letter-spacing: .04em;
        }
        .ta-badge-blue { background: #e4effc; color: #1050a8; border: 1px solid #c5daf5; }
        .ta-badge-gray { background: #edf2fa; color: #3a6199; border: 1px solid #cdd9eb; }

        /* ── MODAL ── */
        .ta-modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          background: rgba(6,18,46,.52);
          backdrop-filter: blur(5px);
          padding: 1.25rem;
          overflow-y: auto;
          animation: ta-fadeIn .15s ease;
        }
        .ta-modal {
          background: #fff;
          border-radius: 16px;
          width: 100%; max-width: 780px; margin: auto;
          box-shadow: 0 20px 70px rgba(13,45,94,.22);
          border: 1px solid #c8ddf5;
          overflow: hidden;
          max-height: 94vh;
          display: flex; flex-direction: column;
          animation: ta-modalIn .22s cubic-bezier(.34,1.4,.64,1);
        }
        .ta-modal-sm { max-width: 500px; }

        .ta-modal-header {
          background: linear-gradient(135deg, #0a2550 0%, #1458b8 100%);
          padding: 1.35rem 1.75rem;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .ta-modal-header-icon {
          background: rgba(255,255,255,.15);
          padding: .55rem; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .ta-modal-title { font-size: 1.05rem; font-weight: 800; color: #fff; margin: 0; letter-spacing: -.02em; }
        .ta-modal-sub { font-size: .77rem; color: rgba(255,255,255,.6); margin: .18rem 0 0; }
        .ta-modal-close {
          background: rgba(255,255,255,.13); border: none; color: #fff;
          width: 32px; height: 32px; border-radius: 8px; font-size: .9rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background .15s; flex-shrink: 0;
        }
        .ta-modal-close:hover { background: rgba(255,255,255,.24); }

        .ta-modal-body { overflow-y: auto; flex: 1; padding: 1.75rem 2rem; }
        .ta-modal-footer {
          background: #f5f9ff;
          border-top: 1px solid #e4effc;
          padding: 1rem 1.75rem;
          display: flex; justify-content: flex-end; align-items: center; gap: .65rem;
          flex-shrink: 0;
        }

        /* ── FORM ── */
        .ta-form-label {
          display: block;
          font-size: .7rem; font-weight: 800;
          letter-spacing: .07em; text-transform: uppercase;
          color: #2e6db4; margin-bottom: .45rem;
        }
        .ta-form-hint { font-size: .72rem; color: #7da0c4; margin-top: .3rem; font-weight: 400; }
        .ta-form-group { margin-bottom: 1.3rem; }

        .ta-section-wrap {
          display: flex; align-items: center; gap: .65rem;
          margin-bottom: 1.15rem;
        }
        .ta-section-num {
          width: 24px; height: 24px;
          background: linear-gradient(135deg, #1458b8, #2575d0);
          color: #fff; border-radius: 50%;
          font-size: .67rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(20,88,184,.32);
        }
        .ta-section-title {
          font-size: .72rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: .1em;
          color: #1458b8;
        }
        .ta-section-subtitle {
          font-size: .71rem; color: #7da0c4;
          margin-top: .08rem; font-weight: 400;
        }

        .ta-tip {
          display: flex; align-items: flex-start; gap: .7rem;
          padding: .8rem 1rem;
          background: #eef6ff;
          border: 1.5px solid #c0d9f8;
          border-radius: 10px;
          font-size: .82rem; color: #1050a8;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .ta-readonly-badge {
          display: inline-flex; align-items: center; gap: .25rem;
          font-size: .67rem; font-weight: 700; color: #7da0c4;
          background: #f0f6ff; border: 1px solid #dce9f5;
          padding: .15rem .45rem; border-radius: 5px;
          letter-spacing: .03em; vertical-align: middle; margin-left: .35rem;
        }

        /* ── TOASTS ── */
        .ta-toast {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
          display: flex; align-items: center; gap: .75rem;
          padding: .85rem 1.25rem; border-radius: 11px;
          font-family: 'DM Sans', sans-serif; font-size: .855rem; font-weight: 600;
          box-shadow: 0 8px 28px rgba(0,0,0,.13);
          animation: ta-slideUp .28s cubic-bezier(.22,.68,0,1.2);
          max-width: 320px;
        }
        .ta-toast-success { background: #f0fdf4; color: #166534; border: 1.5px solid #bbf7d0; }
        .ta-toast-error { background: #fff5f5; color: #991b1b; border: 1.5px solid #fecaca; }

        /* ── EMPTY STATE ── */
        .ta-empty { padding: 4rem 2rem; text-align: center; }
        .ta-empty-icon {
          width: 52px; height: 52px;
          background: #eef5ff; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
          border: 1.5px solid #c8ddf5;
        }

        /* ── NAV BREADCRUMB style ── */
        .ta-breadcrumb {
          display: flex; align-items: center; gap: .45rem;
          font-size: .73rem; color: #7da0c4; font-weight: 500;
          margin-bottom: 1.25rem;
        }
        .ta-breadcrumb span { color: #b8cfe8; }
      `}</style>

      <div className="ta-root ta-page">
        <div className="ta-page-inner">

          {/* ── BREADCRUMB ── */}
          <div className="ta-breadcrumb">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Gestión de Activos
            <span>›</span>
            Tipos de Activo
          </div>

          {/* ── PAGE HEADER ── */}
          <div className="ta-page-header">
            <div className="ta-page-header-left">
              <div className="ta-page-icon">
                <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="ta-page-title">
                  Tipos de Activo
                  {!loading && <span className="ta-count-pill">{categorias.length}</span>}
                </h2>
                <p className="ta-page-subtitle">Administra las categorías y sus campos personalizados del inventario</p>
              </div>
            </div>

            <div className="ta-page-actions">
              <button onClick={() => setShowComponentsModal(true)} className="ta-btn-secondary">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                Componentes
              </button>
              <div className="ta-action-divider" />
              <button onClick={fetchCategorias} className="ta-btn-secondary">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Actualizar
              </button>
              <button onClick={openNew} className="ta-btn-primary">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Nuevo tipo
              </button>
            </div>
          </div>

          {/* ── TABLE CARD ── */}
          <div className="ta-card">
            {/* Card header row */}
            <div style={{
              padding: '.85rem 1.5rem',
              background: '#f7fafd',
              borderBottom: '1px solid #e4eef8',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#5a87ba' }}>
                Listado de categorías
              </span>
              {!loading && categorias.length > 0 && (
                <span style={{ fontSize: '.75rem', color: '#8aaac8', fontWeight: 500 }}>
                  {categorias.length} {categorias.length === 1 ? 'registro' : 'registros'}
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#7da0c4' }}>
                <div style={{
                  display: 'inline-block', width: '22px', height: '22px',
                  border: '2.5px solid #c8ddf5', borderTopColor: '#1458b8',
                  borderRadius: '50%', animation: 'ta-spin .7s linear infinite',
                  marginRight: '.6rem', verticalAlign: 'middle'
                }} />
                <span style={{ fontWeight: 600, fontSize: '.855rem' }}>Cargando categorías...</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Nombre</th>
                      <th style={{ width: '20%' }}>Código</th>
                      <th style={{ width: '28%' }}>Grupo</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((c, idx) => (
                      <tr key={String(c.id ?? c.nombre)} style={{ animationDelay: `${idx * 0.04}s` }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                            <div className="ta-dot" />
                            <span style={{ fontWeight: 700, color: '#0a2550', fontSize: '.9rem' }}>{c.nombre}</span>
                          </div>
                        </td>
                        <td>
                          <span className="ta-badge ta-badge-blue">{c.codigo}</span>
                        </td>
                        <td>
                          {(() => {
                            const gid = String((c as any).grupoId ?? (c as any).grupo_id ?? (c as any).groupId ?? (c as any).grupo ?? '').trim();
                            if (!gid) return <span style={{ color: '#c5d9ef', fontSize: '.85rem' }}>—</span>;
                            const g = groups.find(x => String(x.id) === gid);
                            return <span className="ta-badge ta-badge-gray">{g ? g.nombre : gid}</span>;
                          })()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => openEdit(c)} className="ta-btn-edit">
                            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
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
                              <svg width="22" height="22" fill="none" stroke="#7da0c4" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                            <p style={{ fontSize: '.95rem', fontWeight: 700, color: '#4a6f98', marginBottom: '.25rem' }}>Sin tipos registrados</p>
                            <p style={{ fontSize: '.82rem', color: '#9bbcd4', margin: 0, fontWeight: 400 }}>Pulsa "Nuevo tipo" para comenzar</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── ADD / EDIT MODAL ──────────────── */}
      {showModal && (
        <div className="ta-modal-overlay">
          <div className="ta-modal">
            <div className="ta-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                <div className="ta-modal-header-icon">
                  <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="ta-modal-title">{editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}</p>
                  <p className="ta-modal-sub">{editingCategoryId ? 'Actualiza los datos de la categoría seleccionada.' : 'Define el nuevo tipo de activo y su clasificación.'}</p>
                </div>
              </div>
              <button type="button" className="ta-modal-close" onClick={() => { setShowModal(false); setEditingCategoryId(null); setCategoryNameInput(''); setCategoryCodeInput(''); setCategoryGroupId(''); }}>✕</button>
            </div>

            <div className="ta-modal-body">
              <form onSubmit={handleSaveBasic}>

                <div className="ta-tip">
                  <svg width="15" height="15" fill="none" stroke="#1458b8" viewBox="0 0 24 24" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong style={{ fontWeight: 700 }}>Recomendación:</strong> usa un nombre claro y descriptivo para facilitar la clasificación del activo.</span>
                </div>

                <div className="ta-section-wrap">
                  <span className="ta-section-num">1</span>
                  <div>
                    <span className="ta-section-title">Información básica</span>
                    <p className="ta-section-subtitle">Identificación y grupo al que pertenece la categoría</p>
                  </div>
                </div>

                <div className="ta-form-group">
                  <label className="ta-form-label">Grupo de Activo <span style={{ color: '#e53e3e' }}>*</span></label>
                  <select value={categoryGroupId} onChange={(e) => setCategoryGroupId(e.target.value)} className="ta-input ta-select">
                    <option value="">— Seleccionar grupo —</option>
                    {groups.map(g => (<option key={g.id} value={g.id}>{g.nombre}</option>))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem', marginBottom: '1.3rem' }}>
                  <div>
                    <label className="ta-form-label">
                      Nombre de categoría <span style={{ color: '#e53e3e' }}>*</span>
                      {editingCategoryId && <span className="ta-readonly-badge">Solo lectura</span>}
                    </label>
                    <input
                      name="categoria"
                      value={categoryNameInput}
                      onChange={(e) => { const v = e.target.value; setCategoryNameInput(v); if (!editingCategoryId) setCategoryCodeInput(generateCategoryCode(v)); }}
                      className="ta-input"
                      placeholder="ej: Laptop"
                      readOnly={!!editingCategoryId}
                      required
                    />
                    {editingCategoryId && <p className="ta-form-hint">El nombre no se edita para mantener consistencia.</p>}
                  </div>
                  <div>
                    <label className="ta-form-label">
                      Código <span style={{ color: '#e53e3e' }}>*</span>
                      <span className="ta-readonly-badge">Auto</span>
                    </label>
                    <input
                      name="codigo"
                      value={categoryCodeInput}
                      readOnly
                      className="ta-input"
                      placeholder="Se genera automáticamente"
                      required
                      style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '.04em' }}
                    />
                    <p className="ta-form-hint">Generado automáticamente desde el nombre.</p>
                  </div>
                </div>

                <div className="ta-modal-footer" style={{ margin: '0 -2rem -1.75rem', borderRadius: '0 0 16px 16px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingCategoryId(null); setCategoryNameInput(''); setCategoryCodeInput(''); setCategoryGroupId(''); }}
                    className="ta-btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="ta-btn-primary">
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {editingCategoryId ? 'Guardar cambios' : 'Crear categoría'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Components modal */}
      {showComponentsModal && (
        <ComponentsModal visible={showComponentsModal} onClose={() => setShowComponentsModal(false)} categories={categorias} />
      )}

      {/* ──────────────── GROUP MODAL ──────────────── */}
      {showGroupModal && (
        <div className="ta-modal-overlay">
          <div className="ta-modal ta-modal-sm">
            <div className="ta-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                <div className="ta-modal-header-icon">
                  <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="ta-modal-title">{editingGroupId ? 'Editar grupo' : 'Crear grupo'}</p>
                  <p className="ta-modal-sub">Define un grupo para clasificar tipos de activo relacionados.</p>
                </div>
              </div>
              <button type="button" className="ta-modal-close" onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }}>✕</button>
            </div>

            <div className="ta-modal-body">
              <div className="ta-form-group">
                <label className="ta-form-label">Nombre del grupo <span style={{ color: '#e53e3e' }}>*</span></label>
                <input value={groupNameInput} onChange={e => { const v = e.target.value; setGroupNameInput(v); setGroupCodeInput(generateGroupCode(v)); }} className="ta-input" placeholder="Ej: Equipos de Cómputo" />
              </div>
              <div className="ta-form-group">
                <label className="ta-form-label">Código <span className="ta-readonly-badge">Auto</span></label>
                <input value={groupCodeInput} readOnly className="ta-input" placeholder="Se genera automáticamente" style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '.04em' }} />
                <p className="ta-form-hint">Generado automáticamente a partir del nombre.</p>
              </div>
              <div className="ta-form-group">
                <label className="ta-form-label">Descripción</label>
                <textarea value={groupDescriptionInput} onChange={e => setGroupDescriptionInput(e.target.value)} className="ta-input" placeholder="Descripción del grupo (opcional)" rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.85rem 1rem', background: '#f5f9ff', border: '1.5px solid #c8ddf5', borderRadius: '10px' }}>
                <input type="checkbox" id="grp-activo" checked={groupActiveInput} onChange={e => setGroupActiveInput(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1458b8', cursor: 'pointer' }} />
                <label htmlFor="grp-activo" style={{ fontSize: '.855rem', fontWeight: 600, color: '#0a2550', cursor: 'pointer', userSelect: 'none' }}>Grupo activo</label>
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
              }} className="ta-btn-primary">{editingGroupId ? 'Guardar cambios' : 'Crear grupo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOASTS ── */}
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