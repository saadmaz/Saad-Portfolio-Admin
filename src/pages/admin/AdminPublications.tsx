import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Publication } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from 'lucide-react';
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

const publicationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  publisher: z.string().min(1, 'Publisher is required'),
  date: z.string().min(1, 'Date is required'),
  authors: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  tags: z.string().optional(),
});

type PublicationFormData = z.infer<typeof publicationSchema>;

const publicationFields = [
  { name: 'title', label: 'Publication Title', type: 'text' as const, placeholder: 'e.g. Deep Learning for NLP: A Survey' },
  { name: 'publisher', label: 'Publisher / Journal / Conference', type: 'text' as const, placeholder: 'e.g. IEEE, ArXiv, Medium' },
  { name: 'date', label: 'Publication Date', type: 'text' as const, placeholder: 'e.g. March 2024' },
  { name: 'authors', label: 'Authors (comma-separated, Optional)', type: 'text' as const, placeholder: 'e.g. Saad Mazhar, John Doe' },
  { name: 'description', label: 'Description / Abstract (Optional)', type: 'textarea' as const, placeholder: 'Brief summary of the publication…' },
  { name: 'tags', label: 'Tags (comma-separated, Optional)', type: 'text' as const, placeholder: 'e.g. AI, NLP, Research' },
  { name: 'link', label: 'Publication Link (Optional)', type: 'text' as const, placeholder: 'https://...' },
] as const;

const AdminPublications = () => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [current, setCurrent] = useState<Publication | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchPublications(); }, []);

  const fetchPublications = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getPublications();
      setPublications(data);
    } catch {
      toast.error('Failed to load publications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrent(null); setIsDialogOpen(true); };
  useCreateIntent(handleAdd);
  const handleEdit = (p: Publication) => { setCurrent(p); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deletePublication(deleteTarget.id);
      toast.success('Publication deleted');
      fetchPublications();
    } catch { toast.error('Failed to delete publication'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: PublicationFormData) => {
    const payload: Partial<Publication> = {
      ...data,
      authors: data.authors ? data.authors.split(',').map(s => s.trim()).filter(Boolean) : [],
      tags: data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    try {
      if (current) {
        await CommonService.updatePublication(current.id, payload);
        toast.success('Publication updated');
      } else {
        await CommonService.createPublication(payload);
        toast.success('Publication added');
      }
      fetchPublications();
    } catch {
      toast.error('Failed to save publication');
      throw new Error('save failed');
    }
  };

  const getDefaultValues = (pub: Publication | null) => {
    if (!pub) return {};
    return {
      ...pub,
      authors: pub.authors?.join(', ') ?? '',
      tags: pub.tags?.join(', ') ?? '',
    };
  };

  const filtered = publications.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.publisher?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publications"
        subtitle={plural(publications.length, "publication")}
        actions={
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Add publication
          </Button>
        }
      />

      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search publications…" />

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3].map(i => (
            <div key={i} className={cn(SKELETON, 'h-24')} />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((pub) => (
            <Card key={pub.id} className={ROW_CARD}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={cn(ICON_TILE, 'mt-0.5')}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className={ROW_TITLE}>
                        {pub.title}
                      </h3>
                      <p className={cn(ROW_META, 'mt-0.5')}>
                        {pub.publisher} · {pub.date}
                      </p>
                      {pub.authors && pub.authors.length > 0 && (
                        <p className={cn(ROW_META, 'mt-0.5 truncate')}>
                          {pub.authors.join(', ')}
                        </p>
                      )}
                      {pub.tags && pub.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {pub.tags.map(tag => (
                            <Badge key={tag} variant="neutral">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <RowActions label="publication" href={pub.link} onEdit={() => handleEdit(pub)} onDelete={() => handleDelete(pub.id, pub.title)} />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={FileText}
            title={searchQuery ? 'No publications found' : 'No publications yet'}
            description={searchQuery ? 'Try a different search.' : 'Add your papers, articles, and published work.'}
            action={!searchQuery ? { label: 'Add publication', onClick: handleAdd } : undefined}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete publication?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete publication"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit publication' : 'Add publication'}
        fields={publicationFields}
        schema={publicationSchema}
        defaultValues={getDefaultValues(current)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminPublications;
