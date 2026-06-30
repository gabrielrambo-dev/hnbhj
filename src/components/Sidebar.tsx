import { Bot, Code2, FileCode2, FolderGit2, History, MemoryStick, Plus, Search, Settings, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { ChatSession, ProjectInfo } from '../types';

interface Props {
  chats: ChatSession[];
  projects: ProjectInfo[];
  activeChatId: string;
  activeProjectId?: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onSelectProject: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  onCreateProject: () => void;
}

export function Sidebar(props: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const sortedChats = [...props.chats]
    .filter((chat) => !q || chat.title.toLowerCase().includes(q) || chat.messages.some((m) => m.content.toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const filteredProjects = props.projects.filter((project) => !q || project.name.toLowerCase().includes(q) || project.path.toLowerCase().includes(q));

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/assets/nemotron.svg" alt="Nemotron" />
        <div>
          <strong>Nemotron</strong>
          <span>NVIDIA Coding AI</span>
        </div>
      </div>

      <button className="primaryBtn full" onClick={props.onNewChat}>
        <Plus size={16} /> Novo chat
      </button>

      <div className="searchBox">
        <Search size={14} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar chats/projetos" />
      </div>

      <div className="navBlock">
        <div className="navTitle"><FolderGit2 size={14} /> Projetos</div>
        <button className="ghostBtn full" onClick={props.onCreateProject}>Selecionar pasta</button>
        <div className="scrollList small">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              className={`listItem ${props.activeProjectId === project.id ? 'active' : ''}`}
              onClick={() => props.onSelectProject(project.id)}
              title={project.path}
            >
              <FileCode2 size={14} />
              <span>{project.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="navBlock grow">
        <div className="navTitle"><History size={14} /> Histórico</div>
        <div className="scrollList">
          {sortedChats.map((chat) => (
            <button
              key={chat.id}
              className={`listItem ${props.activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => props.onSelectChat(chat.id)}
            >
              <Bot size={14} />
              <span>{chat.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bottomNav">
        <button className="ghostBtn full" onClick={props.onOpenMemory}><MemoryStick size={15} /> Memória</button>
        <button className="ghostBtn full" onClick={props.onOpenSettings}><Settings size={15} /> Configurações</button>
        <div className="modePill"><Sparkles size={13} /> API NVIDIA</div>
        <div className="modePill"><Code2 size={13} /> Agent Ready</div>
      </div>
    </aside>
  );
}
