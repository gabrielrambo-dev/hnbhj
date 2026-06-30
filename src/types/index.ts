export type Role = 'system' | 'user' | 'assistant';

export type ResponseMode = 'padrao' | 'rapido' | 'profundo' | 'codigo' | 'estudo';

export interface SourceReference {
  id: string;
  title: string;
  kind: 'arquivo' | 'imagem' | 'url' | 'manual';
  url?: string;
  content?: string;
  addedAt: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  attachments?: UploadedAttachment[];
  sources?: SourceReference[];
  mode?: ResponseMode;
  tokenEstimate?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface Artifact {
  id: string;
  title: string;
  language: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  versions: ArtifactVersion[];
}

export interface ArtifactVersion {
  id: string;
  content: string;
  createdAt: string;
}

export interface UploadedAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  dataUrl?: string;
}

export interface MemoryItem {
  id: string;
  scope: 'global' | 'project';
  projectId?: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface NvidiaSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextLimit: number;
  reservedOutputTokens: number;
  responseMode: ResponseMode;
  requireSources: boolean;
  showTokenStats: boolean;
  systemPrompt: string;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'stdout' | 'stderr' | 'exit';
  text: string;
}

export interface UrlFetchResult {
  ok: boolean;
  url: string;
  title?: string;
  text?: string;
  error?: string;
}

declare global {
  interface Window {
    nemotron?: {
      selectProjectFolder: () => Promise<{ name: string; path: string; tree: FileNode[] } | null>;
      scanProject: (projectPath: string) => Promise<FileNode[]>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (payload: { projectRoot: string; filePath: string; content: string }) => Promise<{ ok: boolean; backupPath?: string }>;
      createFile: (payload: { projectRoot: string; relativePath: string; content?: string }) => Promise<{ ok: boolean; filePath: string }>;
      deleteFile: (payload: { projectRoot: string; filePath: string }) => Promise<{ ok: boolean }>;
      openExternal: (filePath: string) => Promise<string>;
      fetchUrl: (url: string) => Promise<UrlFetchResult>;
      runCommand: (payload: { id: string; command: string; cwd: string }) => Promise<{ ok: boolean }>;
      stopCommand: (id: string) => Promise<{ ok: boolean }>;
      onTerminalData: (callback: (payload: { id: string; type: TerminalLine['type']; data: string }) => void) => () => void;
    };
  }
}
