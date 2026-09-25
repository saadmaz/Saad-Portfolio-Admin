import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Testimonial } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Quote, Edit2, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="SOCIAL PROOF"
        title="Testimonials"
        subtitle="Manage recommendations from colleagues and clients."
        backTo="/dashboard"
        actions={
          <Button onClick={handleAdd} variant="primary" className="font-semibold h-11 px-6 rounded-lg">
            <Plus className="w-4 h-4 mr-2" /> Add Testimonial
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className="h-48 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : testimonials.length > 0 ? (
          testimonials.map((test) => (
            <Card key={test.id} interactive className="bg-card border-border shadow-sm overflow-hidden relative group">
              <CardContent className="p-6">
                <Quote className="absolute top-4 right-4 w-10 h-10 text-border group-hover:text-accent/10 transition-colors" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 border border-border flex items-center justify-center text-accent overflow-hidden">
                    {test.avatar ? (
                      <img src={test.avatar} alt={test.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold">{test.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{test.name}</h3>
                    <p className="text-xs text-muted-foreground">{test.position} at {test.company}</p>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4 mb-4">
                  "{test.content}"
                </p>
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(test)} className="h-8 w-8 hover:bg-secondary">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(test.id, test.name)} className="h-8 w-8 hover:bg-danger-subtle text-danger-fg hover:text-danger">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Quote}
            title="No testimonials yet"
            description="Showcase what people are saying about your work."
            action={{ label: 'Add Testimonial', onClick: handleAdd }}
            className="md:col-span-2"
          />
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete Testimonial?" description={`"${deleteTarget?.label}" will be permanently deleted.`} confirmLabel="Delete" onConfirm={handleConfirmDelete} />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}
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
