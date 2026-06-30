import { File, Folder, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FileNode, ProjectInfo } from '../types';

interface Props {
  project?: ProjectInfo;
  tree: FileNode[];
  activeFile?: string;
  fileContent: string;
  dirty: boolean;
  onRefresh: () => void;
  onOpenFile: (node: FileNode) => void;
  onChangeContent: (content: string) => void;
  onSaveFile: () => void;
  onDeleteFile: () => void;
  onCreateFile: (relativePath: string) => void;
  onSendProjectContext: () => void;
}

function TreeNode({ node, activeFile, onOpenFile }: { node: FileNode; activeFile?: string; onOpenFile: (node: FileNode) => void }) {
  const [open, setOpen] = useState(true);
  if (node.type === 'directory') {
    return (
      <div className="treeNode">
        <button className="treeItem dir" onClick={() => setOpen((v) => !v)}>
          <Folder size={14} /> {node.name}
        </button>
        {open && <div className="treeChildren">{node.children?.map((child) => <TreeNode key={child.path} node={child} activeFile={activeFile} onOpenFile={onOpenFile} />)}</div>}
      </div>
    );
  }

  return (
    <button className={`treeItem file ${activeFile === node.path ? 'active' : ''}`} onClick={() => onOpenFile(node)}>
      <File size={13} /> {node.name}
    </button>
  );
}

export function ProjectPanel(props: Props) {
  const [newPath, setNewPath] = useState('');

  if (!props.project) {
    return (
      <section className="projectPanel emptyProject">
        <h2>Projeto</h2>
        <p>Selecione uma pasta na lateral para o Nemotron ler arquivos, editar código e rodar terminal.</p>
      </section>
    );
  }

  return (
    <section className="projectPanel">
      <div className="projectHeader">
        <div>
          <strong>{props.project.name}</strong>
          <span title={props.project.path}>{props.project.path}</span>
        </div>
        <button onClick={props.onRefresh}><RefreshCw size={14} /> Atualizar</button>
      </div>

      <div className="projectActions">
        <input value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="novo arquivo: src/teste.ts" />
        <button onClick={() => { if (newPath.trim()) props.onCreateFile(newPath.trim()); setNewPath(''); }}>Criar</button>
        <button onClick={props.onSendProjectContext}>Analisar projeto</button>
      </div>

      <div className="projectGrid">
        <div className="fileTree">
          {props.tree.map((node) => <TreeNode key={node.path} node={node} activeFile={props.activeFile} onOpenFile={props.onOpenFile} />)}
        </div>

        <div className="editorWrap">
          <div className="editorBar">
            <span>{props.activeFile || 'Nenhum arquivo aberto'}</span>
            <div>
              <button disabled={!props.activeFile || !props.dirty} onClick={props.onSaveFile}><Save size={14} /> Salvar</button>
              <button disabled={!props.activeFile} onClick={props.onDeleteFile}><Trash2 size={14} /> Excluir</button>
            </div>
          </div>
          <textarea
            className="codeEditor"
            value={props.fileContent}
            spellCheck={false}
            disabled={!props.activeFile}
            onChange={(e) => props.onChangeContent(e.target.value)}
            placeholder="Abra um arquivo para editar. Antes de salvar, o app faz backup em .nemotron-backups."
          />
        </div>
      </div>
    </section>
  );
}
