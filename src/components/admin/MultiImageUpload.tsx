import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Plus } from 'lucide-react';
import { uploadImage } from '@/services/storage';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  folder?: string;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value,
  onChange,
  maxImages = 10,
  folder = 'uploads',
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const url = await uploadImage(file, folder, () => {});
        newUrls.push(url);
        setUploadCount((c) => c + 1);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      }
    }

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls]);
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
              className="relative group aspect-video rounded-lg overflow-hidden border border-white/10 bg-white/5"
            >
              <img
                src={url}
                alt={`Screenshot ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="w-7 h-7 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Index badge */}
              <div className="absolute top-1.5 left-1.5 bg-black/60 text-white/70 text-[9px] font-bold px-1.5 py-0.5 rounded">
                {i + 1}
              </div>
            </div>
          ))}

          {/* Add more tile */}
          {canAdd && !uploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-white/10 hover:border-accent/40 hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center gap-1 text-white/60 hover:text-accent"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Add</span>
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
            'rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-accent/30 transition-all flex flex-col items-center justify-center gap-2 py-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-xs text-white/50 font-medium">
                Uploading {uploadCount}/{totalCount}…
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/60 hover:text-accent transition-colors">
                  Drop images here or click to upload
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">
                  Up to {maxImages} images · JPG, PNG, WebP · Max 10 MB each
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Uploading progress bar when images already exist */}
      {uploading && value.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
          <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
          <span className="text-xs font-bold text-accent">
            Uploading {uploadCount}/{totalCount}…
          </span>
        </div>
      )}

      {/* Footer row with count + upload button */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/60 font-medium">
          {value.length}/{maxImages} images
        </span>
        {canAdd && value.length > 0 && !uploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-accent/70 hover:text-accent transition-colors"
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
