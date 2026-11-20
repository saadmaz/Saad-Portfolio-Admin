/**
 * Trusted embed providers. A pasted URL is reduced to provider + id; the
 * site rebuilds the iframe from a fixed template (src/lib/embeds.ts on the
 * portfolio uses the same ids and patterns), so content can never point a
 * frame at an arbitrary address.
 */

export type EmbedProviderId = 'youtube' | 'vimeo' | 'loom' | 'codepen';

export const EMBED_PROVIDERS: Record<EmbedProviderId, { label: string; idPattern: RegExp; src: (id: string) => string; page: (id: string) => string }> = {
  youtube: {
    label: 'YouTube',
    idPattern: /^[A-Za-z0-9_-]{11}$/,
    src: (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    page: (id) => `https://www.youtube.com/watch?v=${id}`,
  },
  vimeo: {
    label: 'Vimeo',
    idPattern: /^\d{6,12}$/,
    src: (id) => `https://player.vimeo.com/video/${id}?dnt=1`,
    page: (id) => `https://vimeo.com/${id}`,
  },
  loom: {
    label: 'Loom',
    idPattern: /^[a-f0-9]{32}$/,
    src: (id) => `https://www.loom.com/embed/${id}`,
    page: (id) => `https://www.loom.com/share/${id}`,
  },
  codepen: {
    label: 'CodePen',
    idPattern: /^[A-Za-z0-9_-]{1,40}\/[A-Za-z0-9]{5,12}$/,
    src: (id) => {
      const [user, pen] = id.split('/');
      return `https://codepen.io/${user}/embed/${pen}?default-tab=result`;
    },
    page: (id) => {
      const [user, pen] = id.split('/');
      return `https://codepen.io/${user}/pen/${pen}`;
    },
  },
};

/** Parses a share/watch/embed URL from a trusted provider, or returns null. */
export function parseEmbedUrl(raw: string): { provider: EmbedProviderId; id: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const check = (provider: EmbedProviderId, id: string | undefined | null) =>
    id && EMBED_PROVIDERS[provider].idPattern.test(id) ? { provider, id } : null;

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') return check('youtube', url.searchParams.get('v'));
    if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) return check('youtube', parts[1]);
    return null;
  }
  if (host === 'youtu.be') return check('youtube', parts[0]);
  if (host === 'vimeo.com') return check('vimeo', parts.find((p) => /^\d+$/.test(p)));
  if (host === 'player.vimeo.com' && parts[0] === 'video') return check('vimeo', parts[1]);
  if (host === 'loom.com' && (parts[0] === 'share' || parts[0] === 'embed')) return check('loom', parts[1]);
  if (host === 'codepen.io' && parts.length >= 3 && ['pen', 'embed', 'full'].includes(parts[1]))
    return check('codepen', `${parts[0]}/${parts[2]}`);
  return null;
}
