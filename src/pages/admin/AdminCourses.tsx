import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Course } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, BookMarked, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import BackButton from '@/components/admin/BackButton';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-3">
          <BackButton to="/dashboard" className="mt-1 flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent mb-3">CONTENT</p>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground" style={{ fontFamily: 'DM Sans' }}>
              Courses
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Courses and programs you have completed.
            </p>
          </div>
        </div>
        <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-black font-black h-11 px-6 rounded-lg flex-shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Add Course
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
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
          filtered.map((course) => (
            <Card key={course.id} className="bg-card border-border hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                      <BookMarked className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-foreground text-sm truncate" style={{ fontFamily: 'DM Sans' }}>
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
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(course)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id, course.name)} className="h-9 w-9 hover:bg-red-500/10 text-red-400 hover:text-red-500 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
            <h3 className="text-lg font-black text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>No courses found</h3>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {searchQuery ? 'Try a different search.' : 'Add the courses you have completed.'}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Course?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete Course"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit Course' : 'Add Course'}
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
