import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ACCEPT_ATTR, processAndUpload } from '@/services/image-pipeline';
import type { ImageAsset } from '@/types/blog';

/** Uploads one or more images for an in-article block through the image pipeline. */
export function useBlockUpload(folder = 'blog/inline') {
  const [busy, setBusy] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]): Promise<ImageAsset[]> => {
    const out: ImageAsset[] = [];
    for (const file of files) {
      try {
        setBusy(0);
        const { asset, warnings } = await processAndUpload(file, { folder, purpose: 'inline', onProgress: setBusy });
        warnings.forEach((w) => toast.warning(`${file.name}: ${w}`));
        out.push(asset);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      }
    }
    setBusy(null);
    return out;
  };

  const picker = (onFiles: (assets: ImageAsset[]) => void, multiple = false) => (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[12px] text-fg-2 transition-colors hover:text-foreground disabled:opacity-60"
      >
        {busy !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {busy !== null ? `Uploading ${busy}%` : multiple ? 'Add images' : 'Upload image'}
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        multiple={multiple}
        className="hidden"
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) onFiles(await upload(files));
        }}
      />
    </>
  );

  return { busy, upload, picker };
}
