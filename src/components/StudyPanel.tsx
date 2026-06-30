import { BookOpenCheck, Brain, ClipboardList, Copy, GraduationCap, Send } from 'lucide-react';
import { useState } from 'react';
import type { ChatMessage, UploadedAttachment } from '../types';

interface Props {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSendStudy: (text: string, attachments?: UploadedAttachment[]) => void;
}

const SUBJECTS = ['Java', 'Matemática', 'Química', 'Física', 'Português', 'Inglês', 'História', 'Biologia', 'Programação'];

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => undefined);
}

export function StudyPanel({ messages, isGenerating, onSendStudy }: Props) {
  const [subject, setSubject] = useState('Java');
  const [goal, setGoal] = useState('prova');
  const [time, setTime] = useState('30 minutos');
  const [content, setContent] = useState('');
  const [level, setLevel] = useState('iniciante');
  const studyMessages = messages.filter((message) => message.mode === 'estudo' && message.role === 'assistant').slice(-3).reverse();

  function makePrompt(type: 'plano' | 'resumo' | 'quiz' | 'simulado') {
    const base = `Área de estudo Nemotron.
Matéria: ${subject}
Objetivo: ${goal}
Tempo disponível: ${time}
Nível: ${level}
Conteúdo informado pelo usuário:
${content || '[sem conteúdo colado]'}

`;

    const prompts = {
      plano: `${base}Crie um plano de estudo rápido e eficiente. Priorize o que mais cai, explique a ordem de estudo e coloque um checklist final.`,
      resumo: `${base}Faça um resumo direto para estudar rápido. Inclua principais conceitos, fórmulas/regras se existirem, erros comuns e um exemplo resolvido.`,
      quiz: `${base}Crie 10 questões de treino, com alternativas quando fizer sentido. Mostre o gabarito só no final e explique as respostas.`,
      simulado: `${base}Crie um mini simulado com dificuldade progressiva. Depois coloque gabarito comentado e diga quais tópicos revisar se eu errar.`
    };

    onSendStudy(prompts[type]);
  }

  return (
    <section className="studyPanel">
      <div className="studyHero">
        <div>
          <span className="eyebrow"><GraduationCap size={16} /> Área de estudo</span>
          <h2>Estude mais rápido, sem virar um texto gigante.</h2>
          <p>Monte resumos, planos, quizzes e simulados usando os modelos NVIDIA.</p>
        </div>
        <div className="studyStats">
          <strong>Modo estudo</strong>
          <span>Resumo → exemplo → treino → revisão</span>
        </div>
      </div>

      <div className="studyGrid">
        <div className="studyCard">
          <label>Matéria</label>
          <input list="study-subjects" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <datalist id="study-subjects">
            {SUBJECTS.map((item) => <option key={item} value={item} />)}
          </datalist>

          <label>Objetivo</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="prova">Prova</option>
            <option value="trabalho">Trabalho</option>
            <option value="aprender do zero">Aprender do zero</option>
            <option value="revisão rápida">Revisão rápida</option>
            <option value="programação prática">Programação prática</option>
          </select>

          <div className="twoCols">
            <div>
              <label>Tempo</label>
              <input value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <label>Nível</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="iniciante">Iniciante</option>
                <option value="intermediário">Intermediário</option>
                <option value="avançado">Avançado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="studyCard big">
          <label>Conteúdo, matéria da prova ou dúvidas</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Cole aqui o conteúdo da prova, tema do trabalho, código que quer estudar ou suas dúvidas."
          />
        </div>
      </div>

      <div className="studyActions">
        <button disabled={isGenerating} onClick={() => makePrompt('plano')}><ClipboardList size={16} /> Plano rápido</button>
        <button disabled={isGenerating} onClick={() => makePrompt('resumo')}><BookOpenCheck size={16} /> Resumo essencial</button>
        <button disabled={isGenerating} onClick={() => makePrompt('quiz')}><Brain size={16} /> Quiz</button>
        <button disabled={isGenerating} className="primaryBtn" onClick={() => makePrompt('simulado')}><Send size={16} /> Mini simulado</button>
      </div>

      <div className="studyResults">
        <div className="panelHeader compact">
          <div>
            <strong>Respostas de estudo</strong>
            <span>últimas respostas geradas no modo estudo</span>
          </div>
        </div>
        {studyMessages.length === 0 ? (
          <div className="emptyPanel small">Nenhuma resposta de estudo ainda.</div>
        ) : (
          studyMessages.map((message) => (
            <article key={message.id} className="studyResultCard">
              <div className="messageMeta">
                <strong>Nemotron</strong>
                <span>{new Date(message.createdAt).toLocaleString('pt-BR')}</span>
                <button onClick={() => copy(message.content)} title="Copiar"><Copy size={14} /></button>
              </div>
              <pre className="messageText">{message.content}</pre>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
