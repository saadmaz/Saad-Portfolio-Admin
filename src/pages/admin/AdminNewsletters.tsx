import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Newsletter } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Edit2, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const newsletterSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.string().min(1, 'Type is required'),
  content_url: z.string().url('Must be a valid URL'),
  description: z.string().min(1, 'Description is required'),
  image: z.string().optional(),
});

type NewsletterFormData = z.infer<typeof newsletterSchema>;

const newsletterFields = [
  { name: 'title', label: 'Newsletter Title', type: 'text', placeholder: 'e.g. Founder Journey #1' },
  { name: 'date', label: 'Publication Date', type: 'text', placeholder: 'e.g. March 2024' },
  {
    name: 'type',
    label: 'Newsletter Type',
    type: 'select',
    placeholder: 'Select type...',
    options: [
      { label: 'Founder Weekly', value: 'founder' },
      { label: 'CSE Insights', value: 'cse' },
      { label: 'General', value: 'general' }
    ]
  },
  { name: 'content_url', label: 'Content URL (Link to Newsletter)', type: 'text', placeholder: 'https://...' },
  { name: 'description', label: 'Brief Description', type: 'textarea', placeholder: 'What was this newsletter about?' },
  { name: 'image', label: 'Cover Image URL (Optional)', type: 'text', placeholder: 'https://...' },
] as const;

const AdminNewsletters = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentNewsletter, setCurrentNewsletter] = useState<Newsletter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const fetchNewsletters = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getNewsletters();
      setNewsletters(data);
    } catch {
      toast.error('Failed to load newsletters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentNewsletter(null);
    setIsDialogOpen(true);
  };
  useCreateIntent(handleAdd);

  const handleEdit = (newsletter: Newsletter) => {
    setCurrentNewsletter(newsletter);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteNewsletter(deleteTarget.id);
      toast.success('Newsletter deleted');
      fetchNewsletters();
    } catch { toast.error('Delete failed'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: NewsletterFormData) => {
    try {
      if (currentNewsletter) {
        await CommonService.updateNewsletter(currentNewsletter.id, data);
        toast.success('Newsletter updated');
      } else {
        await CommonService.createNewsletter(data);
        toast.success('Newsletter created');
      }
      fetchNewsletters();
    } catch (error) {
      toast.error('Failed to save newsletter');
      throw error;
    }
  };

  const filteredNewsletters = newsletters.filter(n =>
    (n.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (n.type?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletters"
        subtitle={plural(newsletters.length, "issue")}
        actions={
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Add newsletter
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search newsletters..."
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className="h-28 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : filteredNewsletters.length > 0 ? (
          filteredNewsletters.map((newsletter) => (
            <Card key={newsletter.id} className="bg-card border-border shadow-sm hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg">
              <CardContent className="p-5 flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-secondary border border-border-subtle flex items-center justify-center text-fg-2 flex-shrink-0">
                  <Mail className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-foreground text-base group-hover:text-accent transition-colors truncate">
                      {newsletter.title}
                    </h3>
                    <Badge variant="neutral" className="uppercase tracking-wider flex-shrink-0">
                      {newsletter.type}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-accent/60" /> {newsletter.date}
                    </span>
                    <a href={newsletter.content_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-accent hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" /> View Content
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(newsletter)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(newsletter.id, newsletter.title)} className="h-9 w-9 hover:bg-danger-subtle text-danger-fg hover:text-danger-fg">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Mail}
            title="No newsletters found"
            description={searchQuery ? 'Try a different search.' : 'Publish your first newsletter to get started.'}
          />
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete newsletter?" description={`"${deleteTarget?.label}" will be permanently deleted.`} confirmLabel="Delete" onConfirm={handleConfirmDelete} />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentNewsletter ? 'Edit newsletter' : 'Add new newsletter'}
        fields={newsletterFields}
        schema={newsletterSchema}
        defaultValues={currentNewsletter || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminNewsletters;
