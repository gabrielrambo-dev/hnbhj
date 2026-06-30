import { CheckCircle2, Save, X } from 'lucide-react';
import { useState } from 'react';
import type { NvidiaSettings, ResponseMode } from '../types';
import { NVIDIA_MODEL_PRESETS, listNvidiaModels, testNvidiaConnection } from '../services/nvidia';
import { getTokenBudget, tokenLabel } from '../services/tokenizer';

interface Props {
  settings: NvidiaSettings;
  onSave: (settings: NvidiaSettings) => void;
  onClose: () => void;
}

const MODES: Array<{ value: ResponseMode; label: string }> = [
  { value: 'padrao', label: 'Padrão' },
  { value: 'rapido', label: 'Rápido' },
  { value: 'profundo', label: 'Profundo' },
  { value: 'codigo', label: 'Código' },
  { value: 'estudo', label: 'Estudo' }
];

export function SettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<NvidiaSettings>({ ...settings });
  const [status, setStatus] = useState('');
  const [models, setModels] = useState<string[]>(NVIDIA_MODEL_PRESETS);
  const budget = getTokenBudget(draft);

  async function test() {
    setStatus('Testando conexão...');
    try {
      const found = await testNvidiaConnection(draft);
      setModels(found);
      setStatus(`Conexão OK. ${found.length} modelos encontrados.`);
    } catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <div className="modalBackdrop">
      <div className="modal large">
        <div className="modalHeader">
          <div>
            <strong>Configurações NVIDIA</strong>
            <span>Modelos, tokens, estilo de resposta e fontes.</span>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <label>API Key</label>
        <input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="nvapi-..." />

        <label>Base URL</label>
        <input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />

        <label>Modelo</label>
        <input list="models" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
        <datalist id="models">
          {models.map((model) => <option key={model} value={model} />)}
        </datalist>

        <div className="twoCols">
          <div>
            <label>Modo padrão de resposta</label>
            <select value={draft.responseMode} onChange={(e) => setDraft({ ...draft, responseMode: e.target.value as ResponseMode })}>
              {MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
          </div>
          <div>
            <label>Temperatura</label>
            <input type="number" min="0" max="2" step="0.05" value={draft.temperature} onChange={(e) => setDraft({ ...draft, temperature: Number(e.target.value) })} />
          </div>
        </div>

        <div className="threeCols">
          <div>
            <label>Resposta máx.</label>
            <input type="number" min="256" max="65536" step="256" value={draft.maxTokens} onChange={(e) => setDraft({ ...draft, maxTokens: Number(e.target.value), reservedOutputTokens: Number(e.target.value) })} />
          </div>
          <div>
            <label>Janela de contexto</label>
            <input type="number" min="4096" max="200000" step="1024" value={draft.contextLimit} onChange={(e) => setDraft({ ...draft, contextLimit: Number(e.target.value) })} />
          </div>
          <div>
            <label>Reserva saída</label>
            <input type="number" min="512" max="65536" step="256" value={draft.reservedOutputTokens} onChange={(e) => setDraft({ ...draft, reservedOutputTokens: Number(e.target.value) })} />
          </div>
        </div>

        <div className="tokenBudgetBox">
          <strong>Orçamento de tokens</strong>
          <span>Entrada segura: {tokenLabel(budget.safeInputLimit)} tokens · Saída: {tokenLabel(budget.reservedOutput)} · Contexto: {tokenLabel(budget.contextLimit)}</span>
        </div>

        <div className="checkGrid">
          <label className="checkRow">
            <input type="checkbox" checked={draft.requireSources} onChange={(e) => setDraft({ ...draft, requireSources: e.target.checked })} />
            Exigir fontes quando usar arquivos, links ou dados externos
          </label>
          <label className="checkRow">
            <input type="checkbox" checked={draft.showTokenStats} onChange={(e) => setDraft({ ...draft, showTokenStats: e.target.checked })} />
            Mostrar estimativa de tokens no chat
          </label>
        </div>

        <label>System prompt base</label>
        <textarea className="systemPrompt" value={draft.systemPrompt} onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })} />

        {status && <div className="statusLine"><CheckCircle2 size={15} /> {status}</div>}

        <div className="modalFooter">
          <button onClick={async () => { try { const found = await listNvidiaModels(draft); setModels(found); setStatus(`${found.length} modelos carregados.`); } catch (error) { setStatus(String(error)); } }}>Carregar modelos</button>
          <button onClick={test}>Testar API</button>
          <button className="primaryBtn" onClick={() => onSave(draft)}><Save size={15} /> Salvar</button>
        </div>
      </div>
    </div>
  );
}
