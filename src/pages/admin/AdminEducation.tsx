import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Education } from '@/types';
import { Button } from "@/components/ui/button";
import { Plus, GraduationCap, Edit2, Calendar, Copy, MoreVertical, Star } from 'lucide-react';
import { toast } from "sonner";
import BackButton from '@/components/admin/BackButton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function getSchoolName(edu: Education): string {
  return edu.school_name ?? edu.institution ?? '—';
}

function getLogoUrl(edu: Education): string | undefined {
  return edu.school_logo ?? edu.logo;
}

function getDisplayStartDate(edu: Education): string {
  if (edu.start_month && edu.start_year) return `${edu.start_month.slice(0, 3)} ${edu.start_year}`;
  if (edu.startDate) return edu.startDate;
  return '—';
}

function getDisplayEndDate(edu: Education): string {
  const isCurrent = edu.is_current ?? edu.isCurrent ?? false;
  if (isCurrent) return 'Present';
  if (edu.end_month && edu.end_year) return `${edu.end_month.slice(0, 3)} ${edu.end_year}`;
  if (edu.endDate) return edu.endDate;
  return '—';
}

function isExpectedGrad(edu: Education): boolean {
  const isCurrent = edu.is_current ?? edu.isCurrent ?? false;
  if (!isCurrent || !edu.end_year) return false;
  const now = new Date();
  return edu.end_year > now.getFullYear() ||
    (edu.end_year === now.getFullYear() && !!edu.end_month &&
      MONTHS.indexOf(edu.end_month) >= now.getMonth());
}

const AdminEducation = () => {
  const navigate = useNavigate();
  const [education, setEducation] = useState<Education[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchEducation(); }, []);

  const fetchEducation = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getEducation();
      setEducation(data);
    } catch {
      toast.error('Failed to load education history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteEducation(deleteTarget.id);
      toast.success('Education deleted');
      fetchEducation();
    } catch { toast.error('Failed to delete education'); }
    finally { setDeleteTarget(null); }
  };

  const handleDuplicate = async (edu: Education) => {
    try {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = edu;
      const name = getSchoolName(edu);
      await CommonService.createEducation({
        ...JSON.parse(JSON.stringify(rest)),
        school_name: `${name} (copy)`,
        institution: `${name} (copy)`,
        is_published: false,
        is_featured: false,
      });
      toast.success('Duplicated as draft — edit the copy to update details');
      fetchEducation();
    } catch { toast.error('Duplicate failed'); }
  };

  const sorted = useMemo(() => {
    return [...education].sort((a, b) => {
      if (a.display_order !== undefined && b.display_order !== undefined) {
        return a.display_order - b.display_order;
      }
      const aYear = a.start_year ?? 0;
      const bYear = b.start_year ?? 0;
      return bYear - aYear;
    });
  }, [education]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-3">
          <BackButton to="/dashboard" className="mt-1 flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent mb-2">ACADEMIC</p>
            <h1 className="text-4xl font-black tracking-tight mb-1 text-foreground" style={{ fontFamily: 'DM Sans' }}>Education</h1>
            <p className="text-sm text-muted-foreground font-medium">Manage your academic background and degrees.</p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/education/new')}
          className="bg-accent hover:bg-accent/90 text-black font-black h-11 px-6 rounded-lg flex-shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Education
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-[240px] w-full bg-secondary border border-border rounded-xl animate-pulse" />
          ))
        ) : sorted.length > 0 ? (
          sorted.map((edu, index) => {
            const logo = getLogoUrl(edu);
            const endDate = getDisplayEndDate(edu);
            const expectedGrad = isExpectedGrad(edu);
            const isCurrent = edu.is_current ?? edu.isCurrent ?? false;

            return (
              <div
                key={edu.id}
                className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-accent/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left h-[240px] flex flex-col animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 50}ms`, animationDuration: '300ms', animationFillMode: 'both' }}
              >
                {/* Hover tint */}
                <div className="absolute inset-0 bg-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />

                {/* Actions dropdown */}
                <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-7 h-7 rounded-lg bg-card/90 backdrop-blur-sm border border-border/80 flex items-center justify-center text-muted-foreground hover:text-accent shadow-sm">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border-border text-foreground" align="end">
                      <DropdownMenuItem onClick={() => navigate(`/education/${edu.id}`)} className="cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(edu)} className="cursor-pointer">
                        <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget({ id: edu.id, label: getSchoolName(edu) })}
                        className="cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300"
                      >
                        <span className="w-3.5 h-3.5 mr-2 inline-flex items-center justify-center">✕</span> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges */}
                <div className="absolute top-3 left-3 z-20 flex gap-1.5">
                  {edu.is_featured && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5" /> Featured
                    </span>
                  )}
                  {edu.is_published === false && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-secondary text-muted-foreground border border-border">
                      Draft
                    </span>
                  )}
                </div>

                {/* Logo area */}
                <button
                  type="button"
                  className="h-[96px] bg-secondary border-b border-border flex items-center justify-center p-4 flex-shrink-0 w-full cursor-pointer"
                  onClick={() => navigate(`/education/${edu.id}`)}
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt={`${getSchoolName(edu)} logo`}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-purple-400" />
                    </div>
                  )}
                </button>

                {/* Content */}
                <button
                  type="button"
                  className="p-4 flex flex-col flex-1 min-h-0 text-left cursor-pointer w-full"
                  onClick={() => navigate(`/education/${edu.id}`)}
                >
                  <h3
                    className="font-black text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors leading-snug"
                    style={{ fontFamily: 'DM Sans' }}
                  >
                    {edu.degree ? `${edu.degree}${edu.field_of_study ? ` · ${edu.field_of_study}` : ''}` : getSchoolName(edu)}
                  </h3>
                  <p className="text-xs text-accent font-semibold mt-0.5 truncate">{getSchoolName(edu)}</p>

                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-accent/70" />
                      {getDisplayStartDate(edu)} – {endDate}
                      {expectedGrad && <span className="ml-1 text-amber-400/80">(Expected)</span>}
                    </span>
                    {edu.grade && edu.show_grade_publicly !== false && (
                      <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground truncate max-w-[80px]">
                        {edu.grade}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-base font-black text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>No education history</h3>
            <p className="text-sm text-muted-foreground mt-1 font-medium">Add your degrees and institutions to complete your profile.</p>
            <Button
              onClick={() => navigate('/education/new')}
              className="mt-4 bg-accent hover:bg-accent/90 text-black font-black h-10 px-5 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Education
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Education?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default AdminEducation;
