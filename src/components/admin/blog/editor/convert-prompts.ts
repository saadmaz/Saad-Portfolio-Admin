/**
 * Finds prompts written as ordinary content and turns them into Prompt
 * blocks: plain-text code blocks, and runs of paragraphs/headings/lists that
 * are entirely inline code (how prompts pasted from chat apps often arrive).
 *
 * Works on the editor's JSON, so it's pure and shared by the editor's
 * "Convert to prompts" dialog and one-off migrations. Titles come from the
 * nearest heading ("01. PRD", "Prompt 01: PRD" → "PRD"), stages from the
 * nearest "Stage N…" heading. Only blocks that look like prompts are
 * pre-selected; a folder tree or real code stays a code block.
 */

import type { Editor, JSONContent } from '@tiptap/core';
import { promptVariables } from '@/shared/lib/prompts';

export interface PromptCandidate {
  /** Position of the first top-level node it replaces. */
  index: number;
  /** One past the last top-level node it replaces. */
  end: number;
  /** A "Copy-ready prompt" heading right before it, removed with the conversion. */
  dropHeading: boolean;
  kind: 'code' | 'inline';
  title: string;
  stage: string;
  text: string;
  /** Looks like a prompt: pre-selected in the dialog. */
  suggested: boolean;
}

/** Code languages that mean "this is code, not a prompt". */
const CODE_LANGUAGES = new Set([
  'bash', 'sh', 'shell', 'powershell', 'json', 'yaml', 'yml', 'typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx',
  'python', 'py', 'sql', 'html', 'xml', 'css', 'scss', 'go', 'rust', 'java', 'kotlin', 'swift', 'c', 'cpp', 'csharp',
  'php', 'ruby', 'dockerfile', 'diff', 'graphql', 'toml', 'ini',
]);
const PROMPT_START = /^\s*(you are|you're|act as|i want you|i need you|your (task|role|job)|role\s*:|context\s*:|task\s*:|objective\s*:|as an? )/i;
const STAGE = /^(stage|phase|part|step)\s*\d+\b/i;
const COPY_READY = /^(copy[- ]ready|copyable)?\s*prompt\s*:?$|^copy[- ]ready prompt$/i;

const textOf = (n: JSONContent): string =>
  n.type === 'hardBreak' ? '\n' : (n.text ?? '') + (n.content ?? []).map(textOf).join('');

const SMALL = new Set(['and', 'or', 'the', 'of', 'to', 'for', 'a', 'an', 'in', 'on', 'with', 'by', 'vs', 'at']);
const ACRONYMS = new Set(['UI', 'UX', 'API', 'APIS', 'AI', 'QA', 'MVP', 'PRD', 'SQL', 'CI/CD', 'SEO', 'LLM', 'DB', 'MCP', 'UI/UX']);

/** "STAGE 1: PRODUCT PLANNING" → "Stage 1: Product Planning"; mixed case is kept as written. */
export function tidyHeading(raw: string): string {
  const t = raw.replace(/\s+/g, ' ').trim();
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (!letters || letters !== letters.toUpperCase()) return t;
  return t
    .split(' ')
    .map((w, i) => {
      const bare = w.toUpperCase().replace(/[^A-Z/]/g, '');
      if (ACRONYMS.has(bare)) return bare === 'APIS' ? w.replace(/APIS/i, 'APIs') : w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.replace(/^([^a-z]*)([a-z])/, (_, p: string, c: string) => p + c.toUpperCase());
    })
    .join(' ');
}

/** "01. PRD", "Prompt 01: PRD", "#3 – PRD", "Prompt 4) PRD" → "PRD". */
export function promptTitle(heading: string): string {
  return tidyHeading(heading)
    .replace(/^prompt\s*#?\d{1,3}\s*[:.)\-–—]\s*/i, '')
    .replace(/^#?\d{1,3}\s*[:.)\-–—]\s*/, '')
    .trim();
}

/** True when every bit of text in the node is inline code (and there is some). */
function isAllCode(n: JSONContent): boolean {
  if (!['paragraph', 'heading', 'bulletList', 'orderedList'].includes(n.type ?? '')) return false;
  let any = false;
  let plain = false;
  const walk = (x: JSONContent) => {
    if (x.type === 'text') {
      if (!x.text?.trim()) return;
      any = true;
      if (!x.marks?.some((m) => m.type === 'code')) plain = true;
    }
    x.content?.forEach(walk);
  };
  walk(n);
  return any && !plain;
}

const isRule = (n: JSONContent) => n.type === 'divider' || n.type === 'horizontalRule';

/** Markdown-flavoured text for a run of blocks, as the site copies legacy prompts. */
function runText(nodes: JSONContent[]): string {
  const list = (l: JSONContent, indent: string): string =>
    (l.content ?? [])
      .map((li, i) => {
        const marker = l.type === 'orderedList' ? `${(Number(l.attrs?.start) || 1) + i}.` : '-';
        const own = (li.content ?? [])
          .filter((c) => c.type !== 'bulletList' && c.type !== 'orderedList')
          .map((c) => textOf(c).replace(/\s+/g, ' ').trim())
          .join(' ');
        const nested = (li.content ?? [])
          .filter((c) => c.type === 'bulletList' || c.type === 'orderedList')
          .map((c) => `\n${list(c, `${indent}  `)}`)
          .join('');
        return `${indent}${marker} ${own}${nested}`;
      })
      .join('\n');
  return nodes
    .map((n) => {
      if (n.type === 'heading') return `${'#'.repeat(Number(n.attrs?.level) || 2)} ${textOf(n).trim()}`;
      if (n.type === 'bulletList' || n.type === 'orderedList') return list(n, '');
      if (isRule(n)) return '---';
      return textOf(n).trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

const looksLikePrompt = (text: string, context: string) =>
  PROMPT_START.test(text) || promptVariables(text).length > 0 || /prompt/i.test(context);

export function findPromptCandidates(doc: JSONContent): PromptCandidate[] {
  const nodes = doc.content ?? [];
  const out: PromptCandidate[] = [];
  let stage = '';
  let heading = '';
  let headingRaw = '';
  let copyReadyAt = -1;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];

    // A run of all-inline-code blocks (rules allowed between them).
    if (isAllCode(n)) {
      let end = i + 1;
      while (end < nodes.length && (isAllCode(nodes[end]) || (isRule(nodes[end]) && end + 1 < nodes.length && isAllCode(nodes[end + 1])))) end++;
      const run = nodes.slice(i, end);
      const text = runText(run);
      const single = run.length === 1 && n.type === 'paragraph' && text.length <= 160;
      if (!single) {
        const first = textOf(run[0]).split('\n')[0].trim();
        const title = heading || (first.length <= 90 ? promptTitle(first) : '');
        out.push({
          index: i,
          end,
          dropHeading: copyReadyAt === i - 1,
          kind: 'inline',
          title,
          stage,
          text,
          suggested: run.length >= 3 || looksLikePrompt(text, headingRaw),
        });
      }
      i = end - 1;
      continue;
    }

    if (n.type === 'heading') {
      const t = textOf(n).trim();
      if (COPY_READY.test(t)) copyReadyAt = i;
      else if (STAGE.test(t)) {
        stage = tidyHeading(t);
        heading = '';
        headingRaw = t;
      } else {
        heading = promptTitle(t);
        headingRaw = t;
      }
      continue;
    }

    if (n.type === 'codeBlock') {
      const lang = String(n.attrs?.language ?? '').toLowerCase();
      if (CODE_LANGUAGES.has(lang)) continue;
      const text = textOf(n);
      if (!text.trim()) continue;
      out.push({
        index: i,
        end: i + 1,
        dropHeading: copyReadyAt === i - 1,
        kind: 'code',
        title: heading,
        stage,
        text,
        suggested: !!stage || looksLikePrompt(text, headingRaw),
      });
    }
  }
  return out;
}

/** Replaces the chosen candidates (by `index`) with Prompt blocks, using the given title and stage. */
export function convertPrompts(
  doc: JSONContent,
  picks: { index: number; title: string; stage: string }[],
): JSONContent {
  const candidates = new Map(findPromptCandidates(doc).map((c) => [c.index, c]));
  const chosen = new Map(picks.filter((p) => candidates.has(p.index)).map((p) => [p.index, p]));
  const nodes = doc.content ?? [];
  const drop = new Set<number>();
  for (const idx of chosen.keys()) if (candidates.get(idx)!.dropHeading) drop.add(idx - 1);

  const out: JSONContent[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (drop.has(i)) continue;
    const pick = chosen.get(i);
    if (!pick) {
      out.push(nodes[i]);
      continue;
    }
    const c = candidates.get(i)!;
    out.push({
      type: 'prompt',
      attrs: { label: pick.title.trim() || 'Prompt', stage: pick.stage.trim() },
      ...(c.text ? { content: [{ type: 'text', text: c.text }] } : {}),
    });
    i = c.end - 1;
  }
  return { ...doc, content: out };
}

/** Number of likely prompts in a document, cached per (immutable) document. */
const suggestionCache = new WeakMap<object, number>();
export function suggestedPromptCount(editor: Editor): number {
  const doc = editor.state.doc;
  let n = suggestionCache.get(doc);
  if (n === undefined) {
    n = findPromptCandidates(editor.getJSON()).filter((c) => c.suggested).length;
    suggestionCache.set(doc, n);
  }
  return n;
}
