import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Cause } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Leaf } from 'lucide-react';
import RowActions from '@/components/admin/RowActions';
import { ROW_CARD, ICON_TILE, ROW_TITLE, ROW_META, SKELETON } from '@/components/admin/listStyles';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { cn, plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const causeSchema = z.object({
  name: z.string().min(1, 'Cause name is required'),
  description: z.string().optional(),
});

type CauseFormData = z.infer<typeof causeSchema>;

const causeFields = [
  { name: 'name', label: 'Cause / Issue', type: 'text' as const, placeholder: 'e.g. Climate Change, Education Equity, Open Source' },
  { name: 'description', label: 'Description (Optional)', type: 'textarea' as const, placeholder: 'Why this cause matters to you…' },
] as const;

const AdminCauses = () => {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [current, setCurrent] = useState<Cause | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchCauses(); }, []);

  const fetchCauses = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getCauses();
      setCauses(data);
    } catch {
      toast.error('Failed to load causes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrent(null); setIsDialogOpen(true); };
  useCreateIntent(handleAdd);
  const handleEdit = (c: Cause) => { setCurrent(c); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteCause(deleteTarget.id);
      toast.success('Cause deleted');
      fetchCauses();
    } catch { toast.error('Failed to delete cause'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: CauseFormData) => {
    try {
      if (current) {
        await CommonService.updateCause(current.id, data);
        toast.success('Cause updated');
      } else {
        await CommonService.createCause(data);
        toast.success('Cause added');
      }
      fetchCauses();
    } catch {
      toast.error('Failed to save cause');
      throw new Error('save failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Causes"
        subtitle={plural(causes.length, "cause")}
        actions={
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Add cause
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3].map(i => (
            <div key={i} className={cn(SKELETON, 'h-20')} />
          ))
        ) : causes.length > 0 ? (
          causes.map((cause) => (
            <Card key={cause.id} className={ROW_CARD}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={ICON_TILE}>
                      <Leaf />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h3 className={ROW_TITLE}>{cause.name}</h3>
                      {cause.description && (
                        <p className={cn(ROW_META, 'mt-0.5 line-clamp-2 leading-relaxed')}>{cause.description}</p>
                      )}
                    </div>
                  </div>
                  <RowActions label="cause" reveal onEdit={() => handleEdit(cause)} onDelete={() => handleDelete(cause.id, cause.name)} />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={Leaf}
              title="No causes yet"
              description="Share the issues and causes you care about."
              action={{ label: 'Add cause', onClick: handleAdd }}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete cause?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete cause"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit cause' : 'Add cause'}
        fields={causeFields}
        schema={causeSchema}
        defaultValues={current || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminCauses;
