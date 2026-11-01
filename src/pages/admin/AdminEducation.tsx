import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Education } from '@/types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, GraduationCap, Edit2, Calendar, Copy, MoreVertical, Star } from 'lucide-react';
import { toast } from "sonner";
import PageHeader from '@/components/admin/PageHeader';
import { plural } from '@/shared/lib/utils';
import EmptyState from '@/components/admin/EmptyState';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function getSchoolName(edu: Education): string {
  return edu.school_name ?? edu.institution ?? '·';
}

function getLogoUrl(edu: Education): string | undefined {
  return edu.school_logo ?? edu.logo;
}

function getDisplayStartDate(edu: Education): string {
  if (edu.start_month && edu.start_year) return `${edu.start_month.slice(0, 3)} ${edu.start_year}`;
  if (edu.startDate) return edu.startDate;
  return '·';
}

function getDisplayEndDate(edu: Education): string {
  const isCurrent = edu.is_current ?? edu.isCurrent ?? false;
  if (isCurrent) return 'Present';
  if (edu.end_month && edu.end_year) return `${edu.end_month.slice(0, 3)} ${edu.end_year}`;
  if (edu.endDate) return edu.endDate;
  return '·';
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
      toast.success('Duplicated as a draft, edit the copy to update details');
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
    <div className="space-y-6">
      <PageHeader
        title="Education"
        subtitle={plural(education.length, "entry", "entries")}
        actions={
          <Button
            onClick={() => navigate('/education/new')}
            className="flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Add education
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-[240px] w-full bg-secondary border border-border rounded-xl animate-pulse" />
          ))
        ) : sorted.length > 0 ? (
          sorted.map((edu, index) => {
            const logo = getLogoUrl(edu);
            const school = getSchoolName(edu);
            const program = [edu.degree, edu.field_of_study].filter(Boolean).join(' · ');
            const hasDates = !!(edu.start_year || edu.startDate);
            const isCurrent = edu.is_current ?? edu.isCurrent ?? false;
            const expectedGrad = isExpectedGrad(edu);
            const missing = [!program && 'degree', !hasDates && 'dates'].filter(Boolean) as string[];
            const open = () => navigate(`/education/${edu.id}`);

            return (
              <Card
                key={edu.id}
                interactive
                className="group relative overflow-hidden text-left flex flex-col animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 50}ms`, animationDuration: '300ms', animationFillMode: 'both' }}
              >
                {/* Actions dropdown */}
                <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label={`Actions for ${school}`}
                        className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur-sm border border-border/80 flex items-center justify-center text-muted-foreground hover:text-accent shadow-sm"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border-border text-foreground" align="end">
                      <DropdownMenuItem onClick={open} className="cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(edu)} className="cursor-pointer">
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget({ id: edu.id, label: school })}
                        className="cursor-pointer text-danger-fg hover:text-danger-fg/80 focus:text-danger-fg/80"
                      >
                        <span className="w-3.5 h-3.5 mr-2 inline-flex items-center justify-center">✕</span> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <button type="button" onClick={open} className="flex flex-col flex-1 text-left cursor-pointer w-full">
                  {/* Header: crest on a light tile over a soft glow */}
                  <div className="relative w-full px-5 pt-5 pb-4">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_100%_at_0%_0%,hsl(var(--accent)/0.10),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <div className="relative flex items-start gap-2">
                      {logo ? (
                        <span className="w-14 h-14 rounded-xl bg-[#F4F4F1] p-1.5 flex items-center justify-center shadow-[0_8px_20px_-8px_rgb(0_0_0/0.6)] ring-1 ring-white/10 flex-shrink-0">
                          <img src={logo} alt={`${school} logo`} className="w-full h-full object-contain" />
                        </span>
                      ) : (
                        <span className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-6 h-6 text-muted-foreground" />
                        </span>
                      )}
                      <div className="ml-auto mr-10 flex flex-wrap justify-end gap-1.5">
                        {isCurrent && <Badge variant="success" dot>Current</Badge>}
                        {edu.is_featured && (
                          <Badge variant="accent" className="gap-1">
                            <Star className="w-2.5 h-2.5" /> Featured
                          </Badge>
                        )}
                        {edu.is_published === false && <Badge variant="warning">Draft</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="px-5 pb-4 flex flex-col gap-1 min-w-0">
                    <h3 className="font-medium text-foreground text-[15px] leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {program || school}
                    </h3>
                    {program && <p className="text-[13px] text-fg-2 truncate">{school}</p>}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto w-full px-5 py-3 flex items-center justify-between gap-3 border-t border-border-subtle">
                    {hasDates ? (
                      <span className="text-[12px] text-muted-foreground font-medium flex items-center gap-1.5 min-w-0">
                        <Calendar className="w-3 h-3 text-accent/70 flex-shrink-0" />
                        <span className="truncate">
                          {getDisplayStartDate(edu)} – {getDisplayEndDate(edu)}
                          {expectedGrad && <span className="ml-1 text-warning-fg/80">(Expected)</span>}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground/80 flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning-fg/70 flex-shrink-0" />
                        <span className="truncate">Add {missing.join(' & ')}</span>
                      </span>
                    )}
                    {edu.grade && edu.show_grade_publicly !== false ? (
                      <span className="text-[12px] font-mono bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground truncate max-w-[96px]">
                        {edu.grade}
                      </span>
                    ) : hasDates && missing.length > 0 ? (
                      <span className="text-[12px] text-muted-foreground/80 truncate">Add {missing.join(' & ')}</span>
                    ) : null}
                  </div>
                </button>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={GraduationCap}
              title="No education history"
              description="Add your degrees and institutions to complete your profile."
              action={{ label: 'Add education', onClick: () => navigate('/education/new') }}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete education?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default AdminEducation;
