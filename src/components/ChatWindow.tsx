import { Copy, FileText, RefreshCw } from 'lucide-react';
import type { ChatMessage } from '../types';
import { estimateMessageTokens, tokenLabel } from '../services/tokenizer';

interface Props {
  messages: ChatMessage[];
  showTokenStats?: boolean;
  onCreateArtifact: (message: ChatMessage) => void;
  onRegenerate?: () => void;
}

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => undefined);
}

export function ChatWindow({ messages, showTokenStats, onCreateArtifact, onRegenerate }: Props) {
  if (messages.length === 0) {
    return (
      <main className="chatEmpty">
        <img src="/assets/nemotron.svg" alt="Nemotron" />
        <h1>Nemotron</h1>
        <p>Assistente desktop com projetos, estudo, artifacts, terminal, fontes e API NVIDIA.</p>
        <div className="starterGrid">
          <div>Analise meu projeto inteiro e diga o que está errado.</div>
          <div>Crie uma tela HTML/CSS/JS em um artifact.</div>
          <div>Monte um plano de estudo rápido para minha prova.</div>
          <div>Use links/arquivos como fonte e cite na resposta.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="chatWindow">
      {messages.map((message) => {
        const tokenEstimate = message.tokenEstimate || estimateMessageTokens(message);
        return (
          <article key={message.id} className={`message ${message.role}`}>
            <div className="avatar">{message.role === 'user' ? 'EU' : 'N'}</div>
            <div className="messageBody">
              <div className="messageMeta">
                <strong>{message.role === 'user' ? 'Você' : 'Nemotron'}</strong>
                <span>{new Date(message.createdAt).toLocaleString('pt-BR')}</span>
                {message.mode && <span className="modeTag">{message.mode}</span>}
                {showTokenStats && <span className="tokenTag">~{tokenLabel(tokenEstimate)} tokens</span>}
                <button onClick={() => copy(message.content)} title="Copiar"><Copy size={14} /></button>
                {message.role === 'assistant' && (
                  <button onClick={() => onCreateArtifact(message)} title="Criar artifacts dos blocos de código"><FileText size={14} /></button>
                )}
                {message.role === 'assistant' && onRegenerate && (
                  <button onClick={onRegenerate} title="Regenerar"><RefreshCw size={14} /></button>
                )}
              </div>
              {message.attachments?.length ? (
                <div className="messageFiles">
                  {message.attachments.map((file) => (
                    <span key={file.id}>{file.name}</span>
                  ))}
                </div>
              ) : null}
              {message.sources?.length ? (
                <div className="sourceList">
                  {message.sources.map((source, index) => (
                    <span key={source.id} title={source.url || source.title}>Fonte {index + 1}: {source.title}</span>
                  ))}
                </div>
              ) : null}
              <pre className="messageText">{message.content}</pre>
            </div>
          </article>
        );
      })}
    </main>
  );
}
