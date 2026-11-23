/**
 * Downloadable article attachments (PDF, Markdown, text, CSV, ZIP).
 *
 * Only these types are accepted; anything executable is refused here and
 * by Storage rules (blog/attachments/** allows the same extensions and
 * content types only). The content type is set from the extension rather
 * than trusted from the browser, which often reports "" for .md files.
 */

import { uploadImageWithPath } from './storage';

export const ATTACHMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  md: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
};
export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES).map((e) => `.${e}`).join(',');
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const extensionOf = (name: string) => (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();

export function validateAttachment(file: { name: string; size: number }): string | null {
  const ext = extensionOf(file.name);
  if (!ATTACHMENT_TYPES[ext]) return 'Attach a PDF, Markdown, TXT, CSV or ZIP file.';
  // "report.exe.pdf"-style names: refuse anything with an executable-looking inner extension.
  if (/\.(exe|msi|bat|cmd|com|scr|ps1|sh|js|vbs|jar|apk|dmg|app|html?|svg)\./i.test(file.name))
    return 'This file name looks like a disguised program. Rename it and try again.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > ATTACHMENT_MAX_BYTES) return 'Attachments must be under 25 MB.';
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export interface UploadedAttachment {
  url: string;
  name: string;
  size: number;
  ext: string;
}

export async function uploadAttachment(file: File, onProgress?: (pct: number) => void): Promise<UploadedAttachment> {
  const problem = validateAttachment(file);
  if (problem) throw new Error(problem);
  const ext = extensionOf(file.name);
  const typed = new File([file], file.name, { type: ATTACHMENT_TYPES[ext] });
  const base = file.name.replace(/\.[^.]+$/, '');
  const { url } = await uploadImageWithPath(typed, 'blog/attachments', onProgress, base);
  return { url, name: file.name, size: file.size, ext };
}
