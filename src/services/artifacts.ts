import type { Artifact } from '../types';
import { uid } from './storage';

const codeBlock = /```([\w.+-]*)\n([\s\S]*?)```/g;

export function extractArtifactsFromText(text: string): Artifact[] {
  const items: Artifact[] = [];
  let match: RegExpExecArray | null;
  while ((match = codeBlock.exec(text))) {
    const language = match[1]?.trim() || 'txt';
    const content = match[2] || '';
    if (content.trim().length < 40) continue;
    const extension = mapLanguage(language);
    const createdAt = new Date().toISOString();
    items.push({
      id: uid('artifact'),
      title: `Artifact ${items.length + 1}.${extension}`,
      language,
      content,
      createdAt,
      updatedAt: createdAt,
      versions: [{ id: uid('version'), content, createdAt }]
    });
  }
  return items;
}

function mapLanguage(language: string) {
  const normalized = language.toLowerCase();
  const map: Record<string, string> = {
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    tsx: 'tsx',
    jsx: 'jsx',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'md',
    md: 'md',
    python: 'py',
    java: 'java',
    csharp: 'cs',
    cpp: 'cpp',
    c: 'c'
  };
  return map[normalized] || 'txt';
}

export function artifactKind(language: string) {
  const lang = language.toLowerCase();
  if (['html', 'htm'].includes(lang)) return 'preview';
  if (['md', 'markdown', 'txt'].includes(lang)) return 'document';
  return 'code';
}
