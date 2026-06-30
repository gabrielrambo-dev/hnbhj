import { Play, Square, Terminal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ProjectInfo, TerminalLine } from '../types';
import { uid } from '../services/storage';

interface Props {
  project?: ProjectInfo;
  onSendLogsToChat: (logs: string) => void;
}

export function TerminalPanel({ project, onSendLogsToChat }: Props) {
  const [command, setCommand] = useState('npm run build');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);

  useEffect(() => {
    if (!window.nemotron) return;
    return window.nemotron.onTerminalData((payload) => {
      setLines((prev) => [...prev, { id: uid('line'), type: payload.type, text: payload.data }]);
      if (payload.type === 'exit') setRunningId(null);
    });
  }, []);

  const logText = useMemo(() => lines.map((line) => line.text).join(''), [lines]);

  async function run() {
    if (!project || !window.nemotron || !command.trim()) return;
    const id = uid('cmd');
    setRunningId(id);
    setLines((prev) => [...prev, { id: uid('line'), type: 'input', text: `> ${command}\n` }]);
    try {
      await window.nemotron.runCommand({ id, command, cwd: project.path });
    } catch (error) {
      setRunningId(null);
      setLines((prev) => [...prev, { id: uid('line'), type: 'stderr', text: String(error) }]);
    }
  }

  async function stop() {
    if (runningId && window.nemotron) await window.nemotron.stopCommand(runningId);
    setRunningId(null);
  }

  return (
    <section className="terminalPanel">
      <div className="terminalHeader">
        <div><Terminal size={16} /> Terminal</div>
        <button disabled={!logText.trim()} onClick={() => onSendLogsToChat(logText)}>Enviar erro para IA</button>
      </div>
      <div className="terminalControls">
        <input disabled={!project || !!runningId} value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Comando" />
        {runningId ? <button className="dangerBtn" onClick={stop}><Square size={14} /> Parar</button> : <button onClick={run} disabled={!project}><Play size={14} /> Rodar</button>}
      </div>
      <pre className="terminalOutput">
        {lines.length ? lines.map((line) => <span key={line.id} className={line.type}>{line.text}</span>) : 'Saída do terminal aparecerá aqui.'}
      </pre>
    </section>
  );
}
