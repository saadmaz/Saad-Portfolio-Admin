import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Organization } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, Edit2, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
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
  useCreateIntent(handleAdd);
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
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle={plural(organizations.length, "organization")}
        actions={
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Add organization
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search organizations..."
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
                        <div className="w-12 h-12 rounded-xl bg-secondary border border-border-subtle flex items-center justify-center text-fg-2 flex-shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground text-sm">{org.name}</h3>
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
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(org)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(org.id, org.name)} className="h-9 w-9 hover:bg-danger-subtle text-danger-fg hover:text-danger-fg">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Building2}
            title="No organizations found"
            description={searchQuery ? 'Try a different search.' : 'Add professional associations and memberships.'}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete organization?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete organization"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit organization' : 'Add organization'}
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
