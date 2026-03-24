import React, { useEffect, useMemo, useState } from 'react';
import ChecklistModal from '@/modules/inventario/components/ChecklistModal';
import { getCategorias } from '@/modules/inventario/services/categoriasService';
import * as checklistService from '@/modules/inventario/services/checklistService';

const tipoLabel: Record<string, string> = { si_no: 'Sí/No', texto: 'Texto', seleccion: 'Selección', select: 'Selección' };

const tipoColor: Record<string, { bg: string; color: string }> = {
  si_no:    { bg: '#e0f0ff', color: '#1565c0' },
  texto:    { bg: '#e8f5e9', color: '#2e7d32' },
  seleccion:{ bg: '#fff8e1', color: '#f57f17' },
  select:   { bg: '#fff8e1', color: '#f57f17' },
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 36px',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: '#f0f5fb',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#5b8ec7',
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: '#0d2a4e',
    margin: 0,
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b8fae',
    margin: 0,
    marginTop: 4,
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'linear-gradient(135deg, #1565c0 0%, #1e88e5 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(21,101,192,0.35)',
    letterSpacing: '0.01em',
    transition: 'all 0.15s ease',
  },
  filtersBar: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    background: '#ffffff',
    borderRadius: 12,
    padding: '14px 20px',
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(13,42,78,0.06)',
    border: '1px solid #d8e8f8',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#5b8ec7',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap' as const,
  },
  input: {
    border: '1.5px solid #cfe2f5',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#1a3558',
    background: '#f7fbff',
    outline: 'none',
    width: 280,
    transition: 'border-color 0.15s',
  },
  select: {
    border: '1.5px solid #cfe2f5',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#1a3558',
    background: '#f7fbff',
    outline: 'none',
    width: 180,
    cursor: 'pointer',
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, #daeaf8 0%, transparent 100%)',
    marginBottom: 16,
  },
  tableCard: {
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #d8e8f8',
    boxShadow: '0 4px 18px rgba(13,42,78,0.07)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  thead: {
    background: 'linear-gradient(90deg, #1565c0 0%, #1e88e5 100%)',
  },
  th: {
    padding: '13px 18px',
    textAlign: 'left' as const,
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.09em',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  },
  tdPregunta: {
    padding: '14px 18px',
    borderBottom: '1px solid #eef4fb',
    fontSize: 14,
    color: '#0d2a4e',
    fontWeight: 500,
    maxWidth: 420,
  },
  tdTipo: {
    padding: '14px 18px',
    borderBottom: '1px solid #eef4fb',
    width: 130,
  },
  tdCategorias: {
    padding: '14px 18px',
    borderBottom: '1px solid #eef4fb',
    fontSize: 13,
    color: '#4b6b8e',
    width: 260,
  },
  tdAcciones: {
    padding: '14px 18px',
    borderBottom: '1px solid #eef4fb',
    width: 90,
    textAlign: 'center' as const,
  },
  tipoBadge: (tipo: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '3px 11px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    background: tipoColor[tipo]?.bg ?? '#e9eff8',
    color: tipoColor[tipo]?.color ?? '#1a3558',
    letterSpacing: '0.02em',
  }),
  btnEdit: {
    background: '#f0f6ff',
    border: '1.5px solid #cce0f9',
    borderRadius: 7,
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: 14,
    color: '#1565c0',
    fontWeight: 700,
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
  },
  emptyRow: {
    padding: '36px 18px',
    textAlign: 'center' as const,
    color: '#8aaac8',
    fontSize: 14,
    fontStyle: 'italic' as const,
  },
  rowEven: {
    background: '#f8fbff',
  },
  rowOdd: {
    background: '#ffffff',
  },
};

const ChecklistPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [categorias, setCategorias] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getCategorias();
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        if (!mounted) return;
        setCategorias(list.map((c: any) => ({ id: Number(c.id ?? c._id ?? 0), nombre: c.nombre ?? c.name ?? '' })));
      } catch (err) { setCategorias([]); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // load preguntas from backend on mount
  useEffect(() => {
    let mounted = true;
    const loadPreguntas = async () => {
      try {
        const data = await checklistService.listPreguntas();
        if (!mounted) return;
        setQuestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading checklist preguntas', err);
        setQuestions([]);
      }
    };
    loadPreguntas();
    return () => { mounted = false; };
  }, []);

  const handleSave = async (payload: any) => {
    try {
      // validations snapshot (frontend defensive)
      if (!payload.pregunta || String(payload.pregunta).trim().length === 0) throw new Error('La pregunta es obligatoria');
      if (!Array.isArray(payload.categorias) || payload.categorias.length === 0) throw new Error('Selecciona al menos una categoría');
      if (payload.tipo === 'seleccion' || payload.tipo === 'select') {
        if (!Array.isArray(payload.opciones) || payload.opciones.length === 0) throw new Error('Agrega al menos una opción para selección');
      }

      if (editing && editing.id) {
        const updated = await checklistService.updatePregunta(String(editing.id), { pregunta: payload.pregunta, tipo: payload.tipo, categorias: payload.categorias.map(Number), opciones: payload.opciones || [] });
        setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
        setEditing(null);
      } else {
        const created = await checklistService.createPregunta({ pregunta: payload.pregunta, tipo: payload.tipo, categorias: payload.categorias.map(Number), opciones: payload.opciones || [] });
        setQuestions(prev => [created, ...prev]);
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error guardando pregunta';
      alert(String(msg));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    try {
      await checklistService.deletePregunta(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error deleting pregunta', err);
      alert('Error eliminando la pregunta');
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter(q => {
      if (s && !(String(q.pregunta || '').toLowerCase().includes(s))) return false;
      if (categoriaFilter !== 'all') {
        return Array.isArray(q.categorias) && q.categorias.includes(Number(categoriaFilter));
      }
      return true;
    });
  }, [questions, search, categoriaFilter]);

  const getCategoriaNames = (ids: any[]) => {
    if (!Array.isArray(ids) || ids.length === 0) return '—';
    return ids.map(id => (categorias.find(c => Number(c.id) === Number(id))?.nombre ?? '')).filter(Boolean).join(', ');
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const handleEdit = (q: any) => { setEditing(q); setOpen(true); };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.eyebrow}>Inventario</span>
          <h1 style={styles.title}>Checklist de Preguntas</h1>
          <p style={styles.subtitle}>Gestiona las preguntas de evaluación por categoría</p>
        </div>
        <button
          style={styles.btnPrimary}
          onClick={openNew}
          onMouseOver={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(21,101,192,0.45)')}
          onMouseOut={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(21,101,192,0.35)')}
        >
          + Crear Pregunta
        </button>
      </div>

      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Buscar</span>
          <input
            style={styles.input}
            placeholder="Buscar pregunta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => (e.currentTarget.style.borderColor = '#1565c0')}
            onBlur={e => (e.currentTarget.style.borderColor = '#cfe2f5')}
          />
        </div>
        <div style={{ width: 1, height: 28, background: '#d4e8f8' }} />
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Categoría</span>
          <select
            style={styles.select}
            value={categoriaFilter}
            onChange={e => setCategoriaFilter(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {categorias.map(c => <option key={String(c.id)} value={String(c.id)}>{c.nombre}</option>)}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8aaac8', fontWeight: 600 }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Pregunta</th>
              <th style={{ ...styles.th, width: 130 }}>Tipo</th>
              <th style={{ ...styles.th, width: 260 }}>Categorías</th>
              <th style={{ ...styles.th, width: 90, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={styles.emptyRow}>
                  No hay preguntas que coincidan con la búsqueda
                </td>
              </tr>
            ) : filtered.map((q, idx) => (
              <tr key={q.id} style={idx % 2 === 0 ? styles.rowOdd : styles.rowEven}>
                <td style={styles.tdPregunta}>{q.pregunta}</td>
                <td style={styles.tdTipo}>
                  <span style={styles.tipoBadge(q.tipo)}>{tipoLabel[q.tipo] ?? q.tipo}</span>
                </td>
                <td style={styles.tdCategorias}>{getCategoriaNames(q.categorias)}</td>
                <td style={styles.tdAcciones}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      style={styles.btnEdit}
                      onClick={() => handleEdit(q)}
                      title="Editar pregunta"
                      onMouseOver={e => { e.currentTarget.style.background = '#e0eeff'; e.currentTarget.style.borderColor = '#1565c0'; }}
                      onMouseOut={e => { e.currentTarget.style.background = '#f0f6ff'; e.currentTarget.style.borderColor = '#cce0f9'; }}
                    >
                      ✏️
                    </button>
                    <button
                      style={{ ...styles.btnEdit, background: '#fff5f5', color: '#b03030', borderColor: '#f5c6c6' }}
                      onClick={() => handleDelete(q.id)}
                      title="Eliminar pregunta"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ChecklistModal isOpen={open} onClose={() => setOpen(false)} onSave={handleSave} initialData={editing} />
    </div>
  );
};

export default ChecklistPage;