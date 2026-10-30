import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Award } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Award as AwardIcon, Edit2, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const awardSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type AwardFormData = z.infer<typeof awardSchema>;

const awardFields = [
  { name: 'title', label: 'Award Title', type: 'text', placeholder: 'e.g. Dean\'s List' },
  { name: 'issuer', label: 'Issuer / Organization', type: 'text', placeholder: 'e.g. University of Toronto' },
  { name: 'date', label: 'Date Received', type: 'text', placeholder: 'e.g. June 2023 or 2023-06' },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Briefly describe the award...' },
  { name: 'link', label: 'Link (Optional)', type: 'text', placeholder: 'https://...' },
] as const;

const AdminAwards = () => {
  const [awards, setAwards] = useState<Award[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAward, setCurrentAward] = useState<Award | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getAwards();
      setAwards(data);
    } catch {
      toast.error('Failed to load awards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentAward(null);
    setIsDialogOpen(true);
  };
  useCreateIntent(handleAdd);

  const handleEdit = (award: Award) => {
    setCurrentAward(award);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteAward(deleteTarget.id);
      toast.success('Award deleted successfully');
      fetchAwards();
    } catch { toast.error('Failed to delete award'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: AwardFormData) => {
    try {
      if (currentAward) {
        await CommonService.updateAward(currentAward.id, data);
        toast.success('Award updated successfully');
      } else {
        await CommonService.createAward(data);
        toast.success('Award created successfully');
      }
      fetchAwards();
    } catch (error) {
      toast.error('Failed to save award');
      throw error;
    }
  };

  const filteredAwards = awards.filter(a =>
    (a.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (a.issuer?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Awards"
        subtitle={plural(awards.length, "award")}
        actions={
          <Button onClick={handleAdd} variant="primary">
            <Plus className="w-4 h-4" /> Add award
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search awards..."
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
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
        ) : filteredAwards.length > 0 ? (
          filteredAwards.map((award) => (
            <Card key={award.id} interactive className="group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border-subtle flex items-center justify-center text-fg-2">
                      <AwardIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-sm">
                        {award.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">{award.issuer} · {award.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(award)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(award.id, award.title)} className="h-9 w-9 hover:bg-danger-subtle text-danger-fg hover:text-danger">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={AwardIcon}
            title={searchQuery ? 'No awards found' : 'No awards yet'}
            description={searchQuery ? 'Try a different search.' : 'Add your achievements to get started.'}
            action={!searchQuery ? { label: 'Add award', onClick: handleAdd } : undefined}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete award?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete award"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentAward ? 'Edit award' : 'Add new award'}
        fields={awardFields}
        schema={awardSchema}
        defaultValues={currentAward || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminAwards;
