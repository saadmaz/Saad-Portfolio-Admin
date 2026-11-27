import { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import { PanelSection, TextField } from '@/components/admin/blog/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { cn } from '@/shared/lib/utils';

/** Stored at site_settings/contact; read by the public Contact page. */
export interface ContactSettings {
  status: 'available' | 'limited' | 'booked';
  message: string;
  reply_time: string;
}

const EMPTY: ContactSettings = { status: 'available', message: '', reply_time: '' };
const REF = () => doc(db, 'site_settings', 'contact');

const STATUSES: { id: ContactSettings['status']; label: string; dot: string; example: string }[] = [
  { id: 'available', label: 'Available', dot: 'bg-emerald-500', example: 'Available for new projects' },
  { id: 'limited', label: 'Limited', dot: 'bg-amber-500', example: 'Taking one more project this quarter' },
  { id: 'booked', label: 'Booked', dot: 'bg-red-500', example: 'Booked until March' },
];

const AdminContact = () => {
  const [data, setData] = useState<ContactSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(REF())
      .then((snap) => setData({ ...EMPTY, ...((snap.data() as Partial<ContactSettings>) ?? {}) }))
      .catch(() => toast.error('Could not load Contact settings.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(REF(), {
        status: data.status,
        message: data.message.trim(),
        reply_time: data.reply_time.trim(),
        updated_at: serverTimestamp(),
      });
      toast.success('Contact page updated');
    } catch {
      toast.error('Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const current = STATUSES.find((s) => s.id === data.status) ?? STATUSES[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact page"
        subtitle="Availability badge and reply time shown on /contact."
        actions={<Button onClick={save} loading={saving} disabled={loading}>Save changes</Button>}
      />
      {loading ? (
        <div className="h-40 w-full animate-pulse rounded-xl border border-border-subtle bg-card" />
      ) : (
        <Card>
          <CardContent className="space-y-5 p-5">
            <PanelSection title="Availability">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={data.status === s.id}
                    onClick={() => setData((d) => ({ ...d, status: s.id }))}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors',
                      data.status === s.id ? 'border-accent bg-secondary font-medium text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                    {s.label}
                  </button>
                ))}
              </div>
              <TextField
                label="Badge text"
                value={data.message}
                onChange={(v) => setData((d) => ({ ...d, message: v }))}
                placeholder={current.example}
                hint="Leave empty to use the default for the status."
                max={60}
              />
              <TextField
                label="Reply time"
                value={data.reply_time}
                onChange={(v) => setData((d) => ({ ...d, reply_time: v }))}
                placeholder="within one working day"
                hint='Shown as "replies within one working day". Leave empty for the default.'
                max={40}
              />
            </PanelSection>
            <div className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm">
              <span className="mr-2 text-muted-foreground">Preview:</span>
              <span className={cn('mr-2 inline-block h-2 w-2 rounded-full align-middle', current.dot)} />
              {data.message.trim() || current.example}
              <span className="text-muted-foreground"> · replies {data.reply_time.trim() || 'within one working day'}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminContact;
