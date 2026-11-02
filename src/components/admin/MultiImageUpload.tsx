import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Plus, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { uploadImage } from '@/services/storage';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/components/ui/input';

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  folder?: string;
  /** Label the first image "Cover" (when it's used as the cover). */
  firstIsCover?: boolean;
  /** Used for uploaded file names (e.g. the event title), which search engines read. */
  nameHint?: string;
  /** Per-image alt text, aligned with `value`. Pass both to show the caption fields. */
  captions?: string[];
  onCaptionsChange?: (captions: string[]) => void;
  /** Shown under the caption fields, e.g. what a blank caption falls back to. */
  captionHint?: string;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value,
  onChange,
  maxImages = 10,
  folder = 'uploads',
  firstIsCover = false,
  nameHint,
  captions,
  onCaptionsChange,
  captionHint,
}) => {
  // Captions travel with their image through add/remove/reorder.
  const caps = value.map((_, i) => captions?.[i] ?? '');
  const showCaptions = !!onCaptionsChange && value.length > 0;
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Reordering: the tile being dragged and the tile it's hovering over.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleFiles = async (files: FileList) => {
    const remaining = maxImages - value.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const accepted = Array.from(files).slice(0, remaining);
    const invalid = accepted.filter(
      (f) => !f.type.startsWith('image/') || f.size > 10 * 1024 * 1024
    );

    if (invalid.length > 0) {
      toast.error('Some files were skipped (not an image or > 10 MB)');
    }

    const valid = accepted.filter(
      (f) => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024
    );
    if (valid.length === 0) return;

    setUploading(true);
    setTotalCount(valid.length);
    setUploadCount(0);

    const newUrls: string[] = [];
    for (const file of valid) {
      try {
        const url = await uploadImage(file, folder, () => {}, nameHint);
        newUrls.push(url);
        setUploadCount((c) => c + 1);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      }
    }

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls]);
      onCaptionsChange?.([...caps, ...newUrls.map(() => '')]);
      toast.success(
        newUrls.length === 1 ? 'Image uploaded' : `${newUrls.length} images uploaded`
      );
    }

    setUploading(false);
    setUploadCount(0);
    setTotalCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    onCaptionsChange?.(caps.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= value.length) return;
    const shift = <T,>(list: T[]) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    };
    onChange(shift(value));
    onCaptionsChange?.(shift(caps));
  };

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const canAdd = value.length < maxImages;

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable={!uploading}
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overIndex !== i) setOverIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, i);
                endDrag();
              }}
              onDragEnd={endDrag}
              className={cn(
                'relative group aspect-video rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing transition-[opacity,box-shadow]',
                dragIndex === i && 'opacity-40',
                overIndex === i && dragIndex !== null && dragIndex !== i && 'ring-2 ring-accent',
              )}
            >
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                draggable={false}
                className="w-full h-full object-cover"
              />
              {/* Overlay: reorder and remove */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move photo ${i + 1} earlier`}
                  className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-foreground hover:bg-black/80 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="w-7 h-7 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Move photo ${i + 1} later`}
                  className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-foreground hover:bg-black/80 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Index badge */}
              <div className="absolute top-1.5 left-1.5 bg-black/60 text-fg-2 text-[12px] font-medium px-1.5 py-0.5 rounded">
                {firstIsCover && i === 0 ? 'Cover' : i + 1}
              </div>
              <GripVertical
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 w-4 h-4 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
              />
            </div>
          ))}

          {/* Add more tile */}
          {canAdd && !uploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-accent/40 hover:bg-card transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-accent"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[12px] font-medium uppercase tracking-wide">Add</span>
            </button>
          )}
        </div>
      )}

      {/* Upload dropzone - shown when no images yet */}
      {value.length === 0 && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload images"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onKeyDown={(e) => { if (!uploading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileInputRef.current?.click(); } }}
          className={cn(
            'rounded-xl border-2 border-dashed border-border bg-card hover:bg-secondary hover:border-accent/30 transition-all flex flex-col items-center justify-center gap-2 py-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">
                Uploading {uploadCount}/{totalCount}…
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-secondary border border-border-subtle flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">
                  Drop images here or click to upload
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Up to {maxImages} images · JPG, PNG, WebP · Max 10 MB each
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Alt text per photo */}
      {showCaptions && (
        <div className="space-y-2 rounded-xl border border-border-subtle p-3">
          <p className="label text-fg-2">Alt text · for Google &amp; screen readers</p>
          {value.map((url, i) => (
            <div key={`${url}-cap`} className="flex items-center gap-2.5">
              <img src={url} alt="" className="h-8 w-12 shrink-0 rounded object-cover" />
              <Input
                value={caps[i]}
                onChange={(e) => onCaptionsChange?.(caps.map((c, j) => (j === i ? e.target.value : c)))}
                placeholder={`Photo ${i + 1}: who's in it, what's happening`}
                aria-label={`Alt text for photo ${i + 1}`}
                className="h-9 text-sm"
              />
            </div>
          ))}
          {captionHint && <p className="text-[12px] text-muted-foreground">{captionHint}</p>}
        </div>
      )}

      {/* Uploading progress bar when images already exist */}
      {uploading && value.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
          <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
          <span className="text-xs font-medium text-accent">
            Uploading {uploadCount}/{totalCount}…
          </span>
        </div>
      )}

      {/* Footer row with count + upload button */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground font-medium">
          {value.length}/{maxImages} images
          {value.length > 1 && ' · Drag to reorder'}
        </span>
        {canAdd && value.length > 0 && !uploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider text-accent/70 hover:text-accent transition-colors"
          >
            <Upload className="w-3 h-3" />
            Upload More
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleInputChange}
      />
    </div>
  );
};

export default MultiImageUpload;
