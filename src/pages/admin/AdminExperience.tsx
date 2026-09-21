import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import BackButton from '@/components/admin/BackButton';

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-3">
          <BackButton to="/dashboard" className="mt-1 flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent mb-3">CAREER</p>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground" style={{ fontFamily: 'DM Sans' }}>
              Experience
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Manage your professional career timeline and roles.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/experience/new')}
          className="bg-accent hover:bg-accent/90 text-black font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Experience
        </Button>
      </div>

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
                  ? 'bg-accent text-black border-accent'
                  : 'bg-card border-border text-muted-foreground hover:border-accent/40 hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === tab.key ? 'bg-black/20 text-black' : 'bg-secondary text-muted-foreground'
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
            <div key={i} className="h-28 bg-secondary border border-border rounded-2xl animate-pulse" />
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
                className="bg-card border-border hover:bg-secondary hover:border-accent/30 transition-all group overflow-hidden rounded-2xl shadow-sm"
              >
                <CardContent className="p-5 flex items-center gap-5">
                  {/* Logo or fallback icon */}
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
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
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 flex-shrink-0">
                          Current
                        </span>
                      )}
                      {exp.is_featured && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/20 flex-shrink-0 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" /> Featured
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground font-semibold text-sm mb-2">
                      {firstRoleTitle}
                      {roleCount > 1 && (
                        <span className="ml-2 text-[11px] text-muted-foreground font-normal">
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
                        className="hover:bg-red-500/10 hover:text-red-500 cursor-pointer text-red-400 rounded-lg m-1 py-2 font-semibold"
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
          <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl bg-card shadow-sm">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {search || filter !== 'all' ? 'No results match your search.' : 'No experience entries yet.'}
            </p>
            {!search && filter === 'all' && (
              <Button
                onClick={() => navigate('/experience/new')}
                variant="outline"
                size="sm"
                className="mt-4 border-accent/30 text-accent"
              >
                <Plus className="w-4 h-4 mr-1" /> Add your first experience
              </Button>
            )}
          </div>
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
