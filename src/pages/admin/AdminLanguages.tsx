import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Language } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Globe } from 'lucide-react';
import RowActions from '@/components/admin/RowActions';
import { ROW_CARD, ICON_TILE, ROW_TITLE, SKELETON } from '@/components/admin/listStyles';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { cn, plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const languageSchema = z.object({
  name: z.string().min(1, 'Language name is required'),
  level: z.string().min(1, 'Proficiency level is required'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
});

type LanguageFormData = z.infer<typeof languageSchema>;

const languageFields = [
  { name: 'name', label: 'Language Name', type: 'text', placeholder: 'e.g. English' },
  {
    name: 'level',
    label: 'Proficiency Level',
    type: 'select',
    placeholder: 'Select level',
    options: [
      { label: 'Native / Bilingual', value: 'Native / Bilingual' },
      { label: 'Professional Working', value: 'Professional Working' },
      { label: 'Limited Working', value: 'Limited Working' },
      { label: 'Elementary', value: 'Elementary' },
    ]
  },
  { name: 'percentage', label: 'Proficiency Percentage', type: 'number', placeholder: 'e.g. 95' },
] as const;

const AdminLanguages = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getLanguages();
      setLanguages(data);
    } catch {
      toast.error('Failed to load languages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentLanguage(null);
    setIsDialogOpen(true);
  };
  useCreateIntent(handleAdd);

  const handleEdit = (lang: Language) => {
    setCurrentLanguage(lang);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteLanguage(deleteTarget.id);
      toast.success('Language deleted successfully');
      fetchLanguages();
    } catch { toast.error('Failed to delete language'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: LanguageFormData) => {
    try {
      if (currentLanguage) {
        await CommonService.updateLanguage(currentLanguage.id, data);
        toast.success('Language updated successfully');
      } else {
        await CommonService.createLanguage(data);
        toast.success('Language created successfully');
      }
      fetchLanguages();
    } catch (error) {
      toast.error('Failed to save language');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Languages"
        subtitle={plural(languages.length, "language")}
        actions={
          <Button onClick={handleAdd} variant="primary">
            <Plus className="w-4 h-4" /> Add language
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className={cn(SKELETON, 'h-32')} />
          ))
        ) : languages.length > 0 ? (
          languages.map((lang) => (
            <Card key={lang.id} className={ROW_CARD}>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={ICON_TILE}>
                      <Globe />
                    </div>
                    <div className="min-w-0">
                      <h3 className={cn(ROW_TITLE, 'truncate')}>{lang.name}</h3>
                      <p className="text-[13px] font-medium text-accent">{lang.level}</p>
                    </div>
                  </div>
                  <RowActions label="language" reveal onEdit={() => handleEdit(lang)} onDelete={() => handleDelete(lang.id, lang.name)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-caption text-muted-foreground">
                    <span>Proficiency</span>
                    <span className="tabular">{lang.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-accent transition-all duration-1000 ease-out"
                      style={{ width: `${lang.percentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Globe}
            title="No languages yet"
            description="Add languages to showcase your communication skills."
            action={{ label: 'Add language', onClick: handleAdd }}
            className="md:col-span-2"
          />
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete language?" description={`"${deleteTarget?.label}" will be permanently deleted.`} confirmLabel="Delete" onConfirm={handleConfirmDelete} />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentLanguage ? 'Edit language' : 'Add language'}
        fields={languageFields}
        schema={languageSchema}
        defaultValues={currentLanguage || { percentage: 80 }}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminLanguages;
