import React, { useRef, useEffect } from 'react';

interface Props {
  initialContent?: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}

export default function KnowledgeEditor({ initialContent = '', onSave, onCancel }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialContent;
  }, [initialContent]);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertCodeBlock = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = sel.toString() || '\n// code here\n';
    pre.appendChild(code);
    range.deleteContents();
    range.insertNode(pre);
  };

  const insertTable = () => {
    const rows = Number(prompt('Filas', '2')) || 2;
    const cols = Number(prompt('Columnas', '2')) || 2;
    let html = '<table style="width:100%; border-collapse: collapse;">';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #ccc; padding:6px">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</table><br/>';
    document.execCommand('insertHTML', false, html);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      document.execCommand('insertImage', false, url);
    };
    reader.readAsDataURL(file);
    // reset
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    const html = editorRef.current?.innerHTML || '';
    onSave(html);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => exec('bold')} className="px-2 py-1 border rounded">B</button>
        <button type="button" onClick={() => exec('italic')} className="px-2 py-1 border rounded">I</button>
        <button type="button" onClick={() => exec('underline')} className="px-2 py-1 border rounded">U</button>
        <select onChange={(e) => exec('fontSize', e.target.value)} defaultValue="3" className="px-2 py-1 border rounded">
          <option value="1">Very Small</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">XL</option>
        </select>
        <button type="button" onClick={() => exec('insertUnorderedList')} className="px-2 py-1 border rounded">• List</button>
        <button type="button" onClick={() => exec('insertOrderedList')} className="px-2 py-1 border rounded">1. List</button>
        <button type="button" onClick={insertCodeBlock} className="px-2 py-1 border rounded">Código</button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImagePick} style={{ display: 'none' }} />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-2 py-1 border rounded">Insertar Imagen</button>
        <button type="button" onClick={() => { const url = prompt('URL del enlace') || ''; if (url) exec('createLink', url); }} className="px-2 py-1 border rounded">Insertar Link</button>
        <button type="button" onClick={insertTable} className="px-2 py-1 border rounded">Insertar Tabla</button>
      </div>
      <div ref={editorRef} contentEditable className="min-h-[260px] p-4 border rounded bg-white text-slate-800" style={{ outline: 'none' }} />
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onCancel} className="px-3 py-2 border rounded">Cancelar</button>
        <button onClick={handleSave} className="px-3 py-2 bg-blue-600 text-white rounded font-bold">Guardar</button>
      </div>
    </div>
  );
}
