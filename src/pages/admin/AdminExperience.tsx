import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Plus, MoreVertical, Edit2, Trash2,
  Calendar, MapPin, Star, Copy, Search, Building2,
} from 'lucide-react';
import { CommonService } from '@/shared/services/common-service';
import { Experience } from '@/types';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';

type FilterTab = 'all' | 'current' | 'past' | 'featured';

const AdminExperience = () => {
  const [experience, setExperience] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string | number; label: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const navigate = useNavigate();

  useEffect(() => { fetchExperience(); }, []);

  const fetchExperience = async () => {
    try {
      const data = await CommonService.getWorkExperience();
      setExperience(data);
    } catch {
      toast.error('Failed to load experience');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string | number, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteExperience(deleteTarget.id);
      toast.success('Experience deleted');
      fetchExperience();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDuplicate = async (exp: Experience) => {
    try {
      const { id: _id, ...rest } = exp;
      const companyName = exp.company_name ?? exp.company ?? 'Company';
      const payload = JSON.parse(JSON.stringify({
        ...rest,
        company_name: `${companyName} (copy)`,
        company: `${companyName} (copy)`,
        is_featured: false,
      }));
      await CommonService.createExperience(payload);
      toast.success('Duplicated — edit the copy to update details');
      fetchExperience();
    } catch {
      toast.error('Duplicate failed');
    }
  };

  const getCompanyName = (exp: Experience) => exp.company_name ?? exp.company ?? '—';
  const getFirstRole = (exp: Experience) => {
    if (exp.roles && exp.roles.length > 0) return exp.roles[0].role_title;
    return exp.position ?? '—';
  };
  const getIsCurrentFlag = (exp: Experience) =>
    exp.is_current ?? exp.isCurrent ??
    (exp.roles ? exp.roles.some(r => r.role_is_current) : false);
  const getStartDateDisplay = (exp: Experience) => {
    if (exp.start_month && exp.start_year) return `${exp.start_month.slice(0, 3)} ${exp.start_year}`;
    return exp.startDate ?? '—';
  };
  const getEndDateDisplay = (exp: Experience) => {
    if (getIsCurrentFlag(exp)) return 'Present';
    if (exp.end_month && exp.end_year) return `${exp.end_month.slice(0, 3)} ${exp.end_year}`;
    return exp.endDate ?? '—';
  };

  const filtered = useMemo(() => {
    let list = [...experience];

    if (filter === 'current') list = list.filter(e => getIsCurrentFlag(e));
    else if (filter === 'past') list = list.filter(e => !getIsCurrentFlag(e));
    else if (filter === 'featured') list = list.filter(e => e.is_featured);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (getCompanyName(e)).toLowerCase().includes(q) ||
        (getFirstRole(e)).toLowerCase().includes(q) ||
        (e.roles ?? []).some(r => r.role_title.toLowerCase().includes(q))
      );
    }

    return list;
  }, [experience, filter, search]);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'current', label: 'Current' },
    { key: 'past', label: 'Past' },
    { key: 'featured', label: 'Featured' },
  ];

  const counts = useMemo(() => ({
    all: experience.length,
    current: experience.filter(e => getIsCurrentFlag(e)).length,
    past: experience.filter(e => !getIsCurrentFlag(e)).length,
    featured: experience.filter(e => e.is_featured).length,
  }), [experience]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="CAREER"
        title="Experience"
        subtitle="Manage your professional career timeline and roles."
        backTo="/dashboard"
        actions={
          <Button
            onClick={() => navigate('/experience/new')}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Experience
          </Button>
        }
      />

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company or role…"
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-1.5">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filter === tab.key
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-card border-border text-muted-foreground hover:border-accent/40 hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === tab.key ? 'bg-black/20 text-accent-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-secondary border border-border rounded-xl animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((exp) => {
            const name = getCompanyName(exp);
            const firstRoleTitle = getFirstRole(exp);
            const roleCount = exp.roles?.length ?? 1;
            const isCurrent = getIsCurrentFlag(exp);
            const logo = exp.company_logo ?? exp.companyLogo;
            const location = exp.location ?? '—';

            return (
              <Card
                key={exp.id}
                interactive
                className="overflow-hidden rounded-xl group"
              >
                <CardContent className="p-5 flex items-center gap-5">
                  {/* Logo or fallback icon */}
                  <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                    {logo ? (
                      <img src={logo} alt={name} className="w-10 h-10 object-contain" />
                    ) : (
                      <Building2 className="w-7 h-7 text-accent" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-foreground text-lg group-hover:text-accent transition-colors truncate">
                        {name}
                      </h3>
                      {isCurrent && (
                        <Badge variant="success" className="flex-shrink-0">Current</Badge>
                      )}
                      {exp.is_featured && (
                        <Badge variant="neutral" className="gap-1 flex-shrink-0">
                          <Star className="w-2.5 h-2.5" /> Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground font-semibold text-sm mb-2">
                      {firstRoleTitle}
                      {roleCount > 1 && (
                        <span className="ml-2 text-caption text-muted-foreground font-normal">
                          +{roleCount - 1} more role{roleCount > 2 ? 's' : ''}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        {getStartDateDisplay(exp)} – {getEndDateDisplay(exp)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-accent" /> {location}
                      </span>
                      {exp.display_order !== undefined && (
                        <span className="text-muted-foreground">Order: {exp.display_order}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-secondary active:scale-90 transition-all flex-shrink-0">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border text-foreground rounded-xl shadow-xl p-1 min-w-[160px]">
                      <DropdownMenuItem
                        className="hover:bg-accent/10 hover:text-accent cursor-pointer rounded-lg m-1 py-2 font-semibold"
                        onClick={() => navigate(`/experience/${exp.id}`)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="hover:bg-secondary cursor-pointer rounded-lg m-1 py-2 font-semibold text-muted-foreground"
                        onClick={() => handleDuplicate(exp)}
                      >
                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="hover:bg-danger-subtle hover:text-danger-fg cursor-pointer text-danger-fg rounded-lg m-1 py-2 font-semibold"
                        onClick={() => handleDelete(exp.id, getCompanyName(exp))}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={Building2}
            title={search || filter !== 'all' ? 'No results match your search.' : 'No experience entries yet.'}
            action={
              !search && filter === 'all'
                ? { label: 'Add your first experience', onClick: () => navigate('/experience/new') }
                : undefined
            }
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Experience?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default AdminExperience;
