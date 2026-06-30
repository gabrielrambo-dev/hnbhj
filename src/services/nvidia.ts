import type { ChatMessage, NvidiaSettings, UploadedAttachment } from '../types';

export const NVIDIA_MODEL_PRESETS = [
  'nvidia/nemotron-3-ultra-550b-a55b-nvfp4',
  'nvidia/llama-3.1-nemotron-ultra-253b-v1',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'meta/llama-3.1-405b-instruct',
  'meta/llama-3.1-70b-instruct',
  'mistralai/mixtral-8x22b-instruct-v0.1'
];

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, '');
}

function attachmentText(attachments?: UploadedAttachment[]) {
  if (!attachments?.length) return '';
  return attachments
    .filter((file) => file.content)
    .map((file) => `\n\n[Arquivo anexado: ${file.name}]\n${file.content}`)
    .join('\n');
}

function toApiMessages(messages: ChatMessage[], settings: NvidiaSettings) {
  const apiMessages: Array<{ role: string; content: any }> = [];
  if (settings.systemPrompt.trim()) {
    apiMessages.push({ role: 'system', content: settings.systemPrompt.trim() });
  }

  for (const msg of messages) {
    const textWithFiles = `${msg.content}${attachmentText(msg.attachments)}`;
    const imageAttachments = msg.attachments?.filter((a) => a.dataUrl?.startsWith('data:image/')) || [];

    if (imageAttachments.length) {
      apiMessages.push({
        role: msg.role,
        content: [
          { type: 'text', text: textWithFiles },
          ...imageAttachments.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } }))
        ]
      });
    } else {
      apiMessages.push({ role: msg.role, content: textWithFiles });
    }
  }
  return apiMessages;
}

export async function streamNvidiaChat(options: {
  settings: NvidiaSettings;
  messages: ChatMessage[];
  signal: AbortSignal;
  onToken: (token: string) => void;
}) {
  const { settings, messages, signal, onToken } = options;
  if (!settings.apiKey.trim()) {
    throw new Error('Configure sua NVIDIA API Key em Configurações.');
  }

  const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages: toApiMessages(messages, settings),
      temperature: Number(settings.temperature),
      max_tokens: Number(settings.maxTokens),
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Erro NVIDIA API ${response.status}: ${errorText || response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;

      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') onToken(delta);
      } catch {
        // Ignora linhas parciais de SSE.
      }
    }
  }
}

export async function listNvidiaModels(settings: NvidiaSettings): Promise<string[]> {
  if (!settings.apiKey.trim()) throw new Error('API key vazia.');
  const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/models`, {
    headers: { Authorization: `Bearer ${settings.apiKey.trim()}` }
  });
  if (!response.ok) throw new Error(`Falha ao listar modelos: ${response.status}`);
  const json = await response.json();
  const models = Array.isArray(json.data) ? json.data.map((item: any) => String(item.id)).filter(Boolean) : [];
  return models.length ? models : NVIDIA_MODEL_PRESETS;
}

export async function testNvidiaConnection(settings: NvidiaSettings) {
  return listNvidiaModels(settings);
}
