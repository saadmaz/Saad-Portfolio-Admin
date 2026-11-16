import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Hackathon } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trophy, Calendar, Layout } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RowActions from '@/components/admin/RowActions';
import { ROW_CARD, ICON_TILE, ROW_TITLE, ROW_META, SKELETON } from '@/components/admin/listStyles';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { cn, plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import { LightboxModal } from '@/components/ui/LightboxModal';
import * as z from 'zod';

const hackathonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  organizer: z.string().min(1, 'Organizer is required'),
  date: z.string().min(1, 'Date is required'),
  role: z.string().min(1, 'Role is required'),
  projectTitle: z.string().optional(),
  achievement: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type HackathonFormData = z.infer<typeof hackathonSchema>;

const hackathonFields = [
  { name: 'image', label: 'Event / Team Photo (16:9)', type: 'image' as const },
  { name: 'name', label: 'Hackathon Name', type: 'text' as const, placeholder: 'e.g. Hack The North' },
  { name: 'organizer', label: 'Organizer', type: 'text' as const, placeholder: 'e.g. University of Waterloo' },
  { name: 'date', label: 'Date', type: 'text' as const, placeholder: 'e.g. September 2023' },
  { name: 'role', label: 'Your Role', type: 'text' as const, placeholder: 'e.g. Lead Developer' },
  { name: 'projectTitle', label: 'Project Built (Optional)', type: 'text' as const, placeholder: 'e.g. AgriGuard' },
  { name: 'achievement', label: 'Achievement / Award (Optional)', type: 'text' as const, placeholder: 'e.g. First Place' },
  { name: 'description', label: 'Description (Optional)', type: 'textarea' as const, placeholder: 'What did you build?' },
  { name: 'link', label: 'Project/Event Link (Optional)', type: 'text' as const, placeholder: 'https://...' },
];

const AdminHackathons = () => {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentHackathon, setCurrentHackathon] = useState<Hackathon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => { fetchHackathons(); }, []);

  const fetchHackathons = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getHackathons();
      setHackathons(data);
    } catch {
      toast.error('Failed to load hackathons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrentHackathon(null); setIsDialogOpen(true); };
  useCreateIntent(handleAdd);
  const handleEdit = (hack: Hackathon) => { setCurrentHackathon(hack); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteHackathon(deleteTarget.id);
      toast.success('Hackathon deleted successfully');
      fetchHackathons();
    } catch { toast.error('Failed to delete hackathon'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: HackathonFormData) => {
    try {
      if (currentHackathon) {
        await CommonService.updateHackathon(currentHackathon.id, data);
        toast.success('Hackathon updated successfully');
      } else {
        await CommonService.createHackathon(data);
        toast.success('Hackathon created successfully');
      }
      fetchHackathons();
    } catch (error) {
      toast.error('Failed to save hackathon');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hackathons"
        subtitle={plural(hackathons.length, "hackathon")}
        actions={
          <Button onClick={handleAdd} variant="primary">
            <Plus className="w-4 h-4" /> Add hackathon
          </Button>
        }
      />

      <div className="grid gap-4">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className={cn(SKELETON, 'h-32')} />
          ))
        ) : hackathons.length > 0 ? (
          hackathons.map((hack) => (
            <Card key={hack.id} className={cn(ROW_CARD, 'overflow-hidden')}>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {hack.image && (
                    <button
                      type="button"
                      onClick={() => setLightbox(hack.image!)}
                      aria-label="View image" className="md:w-40 h-32 md:h-auto shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <img
                        src={hack.image}
                        alt={hack.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  )}
                  <div className="flex flex-1 flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                    <div className="flex min-w-0 items-start gap-4">
                      {!hack.image && (
                        <div className={ICON_TILE}>
                          <Trophy />
                        </div>
                      )}
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className={ROW_TITLE}>{hack.name}</h3>
                          {hack.achievement && (
                            <Badge variant="accent">
                              {hack.achievement}
                            </Badge>
                          )}
                        </div>
                        <div className={cn(ROW_META, 'flex flex-wrap gap-x-4 gap-y-1')}>
                          <span className="flex items-center gap-1.5"><Layout className="h-3.5 w-3.5" aria-hidden="true" /> {hack.role}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" aria-hidden="true" /> {hack.date}</span>
                          <span className="text-accent font-medium">{hack.organizer}</span>
                        </div>
                        {hack.projectTitle && (
                          <p className={cn(ROW_META, 'mt-1.5')}>
                            Project: <span className="text-foreground font-medium">{hack.projectTitle}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <RowActions label="hackathon" reveal className="self-end md:self-center" onEdit={() => handleEdit(hack)} onDelete={() => handleDelete(hack.id, hack.name)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Trophy}
            title="No hackathons yet"
            description="Add your hackathon experiences to highlight your rapid prototyping skills."
            action={{ label: 'Add hackathon', onClick: handleAdd }}
          />
        )}
      </div>

      <LightboxModal
        images={lightbox ? [lightbox] : []}
        currentIndex={0}
        isOpen={!!lightbox}
        onClose={() => setLightbox(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete hackathon?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />

      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentHackathon ? 'Edit hackathon' : 'Add hackathon'}
        fields={hackathonFields}
        schema={hackathonSchema}
        defaultValues={currentHackathon || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminHackathons;
