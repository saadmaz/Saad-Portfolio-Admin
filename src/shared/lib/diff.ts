/**
 * Minimal diff for comparing revisions: longest-common-subsequence over
 * blocks (paragraphs, headings, list items), then over words inside each
 * changed block. Articles are small enough that O(n·m) is fine; a size cap
 * falls back to whole-block replacement for pathological inputs.
 */

export type DiffOp = { type: 'eq' | 'add' | 'del'; text: string };

const MAX_CELLS = 2_000_000;

export function diffTokens(a: string[], b: string[]): DiffOp[] {
  if (a.length * b.length > MAX_CELLS) {
    return [...a.map((text) => ({ type: 'del' as const, text })), ...b.map((text) => ({ type: 'add' as const, text }))];
  }
  const m = a.length;
  const n = b.length;
  const lcs: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: 'eq', text: a[i++] });
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ type: 'del', text: a[i++] });
    else out.push({ type: 'add', text: b[j++] });
  }
  while (i < m) out.push({ type: 'del', text: a[i++] });
  while (j < n) out.push({ type: 'add', text: b[j++] });
  return out;
}

/** Visible text of each block-level element in CMS HTML. */
export function htmlBlocks(html: string): string[] {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const blocks = [...doc.body.querySelectorAll('p, h1, h2, h3, h4, li, blockquote, pre, figcaption, td, th')]
    // Leaf-most blocks only, so a list item's paragraph isn't counted twice.
    .filter((el) => !el.querySelector('p, h1, h2, h3, h4, li, pre'))
    .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean);
  return blocks.length ? blocks : [doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''].filter(Boolean);
}

export interface BlockDiff {
  type: 'eq' | 'add' | 'del' | 'change';
  /** Word-level ops for changed blocks; a single op otherwise. */
  words: DiffOp[];
}

/** Block diff with word-level detail where a block was edited rather than replaced. */
export function diffHtml(before: string, after: string): BlockDiff[] {
  const ops = diffTokens(htmlBlocks(before), htmlBlocks(after));
  const out: BlockDiff[] = [];
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    const next = ops[k + 1];
    if (op.type === 'del' && next?.type === 'add') {
      out.push({ type: 'change', words: diffTokens(op.text.split(' '), next.text.split(' ')) });
      k++;
    } else {
      out.push({ type: op.type, words: [op] });
    }
  }
  return out;
}
