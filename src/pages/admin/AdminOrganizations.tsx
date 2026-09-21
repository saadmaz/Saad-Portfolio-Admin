import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Organization } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, Edit2, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import * as z from 'zod';

const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  position: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  image: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

const organizationFields = [
  { name: 'image', label: 'Logo / Photo (Optional)', type: 'image' as const },
  { name: 'name', label: 'Organization Name', type: 'text' as const, placeholder: 'e.g. IEEE Student Branch' },
  { name: 'position', label: 'Position / Role (Optional)', type: 'text' as const, placeholder: 'e.g. Secretary, Member, Chapter Lead' },
  { name: 'startDate', label: 'Start Date (Optional)', type: 'text' as const, placeholder: 'e.g. Jan 2022' },
  { name: 'endDate', label: 'End Date (Optional)', type: 'text' as const, placeholder: 'e.g. Dec 2023' },
  { name: 'description', label: 'Description (Optional)', type: 'textarea' as const, placeholder: 'What you did in this organization...' },
  { name: 'link', label: 'Organization Link (Optional)', type: 'text' as const, placeholder: 'https://...' },
] as const;

const AdminOrganizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [current, setCurrent] = useState<Organization | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchOrganizations(); }, []);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getOrganizations();
      setOrganizations(data);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrent(null); setIsDialogOpen(true); };
  const handleEdit = (o: Organization) => { setCurrent(o); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteOrganization(deleteTarget.id);
      toast.success('Organization deleted');
      fetchOrganizations();
    } catch { toast.error('Failed to delete organization'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: OrganizationFormData) => {
    try {
      if (current) {
        await CommonService.updateOrganization(current.id, data);
        toast.success('Organization updated');
      } else {
        await CommonService.createOrganization(data);
        toast.success('Organization added');
      }
      fetchOrganizations();
    } catch {
      toast.error('Failed to save organization');
      throw new Error('save failed');
    }
  };

  const filtered = organizations.filter(o =>
    o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="PROFILE"
        title="Organizations"
        subtitle="Professional associations, clubs, and memberships."
        backTo="/dashboard"
        actions={
          <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-accent-foreground font-black h-11 px-6 rounded-lg flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Organization
          </Button>
        }
      />

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search organizations..."
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
          filtered.map((org) => (
            <Card key={org.id} className="bg-card border-border hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg overflow-hidden shadow-sm">
              <CardContent className="p-0">
                <div className="flex">
                  {org.image && (
                    <div className="w-20 flex-shrink-0">
                      <img src={org.image} alt={org.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {!org.image && (
                        <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-black text-foreground text-sm" style={{ fontFamily: 'DM Sans' }}>{org.name}</h3>
                        {org.position && <p className="text-xs text-accent font-medium">{org.position}</p>}
                        {(org.startDate || org.endDate) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {org.startDate}{org.isCurrent ? ' – Present' : org.endDate ? ` – ${org.endDate}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {org.link && (
                        <a href={org.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(org)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(org.id, org.name)} className="h-9 w-9 hover:bg-red-500/10 text-red-400 hover:text-red-500 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
            <h3 className="text-lg font-black text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>No organizations found</h3>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {searchQuery ? 'Try a different search.' : 'Add professional associations and memberships.'}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Organization?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete Organization"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit Organization' : 'Add Organization'}
        fields={organizationFields}
        schema={organizationSchema}
        defaultValues={current || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminOrganizations;
