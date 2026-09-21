import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Hackathon } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trophy, Edit2, Trash2, Calendar, Layout } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import BackButton from '@/components/admin/BackButton';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" className="flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent mb-2">COMPETITIONS</p>
            <h1 className="text-4xl font-black tracking-tight mb-1 text-foreground" style={{ fontFamily: 'DM Sans' }}>Hackathons</h1>
            <p className="text-sm text-muted-foreground font-medium">Manage your hackathon participations and achievements.</p>
          </div>
        </div>
        <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-black font-semibold h-11 px-6 rounded-lg">
          <Plus className="w-4 h-4 mr-2" /> Add Hackathon
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className="h-32 w-full bg-secondary border border-border rounded-2xl animate-pulse" />
          ))
        ) : hackathons.length > 0 ? (
          hackathons.map((hack) => (
            <Card key={hack.id} className="bg-card border-border hover:bg-secondary hover:border-accent/30 transition-all overflow-hidden group shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {hack.image && (
                    <button
                      type="button"
                      onClick={() => setLightbox(hack.image!)}
                      className="md:w-40 h-32 md:h-auto flex-shrink-0 overflow-hidden focus:outline-none"
                    >
                      <img
                        src={hack.image}
                        alt={hack.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  )}
                  <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {!hack.image && (
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                          <Trophy className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground text-lg">{hack.name}</h3>
                          {hack.achievement && (
                            <span className="px-2 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider border border-accent/20">
                              {hack.achievement}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Layout className="w-3.5 h-3.5 text-accent" /> {hack.role}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-accent" /> {hack.date}</span>
                          <span className="text-accent font-medium">{hack.organizer}</span>
                        </div>
                        {hack.projectTitle && (
                          <p className="mt-2 text-sm text-muted-foreground font-medium">
                            Project: <span className="text-foreground font-semibold">{hack.projectTitle}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(hack)} className="hover:bg-secondary text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(hack.id, hack.name)} className="hover:bg-red-500/10 text-red-400 hover:text-red-500">
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
            <h3 className="text-lg font-medium text-muted-foreground mb-1">No hackathons listed</h3>
            <p className="text-sm text-muted-foreground">Add your hackathon experiences to highlight your rapid prototyping skills.</p>
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
        title="Delete Hackathon?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />

      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentHackathon ? 'Edit Hackathon' : 'Add Hackathon'}
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
