import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '@/api/axiosClient';

interface Grupo {
  id?: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  activo?: boolean;
}

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
  if (words.length >= 2) {
    part2 = take(words[1], 5);
  } else {
    const single = words[0];
    if (single.length <= 4) part1 = take(single, 4);
    else {
      part1 = take(single, 4);
      part2 = take(single.substring(4), 5);
    }
  }
  return part2 ? `${part1}-${part2}` : part1;
};

const GruposPage = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/api/gestion-grupos-categorias');
      let data: any = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.data)) data = data.data;
        else if (Array.isArray(data.results)) data = data.results;
      }
      if (!Array.isArray(data)) data = [];
      setGrupos(data.map((g: any) => ({ id: String(g.id ?? g._id ?? g.uuid ?? ''), nombre: g.nombre, codigo: g.codigo, descripcion: g.descripcion, activo: g.activo })));
    } catch (err) {
      console.error('Error fetching grupos', err);
      setGrupos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrupos(); }, []);

  const openNew = () => {
    setEditingId(null);
    setNombre('');
    setCodigo('');
    setDescripcion('');
    setActivo(true);
    setShowModal(true);
  };

  const openEdit = (g: Grupo) => {
    setEditingId(g.id ?? null);
    setNombre(g.nombre);
    setCodigo(g.codigo || generateGroupCode(g.nombre));
    setDescripcion(g.descripcion || '');
    setActivo(g.activo ?? true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = { nombre: nombre.trim(), codigo: codigo || undefined, descripcion, activo } as any;
      if (editingId) {
        const res = await axiosClient.put(`/api/gestion-grupos-categorias/${editingId}`, payload);
        setGrupos(prev => prev.map(p => p.id === editingId ? { ...p, ...res.data } : p));
      } else {
        const res = await axiosClient.post('/api/gestion-grupos-categorias', payload);
        const created = res.data && res.data.data ? res.data.data : res.data;
        setGrupos(prev => [created, ...prev]);
        // After creating a group, navigate to Tipos page and request opening the "add tipo" modal
        try {
          navigate('/admin/grupos-activos/tipos', { state: { autoOpenNew: true, groupId: String(created.id ?? created._id ?? '') } });
        } catch (e) {
          console.warn('Navigation to Tipos failed:', e);
        }
      }
      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving grupo', err);
      setError(err?.response?.data?.message || err?.message || 'Error al guardar');
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .grupos-root {
          font-family: 'DM Sans', sans-serif;
          background: #f0f6ff;
          min-height: 100vh;
          padding: 2.5rem 2rem;
        }
        .grupos-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 2rem;
        }
        .grupos-eyebrow {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #38a3d1;
          margin-bottom: 0.3rem;
        }
        .grupos-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0d2d5e;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin: 0;
        }
        .grupos-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #1458b8;
          color: #ffffff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          padding: 0.6rem 1.25rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.1s ease;
          box-shadow: 0 2px 8px rgba(20, 88, 184, 0.25);
        }
        .btn-primary:hover {
          background: #0d45a0;
          box-shadow: 0 4px 16px rgba(20, 88, 184, 0.35);
          transform: translateY(-1px);
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #ffffff;
          color: #1458b8;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.6rem 1rem;
          border: 1.5px solid #b8d4f8;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.18s, background 0.18s, transform 0.1s;
        }
        .btn-secondary:hover {
          border-color: #1458b8;
          background: #eef5ff;
          transform: translateY(-1px);
        }
        .card {
          background: #ffffff;
          border: 1px solid #d4e5f9;
          border-radius: 14px;
          box-shadow: 0 2px 20px rgba(13, 45, 94, 0.06);
          overflow: hidden;
        }
        table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        thead { background: #f0f6ff; border-bottom: 2px solid #cce2fa; }
        thead th {
          padding: 0.85rem 1.25rem;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #3572b0;
        }
        tbody tr { border-bottom: 1px solid #e8f1fb; transition: background 0.15s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #f5f9ff; }
        tbody td { padding: 0.9rem 1.25rem; color: #1a2f55; font-weight: 500; vertical-align: middle; }
        .td-nombre { font-weight: 700; color: #0d2d5e; font-size: 0.9rem; }
        .td-codigo {
          font-family: 'DM Mono', monospace;
          font-size: 0.78rem;
          background: #e8f1fb;
          color: #1458b8;
          padding: 0.25rem 0.6rem;
          border-radius: 5px;
          display: inline-block;
          font-weight: 500;
          letter-spacing: 0.05em;
        }
        .badge-activo {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.7rem;
          border-radius: 20px;
        }
        .badge-activo.si { background: #dcf3e8; color: #1a7a4a; }
        .badge-activo.no { background: #fde8e8; color: #b91c1c; }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; }
        .badge-activo.si .badge-dot { background: #22c55e; }
        .badge-activo.no .badge-dot { background: #ef4444; }
        .btn-edit {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #1458b8;
          background: #eef5ff;
          border: 1px solid #b8d4f8;
          border-radius: 6px;
          padding: 0.35rem 0.85rem;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-edit:hover { background: #ddeeff; border-color: #1458b8; }
        .empty-state { text-align: center; padding: 4rem 2rem; color: #7da0c4; }
        .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4; }
        .loading-cell { text-align: center; padding: 3rem; color: #7da0c4; font-weight: 500; }
        .spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2.5px solid #b8d4f8;
          border-top-color: #1458b8;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 0.6rem;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .count-badge {
          font-size: 0.75rem;
          font-weight: 700;
          background: #ddeeff;
          color: #1458b8;
          border-radius: 20px;
          padding: 0.15rem 0.6rem;
          margin-left: 0.5rem;
          vertical-align: middle;
        }

        /* MODAL */
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          background: rgba(10, 30, 70, 0.45);
          backdrop-filter: blur(3px);
          padding: 1rem;
        }
        .modal {
          background: #ffffff;
          border-radius: 16px;
          width: 100%; max-width: 520px;
          box-shadow: 0 20px 60px rgba(13, 45, 94, 0.22);
          overflow: hidden;
          animation: modalIn 0.22s cubic-bezier(0.34, 1.5, 0.64, 1);
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-header {
          background: linear-gradient(135deg, #0d2d5e 0%, #1458b8 100%);
          padding: 1.4rem 1.75rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .modal-header-title { font-size: 1.05rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
        .modal-header-sub { font-size: 0.75rem; color: #90b8e8; margin-top: 0.1rem; }
        .modal-close {
          background: rgba(255,255,255,0.12); border: none; color: #fff;
          width: 32px; height: 32px; border-radius: 8px; font-size: 1.1rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.22); }
        .modal-body { padding: 1.75rem; }
        .error-banner {
          background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;
          padding: 0.7rem 1rem; color: #b91c1c; font-size: 0.85rem;
          font-weight: 500; margin-bottom: 1.25rem;
        }
        .form-group { margin-bottom: 1.1rem; }
        .form-label {
          display: block; font-size: 0.78rem; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #3572b0; margin-bottom: 0.4rem;
        }
        .form-input {
          width: 100%; border: 1.5px solid #cce2fa; border-radius: 8px;
          padding: 0.65rem 0.9rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem; color: #0d2d5e; background: #ffffff;
          transition: border-color 0.18s, box-shadow 0.18s;
          box-sizing: border-box; outline: none;
        }
        .form-input:focus { border-color: #1458b8; box-shadow: 0 0 0 3px rgba(20, 88, 184, 0.12); }
        .form-input[readonly] { background: #f4f8fe; color: #5a7fa8; cursor: default; }
        .form-input::placeholder { color: #a0bdda; }
        .form-textarea {
          width: 100%; border: 1.5px solid #cce2fa; border-radius: 8px;
          padding: 0.65rem 0.9rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem; color: #0d2d5e; background: #ffffff;
          transition: border-color 0.18s, box-shadow 0.18s;
          box-sizing: border-box; outline: none; resize: vertical; min-height: 80px;
        }
        .form-textarea:focus { border-color: #1458b8; box-shadow: 0 0 0 3px rgba(20, 88, 184, 0.12); }
        .form-hint { font-size: 0.73rem; color: #7da0c4; margin-top: 0.3rem; }
        .toggle-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: #f4f8fe; border: 1.5px solid #cce2fa; border-radius: 8px;
        }
        .toggle-label { font-size: 0.875rem; font-weight: 600; color: #0d2d5e; cursor: pointer; user-select: none; }
        .modal-footer {
          display: flex; justify-content: flex-end; gap: 0.75rem;
          padding: 1.25rem 1.75rem;
          border-top: 1px solid #e8f1fb; background: #f8fbff;
        }
        .btn-cancel {
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 600;
          color: #3572b0; background: #ffffff; border: 1.5px solid #b8d4f8;
          border-radius: 8px; padding: 0.6rem 1.25rem; cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-cancel:hover { background: #eef5ff; border-color: #1458b8; }
        .btn-save {
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 700;
          color: #ffffff; background: #1458b8; border: none; border-radius: 8px;
          padding: 0.6rem 1.5rem; cursor: pointer;
          box-shadow: 0 2px 8px rgba(20, 88, 184, 0.28);
          transition: background 0.18s, box-shadow 0.18s, transform 0.1s;
        }
        .btn-save:hover {
          background: #0d45a0;
          box-shadow: 0 4px 16px rgba(20, 88, 184, 0.38);
          transform: translateY(-1px);
        }
      `}</style>

      <div className="grupos-root">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          <div className="grupos-header">
            <div>
              <div className="grupos-eyebrow">Gestión de Activos</div>
              <h2 className="grupos-title">
                Grupos de Activos
                {!loading && <span className="count-badge">{grupos.length}</span>}
              </h2>
            </div>
            <div className="grupos-actions">
              <button onClick={fetchGrupos} className="btn-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                Actualizar
              </button>
              <button onClick={openNew} className="btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Añadir grupo
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="loading-cell">
                        <span className="spinner" />
                        Cargando grupos...
                      </td>
                    </tr>
                  ) : grupos.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-icon">🗂️</div>
                          <p>No hay grupos registrados</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    grupos.map(g => (
                      <tr key={g.id}>
                        <td className="td-nombre">{g.nombre}</td>
                        <td><span className="td-codigo">{g.codigo}</span></td>
                        <td style={{ color: '#4a6a99', fontWeight: 400 }}>{g.descripcion || <span style={{ color: '#b0c8e0' }}>—</span>}</td>
                        <td>
                          <span className={`badge-activo ${g.activo ? 'si' : 'no'}`}>
                            <span className="badge-dot" />
                            {g.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => openEdit(g)} className="btn-edit">Editar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-header-title">{editingId ? 'Editar grupo' : 'Nuevo grupo'}</div>
                <div className="modal-header-sub">
                  {editingId ? 'Modifica los datos del grupo seleccionado' : 'Completa la información para registrar un nuevo grupo'}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="error-banner">⚠ {error}</div>}

                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-input"
                    value={nombre}
                    onChange={(e) => { setNombre(e.target.value); if (!editingId) setCodigo(generateGroupCode(e.target.value)); }}
                    placeholder="Ej. Maquinaria Pesada"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Código</label>
                  <input
                    className="form-input"
                    value={codigo}
                    readOnly
                    placeholder="Se genera automáticamente"
                  />
                  <div className="form-hint">El código se genera automáticamente a partir del nombre.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-textarea"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Descripción opcional del grupo..."
                  />
                </div>

                <div className="toggle-row">
                  <input
                    type="checkbox"
                    id="activo-check"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#1458b8', cursor: 'pointer' }}
                  />
                  <label htmlFor="activo-check" className="toggle-label">Grupo activo</label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GruposPage;