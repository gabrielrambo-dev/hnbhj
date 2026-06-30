import type { MemoryItem, NvidiaSettings, ProjectInfo, ResponseMode, SourceReference } from '../types';
import { sourceContextBlock } from './sources';

const MODE_INSTRUCTIONS: Record<ResponseMode, string> = {
  padrao: 'Modo padrão: responda direto, bem estruturado e sem enrolar.',
  rapido: 'Modo rápido: priorize resposta curta, solução prática e poucos detalhes.',
  profundo: 'Modo profundo: faça análise completa, explique decisões e riscos, mas sem texto inútil.',
  codigo: 'Modo código: aja como coding agent. Liste plano, arquivos afetados, patch sugerido e como testar. Não altere arquivos sem autorização do usuário.',
  estudo: 'Modo estudo: explique como professor prático. Foque no que cai, resumo, exemplos, perguntas e treino rápido.'
};

export function buildMemoryContext(memories: MemoryItem[], projectId?: string) {
  const relevant = memories.filter((item) => item.scope === 'global' || item.projectId === projectId);
  if (!relevant.length) return '';
  return `\n\nMEMÓRIAS ÚTEIS:\n${relevant.map((item) => `- ${item.title}: ${item.content}`).join('\n')}`;
}

export function buildSystemPrompt(options: {
  settings: NvidiaSettings;
  mode: ResponseMode;
  project?: ProjectInfo;
  memories: MemoryItem[];
  sources: SourceReference[];
}) {
  const { settings, mode, project, memories, sources } = options;
  const memoryContext = buildMemoryContext(memories, project?.id);
  const sourceContext = sourceContextBlock(sources);
  const projectContext = project ? `\n\nPROJETO ATIVO:\nNome: ${project.name}\nPasta: ${project.path}` : '';

  const sourceRule = settings.requireSources
    ? 'Quando a resposta depender de informação externa, arquivos ou links, cite usando [Fonte N: nome]. Se não houver fonte suficiente, diga claramente que não há fonte suficiente. Não invente fontes.'
    : 'Use fontes quando forem fornecidas. Não invente citações.';

  return `${settings.systemPrompt.trim()}

REGRAS FIXAS DO NEMOTRON:
- Responda em PT-BR.
- Seja profissional, direto e prático.
- Não copie interface, marca ou identidade visual de produtos de terceiros.
- Para código, seja objetivo e entregue o que muda.
- Quando criar/alterar algo, sempre liste: Adicionado, Corrigido, Arquivos alterados e Como testar.
- ${sourceRule}
- Se o pedido for estudo, entregue: resumo, pontos principais, exemplo e exercício rápido.

${MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.padrao}${projectContext}${memoryContext}${sourceContext}`;
}
