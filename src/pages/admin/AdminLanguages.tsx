import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Language } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Globe, Edit2, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
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
    } catch (error) {
      toast.error('Failed to load languages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentLanguage(null);
    setIsDialogOpen(true);
  };

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="COMMUNICATION"
        title="Languages"
        subtitle="Manage the languages you speak and your proficiency levels."
        backTo="/dashboard"
        actions={
          <Button onClick={handleAdd} variant="primary" className="font-semibold h-11 px-6 rounded-lg">
            <Plus className="w-4 h-4 mr-2" /> Add New Language
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : languages.length > 0 ? (
          languages.map((lang) => (
            <Card key={lang.id} interactive className="bg-card border-border shadow-sm overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-info-subtle border border-info/20 flex items-center justify-center text-info-fg">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{lang.name}</h3>
                      <p className="text-sm text-accent">{lang.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(lang)} className="h-8 w-8 hover:bg-secondary">
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(lang.id, lang.name)} className="h-8 w-8 hover:bg-danger-subtle text-danger-fg hover:text-danger">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Proficiency</span>
                    <span>{lang.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border">
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
            title="No languages added"
            description="Add languages to showcase your communication skills."
            action={{ label: 'Add New Language', onClick: handleAdd }}
            className="md:col-span-2"
          />
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete Language?" description={`"${deleteTarget?.label}" will be permanently deleted.`} confirmLabel="Delete" onConfirm={handleConfirmDelete} />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentLanguage ? 'Edit Language' : 'Add New Language'}
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
