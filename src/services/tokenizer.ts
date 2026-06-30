import type { ChatMessage, NvidiaSettings, UploadedAttachment, SourceReference } from '../types';

export function estimateTokensFromText(text = '') {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 0;
  // Estimativa conservadora: PT-BR costuma variar bastante. 1 token ~= 3.6 a 4 caracteres.
  return Math.max(1, Math.ceil(clean.length / 3.8));
}

export function estimateAttachmentsTokens(attachments?: UploadedAttachment[]) {
  if (!attachments?.length) return 0;
  return attachments.reduce((total, file) => {
    if (file.content) return total + estimateTokensFromText(file.content);
    if (file.dataUrl) return total + 900;
    return total + 40;
  }, 0);
}

export function estimateSourcesTokens(sources?: SourceReference[]) {
  if (!sources?.length) return 0;
  return sources.reduce((total, source) => total + estimateTokensFromText(source.content || source.title || ''), 0);
}

export function estimateMessageTokens(message: ChatMessage) {
  return estimateTokensFromText(message.content) + estimateAttachmentsTokens(message.attachments) + estimateSourcesTokens(message.sources) + 8;
}

export function estimateChatTokens(messages: ChatMessage[]) {
  return messages.reduce((total, message) => total + estimateMessageTokens(message), 0);
}

export function getTokenBudget(settings: NvidiaSettings) {
  const contextLimit = Number(settings.contextLimit || 32768);
  const reservedOutput = Number(settings.reservedOutputTokens || settings.maxTokens || 4096);
  return {
    contextLimit,
    reservedOutput,
    safeInputLimit: Math.max(1024, contextLimit - reservedOutput)
  };
}

export function trimMessagesToBudget(messages: ChatMessage[], settings: NvidiaSettings) {
  const { safeInputLimit } = getTokenBudget(settings);
  const kept: ChatMessage[] = [];
  let used = 0;

  for (const message of [...messages].reverse()) {
    const cost = estimateMessageTokens(message);
    if (kept.length > 0 && used + cost > safeInputLimit) break;
    kept.unshift(message);
    used += cost;
  }

  return {
    messages: kept,
    estimatedTokens: used,
    droppedCount: Math.max(0, messages.length - kept.length)
  };
}

export function tokenLabel(tokens: number) {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(tokens >= 10000 ? 0 : 1)}k`;
  return String(tokens);
}
