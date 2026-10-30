import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Patent } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Plus, Search, Lightbulb, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const patentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  patentOffice: z.string().min(1, 'Patent office is required'),
  status: z.string().min(1, 'Status is required'),
  patentNumber: z.string().optional(),
  filingDate: z.string().optional(),
  issueDate: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type PatentFormData = z.infer<typeof patentSchema>;

const patentFields = [
  { name: 'title', label: 'Patent Title', type: 'text' as const, placeholder: 'e.g. Method for Efficient Neural Network Pruning' },
  { name: 'patentOffice', label: 'Patent Office', type: 'text' as const, placeholder: 'e.g. USPTO, EPO, WIPO' },
  { name: 'status', label: 'Status', type: 'text' as const, placeholder: 'e.g. Pending, Issued, Abandoned' },
  { name: 'patentNumber', label: 'Patent Number (Optional)', type: 'text' as const, placeholder: 'e.g. US10,123,456' },
  { name: 'filingDate', label: 'Filing Date (Optional)', type: 'text' as const, placeholder: 'e.g. Jan 2023' },
  { name: 'issueDate', label: 'Issue Date (Optional)', type: 'text' as const, placeholder: 'e.g. June 2024' },
  { name: 'description', label: 'Description (Optional)', type: 'textarea' as const, placeholder: 'Brief description of the invention...' },
  { name: 'link', label: 'Patent Link (Optional)', type: 'text' as const, placeholder: 'https://...' },
] as const;

const STATUS_VARIANTS: Record<string, NonNullable<BadgeProps['variant']>> = {
  issued: 'success',
  pending: 'warning',
  abandoned: 'danger',
};

const getStatusVariant = (status: string): NonNullable<BadgeProps['variant']> =>
  STATUS_VARIANTS[status.toLowerCase()] ?? 'neutral';

const AdminPatents = () => {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [current, setCurrent] = useState<Patent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchPatents(); }, []);

  const fetchPatents = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getPatents();
      setPatents(data);
    } catch {
      toast.error('Failed to load patents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrent(null); setIsDialogOpen(true); };
  useCreateIntent(handleAdd);
  const handleEdit = (p: Patent) => { setCurrent(p); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deletePatent(deleteTarget.id);
      toast.success('Patent deleted');
      fetchPatents();
    } catch { toast.error('Failed to delete patent'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: PatentFormData) => {
    try {
      if (current) {
        await CommonService.updatePatent(current.id, data);
        toast.success('Patent updated');
      } else {
        await CommonService.createPatent(data);
        toast.success('Patent added');
      }
      fetchPatents();
    } catch {
      toast.error('Failed to save patent');
      throw new Error('save failed');
    }
  };

  const filtered = patents.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.patentOffice?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patents"
        subtitle={patents.length ? plural(patents.length, "patent") : "0 patents · hidden on the site until you add one"}
        actions={
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Add patent
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patents..."
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className="h-24 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((patent) => (
            <Card key={patent.id} className="bg-card border-border hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border-subtle flex items-center justify-center text-fg-2 flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground text-sm">
                          {patent.title}
                        </h3>
                        <Badge variant={getStatusVariant(patent.status)}>
                          {patent.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        {patent.patentOffice}{patent.patentNumber ? ` · ${patent.patentNumber}` : ''}
                      </p>
                      {(patent.filingDate || patent.issueDate) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {patent.filingDate ? `Filed: ${patent.filingDate}` : ''}
                          {patent.filingDate && patent.issueDate ? ' · ' : ''}
                          {patent.issueDate ? `Issued: ${patent.issueDate}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {patent.link && (
                      <a href={patent.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(patent)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(patent.id, patent.title)} className="h-9 w-9 hover:bg-danger-subtle text-danger-fg hover:text-danger-fg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Lightbulb}
            title="No patents found"
            description={searchQuery ? 'Try a different search.' : 'Add your patent filings and inventions.'}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete patent?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete patent"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit patent' : 'Add patent'}
        fields={patentFields}
        schema={patentSchema}
        defaultValues={current || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminPatents;
