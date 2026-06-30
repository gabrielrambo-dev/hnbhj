import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { MemoryItem, ProjectInfo } from '../types';
import { uid } from '../services/storage';

interface Props {
  memories: MemoryItem[];
  activeProject?: ProjectInfo;
  onSave: (memories: MemoryItem[]) => void;
  onClose: () => void;
}

export function MemoryPanel({ memories, activeProject, onSave, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<'global' | 'project'>('global');

  function add() {
    if (!title.trim() || !content.trim()) return;
    const item: MemoryItem = {
      id: uid('memory'),
      title: title.trim(),
      content: content.trim(),
      scope,
      projectId: scope === 'project' ? activeProject?.id : undefined,
      createdAt: new Date().toISOString()
    };
    onSave([item, ...memories]);
    setTitle('');
    setContent('');
  }

  function remove(id: string) {
    onSave(memories.filter((item) => item.id !== id));
  }

  return (
    <div className="modalBackdrop">
      <div className="modal large">
        <div className="modalHeader">
          <div>
            <strong>Memória local</strong>
            <span>Preferências, decisões e padrões de código usados no contexto.</span>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="twoCols">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
          <select value={scope} onChange={(e) => setScope(e.target.value as 'global' | 'project')}>
            <option value="global">Global</option>
            <option value="project" disabled={!activeProject}>Projeto atual</option>
          </select>
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conteúdo da memória" />
        <button className="primaryBtn" onClick={add}><Plus size={14} /> Adicionar memória</button>

        <div className="memoryList">
          {memories.map((item) => (
            <div className="memoryCard" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.scope === 'global' ? 'Global' : 'Projeto'} · {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                <p>{item.content}</p>
              </div>
              <button onClick={() => remove(item.id)}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
