import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadImage } from '@/services/storage';
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, label, className }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const url = await uploadImage(file, 'uploads', (pct) => setProgress(pct));
      onChange(url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {label && (
        <label className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
          {label}
        </label>
      )}

      <div className="relative group">
        {value ? (
          <div className="relative aspect-video rounded-xl overflow-hidden border">
            <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
            {/* Change / Remove overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-surface-3 border-border-strong text-foreground hover:bg-border-strong text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? `${progress}%` : 'Change'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onChange('')}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={label ? `Upload ${label}` : 'Upload image'}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onKeyDown={(e) => { if (!isUploading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileInputRef.current?.click(); } }}
            className="aspect-video rounded-xl border-2 border-dashed border-border bg-card hover:bg-secondary hover:border-accent/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <span className="text-sm font-medium text-accent">{progress}%</span>
                <div className="w-32 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-accent" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-accent transition-colors">
                  Click to upload
                </span>
                <span className="text-[12px] text-muted-foreground">JPG, PNG or WebP · Max 10 MB</span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUpload;
