import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Organization } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, Calendar } from 'lucide-react';
import SearchInput from '@/components/admin/SearchInput';
import RowActions from '@/components/admin/RowActions';
import { ROW_CARD, ICON_TILE, ROW_TITLE, ROW_META, SKELETON } from '@/components/admin/listStyles';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { cn, plural } from '@/shared/lib/utils';
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
  { name: 'description', label: 'Description (Optional)', type: 'textarea' as const, placeholder: 'What you did in this organization…' },
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

      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search organizations…" />

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3].map(i => (
            <div key={i} className={cn(SKELETON, 'h-24')} />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((org) => (
            <Card key={org.id} className={cn(ROW_CARD, 'overflow-hidden')}>
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
                        <div className={ICON_TILE}>
                          <Building2 className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className={ROW_TITLE}>{org.name}</h3>
                        {org.position && <p className="text-[13px] font-medium text-accent">{org.position}</p>}
                        {(org.startDate || org.endDate) && (
                          <p className={cn(ROW_META, 'mt-0.5 flex items-center gap-1.5')}>
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                            {org.startDate}{org.isCurrent ? ' – Present' : org.endDate ? ` – ${org.endDate}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <RowActions label="organization" href={org.link} onEdit={() => handleEdit(org)} onDelete={() => handleDelete(org.id, org.name)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Building2}
            title={searchQuery ? 'No organizations found' : 'No organizations yet'}
            description={searchQuery ? 'Try a different search.' : 'Add professional associations and memberships.'}
            action={!searchQuery ? { label: 'Add organization', onClick: handleAdd } : undefined}
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
