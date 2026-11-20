import DOMPurify from 'dompurify';

export const CALLOUT_VARIANTS = [
  { value: 'info', label: 'Info' },
  { value: 'tip', label: 'Tip' },
  { value: 'note', label: 'Note' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Important' },
] as const;

/** Same allow-list the site applies (FORBID_TAGS / no data-*), so the preview is honest. */
export const sanitizeCustomHtml = (html: string) =>
  DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'link', 'meta', 'base'],
    FORBID_ATTR: ['id', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
