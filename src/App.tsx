import { useMemo, useRef, useState } from 'react';
import { ArtifactPanel } from './components/ArtifactPanel';
import { ChatInput } from './components/ChatInput';
import { ChatWindow } from './components/ChatWindow';
import { MemoryPanel } from './components/MemoryPanel';
import { ProjectPanel } from './components/ProjectPanel';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { TerminalPanel } from './components/TerminalPanel';
import { StudyPanel } from './components/StudyPanel';
import { extractArtifactsFromText } from './services/artifacts';
import { storage, uid } from './services/storage';
import { streamNvidiaChat } from './services/nvidia';
import { buildSystemPrompt } from './services/promptBuilder';
import { collectSourcesFromInput } from './services/sources';
import { estimateChatTokens, estimateMessageTokens, tokenLabel, trimMessagesToBudget } from './services/tokenizer';
import type { Artifact, ChatMessage, ChatSession, FileNode, MemoryItem, ProjectInfo, ResponseMode, UploadedAttachment } from './types';

type MainTab = 'chat' | 'project' | 'terminal' | 'study';

function createEmptyChat(projectId?: string): ChatSession {
  const now = new Date().toISOString();
  return {
    id: uid('chat'),
    title: 'Novo chat',
    projectId,
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}

function flattenTree(nodes: FileNode[], level = 0): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    lines.push(`${'  '.repeat(level)}${node.type === 'directory' ? '📁' : '📄'} ${node.relativePath}`);
    if (node.children?.length) lines.push(...flattenTree(node.children, level + 1));
  }
  return lines;
}

export default function App() {
  const [settings, setSettings] = useState(storage.getSettings());
  const [projects, setProjects] = useState<ProjectInfo[]>(storage.getProjects());
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const existing = storage.getChats();
    if (existing.length) return existing;
    const first = createEmptyChat();
    storage.setChats([first]);
    return [first];
  });
  const [artifacts, setArtifacts] = useState<Artifact[]>(storage.getArtifacts());
  const [memories, setMemories] = useState<MemoryItem[]>(storage.getMemories());
  const [activeChatId, setActiveChatId] = useState(() => storage.getChats()[0]?.id || chats[0]?.id || '');
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [tree, setTree] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | undefined>();
  const [fileContent, setFileContent] = useState('');
  const [savedFileContent, setSavedFileContent] = useState('');
  const [mainTab, setMainTab] = useState<MainTab>('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | undefined>(artifacts[0]?.id);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId) || chats[0], [chats, activeChatId]);
  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId), [projects, activeProjectId]);
  const activeChatTokens = useMemo(() => estimateChatTokens(activeChat?.messages || []), [activeChat]);
  const dirty = fileContent !== savedFileContent;

  function persistChats(next: ChatSession[]) {
    setChats(next);
    storage.setChats(next);
  }

  function persistArtifacts(next: Artifact[]) {
    setArtifacts(next);
    storage.setArtifacts(next);
  }

  function persistProjects(next: ProjectInfo[]) {
    setProjects(next);
    storage.setProjects(next);
  }

  function updateChat(chatId: string, updater: (chat: ChatSession) => ChatSession) {
    persistChats(chats.map((chat) => (chat.id === chatId ? updater(chat) : chat)));
  }

  function newChat(projectId = activeProjectId) {
    const chat = createEmptyChat(projectId);
    persistChats([chat, ...chats]);
    setActiveChatId(chat.id);
    setMainTab('chat');
  }

  async function selectProjectFolder() {
    if (!window.nemotron) {
      alert('Funções de arquivo só funcionam dentro do Electron.');
      return;
    }
    const selected = await window.nemotron.selectProjectFolder();
    if (!selected) return;
    const now = new Date().toISOString();
    const existing = projects.find((p) => p.path === selected.path);
    const project: ProjectInfo = existing || {
      id: uid('project'),
      name: selected.name,
      path: selected.path,
      createdAt: now,
      updatedAt: now
    };
    const nextProjects = existing ? projects.map((p) => (p.id === existing.id ? { ...p, updatedAt: now } : p)) : [project, ...projects];
    persistProjects(nextProjects);
    setActiveProjectId(project.id);
    setTree(selected.tree);
    setMainTab('project');
  }

  async function refreshProject() {
    if (!activeProject || !window.nemotron) return;
    setTree(await window.nemotron.scanProject(activeProject.path));
  }

  async function selectProject(id: string) {
    setActiveProjectId(id);
    const project = projects.find((p) => p.id === id);
    if (project && window.nemotron) setTree(await window.nemotron.scanProject(project.path));
    setMainTab('project');
  }

  async function openFile(node: FileNode) {
    if (node.type !== 'file' || !window.nemotron) return;
    if (dirty && !confirm('Você tem alterações não salvas. Abrir outro arquivo mesmo assim?')) return;
    const content = await window.nemotron.readFile(node.path);
    setActiveFile(node.path);
    setFileContent(content);
    setSavedFileContent(content);
  }

  async function saveFile() {
    if (!activeProject || !activeFile || !window.nemotron) return;
    await window.nemotron.writeFile({ projectRoot: activeProject.path, filePath: activeFile, content: fileContent });
    setSavedFileContent(fileContent);
    await refreshProject();
  }

  async function deleteFile() {
    if (!activeProject || !activeFile || !window.nemotron) return;
    if (!confirm('Excluir este arquivo? Um backup será criado antes.')) return;
    await window.nemotron.deleteFile({ projectRoot: activeProject.path, filePath: activeFile });
    setActiveFile(undefined);
    setFileContent('');
    setSavedFileContent('');
    await refreshProject();
  }

  async function createFile(relativePath: string) {
    if (!activeProject || !window.nemotron) return;
    await window.nemotron.createFile({ projectRoot: activeProject.path, relativePath, content: '' });
    await refreshProject();
  }

  async function saveArtifactToProject(artifact: Artifact, relativePath: string) {
    if (!activeProject || !window.nemotron) return;
    const filePath = `${activeProject.path.replace(/\\/g, '/')}/${relativePath}`;
    await window.nemotron.writeFile({ projectRoot: activeProject.path, filePath, content: artifact.content });
    await refreshProject();
    alert(`Salvo em ${relativePath}`);
  }

  function updateArtifact(id: string, content: string) {
    const now = new Date().toISOString();
    persistArtifacts(artifacts.map((artifact) => artifact.id === id ? { ...artifact, content, updatedAt: now } : artifact));
  }

  function createArtifactsFromMessage(message: ChatMessage) {
    const extracted = extractArtifactsFromText(message.content);
    if (!extracted.length) {
      alert('Nenhum bloco de código grande encontrado nessa mensagem.');
      return;
    }
    persistArtifacts([...extracted, ...artifacts]);
    setActiveArtifactId(extracted[0].id);
  }

  function addArtifactsFromAssistantText(text: string) {
    const extracted = extractArtifactsFromText(text);
    if (!extracted.length) return;
    persistArtifacts([...extracted, ...storage.getArtifacts()]);
    setActiveArtifactId(extracted[0].id);
  }

  async function sendMessage(text: string, attachments: UploadedAttachment[] = [], mode: ResponseMode = settings.responseMode) {
    if (!activeChat) return;
    setMainTab(mode === 'estudo' ? 'study' : 'chat');
    const now = new Date().toISOString();
    const sources = await collectSourcesFromInput(text, attachments);
    const userMessage: ChatMessage = {
      id: uid('msg'),
      role: 'user',
      content: text,
      createdAt: now,
      attachments,
      sources,
      mode,
      tokenEstimate: estimateMessageTokens({ id: 'estimate', role: 'user', content: text, createdAt: now, attachments, sources, mode })
    };
    const assistantMessage: ChatMessage = {
      id: uid('msg'),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      mode
    };

    const title = activeChat.messages.length === 0 ? text.slice(0, 42) || 'Novo chat' : activeChat.title;
    const allContextMessages = [...activeChat.messages, userMessage];
    const trimmed = trimMessagesToBudget(allContextMessages, settings);
    const settingsForApi = {
      ...settings,
      maxTokens: Math.min(Number(settings.maxTokens || 4096), Number(settings.reservedOutputTokens || settings.maxTokens || 4096)),
      systemPrompt: buildSystemPrompt({ settings, mode, project: activeProject, memories, sources })
    };

    if (trimmed.droppedCount > 0) {
      settingsForApi.systemPrompt += `\n\nAVISO DE CONTEXTO: ${trimmed.droppedCount} mensagens antigas foram removidas para caber no limite seguro de tokens. Se precisar de algo antigo, peça para o usuário reenviar.`;
    }

    const nextChat: ChatSession = {
      ...activeChat,
      title,
      updatedAt: now,
      messages: [...activeChat.messages, userMessage, assistantMessage]
    };
    persistChats(chats.map((chat) => (chat.id === activeChat.id ? nextChat : chat)));

    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);

    let fullText = '';
    try {
      await streamNvidiaChat({
        settings: settingsForApi,
        messages: trimmed.messages,
        signal: controller.signal,
        onToken: (token) => {
          fullText += token;
          setChats((current) => current.map((chat) => {
            if (chat.id !== activeChat.id) return chat;
            return {
              ...chat,
              messages: chat.messages.map((message) => message.id === assistantMessage.id ? { ...message, content: fullText, tokenEstimate: estimateMessageTokens({ ...message, content: fullText }) } : message)
            };
          }));
        }
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        fullText += `\n\n[Erro] ${String(error)}`;
      } else {
        fullText += '\n\n[Geração cancelada pelo usuário.]';
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
      const assistantFinal: ChatMessage = { ...assistantMessage, content: fullText, tokenEstimate: estimateMessageTokens({ ...assistantMessage, content: fullText }) };
      const finalChats = storage.getChats().map((chat) => {
        if (chat.id !== activeChat.id) return chat;
        return {
          ...chat,
          title,
          updatedAt: new Date().toISOString(),
          messages: chat.messages.map((message) => message.id === assistantMessage.id ? assistantFinal : message)
        };
      });
      const stateChats = chats.map((chat) => {
        if (chat.id !== activeChat.id) return chat;
        return {
          ...chat,
          title,
          updatedAt: new Date().toISOString(),
          messages: [...activeChat.messages, userMessage, assistantFinal]
        };
      });
      persistChats(finalChats.length ? finalChats : stateChats);
      addArtifactsFromAssistantText(fullText);
    }
  }

  function cancelGeneration() {
    abortRef.current?.abort();
  }

  function regenerateLast() {
    if (!activeChat) return;
    const lastUser = [...activeChat.messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const trimmedMessages = activeChat.messages.slice(0, activeChat.messages.findIndex((m) => m.id === lastUser.id));
    updateChat(activeChat.id, (chat) => ({ ...chat, messages: trimmedMessages }));
    sendMessage(lastUser.content, lastUser.attachments || [], lastUser.mode || settings.responseMode);
  }

  function sendProjectContext() {
    if (!activeProject) return;
    const context = `Analise este projeto. Seja direto e liste problemas, melhorias e próximos passos.\n\nProjeto: ${activeProject.name}\nPasta: ${activeProject.path}\n\nÁrvore de arquivos:\n${flattenTree(tree).slice(0, 450).join('\n')}`;
    sendMessage(context, [], 'codigo');
  }

  function sendLogsToChat(logs: string) {
    sendMessage(`Analise este erro do terminal e diga exatamente como corrigir.\n\nLogs:\n${logs.slice(-12000)}`, [], 'codigo');
  }

  function saveSettings(next: typeof settings) {
    setSettings(next);
    storage.setSettings(next);
    setSettingsOpen(false);
  }

  function saveMemories(next: MemoryItem[]) {
    setMemories(next);
    storage.setMemories(next);
  }

  return (
    <div className="appShell">
      <Sidebar
        chats={chats}
        projects={projects}
        activeChatId={activeChat?.id || ''}
        activeProjectId={activeProjectId}
        onNewChat={() => newChat()}
        onSelectChat={(id) => { setActiveChatId(id); setMainTab('chat'); }}
        onSelectProject={selectProject}
        onCreateProject={selectProjectFolder}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenMemory={() => setMemoryOpen(true)}
      />

      <section className="mainArea">
        <header className="topBar">
          <div className="tabs">
            <button className={mainTab === 'chat' ? 'active' : ''} onClick={() => setMainTab('chat')}>Chat</button>
            <button className={mainTab === 'project' ? 'active' : ''} onClick={() => setMainTab('project')}>Projeto</button>
            <button className={mainTab === 'terminal' ? 'active' : ''} onClick={() => setMainTab('terminal')}>Terminal</button>
            <button className={mainTab === 'study' ? 'active' : ''} onClick={() => setMainTab('study')}>Estudos</button>
          </div>
          <div className="topBadges">
            {settings.showTokenStats && <span className="modelBadge">Chat: ~{tokenLabel(activeChatTokens)} tokens</span>}
            <span className="modelBadge">{settings.model}</span>
          </div>
        </header>

        {mainTab === 'chat' && (
          <>
            <ChatWindow messages={activeChat?.messages || []} showTokenStats={settings.showTokenStats} onCreateArtifact={createArtifactsFromMessage} onRegenerate={regenerateLast} />
            <ChatInput isGenerating={isGenerating} onSend={sendMessage} onCancel={cancelGeneration} />
          </>
        )}

        {mainTab === 'project' && (
          <ProjectPanel
            project={activeProject}
            tree={tree}
            activeFile={activeFile}
            fileContent={fileContent}
            dirty={dirty}
            onRefresh={refreshProject}
            onOpenFile={openFile}
            onChangeContent={setFileContent}
            onSaveFile={saveFile}
            onDeleteFile={deleteFile}
            onCreateFile={createFile}
            onSendProjectContext={sendProjectContext}
          />
        )}

        {mainTab === 'terminal' && <TerminalPanel project={activeProject} onSendLogsToChat={sendLogsToChat} />}

        {mainTab === 'study' && <StudyPanel messages={activeChat?.messages || []} isGenerating={isGenerating} onSendStudy={(text, attachments = []) => sendMessage(text, attachments, 'estudo')} />}
      </section>

      <ArtifactPanel
        artifacts={artifacts}
        activeArtifactId={activeArtifactId}
        project={activeProject}
        onSelectArtifact={setActiveArtifactId}
        onUpdateArtifact={updateArtifact}
        onSaveToProject={saveArtifactToProject}
      />

      {settingsOpen && <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setSettingsOpen(false)} />}
      {memoryOpen && <MemoryPanel memories={memories} activeProject={activeProject} onSave={saveMemories} onClose={() => setMemoryOpen(false)} />}
    </div>
  );
}
