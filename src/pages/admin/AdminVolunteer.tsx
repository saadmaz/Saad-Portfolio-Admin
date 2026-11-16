import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { VolunteerExperience } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Heart, Calendar } from 'lucide-react';
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

const volunteerSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  organization: z.string().min(1, 'Organization is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type VolunteerFormData = z.infer<typeof volunteerSchema>;

const volunteerFields = [
  { name: 'image', label: 'Photo (1:1 or 4:3)', type: 'image' as const },
  { name: 'role', label: 'Role / Position', type: 'text' as const, placeholder: 'e.g. Volunteer Teacher' },
  { name: 'organization', label: 'Organization', type: 'text' as const, placeholder: 'e.g. Red Cross' },
  { name: 'startDate', label: 'Start Date', type: 'text' as const, placeholder: 'e.g. Jan 2022' },
  { name: 'endDate', label: 'End Date (Optional)', type: 'text' as const, placeholder: 'e.g. Dec 2022' },
  { name: 'description', label: 'Description', type: 'textarea' as const, placeholder: 'What was your impact?' },
  { name: 'link', label: 'Organization Link (Optional)', type: 'text' as const, placeholder: 'https://...' },
];

const AdminVolunteer = () => {
  const [volunteer, setVolunteer] = useState<VolunteerExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentExp, setCurrentExp] = useState<VolunteerExperience | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => { fetchVolunteer(); }, []);

  const fetchVolunteer = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getVolunteerExperience();
      setVolunteer(data);
    } catch {
      toast.error('Failed to load volunteer experience');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrentExp(null); setIsDialogOpen(true); };
  useCreateIntent(handleAdd);
  const handleEdit = (exp: VolunteerExperience) => { setCurrentExp(exp); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteVolunteerExperience(deleteTarget.id);
      toast.success('Experience deleted successfully');
      fetchVolunteer();
    } catch { toast.error('Failed to delete experience'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: VolunteerFormData) => {
    try {
      if (currentExp) {
        await CommonService.updateVolunteerExperience(currentExp.id, data);
        toast.success('Experience updated successfully');
      } else {
        await CommonService.createVolunteerExperience(data);
        toast.success('Experience created successfully');
      }
      fetchVolunteer();
    } catch (error) {
      toast.error('Failed to save experience');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteer"
        subtitle={plural(volunteer.length, "role")}
        actions={
          <Button onClick={handleAdd} variant="primary">
            <Plus className="w-4 h-4" /> Add volunteer role
          </Button>
        }
      />

      <div className="grid gap-4">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className={cn(SKELETON, 'h-28')} />
          ))
        ) : volunteer.length > 0 ? (
          volunteer.map((exp) => (
            <Card key={exp.id} className={cn(ROW_CARD, 'overflow-hidden')}>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {exp.image && (
                    <button
                      type="button"
                      onClick={() => setLightbox(exp.image!)}
                      aria-label="View image" className="md:w-36 h-28 md:h-auto shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <img
                        src={exp.image}
                        alt={exp.organization}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  )}
                  <div className="flex flex-1 flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                    <div className="flex min-w-0 items-start gap-4">
                      {!exp.image && (
                        <div className={ICON_TILE}>
                          <Heart />
                        </div>
                      )}
                      <div>
                        <h3 className={ROW_TITLE}>{exp.role}</h3>
                        <p className="text-[13px] font-medium text-accent">{exp.organization}</p>
                        <div className={cn(ROW_META, 'mt-1.5 flex flex-wrap gap-x-4 gap-y-1')}>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    <RowActions label="volunteer role" reveal className="self-end md:self-center" onEdit={() => handleEdit(exp)} onDelete={() => handleDelete(exp.id, exp.role)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Heart}
            title="No volunteer roles yet"
            description="Highlight your contributions to the community."
            action={{ label: 'Add volunteer role', onClick: handleAdd }}
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
        title="Delete volunteer role?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />

      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentExp ? 'Edit volunteer role' : 'Add volunteer role'}
        fields={volunteerFields}
        schema={volunteerSchema}
        defaultValues={currentExp || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminVolunteer;
