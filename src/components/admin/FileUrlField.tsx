import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { uploadAttachment } from '@/services/attachments';

/** A URL input with an "Upload" button that fills it with the uploaded file's URL. */
export default function FileUrlField({
  value,
  onChange,
  accept = '.pdf',
  placeholder,
}: {
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  placeholder?: string;
}) {
  const [pct, setPct] = useState<number | null>(null);
  const upload = async (file?: File) => {
    if (!file) return;
    setPct(0);
    try {
      const res = await uploadAttachment(file, setPct);
      onChange(res.url);
      toast.success(`${res.name} uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setPct(null);
    }
  };
  return (
    <div className="flex gap-2">
      <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent">
        <Upload className="h-3.5 w-3.5" />
        {pct === null ? 'Upload' : `${Math.round(pct)}%`}
        <input type="file" className="hidden" accept={accept} disabled={pct !== null} onChange={(e) => upload(e.target.files?.[0])} />
      </label>
    </div>
  );
}
