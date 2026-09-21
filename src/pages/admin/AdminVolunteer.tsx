import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { VolunteerExperience } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Heart, Edit2, Trash2, Calendar } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import BackButton from '@/components/admin/BackButton';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" className="flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent mb-2">COMMUNITY</p>
            <h1 className="text-4xl font-black tracking-tight mb-1 text-foreground" style={{ fontFamily: 'DM Sans' }}>Volunteer Work</h1>
            <p className="text-sm text-muted-foreground font-medium">Manage your community service and volunteer experiences.</p>
          </div>
        </div>
        <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-black font-semibold h-11 px-6 rounded-lg">
          <Plus className="w-4 h-4 mr-2" /> Add Experience
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className="h-28 w-full bg-secondary border border-border rounded-2xl animate-pulse" />
          ))
        ) : volunteer.length > 0 ? (
          volunteer.map((exp) => (
            <Card key={exp.id} className="bg-card border-border hover:bg-secondary hover:border-accent/30 transition-all overflow-hidden group shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {exp.image && (
                    <button
                      type="button"
                      onClick={() => setLightbox(exp.image!)}
                      className="md:w-36 h-28 md:h-auto flex-shrink-0 overflow-hidden focus:outline-none"
                    >
                      <img
                        src={exp.image}
                        alt={exp.organization}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  )}
                  <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {!exp.image && (
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                          <Heart className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-foreground text-lg">{exp.role}</h3>
                        <p className="text-accent font-medium">{exp.organization}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-accent" /> {exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)} className="hover:bg-secondary text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id, exp.role)} className="hover:bg-red-500/10 text-red-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <h3 className="text-lg font-medium text-muted-foreground mb-1">No volunteer work added</h3>
            <p className="text-sm text-muted-foreground">Highlight your contributions to the community.</p>
          </div>
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
        title="Delete Experience?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />

      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentExp ? 'Edit Experience' : 'Add Experience'}
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
