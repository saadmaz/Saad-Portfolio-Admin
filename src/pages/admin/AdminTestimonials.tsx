import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Testimonial } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Quote } from 'lucide-react';
import RowActions from '@/components/admin/RowActions';
import { ROW_CARD, ROW_TITLE, ROW_META, SKELETON } from '@/components/admin/listStyles';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { cn, plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const testimonialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  company: z.string().min(1, 'Company is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  avatar: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

const testimonialFields = [
  { name: 'name', label: 'Author Name', type: 'text', placeholder: 'e.g. John Doe' },
  { name: 'position', label: 'Position', type: 'text', placeholder: 'e.g. Senior Software Engineer' },
  { name: 'company', label: 'Company', type: 'text', placeholder: 'e.g. Tech Corp' },
  { name: 'content', label: 'Testimonial Content', type: 'textarea', placeholder: 'What did they say?' },
  { name: 'avatar', label: 'Avatar URL (Optional)', type: 'text', placeholder: 'https://...' },
] as const;

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState<Testimonial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getTestimonials();
      setTestimonials(data);
    } catch {
      toast.error('Failed to load testimonials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentTestimonial(null);
    setIsDialogOpen(true);
  };
  useCreateIntent(handleAdd);

  const handleEdit = (test: Testimonial) => {
    setCurrentTestimonial(test);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteTestimonial(deleteTarget.id);
      toast.success('Testimonial deleted successfully');
      fetchTestimonials();
    } catch { toast.error('Failed to delete testimonial'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: TestimonialFormData) => {
    try {
      if (currentTestimonial) {
        await CommonService.updateTestimonial(currentTestimonial.id, data);
        toast.success('Testimonial updated successfully');
      } else {
        await CommonService.createTestimonial(data);
        toast.success('Testimonial created successfully');
      }
      fetchTestimonials();
    } catch (error) {
      toast.error('Failed to save testimonial');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testimonials"
        subtitle={plural(testimonials.length, "testimonial")}
        actions={
          <Button onClick={handleAdd} variant="primary">
            <Plus className="w-4 h-4" /> Add testimonial
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className={cn(SKELETON, 'h-48')} />
          ))
        ) : testimonials.length > 0 ? (
          testimonials.map((test) => (
            <Card key={test.id} className={cn(ROW_CARD, 'relative flex flex-col overflow-hidden')}>
              <CardContent className="flex flex-1 flex-col p-5">
                <Quote className="absolute right-4 top-4 h-10 w-10 text-border transition-colors group-hover:text-accent/40" aria-hidden="true" />
                <div className="mb-4 flex items-center gap-3 pr-12">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-secondary text-fg-2">
                    {test.avatar ? (
                      <img src={test.avatar} alt={test.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-medium">{test.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn(ROW_TITLE, 'truncate')}>{test.name}</h3>
                    <p className={cn(ROW_META, 'truncate')}>{[test.position, test.company].filter(Boolean).join(' at ')}</p>
                  </div>
                </div>
                <p className="mb-4 line-clamp-4 flex-1 text-sm leading-relaxed text-fg-2">
                  “{test.content}”
                </p>
                <RowActions label="testimonial" reveal className="justify-end" onEdit={() => handleEdit(test)} onDelete={() => handleDelete(test.id, test.name)} />
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Quote}
            title="No testimonials yet"
            description="Showcase what people are saying about your work."
            action={{ label: 'Add testimonial', onClick: handleAdd }}
            className="md:col-span-2"
          />
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete testimonial?" description={`"${deleteTarget?.label}" will be permanently deleted.`} confirmLabel="Delete" onConfirm={handleConfirmDelete} />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentTestimonial ? 'Edit testimonial' : 'Add testimonial'}
        fields={testimonialFields}
        schema={testimonialSchema}
        defaultValues={currentTestimonial || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminTestimonials;
