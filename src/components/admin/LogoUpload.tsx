import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Building2 } from 'lucide-react';
import { uploadImage } from '@/services/storage';
import { toast } from 'sonner';

interface LogoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  required?: boolean;
  label?: string;
  size?: number;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ value, onChange, required, label = 'Logo', size = 80 }) => {
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
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5 MB');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, 'logos', (pct) => setProgress(pct));
      onChange(url);
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Square logo preview */}
      <div
        role="button"
        tabIndex={0}
        aria-label={value ? `Replace ${label}` : `Upload ${label}`}
        className="relative group flex-shrink-0 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ width: size, height: size }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(e) => { if (!isUploading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileInputRef.current?.click(); } }}
      >
        {value ? (
          <>
            <img src={value} alt="Logo" className="w-full h-full object-contain p-1" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center">
              {isUploading ? (
                <span className="text-[9px] font-bold text-accent">{progress}%</span>
              ) : (
                <Upload className="w-4 h-4 text-white" />
              )}
            </div>
          </>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-1">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
            <span className="text-[9px] text-accent font-bold">{progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-white/60 hover:text-accent/60 transition-colors">
            <Building2 className="w-6 h-6" />
            <Upload className="w-3 h-3" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-white/70">
          {label} {required && <span className="text-danger">*</span>}
        </p>
        <p className="text-[10px] text-white/60">JPG, PNG, WebP · Max 5 MB</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px] font-bold bg-white/5 border-white/10 hover:bg-white/10 text-white/60 hover:text-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {value ? 'Replace' : 'Upload'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-danger hover:text-danger-fg hover:bg-danger-subtle"
              onClick={() => onChange('')}
              disabled={isUploading}
            >
              <X className="w-3 h-3 mr-1" /> Remove
            </Button>
          )}
        </div>
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

export default LogoUpload;
