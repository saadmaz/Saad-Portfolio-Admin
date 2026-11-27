import { useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { SERIES, SERIES_IDS, type SeriesId } from '@/shared/lib/newsletter-series';
import { parseEmails, subscriberId, type Subscriber } from '@/shared/lib/subscribers';

/**
 * Adds people to the newsletter by hand, as active subscribers (no confirm
 * email). Uses the same document id as /api/subscribe, so a later sign-up on
 * the site updates the same entry. Addresses already on the list are left
 * alone, so an unsubscribe is never undone from here.
 */
export function AddSubscribersDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (rows: Subscriber[]) => void;
}) {
  const [text, setText] = useState('');
  const [topics, setTopics] = useState<SeriesId[]>(SERIES_IDS);
  const [saving, setSaving] = useState(false);
  const { valid, invalid } = useMemo(() => parseEmails(text), [text]);

  const toggle = (id: SeriesId) => setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const close = (o: boolean) => {
    if (saving) return;
    if (!o) setText('');
    onOpenChange(o);
  };

  const add = async () => {
    setSaving(true);
    try {
      const results = await Promise.all(
        valid.map(async (email) => {
          const id = await subscriberId(email);
          const ref = doc(db, 'subscribers', id);
          if ((await getDoc(ref)).exists()) return null;
          const data = { email, topics, status: 'active' as const, source: 'admin' };
          await setDoc(ref, { ...data, created_at: serverTimestamp(), confirmed_at: serverTimestamp(), updated_at: serverTimestamp() });
          return { id, ...data, created_at: new Date(), confirmed_at: new Date() } as Subscriber;
        }),
      );
      const added = results.filter((r): r is Subscriber => !!r);
      const skipped = valid.length - added.length;
      onAdded(added);
      toast.success(`Added ${added.length} subscriber${added.length === 1 ? '' : 's'}${skipped ? ` · ${skipped} already on the list` : ''}`);
      setText('');
      onOpenChange(false);
    } catch {
      toast.error('Could not add subscribers. Are the Firestore rules deployed?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add subscribers</DialogTitle>
          <DialogDescription>
            They're added as active with no confirmation email, so only add people who agreed to get your newsletter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="add-subscribers" className="text-[13px] font-medium text-foreground">Email addresses</label>
            <Textarea
              id="add-subscribers"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'one@example.com\ntwo@example.com, three@example.com'}
              className="text-[13px]"
            />
            <p className="text-[12px] text-muted-foreground">
              One per line, or separated by commas. {valid.length > 0 && `${valid.length} valid.`}
              {invalid.length > 0 && <span className="text-danger-fg"> Skipping: {invalid.join(', ')}</span>}
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium text-foreground">Series</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERIES.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <Checkbox checked={topics.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                  <span className="tabular text-muted-foreground">{s.number}</span>
                  <span className="text-foreground">{s.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={saving}>Cancel</Button>
          <Button onClick={add} disabled={saving || !valid.length || !topics.length}>
            {saving ? 'Adding…' : valid.length ? `Add ${valid.length} subscriber${valid.length === 1 ? '' : 's'}` : 'Add subscribers'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
