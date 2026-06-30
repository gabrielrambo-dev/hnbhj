import type { SourceReference, UploadedAttachment, UrlFetchResult } from '../types';
import { uid } from './storage';

const URL_RE = /https?:\/\/[^\s)\]}>"]+/gi;

export function extractUrls(text: string) {
  return Array.from(new Set((text.match(URL_RE) || []).map((url) => url.replace(/[.,;:!?]+$/, ''))));
}

export function sourcesFromAttachments(attachments: UploadedAttachment[] = []): SourceReference[] {
  const now = new Date().toISOString();
  return attachments.map((file) => ({
    id: uid('src'),
    title: file.name,
    kind: file.type.startsWith('image/') ? 'imagem' : 'arquivo',
    content: file.content || (file.dataUrl ? '[Imagem anexada para análise visual]' : undefined),
    addedAt: now
  }));
}

export function sourceContextBlock(sources: SourceReference[]) {
  const usable = sources.filter((source) => source.content?.trim());
  if (!usable.length) return '';
  return `\n\nFONTES DISPONÍVEIS PARA CITAR:\n${usable.map((source, index) => {
    const label = `[Fonte ${index + 1}: ${source.title}]`;
    return `${label}\nTipo: ${source.kind}${source.url ? `\nURL: ${source.url}` : ''}\nConteúdo:\n${source.content?.slice(0, 24000)}`;
  }).join('\n\n---\n\n')}`;
}

export async function collectSourcesFromInput(text: string, attachments: UploadedAttachment[]) {
  const sources = sourcesFromAttachments(attachments);
  const urls = extractUrls(text);

  if (!urls.length || !window.nemotron?.fetchUrl) return sources;

  const fetched = await Promise.all(urls.slice(0, 6).map(async (url): Promise<SourceReference> => {
    try {
      const result: UrlFetchResult = await window.nemotron!.fetchUrl(url);
      return {
        id: uid('src'),
        title: result.title || url,
        kind: 'url',
        url,
        content: result.ok ? result.text : `[Não foi possível ler o conteúdo do link. Erro: ${result.error || 'desconhecido'}]`,
        addedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        id: uid('src'),
        title: url,
        kind: 'url',
        url,
        content: `[Não foi possível buscar este link: ${String(error)}]`,
        addedAt: new Date().toISOString()
      };
    }
  }));

  return [...sources, ...fetched];
}
