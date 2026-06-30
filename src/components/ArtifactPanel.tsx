import { Copy, Download, Eye, FilePlus2, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Artifact, ProjectInfo } from '../types';
import { artifactKind } from '../services/artifacts';

interface Props {
  artifacts: Artifact[];
  activeArtifactId?: string;
  project?: ProjectInfo;
  onSelectArtifact: (id: string) => void;
  onUpdateArtifact: (id: string, content: string) => void;
  onSaveToProject: (artifact: Artifact, relativePath: string) => void;
}

function downloadArtifact(artifact: Artifact) {
  const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = artifact.title;
  a.click();
  URL.revokeObjectURL(url);
}

export function ArtifactPanel({ artifacts, activeArtifactId, project, onSelectArtifact, onUpdateArtifact, onSaveToProject }: Props) {
  const active = artifacts.find((item) => item.id === activeArtifactId) || artifacts[0];
  const [preview, setPreview] = useState(false);
  const [savePath, setSavePath] = useState('');

  const kind = useMemo(() => active ? artifactKind(active.language) : 'code', [active]);

  return (
    <aside className="artifactPanel">
      <div className="panelHeader">
        <div>
          <strong>Artifacts</strong>
          <span>código, docs e preview</span>
        </div>
        <span className="counter">{artifacts.length}</span>
      </div>

      <div className="artifactTabs">
        {artifacts.map((artifact) => (
          <button
            key={artifact.id}
            className={active?.id === artifact.id ? 'active' : ''}
            onClick={() => onSelectArtifact(artifact.id)}
          >
            {artifact.title}
          </button>
        ))}
      </div>

      {!active ? (
        <div className="emptyPanel">
          <FilePlus2 size={28} />
          <p>Quando a IA gerar blocos de código, eles aparecem aqui.</p>
        </div>
      ) : (
        <>
          <div className="artifactActions">
            <button onClick={() => navigator.clipboard.writeText(active.content)}><Copy size={14} /> Copiar</button>
            <button onClick={() => downloadArtifact(active)}><Download size={14} /> Baixar</button>
            {kind === 'preview' && <button onClick={() => setPreview((v) => !v)}><Eye size={14} /> Preview</button>}
          </div>

          {preview && kind === 'preview' ? (
            <iframe className="htmlPreview" sandbox="allow-scripts" srcDoc={active.content} />
          ) : (
            <textarea
              className="artifactEditor"
              value={active.content}
              spellCheck={false}
              onChange={(e) => onUpdateArtifact(active.id, e.target.value)}
            />
          )}

          <div className="saveBox">
            <input
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              placeholder={project ? 'ex: src/App.tsx' : 'Selecione um projeto'}
              disabled={!project}
            />
            <button
              disabled={!project || !savePath.trim()}
              onClick={() => {
                if (active && savePath.trim()) onSaveToProject(active, savePath.trim());
                setSavePath('');
              }}
            >
              <Save size={14} /> Salvar
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
