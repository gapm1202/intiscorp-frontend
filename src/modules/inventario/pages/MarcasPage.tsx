import React, { useEffect, useMemo, useState } from 'react';
import { getCategorias } from '@/modules/inventario/services/categoriasService';
import { getMarcas, createMarca, updateMarca, syncCategorias } from '@/modules/inventario/services/marcasService';

interface MarcaItem { id: string; nombre: string; activo: boolean; categorias?: string[] }

const MarcasPage = () => {
  const [marcas, setMarcas] = useState<MarcaItem[]>([]);

  const [query, setQuery] = useState('');
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Array<{ id: string; nombre: string }>>([]);
  const [catQuery, setCatQuery] = useState('');
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = String(query || '').toLowerCase().trim();
    // Require a tipo filter: if none selected, return empty list
    if (!selectedTipoFilter) return [];
    // start from marcas
    let list = marcas || [];
    // filter by tipo (categoria)
    const selectedCat = categorias.find(c => String(c.id) === String(selectedTipoFilter));
    const selId = String(selectedCat?.id ?? '');
    const selName = String(selectedCat?.nombre ?? '');
    list = list.filter(m => Array.isArray(m.categorias) && m.categorias.some(c => String(c) === selId || String(c) === selName));
    if (!q) return list;
    return list.filter(m => (m.nombre || '').toLowerCase().includes(q));
  }, [marcas, query, selectedTipoFilter, categorias]);

  const openNew = () => {
    setEditingId(null); setNombre(''); setActivo(true); setError(null);
    setSelectedCategorias([]); setCatQuery(''); setShowModal(true);
  };

  const openEdit = (m: MarcaItem) => {
    setEditingId(m.id); setNombre(m.nombre || ''); setActivo(Boolean(m.activo));
    setError(null);
    // Map stored marca.categorias values (objects or strings) to our `categorias` ids
    try {
      const rawCats = Array.isArray((m as any).categorias) ? (m as any).categorias : [];
      const mapped = rawCats.map((val: any) => {
        if (!val && val !== 0) return '';
        // If it's an object like { id, nombre }
        if (typeof val === 'object') {
          const idVal = String(val.id ?? val._id ?? val.codigo ?? '').trim();
          if (idVal) return idVal;
          const nameVal = String(val.nombre ?? val.name ?? '').trim();
          if (nameVal) return nameVal;
          return '';
        }
        // primitive (string/number)
        const s = String(val).trim();
        // try to find by id
        const byId = categorias.find(c => String(c.id) === s || String(Number(c.id)) === s);
        if (byId) return String(byId.id);
        // try to find by name
        const byName = categorias.find(c => String(c.nombre).toLowerCase() === s.toLowerCase());
        if (byName) return String(byName.id);
        return s;
      }).filter(Boolean);
      setSelectedCategorias(mapped);
    } catch (e) {
      setSelectedCategorias((m.categorias ?? []).map((x:any) => typeof x === 'object' ? String(x.id ?? x.nombre ?? '') : String(x)));
    }
    setCatQuery(''); setShowModal(true);
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getCategorias();
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setCategorias(list.map((c: any) => ({ id: String(c.id ?? c._id ?? c.uuid ?? ''), nombre: c.nombre })));
      } catch (err) { setCategorias([]); }
    };
    fetch();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await getMarcas();
        // normalize categories ids to strings
        const normalized = (list || []).map((m: any) => ({
          id: String(m.id ?? m._id ?? ''),
          nombre: String(m.nombre ?? m.name ?? ''),
          activo: Boolean(m.activo),
          categorias: Array.isArray(m.categorias) ? m.categorias.map((x: any) => {
            if (x && typeof x === 'object') return String(x.id ?? x._id ?? x.codigo ?? x.nombre ?? '');
            return String(x ?? '');
          }).filter(Boolean) : [],
        }));
        setMarcas(normalized);
      } catch (err) {
        console.error('Error fetching marcas:', err);
        setMarcas([]);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const n = String(nombre || '').trim();
    if (!n) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      // Convertir selectedCategorias a enteros para `categoriaIds`
      const categoriaIdsPayload = selectedCategorias.map((s) => Number(s)).filter((n) => Number.isInteger(n));

      if (editingId) {
        const updated = await updateMarca(editingId, { nombre: n, activo, categoriaIds: categoriaIdsPayload });
        // optimista: reflejar las categorías seleccionadas aunque el backend no las devuelva
        setMarcas(prev => prev.map(p => p.id === editingId ? { id: String(updated.id), nombre: updated.nombre, activo: Boolean(updated.activo), categorias: selectedCategorias.map(String) } : p));
        // intentar sincronizar mediante endpoint específico si el backend no lo hizo
        try { await syncCategorias(editingId, categoriaIdsPayload); } catch (errSync) { console.warn('syncCategorias failed (edit):', errSync); }
      } else {
        const created = await createMarca({ nombre: n, activo, categoriaIds: categoriaIdsPayload });
        const item = { id: String(created.id), nombre: created.nombre, activo: Boolean(created.activo), categorias: selectedCategorias.map(String) };
        setMarcas(prev => [item, ...prev]);
        // intentar sincronizar mediante endpoint específico por si el backend no procesó 'categoriaIds'
        try { await syncCategorias(String(created.id), categoriaIdsPayload); } catch (errSync) { console.warn('syncCategorias failed (create):', errSync); }
      }
      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving marca:', err);
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar la marca';
      setError(String(msg));
    } finally { setSaving(false); }
  };

  const handleCancel = () => { setShowModal(false); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .mp-root { font-family: 'DM Sans', sans-serif; }
        .mp-root * { box-sizing: border-box; }
        @keyframes mp-spin { to { transform: rotate(360deg); } }
        @keyframes mp-modalIn { from { opacity:0; transform:scale(0.94) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }

        .mp-input {
          width: 100%; padding: .62rem .9rem;
          border: 1.5px solid #cce2fa; border-radius: 8px;
          font-size: .9rem; font-family: 'DM Sans', sans-serif;
          color: #0d2d5e; font-weight: 500; background: #f4f8fe;
          transition: border-color .15s, box-shadow .15s, background .15s; outline: none;
        }
        .mp-input:focus { border-color: #1458b8; background: #fff; box-shadow: 0 0 0 3px rgba(20,88,184,.12); }
        .mp-input::placeholder { color: #a0bdda; }

        .mp-btn-primary {
          display: inline-flex; align-items: center; gap: .45rem;
          padding: .62rem 1.25rem; background: #1458b8; color: #fff;
          border: none; border-radius: 8px; font-weight: 600; font-size: .875rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .18s, box-shadow .18s, transform .1s;
          box-shadow: 0 2px 8px rgba(20,88,184,.25);
        }
        .mp-btn-primary:hover { background: #0d45a0; box-shadow: 0 4px 16px rgba(20,88,184,.35); transform: translateY(-1px); }
        .mp-btn-primary:active { transform: translateY(0); }

        .mp-btn-secondary {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .62rem 1.1rem; background: #fff; color: #1458b8;
          border: 1.5px solid #b8d4f8; border-radius: 8px; font-weight: 600; font-size: .875rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .15s, border-color .15s, transform .1s;
        }
        .mp-btn-secondary:hover { background: #eef5ff; border-color: #1458b8; transform: translateY(-1px); }

        .mp-btn-ghost {
          display: inline-flex; align-items: center; gap: .35rem;
          padding: .35rem .75rem; background: #eef5ff; color: #1458b8;
          border: 1px solid #b8d4f8; border-radius: 6px;
          font-size: .8rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .12s, border-color .12s;
        }
        .mp-btn-ghost:hover { background: #ddeeff; border-color: #1458b8; }

        .mp-card { background: #fff; border: 1px solid #d4e5f9; border-radius: 14px; box-shadow: 0 2px 20px rgba(13,45,94,.06); overflow: hidden; }

        .mp-table { width: 100%; border-collapse: collapse; }
        .mp-table thead { background: #f0f6ff; border-bottom: 2px solid #cce2fa; }
        .mp-table th { padding: .85rem 1.25rem; text-align: left; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: #3572b0; }
        .mp-table td { padding: .9rem 1.25rem; color: #1a2f55; font-weight: 500; border-bottom: 1px solid #e8f1fb; vertical-align: middle; }
        .mp-table tbody tr:last-child td { border-bottom: none; }
        .mp-table tbody tr { transition: background .15s; }
        .mp-table tbody tr:hover td { background: #f5f9ff; }

        .mp-search-wrap {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e8f1fb;
          background: #fafcff;
        }
        .mp-search-inner {
          position: relative; max-width: 340px;
        }
        .mp-search-icon {
          position: absolute; left: .75rem; top: 50%; transform: translateY(-50%);
          color: #7da0c4; pointer-events: none;
        }
        .mp-search-input {
          width: 100%; padding: .55rem .9rem .55rem 2.2rem;
          border: 1.5px solid #cce2fa; border-radius: 8px;
          font-size: .875rem; font-family: 'DM Sans', sans-serif;
          color: #0d2d5e; font-weight: 500; background: #fff;
          transition: border-color .15s, box-shadow .15s; outline: none;
        }
        .mp-search-input:focus { border-color: #1458b8; box-shadow: 0 0 0 3px rgba(20,88,184,.12); }
        .mp-search-input::placeholder { color: #a0bdda; }

        .mp-modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          background: rgba(10,30,70,.45); backdrop-filter: blur(3px); padding: 1rem;
        }
        .mp-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
          box-shadow: 0 20px 60px rgba(13,45,94,.22); border: 1px solid #d4e5f9;
          overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;
          animation: mp-modalIn .22s cubic-bezier(.34,1.5,.64,1);
        }
        .mp-modal-header {
          background: linear-gradient(135deg, #0d2d5e 0%, #1458b8 100%);
          padding: 1.4rem 1.75rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .mp-modal-header-icon { background: rgba(255,255,255,.15); padding: .55rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .mp-modal-title { font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0; letter-spacing: -.01em; }
        .mp-modal-sub { font-size: .78rem; color: rgba(255,255,255,.7); margin: .2rem 0 0; }
        .mp-modal-close {
          background: rgba(255,255,255,.12); border: none; color: #fff;
          width: 32px; height: 32px; border-radius: 8px; font-size: 1rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background .15s; flex-shrink: 0;
        }
        .mp-modal-close:hover { background: rgba(255,255,255,.22); }
        .mp-modal-body { overflow-y: auto; flex: 1; padding: 1.75rem; }
        .mp-modal-footer {
          background: #f8fbff; border-top: 1px solid #e8f1fb;
          padding: 1rem 1.75rem; display: flex; justify-content: flex-end; gap: .75rem; flex-shrink: 0;
        }

        .mp-form-label { display: block; font-size: .78rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #3572b0; margin-bottom: .45rem; }
        .mp-form-group { margin-bottom: 1.1rem; }
        .mp-divider { border: none; border-top: 1.5px solid #e8f1fb; margin: 1.25rem 0; }

        .mp-error-banner {
          background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;
          padding: .7rem 1rem; color: #b91c1c; font-size: .85rem; font-weight: 500; margin-bottom: 1.25rem;
        }

        .mp-toggle-row {
          display: flex; align-items: center; gap: .75rem;
          padding: .85rem 1rem; background: #f4f8fe; border: 1.5px solid #cce2fa; border-radius: 8px;
        }

        .mp-cat-chip {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .25rem .7rem; border-radius: 99px;
          background: #ddeeff; border: 1.5px solid #b8d4f8;
          color: #1458b8; font-size: .8rem; font-weight: 600;
        }
        .mp-cat-chip-remove {
          background: none; border: none; cursor: pointer; color: #7da0c4;
          padding: 0; display: flex; font-size: .85rem; line-height: 1;
          transition: color .12s;
        }
        .mp-cat-chip-remove:hover { color: #e53e3e; }

        .mp-cat-list {
          max-height: 160px; overflow-y: auto;
          border: 1.5px solid #cce2fa; border-radius: 8px;
          background: #fff;
        }
        .mp-cat-list::-webkit-scrollbar { width: 4px; }
        .mp-cat-list::-webkit-scrollbar-track { background: #f0f6ff; }
        .mp-cat-list::-webkit-scrollbar-thumb { background: #b8d4f8; border-radius: 4px; }

        .mp-cat-item {
          display: flex; align-items: center; gap: .65rem;
          padding: .55rem .85rem; cursor: pointer;
          transition: background .12s; font-size: .875rem; color: #0d2d5e; font-weight: 500;
          border-bottom: 1px solid #f0f6ff;
        }
        .mp-cat-item:last-child { border-bottom: none; }
        .mp-cat-item:hover { background: #f5f9ff; }
        .mp-cat-item.selected { background: #eef5ff; }

        .mp-empty { padding: 4rem 2rem; text-align: center; }
        .mp-empty-icon { width: 52px; height: 52px; background: #eef5ff; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }

        .mp-badge-activo {
          display: inline-flex; align-items: center; gap: .35rem;
          font-size: .75rem; font-weight: 600; padding: .25rem .7rem; border-radius: 20px;
        }
        .mp-badge-activo.si { background: #dcf3e8; color: #1a7a4a; }
        .mp-badge-activo.no { background: #fde8e8; color: #b91c1c; }
        .mp-badge-dot { width: 6px; height: 6px; border-radius: 50%; }
        .mp-badge-activo.si .mp-badge-dot { background: #22c55e; }
        .mp-badge-activo.no .mp-badge-dot { background: #ef4444; }
      `}</style>

      <div className="mp-root" style={{ padding: '2.5rem 2rem', minHeight: '100vh', background: '#f0f6ff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* PAGE HEADER */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '.7rem', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: '#38a3d1', marginBottom: '.3rem' }}>
                Gestión de Activos
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0d2d5e', letterSpacing: '-.03em', margin: 0, lineHeight: 1.1 }}>
                Marcas
                <span style={{ fontSize: '.75rem', fontWeight: 700, background: '#ddeeff', color: '#1458b8', borderRadius: '20px', padding: '.15rem .6rem', marginLeft: '.5rem', verticalAlign: 'middle' }}>
                  {filtered.length}
                </span>
              </h2>
              <p style={{ fontSize: '.85rem', color: '#5a7fa8', margin: '.35rem 0 0', fontWeight: 400 }}>
                Administra las marcas y sus categorías asociadas
              </p>
            </div>
            <button onClick={openNew} className="mp-btn-primary">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nueva Marca
            </button>
          </div>

          {/* TABLE CARD */}
          <div className="mp-card">
            {/* Search bar */}
            <div className="mp-search-wrap">
              <div className="mp-search-inner">
                <span className="mp-search-icon">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar marca..."
                  className="mp-search-input"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', margin: '1rem 1.25rem' }}>
              <div style={{ minWidth: 220 }}>
                <select value={selectedTipoFilter} onChange={e => setSelectedTipoFilter(e.target.value)} className="mp-input">
                  <option value="">-- Filtrar por Tipo de Activo --</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }} />
            </div>

          { !selectedTipoFilter && (
            <div style={{ padding: '1rem 1.25rem', color: '#6b7280' }}>
              Selecciona un "Tipo de Activo" arriba para ver las marcas relacionadas.
            </div>
          )}
            <div style={{ overflowX: 'auto' }}>
              <table className="mp-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th style={{ width: '110px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1458b8', flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, color: '#0d2d5e', fontSize: '.9rem' }}>{m.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`mp-badge-activo ${m.activo ? 'si' : 'no'}`}>
                          <span className="mp-badge-dot" />
                          {m.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => openEdit(m)} className="mp-btn-ghost">
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={3} style={{ border: 'none', padding: 0 }}>
                      <div className="mp-empty">
                        <div className="mp-empty-icon">
                          <svg width="22" height="22" fill="none" stroke="#7da0c4" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                        </div>
                        <p style={{ fontSize: '.95rem', fontWeight: 600, color: '#5a7fa8', marginBottom: '.25rem' }}>
                          {query ? 'Sin resultados para tu búsqueda' : 'No hay marcas registradas'}
                        </p>
                        <p style={{ fontSize: '.82rem', color: '#9bbcd4', margin: 0 }}>
                          {query ? 'Intenta con otro término' : 'Pulsa "Nueva Marca" para comenzar'}
                        </p>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="mp-modal-overlay">
          <div className="mp-modal">
            <div className="mp-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                <div className="mp-modal-header-icon">
                  <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                </div>
                <div>
                  <p className="mp-modal-title">{editingId ? 'Editar Marca' : 'Nueva Marca'}</p>
                  <p className="mp-modal-sub">{editingId ? 'Modifica los datos de la marca seleccionada' : 'Completa la información para registrar una nueva marca'}</p>
                </div>
              </div>
              <button type="button" className="mp-modal-close" onClick={handleCancel}>✕</button>
            </div>

            <div className="mp-modal-body">
              <form onSubmit={handleSave} id="marca-form">
                {error && <div className="mp-error-banner">⚠ {error}</div>}

                {/* Nombre */}
                <div className="mp-form-group">
                  <label className="mp-form-label">Nombre de la marca <span style={{ color: '#e53e3e' }}>*</span></label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="mp-input"
                    placeholder="Ej: ASUS"
                    required
                  />
                </div>

                <hr className="mp-divider" />

                {/* Estado */}
                <div className="mp-form-group">
                  <label className="mp-form-label">Estado</label>
                  <div className="mp-toggle-row">
                    <input
                      type="checkbox"
                      id="marca-activa"
                      checked={activo}
                      onChange={(e) => setActivo(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#1458b8', cursor: 'pointer' }}
                    />
                    <label htmlFor="marca-activa" style={{ fontSize: '.875rem', fontWeight: 600, color: '#0d2d5e', cursor: 'pointer' }}>
                      Marca activa
                    </label>
                  </div>
                </div>

                <hr className="mp-divider" />

                {/* Categorías */}
                <div className="mp-form-group">
                  <label className="mp-form-label">Categorías donde aplica</label>

                  {/* Selected chips */}
                  {selectedCategorias.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem', marginBottom: '.75rem' }}>
                      {selectedCategorias.map(id => {
                        const c = categorias.find(x => x.id === id);
                        return c ? (
                          <span key={id} className="mp-cat-chip">
                            {c.nombre}
                            <button
                              type="button"
                              className="mp-cat-chip-remove"
                              onClick={() => setSelectedCategorias(prev => prev.filter(x => x !== id))}
                            >✕</button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Search */}
                  <div style={{ position: 'relative', marginBottom: '.5rem' }}>
                    <span style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: '#7da0c4', pointerEvents: 'none' }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
                    </span>
                    <input
                      value={catQuery}
                      onChange={(e) => setCatQuery(e.target.value)}
                      placeholder="Buscar categorías..."
                      className="mp-input"
                      style={{ paddingLeft: '2.2rem' }}
                    />
                  </div>

                  {/* List */}
                  <div className="mp-cat-list">
                    {categorias.filter(c => (c.nombre || '').toLowerCase().includes(catQuery.toLowerCase())).slice(0, 50).map(c => (
                      <label
                        key={c.id}
                        className={`mp-cat-item ${selectedCategorias.includes(c.id) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategorias.includes(c.id)}
                          onChange={() => setSelectedCategorias(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                          style={{ accentColor: '#1458b8', width: '15px', height: '15px', flexShrink: 0 }}
                        />
                        <span>{c.nombre}</span>
                      </label>
                    ))}
                    {categorias.length === 0 && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#9bbcd4', fontSize: '.85rem', fontStyle: 'italic' }}>
                        No hay categorías disponibles
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="mp-modal-footer">
              <button type="button" className="mp-btn-secondary" onClick={handleCancel}>Cancelar</button>
              <button type="submit" form="marca-form" className="mp-btn-primary">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarcasPage;