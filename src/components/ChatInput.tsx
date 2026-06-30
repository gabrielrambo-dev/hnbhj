import { ImagePlus, Paperclip, Send, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import type { UploadedAttachment } from '../types';
import { uid } from '../services/storage';

interface Props {
  disabled?: boolean;
  isGenerating: boolean;
  onSend: (text: string, attachments: UploadedAttachment[]) => void;
  onCancel: () => void;
}

const textFileTypes = ['text/', 'application/json', 'application/javascript', 'application/typescript'];
const codeExtensions = ['.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.md', '.txt', '.json', '.java', '.py', '.c', '.cpp', '.cs', '.xml', '.yml', '.yaml'];

async function readUpload(file: File): Promise<UploadedAttachment> {
  const base = { id: uid('file'), name: file.name, type: file.type || 'arquivo', size: file.size };
  const lower = file.name.toLowerCase();
  if (file.type.startsWith('image/')) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return { ...base, dataUrl };
  }

  if (textFileTypes.some((t) => file.type.startsWith(t)) || codeExtensions.some((ext) => lower.endsWith(ext))) {
    const content = await file.text();
    return { ...base, content: content.slice(0, 180_000) };
  }

  return { ...base, content: `[${file.name}] Tipo ainda não lido diretamente. Converta para texto ou cole o conteúdo.` };
}

export function ChatInput({ disabled, isGenerating, onSend, onCancel }: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const parsed = await Promise.all(Array.from(files).map(readUpload));
    setAttachments((prev) => [...prev, ...parsed]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function submit() {
    const clean = text.trim();
    if (!clean && attachments.length === 0) return;
    onSend(clean || 'Analise os arquivos anexados.', attachments);
    setText('');
    setAttachments([]);
  }

  return (
    <div className="composerWrap">
      {attachments.length > 0 && (
        <div className="attachments">
          {attachments.map((file) => (
            <button key={file.id} onClick={() => setAttachments((prev) => prev.filter((f) => f.id !== file.id))}>
              {file.type.startsWith('image/') ? <ImagePlus size={14} /> : <Paperclip size={14} />} {file.name} ×
            </button>
          ))}
        </div>
      )}
      <div className="composer">
        <button className="iconBtn" onClick={() => fileRef.current?.click()} title="Anexar arquivo ou imagem">
          <Paperclip size={18} />
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        <textarea
          value={text}
          disabled={disabled}
          placeholder="Peça para conversar, analisar arquivo, corrigir código ou criar um artifact..."
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {isGenerating ? (
          <button className="dangerBtn" onClick={onCancel}><Square size={15} /> Parar</button>
        ) : (
          <button className="primaryBtn" onClick={submit}><Send size={16} /> Enviar</button>
        )}
      </div>
    </div>
  );
}
