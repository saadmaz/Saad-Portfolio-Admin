import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Publication } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
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
  { name: 'description', label: 'Description / Abstract (Optional)', type: 'textarea' as const, placeholder: 'Brief summary of the publication...' },
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="CONTENT"
        title="Publications"
        subtitle="Articles, papers, and other published work."
        backTo="/dashboard"
        actions={
          <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-accent-foreground font-black h-11 px-6 rounded-lg flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Publication
          </Button>
        }
      />

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search publications..."
            className="w-full bg-secondary border border-border rounded-lg pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-accent outline-none transition-all text-foreground placeholder:text-muted-foreground font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((pub) => (
            <Card key={pub.id} className="bg-card border-border shadow-sm hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-foreground text-sm">
                        {pub.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        {pub.publisher} · {pub.date}
                      </p>
                      {pub.authors && pub.authors.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {pub.authors.join(', ')}
                        </p>
                      )}
                      {pub.tags && pub.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {pub.tags.map(tag => (
                            <Badge key={tag} variant="neutral" className="text-[10px] px-1.5 py-0.5">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {pub.link && (
                      <a href={pub.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(pub)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pub.id, pub.title)} className="h-9 w-9 hover:bg-danger-subtle text-danger-fg hover:text-danger-fg rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={FileText}
            title="No publications found"
            description={searchQuery ? 'Try a different search.' : 'Add your papers, articles, and published work.'}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Publication?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete Publication"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit Publication' : 'Add Publication'}
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
