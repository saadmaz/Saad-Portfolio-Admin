import { useEffect, useState } from 'react';
import { ExternalLink, Laptop, Loader2, RefreshCw, Smartphone, Tablet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { SiteApi } from '@/services/site-api';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Laptop, width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '820px' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: '390px' },
] as const;

/**
 * Secure draft preview: the site renders the post with its real article
 * components at /preview/:id, authorised by a signed link that expires in
 * 30 minutes. `beforeOpen` saves pending edits first so the preview is current.
 */
export function PreviewDialog({
  postId,
  open,
  onOpenChange,
  beforeOpen,
}: {
  postId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  beforeOpen: () => Promise<void>;
}) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]['id']>('desktop');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!open || !postId) return;
    let cancelled = false;
    setUrl(null);
    setError('');
    (async () => {
      try {
        await beforeOpen();
        const link = await SiteApi.previewLink(postId);
        if (!cancelled) setUrl(link.url);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not create a preview link');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, postId, beforeOpen, nonce]);

  const width = DEVICES.find((d) => d.id === device)!.width;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[min(1400px,96vw)] flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3 pr-10">
          <DialogTitle className="text-base">Preview</DialogTitle>
          <DialogDescription className="sr-only">The article as readers will see it. Not public.</DialogDescription>
          <div role="radiogroup" aria-label="Device" className="flex rounded-lg border border-border p-0.5">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={device === d.id}
                onClick={() => setDevice(d.id)}
                className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px]', device === d.id ? 'bg-secondary text-foreground' : 'text-fg-2 hover:text-foreground')}
              >
                <d.icon className="h-3.5 w-3.5" aria-hidden="true" /> {d.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={() => setNonce((n) => n + 1)}>
              <RefreshCw aria-hidden="true" /> Refresh
            </Button>
            {url && (
              <Button asChild variant="outline" size="xs">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" /> New tab
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 justify-center overflow-hidden rounded-xl border border-border-subtle bg-background">
          {error ? (
            <div className="m-auto max-w-md space-y-2 p-6 text-center">
              <p className="text-sm text-danger-fg">{error}</p>
              <p className="text-[13px] text-muted-foreground">
                Preview needs the site’s PREVIEW_SECRET, ADMIN_EMAIL and Firebase Admin variables (see the README’s CMS section).
              </p>
            </div>
          ) : !url ? (
            <div className="m-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving and preparing preview…
            </div>
          ) : (
            <iframe key={`${url}-${nonce}`} src={url} title="Article preview" className="h-full border-0 bg-background transition-[width]" style={{ width }} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
