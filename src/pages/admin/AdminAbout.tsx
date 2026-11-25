import { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import { ObjectListEditor } from '@/components/admin/ObjectListEditor';
import { PanelSection, TextField } from '@/components/admin/blog/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/firebase';

/** Stored at site_settings/about; read by the public About page. */
export interface AboutSettings {
  values: { title: string; description: string }[];
  now: { building: string; learning: string; reading: string };
}

const EMPTY: AboutSettings = { values: [], now: { building: '', learning: '', reading: '' } };
const REF = () => doc(db, 'site_settings', 'about');

const AdminAbout = () => {
  const [data, setData] = useState<AboutSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(REF())
      .then((snap) => {
        const d = snap.data() as Partial<AboutSettings> | undefined;
        setData({ values: d?.values ?? [], now: { ...EMPTY.now, ...(d?.now ?? {}) } });
      })
      .catch(() => toast.error('Could not load About settings. Are the Firestore rules deployed?'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(REF(), {
        values: data.values.filter((v) => v.title.trim()),
        now: {
          building: data.now.building.trim(),
          learning: data.now.learning.trim(),
          reading: data.now.reading.trim(),
        },
        updated_at: serverTimestamp(),
      });
      toast.success('About page updated');
    } catch {
      toast.error('Save failed. Deploy the Firestore rules (site_settings) and try again.');
    } finally {
      setSaving(false);
    }
  };

  const setNow = (k: keyof AboutSettings['now']) => (v: string) => setData((d) => ({ ...d, now: { ...d.now, [k]: v } }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="About page"
        subtitle="Values and what you're up to now. Empty sections stay hidden on the site."
        actions={<Button onClick={save} loading={saving} disabled={loading}>Save changes</Button>}
      />
      {loading ? (
        <div className="h-40 w-full animate-pulse rounded-xl border border-border-subtle bg-card" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 p-5">
              <PanelSection title="What drives me">
                <ObjectListEditor
                  label="Values"
                  hint="Up to four. A short title and one line each."
                  items={data.values}
                  fields={[
                    { key: 'title', label: 'Title', placeholder: 'e.g. Ship, then polish' },
                    { key: 'description', label: 'One line', type: 'textarea', placeholder: 'Why it matters to you', span: 2 },
                  ]}
                  blank={() => ({ title: '', description: '' })}
                  onChange={(values) => setData((d) => ({ ...d, values }))}
                  addLabel="Add value"
                  max={4}
                />
              </PanelSection>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-5">
              <PanelSection title="Now">
                <TextField label="Building" value={data.now.building} onChange={setNow('building')} placeholder="e.g. Polish Station OS v2" max={120} />
                <TextField label="Learning" value={data.now.learning} onChange={setNow('learning')} placeholder="e.g. Rust for backend services" max={120} />
                <TextField label="Reading" value={data.now.reading} onChange={setNow('reading')} placeholder="e.g. The Mom Test" max={120} />
              </PanelSection>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminAbout;
