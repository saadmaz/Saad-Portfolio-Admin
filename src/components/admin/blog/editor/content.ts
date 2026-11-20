/** Parses stored editor content: the JSON document when present, else legacy HTML. */
export function initialEditorContent(contentJson?: string, html?: string) {
  if (contentJson) {
    try {
      return JSON.parse(contentJson);
    } catch {
      // fall back to HTML
    }
  }
  return html ?? '';
}
