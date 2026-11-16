import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Newsletter } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, ExternalLink, Calendar } from 'lucide-react';
import SearchInput from '@/components/admin/SearchInput';
import RowActions from '@/components/admin/RowActions';
import { ROW_CARD, ICON_TILE, ROW_TITLE, ROW_META, SKELETON } from '@/components/admin/listStyles';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { cn, plural } from '@/shared/lib/utils';
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
    placeholder: 'Select type…',
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

      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search newsletters…" />

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className={cn(SKELETON, 'h-[86px]')} />
          ))
        ) : filteredNewsletters.length > 0 ? (
          filteredNewsletters.map((newsletter) => (
            <Card key={newsletter.id} className={ROW_CARD}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={ICON_TILE}>
                  <Mail />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className={cn(ROW_TITLE, 'truncate')}>
                      {newsletter.title}
                    </h3>
                    <Badge variant="neutral" className="uppercase flex-shrink-0">
                      {newsletter.type}
                    </Badge>
                  </div>
                  <div className={cn(ROW_META, 'flex flex-wrap items-center gap-x-4 gap-y-1')}>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> {newsletter.date}
                    </span>
                    <a href={newsletter.content_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-accent hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> View content
                    </a>
                  </div>
                </div>
                <RowActions label="newsletter" onEdit={() => handleEdit(newsletter)} onDelete={() => handleDelete(newsletter.id, newsletter.title)} />
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Mail}
            title={searchQuery ? 'No newsletters found' : 'No newsletters yet'}
            description={searchQuery ? 'Try a different search.' : 'Publish your first newsletter to get started.'}
            action={!searchQuery ? { label: 'Add newsletter', onClick: handleAdd } : undefined}
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
