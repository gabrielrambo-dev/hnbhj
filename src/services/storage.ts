import type { Artifact, ChatSession, MemoryItem, NvidiaSettings, ProjectInfo } from '../types';

const KEYS = {
  chats: 'nemotron.chats',
  projects: 'nemotron.projects',
  memories: 'nemotron.memories',
  artifacts: 'nemotron.artifacts',
  settings: 'nemotron.settings'
};

export const defaultSettings: NvidiaSettings = {
  apiKey: '',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3-ultra-550b-a55b-nvfp4',
  temperature: 0.25,
  maxTokens: 4096,
  contextLimit: 32768,
  reservedOutputTokens: 4096,
  responseMode: 'padrao',
  requireSources: true,
  showTokenStats: true,
  systemPrompt:
    'Você é o Nemotron, um assistente de IA em PT-BR. Seja direto, profissional e prático. Quando alterar/criar código, liste: Adicionado, Corrigido, Arquivos alterados e Como testar.'
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readSettings() {
  const current = read<Partial<NvidiaSettings>>(KEYS.settings, defaultSettings);
  return { ...defaultSettings, ...current } as NvidiaSettings;
}

export const storage = {
  getChats: () => read<ChatSession[]>(KEYS.chats, []),
  setChats: (value: ChatSession[]) => write(KEYS.chats, value),

  getProjects: () => read<ProjectInfo[]>(KEYS.projects, []),
  setProjects: (value: ProjectInfo[]) => write(KEYS.projects, value),

  getMemories: () => read<MemoryItem[]>(KEYS.memories, []),
  setMemories: (value: MemoryItem[]) => write(KEYS.memories, value),

  getArtifacts: () => read<Artifact[]>(KEYS.artifacts, []),
  setArtifacts: (value: Artifact[]) => write(KEYS.artifacts, value),

  getSettings: readSettings,
  setSettings: (value: NvidiaSettings) => write(KEYS.settings, { ...defaultSettings, ...value }),

  exportAll: () => ({
    chats: read<ChatSession[]>(KEYS.chats, []),
    projects: read<ProjectInfo[]>(KEYS.projects, []),
    memories: read<MemoryItem[]>(KEYS.memories, []),
    artifacts: read<Artifact[]>(KEYS.artifacts, []),
    settings: readSettings()
  })
};

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
