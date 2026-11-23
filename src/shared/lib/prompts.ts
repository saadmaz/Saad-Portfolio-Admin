/**
 * Prompt helpers shared by the editor. The public site has the same rules in
 * src/lib/prompts.ts (same test vectors), so what the editor reports as a
 * variable is exactly what readers can fill in.
 */

/**
 * Placeholder variables: square brackets around upper-case words, e.g.
 * [PROJECT IDEA], [TASK / FEATURE], [API NAME]. Lower-case or empty brackets
 * (Markdown checkboxes, links) are not variables.
 */
export const PROMPT_VARIABLE_RE = /\[([A-Z][A-Z0-9 /&_.'-]{0,48}[A-Z0-9])\]/g;

/** Unique variables in order of first appearance. */
export function promptVariables(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(PROMPT_VARIABLE_RE)) seen.add(m[1]);
  return [...seen];
}

export const PROMPT_LANGUAGES = [
  { value: '', label: 'Prompt (plain text)' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'bash', label: 'Shell' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
] as const;
