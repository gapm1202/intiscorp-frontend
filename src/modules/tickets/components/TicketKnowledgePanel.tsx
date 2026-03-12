import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getCategorias,
  createSubcategoria,
  createEntrada,
  getEntradas,
  getEntrada,
  getCategoria,
} from '@/modules/baseConocimientos/services/baseConocimientosService';

/* ════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════ */
type Subcategory = { id: string; name: string; raw?: any };
type Category    = { id: string; name: string; subcategories: Subcategory[]; raw?: any };
export type KBEntry = { id: string; titulo: string; contenido_html?: string; categoria_id?: string; subcategoria_id?: string; status?: string; raw?: any };

const isUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/* ════════════════════════════════════════════════════════════
   TOOLTIP
════════════════════════════════════════════════════════════ */
const Tip = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)', background: '#1e3a5f', color: '#fff',
          fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
          padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
        }}>{label}</span>
      )}
    </span>
  );
};

const Sep = () => (
  <div style={{ width: 1, height: 18, background: '#dbeafe', margin: '0 3px', flexShrink: 0 }} />
);

/* ════════════════════════════════════════════════════════════
   KNOWLEDGE EDITOR (inline — same as BaseConocimientosPage)
════════════════════════════════════════════════════════════ */
interface EditorProps {
  initialContent?: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}

function KnowledgeEditor({ initialContent = '', onSave, onCancel }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState('14');
  const [fontFamily, setFontFamily] = useState('DM Sans');

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent || '';
      setTimeout(() => updateStats(), 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    setCharCount(text.length);
    const f = new Set<string>();
    ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'].forEach(c => {
      if (document.queryCommandState(c)) f.add(c);
    });
    ['justifyLeft','justifyCenter','justifyRight','justifyFull'].forEach(c => {
      if (document.queryCommandState(c)) f.add(c);
    });
    setActiveFormats(f);
  }, []);

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateStats();
  }, [updateStats]);

  const isActive = (cmd: string) => activeFormats.has(cmd);

  const tbStyle = (cmd: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 26, border: 'none', borderRadius: 5, cursor: 'pointer',
    background: isActive(cmd) ? 'linear-gradient(135deg,#1d6fd8,#38bdf8)' : 'transparent',
    color: isActive(cmd) ? '#fff' : '#334155',
    transition: 'all .12s', flexShrink: 0,
  });

  const ghost: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 26, border: 'none', borderRadius: 5, cursor: 'pointer',
    background: 'transparent', color: '#334155', transition: 'background .12s', flexShrink: 0,
  };

  const handleFontSize = (val: string) => {
    setFontSize(val);
    editorRef.current?.focus();
    document.execCommand('fontSize', false, '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      (el as HTMLElement).removeAttribute('size');
      (el as HTMLElement).style.fontSize = val + 'px';
    });
    updateStats();
  };

  const insertTable = () =>
    exec('insertHTML', `<table style="border-collapse:collapse;width:100%;margin:8px 0">${
      [...Array(3)].map(() => `<tr>${[...Array(3)].map(() =>
        `<td style="border:1px solid #bfdbfe;padding:6px 10px;min-width:80px">&nbsp;</td>`
      ).join('')}</tr>`).join('')
    }</table><p><br></p>`);

  return (
    <div className="ke-wrap">
      {/* ── TOOLBAR ── */}
      <div className="ke-toolbar">
        {/* Row 1 */}
        <div className="ke-toolbar-row">
          <Tip label="Fuente">
            <select className="ke-sel" style={{ width: 112 }} value={fontFamily}
              onChange={e => { setFontFamily(e.target.value); exec('fontName', e.target.value); }}>
              {['DM Sans','Georgia','Times New Roman','Courier New','Tahoma','Verdana','Arial'].map(f =>
                <option key={f} value={f}>{f}</option>)}
            </select>
          </Tip>
          <Tip label="Tamaño">
            <select className="ke-sel" style={{ width: 52 }} value={fontSize}
              onChange={e => handleFontSize(e.target.value)}>
              {[8,9,10,11,12,14,16,18,20,24,28,32,36,48,72].map(s =>
                <option key={s} value={String(s)}>{s}</option>)}
            </select>
          </Tip>
          <Sep/>
          {(['h1','h2','h3'] as const).map((h, i) => (
            <Tip key={h} label={`Título ${i+1}`}>
              <button className="ke-hbtn" onMouseDown={e => { e.preventDefault(); exec('formatBlock', h); }}>H{i+1}</button>
            </Tip>
          ))}
          <Tip label="Párrafo">
            <button className="ke-hbtn" style={{ fontWeight: 500 }} onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'p'); }}>¶</button>
          </Tip>
          <Sep/>
          <Tip label="Negrita (Ctrl+B)">
            <button onMouseDown={e => { e.preventDefault(); exec('bold'); }} style={tbStyle('bold')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 0 1 0 8H6zm0 8h9a4 4 0 0 1 0 8H6z"/></svg>
            </button>
          </Tip>
          <Tip label="Cursiva (Ctrl+I)">
            <button onMouseDown={e => { e.preventDefault(); exec('italic'); }} style={tbStyle('italic')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
            </button>
          </Tip>
          <Tip label="Subrayado (Ctrl+U)">
            <button onMouseDown={e => { e.preventDefault(); exec('underline'); }} style={tbStyle('underline')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
            </button>
          </Tip>
          <Tip label="Tachado">
            <button onMouseDown={e => { e.preventDefault(); exec('strikeThrough'); }} style={tbStyle('strikeThrough')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6C16 6 14.5 4 12 4s-5 1.5-5 4c0 1.5.8 2.5 2 3"/><path d="M8 18c0 0 1.5 2 4 2s5-1.5 5-4c0-1.5-.8-2.5-2-3"/></svg>
            </button>
          </Tip>
          <Sep/>
          <Tip label="Color de texto">
            <div className="ke-color-wrap">
              <div className="ke-color-btn" onClick={() => (document.getElementById('tke-fc') as HTMLInputElement)?.click()}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2"><path d="M4 20h4l10-10-4-4L4 16v4z"/></svg>
                <div className="ke-color-bar" id="tke-fc-bar" style={{ background: '#1e293b' }}/>
              </div>
              <input type="color" id="tke-fc" className="ke-color-input"
                onChange={e => { exec('foreColor', e.target.value); const b = document.getElementById('tke-fc-bar'); if (b) b.style.background = e.target.value; }}/>
            </div>
          </Tip>
          <Tip label="Resaltado">
            <div className="ke-color-wrap">
              <div className="ke-color-btn" onClick={() => (document.getElementById('tke-bc') as HTMLInputElement)?.click()}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2"><path d="M9 7H6l-3 10h18L18 7h-3"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                <div className="ke-color-bar" id="tke-bc-bar" style={{ background: '#fef08a' }}/>
              </div>
              <input type="color" id="tke-bc" className="ke-color-input" defaultValue="#fef08a"
                onChange={e => { exec('hiliteColor', e.target.value); const b = document.getElementById('tke-bc-bar'); if (b) b.style.background = e.target.value; }}/>
            </div>
          </Tip>
        </div>

        {/* Row 2 */}
        <div className="ke-toolbar-row">
          <Tip label="Izquierda"><button onMouseDown={e => { e.preventDefault(); exec('justifyLeft'); }} style={tbStyle('justifyLeft')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg></button></Tip>
          <Tip label="Centrar"><button onMouseDown={e => { e.preventDefault(); exec('justifyCenter'); }} style={tbStyle('justifyCenter')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg></button></Tip>
          <Tip label="Derecha"><button onMouseDown={e => { e.preventDefault(); exec('justifyRight'); }} style={tbStyle('justifyRight')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg></button></Tip>
          <Tip label="Justificar"><button onMouseDown={e => { e.preventDefault(); exec('justifyFull'); }} style={tbStyle('justifyFull')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button></Tip>
          <Sep/>
          <Tip label="Lista viñetas"><button onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} style={tbStyle('insertUnorderedList')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg></button></Tip>
          <Tip label="Lista numerada"><button onMouseDown={e => { e.preventDefault(); exec('insertOrderedList'); }} style={tbStyle('insertOrderedList')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1V3" strokeWidth="1.8"/><path d="M3 9h3" strokeWidth="1.8"/><path d="M3 15h2a1 1 0 0 1 0 2H3a1 1 0 0 1 0 2h3" strokeWidth="1.5"/></svg></button></Tip>
          <Sep/>
          <Tip label="Sangría +"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('indent'); }} style={ghost}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="21" y2="12"/><line x1="7" y1="18" x2="21" y2="18"/><polyline points="3,9 6,12 3,15"/></svg></button></Tip>
          <Tip label="Sangría -"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('outdent'); }} style={ghost}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="21" y2="12"/><line x1="7" y1="18" x2="21" y2="18"/><polyline points="9,9 6,12 9,15"/></svg></button></Tip>
          <Sep/>
          <Tip label="Cita"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('formatBlock','blockquote'); }} style={ghost}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg></button></Tip>
          <Tip label="Enlace"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); const u = prompt('URL:'); if (u) exec('createLink', u); }} style={ghost}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button></Tip>
          <Tip label="Tabla"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); insertTable(); }} style={ghost}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg></button></Tip>
          <Tip label="Separador"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('insertHTML','<hr style="border:none;border-top:2px solid #bfdbfe;margin:12px 0"><p><br></p>'); }} style={ghost}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="12" x2="21" y2="12"/></svg></button></Tip>
          <Sep/>
          <Tip label="Deshacer"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('undo'); }} style={ghost}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg></button></Tip>
          <Tip label="Rehacer"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('redo'); }} style={ghost}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg></button></Tip>
          <Sep/>
          <Tip label="Limpiar formato"><button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); exec('formatBlock','p'); }} style={{ ...ghost, color: '#ef4444' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 7l4-4 12 12-4 4z"/><line x1="2" y1="22" x2="22" y2="2" opacity="0.5"/></svg></button></Tip>
        </div>
      </div>

      {/* ── DOCUMENT PAGE ── */}
      <div className="ke-page-wrap">
        <div className="ke-page">
          <div
            ref={editorRef}
            className="ke-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={updateStats} onKeyUp={updateStats} onMouseUp={updateStats} onSelect={updateStats}
            spellCheck={false}
          />
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="ke-statusbar">
        <div>
          <span className="ke-stat"><strong>{wordCount}</strong>&nbsp;palabras</span>
          <span className="ke-stat"><strong>{charCount}</strong>&nbsp;caracteres</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ke-btn ke-btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="ke-btn ke-btn-save" onClick={() => onSave(editorRef.current?.innerHTML ?? '')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Guardar entrada
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COMPACT KB PANEL
════════════════════════════════════════════════════════════ */
interface Props {
  onEntrySelected: (entry: KBEntry | null) => void;
  selectedEntry: KBEntry | null;
}

export default function TicketKnowledgePanel({ onEntrySelected, selectedEntry }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion state: which category is expanded, which subcategory
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [wizardTitulo, setWizardTitulo] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);

  // Inline add subcategory in wizard
  const [addingSubForCat, setAddingSubForCat] = useState<string | null>(null);
  const [inlineSubName, setInlineSubName] = useState('');

  // Preview
  const [previewEntry, setPreviewEntry] = useState<KBEntry | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = useCallback(async (entry: KBEntry) => {
    // Show modal immediately with what we have, then fetch the full content
    setPreviewEntry(entry);
    if (entry.contenido_html) return; // already have the content
    try {
      setPreviewLoading(true);
      const full = await getEntrada(entry.id);
      const html = full?.contenido_html ?? full?.contenidoHtml ?? full?.data?.contenido_html ?? '';
      setPreviewEntry(prev => prev ? { ...prev, contenido_html: html } : null);
    } catch {
      // leave as-is
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catsRaw, entriesRaw] = await Promise.all([getCategorias(), getEntradas()]);
      const cats: Category[] = (catsRaw || []).map((c: any) => ({
        id: String(c.id ?? c.uuid ?? `c_${Date.now()}`),
        name: c.nombre ?? c.name ?? c.titulo ?? 'Sin nombre',
        raw: c,
        subcategories: (c.subcategorias || c.subcategories || []).map((s: any) => ({
          id: String(s.id ?? s.uuid ?? `s_${Date.now()}`),
          name: s.nombre ?? s.name ?? 'Sin nombre',
          raw: s,
        })),
      }));
      setCategories(cats);

      const ents: KBEntry[] = (entriesRaw || []).map((e: any) => ({
        id: e.id ?? e.uuid ?? String(e.id),
        titulo: e.titulo ?? e.title ?? 'Sin título',
        contenido_html: e.contenido_html ?? e.contenidoHtml ?? '',
        categoria_id: e.categoria_id ?? e.categoriaId ?? null,
        subcategoria_id: e.subcategoria_id ?? e.subcategoriaId ?? null,
        status: e.status ?? 'DRAFT',
        raw: e,
      }));
      setEntries(ents);
    } catch (err) {
      console.error('Error cargando KB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Helpers ── */
  const toggleCat = (catId: string) => {
    if (expandedCatId === catId) {
      setExpandedCatId(null);
      setExpandedSubId(null);
    } else {
      setExpandedCatId(catId);
      setExpandedSubId(null);
    }
  };

  const toggleSub = (subId: string) => {
    setExpandedSubId(prev => prev === subId ? null : subId);
  };

  const getEntriesForSub = (cat: Category, sub: Subcategory) => {
    const cId = cat.raw?.id ?? cat.id;
    const sId = sub.raw?.id ?? sub.id;
    return entries.filter(e =>
      String(e.categoria_id) === String(cId) &&
      String(e.subcategoria_id) === String(sId)
    );
  };

  const confirmInlineSub = async () => {
    if (!addingSubForCat || !inlineSubName.trim()) return;
    try {
      const resp: any = await createSubcategoria(addingSubForCat, inlineSubName.trim());
      const newSub: Subcategory = {
        id: String(resp.id ?? resp.uuid ?? `s_${Date.now()}`),
        name: resp.nombre ?? resp.name ?? inlineSubName.trim(),
        raw: resp,
      };
      setCategories(prev => prev.map(c =>
        c.id === addingSubForCat ? { ...c, subcategories: [...c.subcategories, newSub] } : c
      ));
      setSelectedSubId(newSub.id);
    } catch (err) {
      console.error('Error creando subcategoría:', err);
    } finally {
      setInlineSubName('');
      setAddingSubForCat(null);
    }
  };

  const openWizard = () => {
    setWizardStep(1);
    setWizardTitulo('');
    setEditingContent('');
    setSelectedCatId(categories[0]?.id ?? null);
    setSelectedSubId(categories[0]?.subcategories?.[0]?.id ?? null);
    setEditorKey(k => k + 1);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setWizardTitulo('');
    setEditingContent('');
    setAddingSubForCat(null);
    setInlineSubName('');
  };

  const handleSaveEntry = async (html: string) => {
    if (!selectedCatId) { alert('Seleccione una categoría'); return; }
    setSaving(true);
    try {
      const titulo = wizardTitulo.trim() || 'Sin título';
      const selCat = categories.find(cc => cc.id === selectedCatId);
      let maybeUuid = selCat?.raw?.uuid ?? selCat?.raw?.id ?? selCat?.id;

      if (!isUuid(String(maybeUuid))) {
        try {
          const serverCat: any = await getCategoria(String(selectedCatId));
          maybeUuid = serverCat?.id ?? serverCat?.uuid ?? maybeUuid;
        } catch { /* silent */ }
      }

      if (!isUuid(String(maybeUuid))) {
        alert('No se puede crear la entrada: UUID de categoría inválido.');
        return;
      }

      // Resolve subcategoria UUID
      let subUuid: string | null = null;
      if (selectedSubId) {
        const selSub = selCat?.subcategories.find(s => s.id === selectedSubId);
        subUuid = selSub?.raw?.id ?? selSub?.id ?? selectedSubId;
      }

      const newEntry: any = await createEntrada({
        categoriaId: String(maybeUuid),
        subcategoriaId: subUuid,
        titulo,
        contenidoHtml: html,
        contenidoTexto: '',
      });

      const createdEntry: KBEntry = {
        id: newEntry.id ?? newEntry.uuid ?? String(Date.now()),
        titulo,
        contenido_html: html,
        categoria_id: newEntry.categoria_id ?? maybeUuid,
        subcategoria_id: newEntry.subcategoria_id ?? subUuid,
        status: newEntry.status ?? 'DRAFT',
        raw: newEntry,
      };

      setEntries(prev => [...prev, createdEntry]);
      closeWizard();

      // Auto-select the new entry if it's in the tree navigation
      onEntrySelected(createdEntry);

      // Expand to the new entry's location
      setExpandedCatId(selectedCatId);
      setExpandedSubId(selectedSubId);

      // Refresh data
      await loadData();
    } catch (err: any) {
      console.error('Error guardando entrada:', err);
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error desconocido';
      alert('Error al guardar la entrada: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedCat = categories.find(c => c.id === selectedCatId);

  /* ════════════════════════════
     RENDER
  ════════════════════════════ */
  return (
    <>
      {/* ── GLOBAL STYLES (scoped to .tkb- prefix) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        /* ── KB PANEL ── */
        .tkb-panel { font-family:'DM Sans',sans-serif; background:#fff; border-radius:14px; border:1px solid #dbeafe; box-shadow:0 2px 12px rgba(30,58,138,.07); overflow:hidden; }
        .tkb-header { display:flex; align-items:center; justify-content:space-between; padding:.75rem 1rem; background:linear-gradient(90deg,#1e3a8a,#1d6fd8); }
        .tkb-header-left { display:flex; align-items:center; gap:.5rem; }
        .tkb-header-left svg { color:#fff; opacity:.85; }
        .tkb-header-title { font-size:.8125rem; font-weight:700; color:#fff; letter-spacing:-.01em; }
        .tkb-new-btn { display:inline-flex; align-items:center; gap:.3rem; font-family:'DM Sans',sans-serif; font-size:.75rem; font-weight:600; padding:.35rem .75rem; border-radius:6px; border:1.5px solid rgba(255,255,255,.35); background:rgba(255,255,255,.12); color:#fff; cursor:pointer; transition:all .15s; }
        .tkb-new-btn:hover { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.55); }

        /* ── SELECTED ENTRY BANNER ── */
        .tkb-selected-banner { display:flex; align-items:center; gap:.5rem; padding:.625rem 1rem; background:#dcfce7; border-bottom:1px solid #bbf7d0; }
        .tkb-selected-banner span { font-size:.775rem; font-weight:600; color:#15803d; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .tkb-deselect-btn { border:none; background:transparent; color:#16a34a; cursor:pointer; display:flex; align-items:center; padding:2px; border-radius:4px; transition:background .12s; }
        .tkb-deselect-btn:hover { background:#bbf7d0; }

        /* ── TREE ── */
        .tkb-tree { padding:.5rem 0; max-height:360px; overflow-y:auto; }
        .tkb-empty { padding:2rem 1rem; text-align:center; color:#94a3b8; font-size:.8rem; }

        /* category row */
        .tkb-cat-row { display:flex; align-items:center; gap:0; width:100%; border:none; background:transparent; cursor:pointer; padding:.45rem .75rem .45rem 1rem; font-family:'DM Sans',sans-serif; transition:background .12s; }
        .tkb-cat-row:hover { background:#f0f6ff; }
        .tkb-cat-row.expanded { background:#eff6ff; }
        .tkb-cat-chevron { width:16px; height:16px; flex-shrink:0; color:#93c5fd; transition:transform .15s; }
        .tkb-cat-chevron.open { transform:rotate(90deg); color:#1d6fd8; }
        .tkb-cat-icon { width:14px; height:14px; flex-shrink:0; margin:0 .4rem 0 .25rem; }
        .tkb-cat-name { font-size:.8125rem; font-weight:700; color:#0f2a52; flex:1; text-align:left; }
        .tkb-cat-count { font-family:'DM Mono',monospace; font-size:.65rem; font-weight:500; color:#1d6fd8; background:#eff6ff; border:1px solid #bfdbfe; padding:1px 6px; border-radius:999px; }

        /* subcategory row */
        .tkb-sub-row { display:flex; align-items:center; gap:0; width:100%; border:none; background:transparent; cursor:pointer; padding:.375rem .75rem .375rem 2.25rem; font-family:'DM Sans',sans-serif; transition:background .12s; }
        .tkb-sub-row:hover { background:#f8fbff; }
        .tkb-sub-row.expanded { background:#eff6ff; }
        .tkb-sub-chevron { width:14px; height:14px; flex-shrink:0; color:#bfdbfe; transition:transform .15s; }
        .tkb-sub-chevron.open { transform:rotate(90deg); color:#38bdf8; }
        .tkb-sub-name { font-size:.775rem; font-weight:500; color:#334155; flex:1; text-align:left; margin-left:.375rem; }
        .tkb-sub-count { font-family:'DM Mono',monospace; font-size:.62rem; font-weight:500; color:#38bdf8; background:#f0f9ff; border:1px solid #bae6fd; padding:1px 5px; border-radius:999px; }

        /* entry row */
        .tkb-entries { padding:.25rem 0; background:#f8fbff; border-bottom:1px solid #f0f6ff; }
        .tkb-entry-row { display:flex; align-items:center; gap:.4rem; padding:.35rem .625rem .35rem 3rem; cursor:pointer; transition:background .12s; background:transparent; width:100%; font-family:'DM Sans',sans-serif; }
        .tkb-entry-row:hover { background:#eff6ff; }
        .tkb-entry-row.selected { background:#dbeafe; }
        .tkb-entry-icon { width:14px; height:14px; flex-shrink:0; color:#60a5fa; }
        .tkb-entry-icon.selected { color:#1d6fd8; }
        .tkb-entry-title { font-size:.775rem; font-weight:500; color:#334155; flex:1; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }
        .tkb-entry-title.selected { font-weight:700; color:#1d4ed8; }
        .tkb-entry-check { width:14px; height:14px; flex-shrink:0; color:#1d6fd8; }
        .tkb-no-entries { padding:.5rem .75rem .5rem 3rem; font-size:.75rem; color:#94a3b8; font-style:italic; }
        .tkb-ver-btn { display:inline-flex; align-items:center; gap:3px; font-family:'DM Sans',sans-serif; font-size:.68rem; font-weight:600; padding:2px 7px; border-radius:5px; border:1.5px solid #bfdbfe; background:#fff; color:#1d6fd8; cursor:pointer; flex-shrink:0; transition:all .12s; white-space:nowrap; }
        .tkb-ver-btn:hover { background:#eff6ff; border-color:#1d6fd8; }

        /* ── PREVIEW MODAL ── */
        .tkb-preview { background:#fff; border-radius:14px; box-shadow:0 24px 64px rgba(8,28,60,.24); width:100%; max-width:780px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; }
        .tkb-preview-head { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; background:linear-gradient(90deg,#1e3a8a,#1d6fd8); flex-shrink:0; }
        .tkb-preview-head h2 { font-size:.9375rem; font-weight:700; color:#fff; margin:0; letter-spacing:-.01em; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:1rem; }
        .tkb-preview-body { flex:1; overflow-y:auto; padding:1.75rem 2rem; background:#f8fbff; }
        .tkb-preview-content { background:#fff; border-radius:10px; border:1px solid #dbeafe; padding:2rem 2.5rem; box-shadow:0 1px 6px rgba(29,111,216,.07); font-family:'DM Sans',sans-serif; font-size:14px; line-height:1.75; color:#1e293b; }
        .tkb-preview-content p{margin:0 0 .5em} .tkb-preview-content h1{font-size:2em;font-weight:700;color:#0f2a52;margin:.5em 0 .25em;line-height:1.2} .tkb-preview-content h2{font-size:1.5em;font-weight:700;color:#0f2a52;margin:.5em 0 .25em} .tkb-preview-content h3{font-size:1.17em;font-weight:700;color:#1e3a5f;margin:.5em 0 .25em}
        .tkb-preview-content ul,.tkb-preview-content ol{margin:.25em 0 .5em 1.5em} .tkb-preview-content li{margin-bottom:.2em} .tkb-preview-content table{border-collapse:collapse;width:100%;margin:8px 0} .tkb-preview-content td,.tkb-preview-content th{border:1px solid #bfdbfe;padding:6px 10px} .tkb-preview-content a{color:#1d6fd8;text-decoration:underline} .tkb-preview-content hr{border:none;border-top:2px solid #bfdbfe;margin:12px 0} .tkb-preview-content blockquote{border-left:3px solid #38bdf8;margin:.5em 0;padding:6px 14px;color:#475569;background:#f0f9ff;border-radius:0 6px 6px 0}
        .tkb-preview-footer { padding:.875rem 1.5rem; border-top:1px solid #e0eeff; background:#fff; display:flex; justify-content:flex-end; gap:.625rem; flex-shrink:0; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* ── WIZARD OVERLAY ── */
        .tkb-overlay { position:fixed; inset:0; z-index:1500; display:flex; align-items:center; justify-content:center; padding:1rem; background:rgba(8,28,60,.52); backdrop-filter:blur(5px); }
        .tkb-wizard { background:#fff; border-radius:14px; box-shadow:0 24px 64px rgba(8,28,60,.24); width:100%; max-width:980px; max-height:94vh; overflow-y:auto; }
        .tkb-wizard-head { display:flex; align-items:center; justify-content:space-between; padding:1.125rem 1.5rem; background:linear-gradient(90deg,#1e3a8a,#1d6fd8); position:sticky; top:0; z-index:10; }
        .tkb-wizard-head h2 { font-size:.9375rem; font-weight:700; color:#fff; margin:0; letter-spacing:-.01em; }
        .tkb-wizard-close { background:rgba(255,255,255,.15); border:none; color:#fff; width:1.75rem; height:1.75rem; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem; transition:background .15s; }
        .tkb-wizard-close:hover { background:rgba(255,255,255,.28); }
        .tkb-wizard-body { padding:1.5rem; }
        .tkb-wizard-footer { padding:0 1.5rem 1.5rem; display:flex; justify-content:flex-end; gap:.625rem; }

        /* ── STEPS ── */
        .tkb-steps { display:flex; align-items:center; margin-bottom:1.75rem; }
        .tkb-step { display:flex; align-items:center; gap:.5rem; }
        .tkb-step-circle { width:1.75rem; height:1.75rem; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; flex-shrink:0; transition:all .2s; }
        .tkb-step-circle.active { background:linear-gradient(135deg,#1d6fd8,#38bdf8); color:#fff; box-shadow:0 2px 8px rgba(29,111,216,.3); }
        .tkb-step-circle.done { background:#dcfce7; color:#16a34a; }
        .tkb-step-circle.inactive { background:#f1f5f9; color:#94a3b8; border:1.5px solid #e2e8f0; }
        .tkb-step-label { font-size:.75rem; font-weight:600; color:#334155; }
        .tkb-step-label.active-lbl { color:#1d6fd8; }
        .tkb-step-connector { flex:1; height:1.5px; background:#bfdbfe; margin:0 .75rem; }

        /* ── CAT CARDS (wizard step 1) ── */
        .tkb-step1-hint { font-size:.78rem; color:#64748b; margin-bottom:1rem; background:#f0f6ff; padding:.5rem .875rem; border-radius:7px; border-left:3px solid #38bdf8; }
        .tkb-step1-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.125rem; }
        .tkb-cat-card { border:1.5px solid #dbeafe; border-radius:10px; overflow:hidden; background:#fafcff; transition:border-color .15s; }
        .tkb-cat-card.selected { border-color:#1d6fd8; box-shadow:0 0 0 3px rgba(29,111,216,.10); }
        .tkb-cat-card-head { display:flex; align-items:center; justify-content:space-between; padding:.625rem .875rem; background:#f0f6ff; border-bottom:1px solid #e0eeff; cursor:pointer; transition:background .12s; }
        .tkb-cat-card-head:hover { background:#e6f0fd; }
        .tkb-cat-card-head.sel-head { background:linear-gradient(90deg,#dbeafe,#e0f2fe); }
        .tkb-radio-dot { width:14px; height:14px; border-radius:50%; border:2px solid #93c5fd; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; }
        .tkb-radio-dot.checked { border-color:#1d6fd8; background:#1d6fd8; }
        .tkb-radio-dot.checked::after { content:''; width:5px; height:5px; border-radius:50%; background:#fff; display:block; }
        .tkb-cat-card-name { font-size:.825rem; font-weight:700; color:#0f2a52; }
        .tkb-cat-card-body { padding:.5rem .75rem .75rem; }
        .tkb-sub-option { display:flex; align-items:center; gap:.5rem; padding:.3125rem .5rem; border-radius:6px; cursor:pointer; transition:background .12s; margin-bottom:2px; }
        .tkb-sub-option:hover { background:#eff6ff; }
        .tkb-sub-option.sub-sel { background:#dbeafe; }
        .tkb-sub-radio { width:12px; height:12px; border-radius:50%; border:2px solid #93c5fd; flex-shrink:0; transition:all .15s; display:flex; align-items:center; justify-content:center; }
        .tkb-sub-radio.checked { border-color:#1d6fd8; background:#1d6fd8; }
        .tkb-sub-radio.checked::after { content:''; width:4px; height:4px; border-radius:50%; background:#fff; display:block; }
        .tkb-sub-name-wiz { font-size:.775rem; color:#334155; }
        .tkb-inline-add { display:flex; gap:.375rem; margin-top:.375rem; padding-top:.375rem; border-top:1px dashed #dbeafe; }
        .tkb-inline-input { flex:1; padding:.3rem .6rem; border:1.5px solid #dbeafe; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:.775rem; color:#0f172a; background:#fff; outline:none; }
        .tkb-inline-input:focus { border-color:#1d6fd8; }
        .tkb-inline-ok { padding:.3rem .6rem; border:none; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:.75rem; font-weight:600; cursor:pointer; background:#1d6fd8; color:#fff; }
        .tkb-inline-no { padding:.3rem .6rem; border:none; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:.75rem; font-weight:600; cursor:pointer; background:#f1f5f9; color:#64748b; }
        .tkb-add-sub-link { display:inline-flex; align-items:center; gap:3px; font-size:.75rem; color:#1d6fd8; font-weight:500; cursor:pointer; margin-top:4px; padding:2px 4px; border-radius:4px; transition:background .12s; border:none; background:transparent; font-family:'DM Sans',sans-serif; }
        .tkb-add-sub-link:hover { background:#eff6ff; }

        /* ── BREADCRUMB IN STEP 2 ── */
        .tkb-ctx-pill { display:flex; align-items:center; gap:.5rem; margin-bottom:1rem; padding:.5rem .875rem; background:#eff6ff; border-radius:8px; border:1px solid #dbeafe; }
        .tkb-ctx-pill span { font-size:.775rem; color:#1e3a5f; font-weight:500; }
        .tkb-ctx-pill .sep { color:#93c5fd; margin:0 4px; }

        /* ── BUTTONS ── */
        .tkb-btn { display:inline-flex; align-items:center; gap:.375rem; font-family:'DM Sans',sans-serif; font-size:.8125rem; font-weight:600; padding:.5rem 1rem; border-radius:7px; border:none; cursor:pointer; transition:all .15s; }
        .tkb-btn-primary { background:linear-gradient(135deg,#1d6fd8,#2563eb); color:#fff; box-shadow:0 2px 8px rgba(29,111,216,.25); }
        .tkb-btn-primary:hover { background:linear-gradient(135deg,#1a5fc0,#1d4ed8); }
        .tkb-btn-primary:disabled { opacity:.45; cursor:not-allowed; }
        .tkb-btn-ghost { background:#fff; color:#475569; border:1.5px solid #e2e8f0; }
        .tkb-btn-ghost:hover { background:#f8fafc; }

        /* ── FIELD ── */
        .tkb-field label { display:block; font-size:.78rem; font-weight:600; color:#1e3a5f; margin-bottom:.375rem; text-transform:uppercase; letter-spacing:.04em; }
        .tkb-input { width:100%; padding:.5625rem .875rem; border:1.5px solid #cbd5e1; border-radius:7px; font-family:'DM Sans',sans-serif; font-size:.875rem; color:#0f172a; background:#fafcff; transition:border-color .15s; outline:none; }
        .tkb-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.12); }

        /* ── KnowledgeEditor shared styles (same as BaseConocimientosPage) ── */
        .ke-wrap { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; border-radius:10px; overflow:hidden; border:1.5px solid #bfdbfe; box-shadow:0 4px 24px rgba(29,111,216,.10); background:#f0f6ff; }
        .ke-toolbar { background:linear-gradient(180deg,#fff,#f5f9ff); border-bottom:1.5px solid #dbeafe; padding:6px 10px; display:flex; flex-direction:column; gap:5px; }
        .ke-toolbar-row { display:flex; align-items:center; gap:2px; flex-wrap:wrap; }
        .ke-sel { font-family:'DM Sans',sans-serif; font-size:12px; font-weight:500; color:#1e3a5f; background:#fff; border:1.5px solid #dbeafe; border-radius:6px; padding:2px 6px; cursor:pointer; height:26px; outline:none; transition:border-color .15s; }
        .ke-sel:hover,.ke-sel:focus { border-color:#1d6fd8; }
        .ke-hbtn { height:26px; padding:0 8px; border:1.5px solid #dbeafe; border-radius:5px; background:#fff; color:#1e3a5f; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; flex-shrink:0; transition:background .12s; }
        .ke-hbtn:hover { background:#eff6ff; }
        .ke-ghost:hover { background:#eff6ff !important; }
        .ke-color-wrap { position:relative; display:inline-flex; flex-direction:column; align-items:center; cursor:pointer; }
        .ke-color-btn { width:28px; height:26px; border:1.5px solid #dbeafe; border-radius:5px; background:#fff; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; transition:border-color .15s; }
        .ke-color-btn:hover { border-color:#1d6fd8; background:#eff6ff; }
        .ke-color-bar { width:14px; height:3px; border-radius:2px; }
        .ke-color-input { position:absolute; width:1px; height:1px; opacity:0; top:0; left:0; }
        .ke-page-wrap { background:#dce8fa; padding:20px; min-height:340px; max-height:400px; display:flex; justify-content:center; overflow-y:auto; }
        .ke-page { background:#fff; width:100%; max-width:740px; min-height:320px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(29,111,216,.07),0 0 0 1px rgba(191,219,254,.6); padding:40px 52px; }
        .ke-editor { outline:none; min-height:260px; font-family:'DM Sans',sans-serif; font-size:14px; line-height:1.75; color:#1e293b; caret-color:#1d6fd8; }
        .ke-editor:empty::before { content:'Comienza a escribir aquí...'; color:#94a3b8; pointer-events:none; }
        .ke-editor p{margin:0 0 .5em} .ke-editor h1{font-size:2em;font-weight:700;color:#0f2a52;margin:.5em 0 .25em;line-height:1.2} .ke-editor h2{font-size:1.5em;font-weight:700;color:#0f2a52;margin:.5em 0 .25em} .ke-editor h3{font-size:1.17em;font-weight:700;color:#1e3a5f;margin:.5em 0 .25em}
        .ke-editor ul,.ke-editor ol{margin:.25em 0 .5em 1.5em} .ke-editor li{margin-bottom:.2em} .ke-editor table{border-collapse:collapse;width:100%;margin:8px 0} .ke-editor td,.ke-editor th{border:1px solid #bfdbfe;padding:6px 10px} .ke-editor a{color:#1d6fd8;text-decoration:underline} .ke-editor hr{border:none;border-top:2px solid #bfdbfe;margin:12px 0} .ke-editor blockquote{border-left:3px solid #38bdf8;margin:.5em 0;padding:6px 14px;color:#475569;background:#f0f9ff;border-radius:0 6px 6px 0}
        .ke-statusbar { background:linear-gradient(180deg,#f5f9ff,#eff6ff); border-top:1.5px solid #dbeafe; padding:6px 14px; display:flex; align-items:center; justify-content:space-between; }
        .ke-stat { font-size:11px; color:#5b84b8; font-weight:500; display:inline-flex; align-items:center; gap:4px; margin-right:12px; }
        .ke-stat strong { color:#1e3a5f; }
        .ke-btn { font-family:'DM Sans',sans-serif; font-size:12.5px; font-weight:600; padding:5px 14px; border-radius:6px; border:none; cursor:pointer; transition:all .15s; display:inline-flex; align-items:center; gap:5px; }
        .ke-btn-cancel { background:#fff; color:#475569; border:1.5px solid #cbd5e1; }
        .ke-btn-cancel:hover { background:#f8fafc; border-color:#94a3b8; }
        .ke-btn-save { background:linear-gradient(135deg,#1d6fd8,#2563eb); color:#fff; box-shadow:0 2px 8px rgba(29,111,216,.25); }
        .ke-btn-save:hover { background:linear-gradient(135deg,#1a5fc0,#1d4ed8); transform:translateY(-1px); }
      `}</style>

      {/* ════════════════ PANEL ════════════════ */}
      <div className="tkb-panel">
        {/* Header */}
        <div className="tkb-header">
          <div className="tkb-header-left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span className="tkb-header-title">Base de Conocimiento</span>
          </div>
          <button className="tkb-new-btn" onClick={openWizard}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nueva entrada
          </button>
        </div>

        {/* Selected entry banner */}
        {selectedEntry && (
          <div className="tkb-selected-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span title={selectedEntry.titulo}>{selectedEntry.titulo}</span>
            <button className="tkb-deselect-btn" title="Deseleccionar entrada" onClick={() => onEntrySelected(null)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* Tree */}
        <div className="tkb-tree">
          {loading ? (
            <div className="tkb-empty">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2"
                style={{ display:'block', margin:'0 auto .5rem', animation:'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Cargando...
            </div>
          ) : categories.length === 0 ? (
            <div className="tkb-empty">
              Sin categorías. Crea una entrada para comenzar.
            </div>
          ) : (
            categories.map(cat => {
              const catExpanded = expandedCatId === cat.id;
              const catEntryCount = entries.filter(e => String(e.categoria_id) === String(cat.raw?.id ?? cat.id)).length;
              return (
                <div key={cat.id}>
                  {/* Category row */}
                  <button
                    className={`tkb-cat-row${catExpanded ? ' expanded' : ''}`}
                    onClick={() => toggleCat(cat.id)}
                  >
                    <svg className={`tkb-cat-chevron${catExpanded ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                    <svg className="tkb-cat-icon" viewBox="0 0 24 24" fill={catExpanded ? '#1d6fd8' : '#93c5fd'} stroke="none">
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                    <span className="tkb-cat-name">{cat.name}</span>
                    <span className="tkb-cat-count">{catEntryCount}</span>
                  </button>

                  {/* Subcategory rows */}
                  {catExpanded && cat.subcategories.map(sub => {
                    const subExpanded = expandedSubId === sub.id;
                    const subEntries = getEntriesForSub(cat, sub);
                    return (
                      <div key={sub.id}>
                        <button
                          className={`tkb-sub-row${subExpanded ? ' expanded' : ''}`}
                          onClick={() => toggleSub(sub.id)}
                        >
                          <svg className={`tkb-sub-chevron${subExpanded ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                          <span className="tkb-sub-name">{sub.name}</span>
                          <span className="tkb-sub-count">{subEntries.length}</span>
                        </button>

                        {/* Entry rows */}
                        {subExpanded && (
                          <div className="tkb-entries">
                            {subEntries.length === 0 ? (
                              <div className="tkb-no-entries">Sin entradas en esta subcategoría</div>
                            ) : (
                              subEntries.map(entry => {
                                const isSel = selectedEntry?.id === entry.id;
                                return (
                                  <div
                                    key={entry.id}
                                    className={`tkb-entry-row${isSel ? ' selected' : ''}`}
                                  >
                                    <svg className={`tkb-entry-icon${isSel ? ' selected' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                      <polyline points="14 2 14 8 20 8"/>
                                      <line x1="16" y1="13" x2="8" y2="13"/>
                                      <line x1="16" y1="17" x2="8" y2="17"/>
                                    </svg>
                                    <span
                                      className={`tkb-entry-title${isSel ? ' selected' : ''}`}
                                      onClick={() => onEntrySelected(isSel ? null : entry)}
                                      title={entry.titulo}
                                    >
                                      {entry.titulo}
                                    </span>
                                    {isSel && (
                                      <svg className="tkb-entry-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    )}
                                    <button
                                      className="tkb-ver-btn"
                                      onClick={e => { e.stopPropagation(); openPreview(entry); }}
                                      title="Ver contenido de la entrada"
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                      </svg>
                                      Ver
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* If category has no subcategories */}
                  {catExpanded && cat.subcategories.length === 0 && (
                    <div className="tkb-no-entries" style={{ paddingLeft: '2.25rem' }}>
                      Sin subcategorías
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Hint: click to select */}
        {!selectedEntry && !loading && categories.length > 0 && (
          <div style={{ padding: '.5rem 1rem .75rem', borderTop: '1px solid #f0f6ff' }}>
            <p style={{ fontSize: '.72rem', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
              Selecciona una entrada para habilitar "Culminar ticket"
            </p>
          </div>
        )}
      </div>

      {/* ════════════════ PREVIEW MODAL ════════════════ */}
      {previewEntry && (
        <div className="tkb-overlay" onClick={() => setPreviewEntry(null)}>
          <div className="tkb-preview" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="tkb-preview-head">
              <h2>{previewEntry.titulo}</h2>
              <button
                style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:'1.1rem', lineHeight:1, padding:'2px 6px', borderRadius:6 }}
                onClick={() => setPreviewEntry(null)}
              >✕</button>
            </div>

            {/* Body */}
            <div className="tkb-preview-body">
              {previewLoading
                ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'3rem', gap:'.75rem', color:'#64748b', fontSize:'.85rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d6fd8" strokeWidth="2.5" style={{ animation:'spin 1s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Cargando contenido...
                  </div>
                : previewEntry.contenido_html
                  ? <div
                      className="tkb-preview-content"
                      dangerouslySetInnerHTML={{ __html: previewEntry.contenido_html }}
                    />
                  : <p style={{ color:'#94a3b8', fontStyle:'italic', fontSize:'.85rem' }}>Esta entrada no tiene contenido.</p>
              }
            </div>

            {/* Footer */}
            <div className="tkb-preview-footer">
              <button
                style={{ padding:'.45rem 1.1rem', borderRadius:8, border:'1.5px solid #bfdbfe', background:'#fff', color:'#1d6fd8', fontWeight:600, fontSize:'.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}
                onClick={() => setPreviewEntry(null)}
              >Cerrar</button>
              <button
                style={{ padding:'.45rem 1.25rem', borderRadius:8, border:'none', background:'linear-gradient(90deg,#1e3a8a,#1d6fd8)', color:'#fff', fontWeight:700, fontSize:'.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}
                onClick={() => {
                  onEntrySelected(previewEntry);
                  setPreviewEntry(null);
                }}
              >Seleccionar entrada</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ WIZARD MODAL ════════════════ */}
      {wizardOpen && (
        <div className="tkb-overlay">
          <div className="tkb-wizard">
            {/* Header */}
            <div className="tkb-wizard-head">
              <h2>
                {wizardStep === 1
                  ? 'Nueva entrada — Paso 1: Seleccionar categoría'
                  : 'Nueva entrada — Paso 2: Redactar contenido'}
              </h2>
              <button className="tkb-wizard-close" onClick={closeWizard}>✕</button>
            </div>

            <div className="tkb-wizard-body">
              {/* Step indicator */}
              <div className="tkb-steps">
                <div className="tkb-step">
                  <div className={`tkb-step-circle ${wizardStep === 1 ? 'active' : 'done'}`}>
                    {wizardStep > 1 ? '✓' : '1'}
                  </div>
                  <span className={`tkb-step-label ${wizardStep === 1 ? 'active-lbl' : ''}`}>Categorización</span>
                </div>
                <div className="tkb-step-connector"/>
                <div className="tkb-step">
                  <div className={`tkb-step-circle ${wizardStep === 2 ? 'active' : 'inactive'}`}>2</div>
                  <span className={`tkb-step-label ${wizardStep === 2 ? 'active-lbl' : ''}`}>Contenido</span>
                </div>
              </div>

              {/* ── PASO 1 ── */}
              {wizardStep === 1 && (
                <>
                  <p className="tkb-step1-hint">
                    Selecciona la categoría y subcategoría donde se guardará esta entrada. Puedes agregar subcategorías nuevas directamente desde aquí.
                  </p>

                  {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '.85rem' }}>
                      No hay categorías aún. Crea una desde el módulo de Base de Conocimiento.
                    </div>
                  ) : (
                    <div className="tkb-step1-grid">
                      {categories.map(c => (
                        <div key={c.id} className={`tkb-cat-card ${selectedCatId === c.id ? 'selected' : ''}`}>
                          <div
                            className={`tkb-cat-card-head ${selectedCatId === c.id ? 'sel-head' : ''}`}
                            onClick={() => { setSelectedCatId(c.id); setSelectedSubId(c.subcategories[0]?.id ?? null); }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                              <div className={`tkb-radio-dot ${selectedCatId === c.id ? 'checked' : ''}`}/>
                              <span className="tkb-cat-card-name">{c.name}</span>
                            </div>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.6875rem', fontWeight: 500, padding: '.1875rem .625rem', background: '#eff6ff', color: '#1d6fd8', borderRadius: 999, border: '1px solid #bfdbfe' }}>
                              {c.subcategories.length}
                            </span>
                          </div>

                          {selectedCatId === c.id && (
                            <div className="tkb-cat-card-body">
                              {c.subcategories.length === 0 && addingSubForCat !== c.id && (
                                <p style={{ fontSize: '.75rem', color: '#94a3b8', margin: '4px 0', fontStyle: 'italic' }}>Sin subcategorías</p>
                              )}
                              {c.subcategories.map(sc => (
                                <div key={sc.id}
                                  className={`tkb-sub-option ${selectedSubId === sc.id ? 'sub-sel' : ''}`}
                                  onClick={() => setSelectedSubId(sc.id)}>
                                  <div className={`tkb-sub-radio ${selectedSubId === sc.id ? 'checked' : ''}`}/>
                                  <span className="tkb-sub-name-wiz">{sc.name}</span>
                                </div>
                              ))}

                              {addingSubForCat === c.id ? (
                                <div className="tkb-inline-add">
                                  <input autoFocus className="tkb-inline-input"
                                    placeholder="Nombre subcategoría..."
                                    value={inlineSubName}
                                    onChange={e => setInlineSubName(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') confirmInlineSub();
                                      if (e.key === 'Escape') { setAddingSubForCat(null); setInlineSubName(''); }
                                    }}/>
                                  <button className="tkb-inline-ok" onClick={confirmInlineSub}>✓</button>
                                  <button className="tkb-inline-no" onClick={() => { setAddingSubForCat(null); setInlineSubName(''); }}>✕</button>
                                </div>
                              ) : (
                                <button className="tkb-add-sub-link" onClick={() => setAddingSubForCat(c.id)}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                  Añadir subcategoría
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── PASO 2 ── */}
              {wizardStep === 2 && (
                <>
                  {/* Breadcrumb */}
                  <div className="tkb-ctx-pill">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d6fd8" strokeWidth="2.2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    <span>
                      <strong>{selectedCat?.name ?? '—'}</strong>
                      {selectedSubId && selectedCat?.subcategories.find(s => s.id === selectedSubId) && (
                        <><span className="sep">›</span>{selectedCat.subcategories.find(s => s.id === selectedSubId)?.name}</>
                      )}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="tkb-field" style={{ marginBottom: '1rem' }}>
                    <label>Título de la entrada</label>
                    <input
                      autoFocus
                      value={wizardTitulo}
                      onChange={e => setWizardTitulo(e.target.value)}
                      placeholder="Ej. Cómo configurar la impresora en red"
                      className="tkb-input"
                      style={{ fontSize: '1rem', fontWeight: 600 }}
                    />
                  </div>

                  {/* Editor */}
                  <KnowledgeEditor
                    key={editorKey}
                    initialContent={editingContent}
                    onSave={handleSaveEntry}
                    onCancel={closeWizard}
                  />
                </>
              )}
            </div>

            {/* Footer (only step 1) */}
            {wizardStep === 1 && categories.length > 0 && (
              <div className="tkb-wizard-footer">
                <button className="tkb-btn tkb-btn-ghost" onClick={closeWizard}>Cancelar</button>
                <button
                  className="tkb-btn tkb-btn-primary"
                  onClick={() => setWizardStep(2)}
                  disabled={!selectedCatId}
                  style={{ opacity: selectedCatId ? 1 : 0.45, cursor: selectedCatId ? 'pointer' : 'not-allowed' }}
                >
                  Siguiente — Redactar contenido
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </div>
            )}

            {saving && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,28,60,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.5rem', color: '#1e3a5f', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d6fd8" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Guardando...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
