import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Course } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, BookMarked, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  school: z.string().min(1, 'School / platform is required'),
  associatedWith: z.string().optional(),
  completedDate: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type CourseFormData = z.infer<typeof courseSchema>;

const courseFields = [
  { name: 'name', label: 'Course Name', type: 'text' as const, placeholder: 'e.g. Machine Learning Specialization' },
  { name: 'school', label: 'School / Platform', type: 'text' as const, placeholder: 'e.g. Coursera, MIT OpenCourseWare' },
  { name: 'associatedWith', label: 'Associated Institution (Optional)', type: 'text' as const, placeholder: 'e.g. Stanford University' },
  { name: 'completedDate', label: 'Completion Date (Optional)', type: 'text' as const, placeholder: 'e.g. June 2023' },
  { name: 'description', label: 'Description (Optional)', type: 'textarea' as const, placeholder: 'What you learned...' },
  { name: 'link', label: 'Course Link (Optional)', type: 'text' as const, placeholder: 'https://...' },
] as const;

const AdminCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [current, setCurrent] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getCourses();
      setCourses(data);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrent(null); setIsDialogOpen(true); };
  useCreateIntent(handleAdd);
  const handleEdit = (c: Course) => { setCurrent(c); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteCourse(deleteTarget.id);
      toast.success('Course deleted');
      fetchCourses();
    } catch { toast.error('Failed to delete course'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: CourseFormData) => {
    try {
      if (current) {
        await CommonService.updateCourse(current.id, data);
        toast.success('Course updated');
      } else {
        await CommonService.createCourse(data);
        toast.success('Course added');
      }
      fetchCourses();
    } catch {
      toast.error('Failed to save course');
      throw new Error('save failed');
    }
  };

  const filtered = courses.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.school?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        subtitle={plural(courses.length, "course")}
        actions={
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Add course
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
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
          filtered.map((course) => (
            <Card key={course.id} className="bg-card border-border hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border-subtle flex items-center justify-center text-fg-2 flex-shrink-0">
                      <BookMarked className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground text-sm truncate">
                        {course.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        {course.school}{course.associatedWith ? ` · ${course.associatedWith}` : ''}{course.completedDate ? ` · ${course.completedDate}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {course.link && (
                      <a href={course.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(course)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id, course.name)} className="h-9 w-9 hover:bg-danger-subtle text-danger-fg hover:text-danger-fg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={BookMarked}
            title="No courses found"
            description={searchQuery ? 'Try a different search.' : 'Add the courses you have completed.'}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete course?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete course"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit course' : 'Add course'}
        fields={courseFields}
        schema={courseSchema}
        defaultValues={current || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminCourses;
