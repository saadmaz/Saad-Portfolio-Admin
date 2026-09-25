import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Cause } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Leaf, Edit2, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const causeSchema = z.object({
  name: z.string().min(1, 'Cause name is required'),
  description: z.string().optional(),
});

type CauseFormData = z.infer<typeof causeSchema>;

const causeFields = [
  { name: 'name', label: 'Cause / Issue', type: 'text' as const, placeholder: 'e.g. Climate Change, Education Equity, Open Source' },
  { name: 'description', label: 'Description (Optional)', type: 'textarea' as const, placeholder: 'Why this cause matters to you...' },
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="PROFILE"
        title="Causes"
        subtitle="Issues and causes you care about."
        backTo="/dashboard"
        actions={
          <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-accent-foreground font-black h-11 px-6 rounded-lg flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Cause
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-20 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : causes.length > 0 ? (
          causes.map((cause) => (
            <Card key={cause.id} className="bg-card border-border hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground flex-shrink-0 mt-0.5">
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-foreground text-sm">{cause.name}</h3>
                      {cause.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{cause.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cause)} className="h-7 w-7 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-md">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cause.id, cause.name)} className="h-7 w-7 hover:bg-danger-subtle text-danger hover:text-danger-fg rounded-md">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={Leaf}
              title="No causes added"
              description="Share the issues and causes you care about."
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Cause?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete Cause"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit Cause' : 'Add Cause'}
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
