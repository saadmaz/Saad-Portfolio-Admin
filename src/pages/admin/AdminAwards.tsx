import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Award } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Award as AwardIcon } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { cn, plural } from '@/shared/lib/utils';
import SearchInput from '@/components/admin/SearchInput';
import RowActions from '@/components/admin/RowActions';
import { ROW_CARD, ICON_TILE, ROW_TITLE, ROW_META, SKELETON } from '@/components/admin/listStyles';
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
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Briefly describe the award…' },
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

      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search awards…" />

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3].map(i => <div key={i} className={cn(SKELETON, 'h-[78px]')} />)
        ) : filteredAwards.length > 0 ? (
          filteredAwards.map((award) => (
            <Card key={award.id} className={ROW_CARD}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className={ICON_TILE}>
                    <AwardIcon />
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn(ROW_TITLE, 'truncate')}>{award.title}</h3>
                    <p className={ROW_META}>{[award.issuer, award.date].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <RowActions
                  label="award"
                  href={award.link || undefined}
                  onEdit={() => handleEdit(award)}
                  onDelete={() => handleDelete(award.id, award.title)}
                />
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
        title={currentAward ? 'Edit award' : 'Add award'}
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
