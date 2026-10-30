import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowUpRight, Code2, Eye, MoreHorizontal, Pencil, Search, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SITE_URL } from '@/components/admin/navConfig';
import { OVERVIEW_QUERY_KEY } from '@/components/admin/useAdminOverview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectService } from '@/services/project-service';
import type { FirestoreLikeTimestamp, Project } from '@/types';
import { cn, plural, toJsDate } from '@/shared/lib/utils';
import { formatDistanceToNowStrict, format } from 'date-fns';

type Filter = 'all' | 'published' | 'hidden' | 'featured';
type SortKey = 'order' | 'updated' | 'az';

type ProjectRow = Project & { updated_at?: FirestoreLikeTimestamp };

const isPublished = (p: Project) => p.published !== false;

const updatedLabel = (p: ProjectRow) => {
  if (!p.updated_at) return '·';
  const d = toJsDate(p.updated_at);
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days < 1) return `${formatDistanceToNowStrict(d)} ago`.replace(/ hours?/, 'h').replace(/ minutes?/, 'm').replace(/ seconds?/, 's');
  if (days < 2) return 'Yesterday';
  if (days < 30) return `${Math.round(days)}d ago`;
  return format(d, 'MMM yyyy');
};

const Thumb = ({ project }: { project: Project }) => {
  const src = project.heroImage || project.image;
  const [broken, setBroken] = useState(false);
  return (
    <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-secondary">
      {src && !broken ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <Code2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
};

const StatusBadge = ({ project }: { project: Project }) =>
  isPublished(project) ? <Badge variant="success" dot>Published</Badge> : <Badge variant="neutral" dot>Hidden</Badge>;

const AdminProjects = () => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchProjects = async () => {
    try {
      setProjects(await ProjectService.getAll());
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const counts = useMemo(() => ({
    all: projects.length,
    published: projects.filter(isPublished).length,
    hidden: projects.filter((p) => !isPublished(p)).length,
    featured: projects.filter((p) => p.featured).length,
  }), [projects]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = projects.filter((p) => {
      if (filter === 'published' && !isPublished(p)) return false;
      if (filter === 'hidden' && isPublished(p)) return false;
      if (filter === 'featured' && !p.featured) return false;
      return !q || [p.title, p.tagline, p.slug].some((v) => v?.toLowerCase().includes(q));
    });
    if (sortKey === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortKey === 'updated') result.sort((a, b) => toJsDate(b.updated_at).getTime() - toJsDate(a.updated_at).getTime());
    else result.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return result;
  }, [projects, search, filter, sortKey]);

  const allSelected = rows.length > 0 && rows.every((p) => selected.has(String(p.id)));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((p) => String(p.id))));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Escape clears the selection.
  useEffect(() => {
    if (!selected.size) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(new Set()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected.size]);

  const patch = async (ids: string[], data: Partial<Project>, message: string) => {
    setIsBulkUpdating(true);
    try {
      await Promise.all(ids.map((id) => ProjectService.update(id, data)));
      setProjects((prev) => prev.map((p) => (ids.includes(String(p.id)) ? { ...p, ...data } : p)));
      queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
      toast.success(message);
    } catch {
      toast.error('Failed to update projects');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteIds) return;
    setIsDeleting(true);
    try {
      await Promise.all(deleteIds.map((id) => ProjectService.delete(id)));
      setProjects((prev) => prev.filter((p) => !deleteIds.includes(String(p.id))));
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
      toast.success(deleteIds.length === 1 ? 'Project deleted' : `${deleteIds.length} projects deleted`);
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setDeleteIds(null);
    }
  };

  const titlesOf = (ids: string[]) =>
    projects.filter((p) => ids.includes(String(p.id))).map((p) => `“${p.title}”`);

  const selectedIds = [...selected];
  const selectedAllPublished = selectedIds.length > 0 && projects.filter((p) => selected.has(String(p.id))).every(isPublished);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'hidden', label: 'Hidden' },
    { key: 'featured', label: 'Featured' },
  ];
  const sortLabels: Record<SortKey, string> = { order: 'Order', updated: 'Recently updated', az: 'A–Z' };

  const RowMenu = ({ project }: { project: ProjectRow }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${project.title}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => navigate(`/projects/${project.id}`)} className="gap-2.5">
          <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2.5">
          <a href={`${SITE_URL}/projects/${project.slug}`} target="_blank" rel="noopener noreferrer">
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> View on site
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => patch([String(project.id)], { featured: !project.featured }, project.featured ? 'Removed from featured' : 'Featured on the homepage')}
          className="gap-2.5"
        >
          <Star className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {project.featured ? 'Unfeature' : 'Feature'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setDeleteIds([String(project.id)])} className="gap-2.5 text-danger-fg focus:text-danger-fg">
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle={`${plural(counts.all, 'project')} · ${counts.published} published · ${counts.featured} featured`}
        actions={
          <Button onClick={() => navigate('/projects/new')}>
            New project <ArrowUpRight aria-hidden="true" />
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder={`Search ${plural(counts.all, 'project')}…`}
            aria-label="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex shrink-0 gap-1 rounded-xl border border-border bg-card p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
                  filter === f.key ? 'bg-secondary text-foreground' : 'text-fg-2 hover:text-foreground',
                )}
              >
                {f.label} <span className="tabular">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 self-start rounded-xl lg:ml-auto lg:self-auto">
              <ArrowUpDown aria-hidden="true" /> Sort: {sortLabels[sortKey]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(sortLabels) as SortKey[]).map((k) => (
              <DropdownMenuItem key={k} onSelect={() => setSortKey(k)} className={cn(sortKey === k && 'text-foreground')}>
                {sortLabels[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border-subtle px-5 py-4 last:border-0">
              <div className="h-10 w-14 animate-pulse rounded-lg bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Code2}
          title={projects.length ? 'No projects match' : 'No projects yet'}
          description={projects.length ? 'Try a different search or filter.' : 'Projects you add here show up on /projects on your site.'}
          action={projects.length ? undefined : { label: 'Add your first project', onClick: () => navigate('/projects/new') }}
          secondaryAction={projects.length ? { label: 'Clear filters', onClick: () => { setSearch(''); setFilter('all'); } } : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border-subtle bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="w-12 py-3.5 pl-5">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all projects" />
                  </th>
                  <th className="label py-3.5 font-medium">Project</th>
                  <th className="label py-3.5 font-medium">Status</th>
                  <th className="label hidden py-3.5 font-medium lg:table-cell">Stage</th>
                  <th className="label py-3.5 text-center font-medium">Featured</th>
                  <th className="label hidden py-3.5 font-medium xl:table-cell">Updated</th>
                  <th className="w-28 py-3.5 pr-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((project) => {
                  const id = String(project.id);
                  const checked = selected.has(id);
                  return (
                    <tr
                      key={id}
                      className={cn(
                        'group border-b border-border-subtle transition-colors last:border-0',
                        checked ? 'bg-accent-subtle/40' : 'hover:bg-secondary/30',
                      )}
                    >
                      <td className="py-3.5 pl-5">
                        <Checkbox checked={checked} onCheckedChange={() => toggleOne(id)} aria-label={`Select ${project.title}`} />
                      </td>
                      <td className="py-3.5 pr-4">
                        <Link to={`/projects/${id}`} className="flex items-center gap-3.5 focus-visible:outline-none">
                          <Thumb project={project} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-foreground group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-4">
                              {project.title}
                            </span>
                            <span className="block truncate font-mono text-[13px] text-muted-foreground">/projects/{project.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4"><StatusBadge project={project} /></td>
                      <td className="hidden py-3.5 pr-4 text-fg-2 lg:table-cell">{project.stage || project.status || '·'}</td>
                      <td className="py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => patch([id], { featured: !project.featured }, project.featured ? 'Removed from featured' : 'Featured on the homepage')}
                          aria-label={project.featured ? `Unfeature ${project.title}` : `Feature ${project.title}`}
                          aria-pressed={!!project.featured}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-secondary"
                        >
                          <Star className={cn('h-4 w-4', project.featured ? 'text-accent' : 'text-muted-foreground/60')} aria-hidden="true" />
                        </button>
                      </td>
                      <td className="hidden py-3.5 pr-4 font-mono text-[13px] text-muted-foreground xl:table-cell">{updatedLabel(project)}</td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button asChild variant="ghost" size="icon-sm" aria-label={`View ${project.title} on site`}>
                            <a href={`${SITE_URL}/projects/${project.slug}`} target="_blank" rel="noopener noreferrer"><Eye /></a>
                          </Button>
                          <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${project.title}`}>
                            <Link to={`/projects/${id}`}><Pencil /></Link>
                          </Button>
                          <RowMenu project={project} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-card md:hidden">
            {rows.map((project) => (
              <li key={String(project.id)} className="flex items-center gap-3.5 py-3.5 pl-4 pr-2">
                <Link to={`/projects/${project.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                  <Thumb project={project} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[15px] text-foreground">
                      {project.title}
                      {project.featured && <Star className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Featured" />}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <StatusBadge project={project} />
                      <span className="truncate font-mono text-[13px] text-muted-foreground">{updatedLabel(project)}</span>
                    </span>
                  </span>
                </Link>
                <RowMenu project={project} />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-max items-center gap-1 rounded-2xl border border-border bg-popover p-1.5 pl-4 shadow-xl animate-in fade-in-0 slide-in-from-bottom-2 md:bottom-8">
          <span className="pr-2 text-sm text-foreground tabular">{selected.size} selected</span>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <Button
            variant="ghost"
            size="sm"
            disabled={isBulkUpdating}
            onClick={() => patch(selectedIds, { published: !selectedAllPublished }, selectedAllPublished ? 'Hidden from the site' : 'Published')}
          >
            {selectedAllPublished ? 'Unpublish' : 'Publish'}
          </Button>
          <Button variant="ghost" size="sm" disabled={isBulkUpdating} onClick={() => patch(selectedIds, { featured: true }, 'Featured on the homepage')}>
            Feature
          </Button>
          <Button variant="destructive-ghost" size="sm" onClick={() => setDeleteIds(selectedIds)}>
            Delete
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-1 hidden rounded-lg px-2.5 py-1.5 font-mono text-[13px] text-muted-foreground hover:text-foreground sm:block"
          >
            Esc
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteIds}
        onOpenChange={(o) => !o && setDeleteIds(null)}
        title={deleteIds && deleteIds.length > 1 ? `Delete ${deleteIds.length} projects?` : 'Delete this project?'}
        description={deleteIds ? `${titlesOf(deleteIds).slice(0, 3).join(' and ')}${deleteIds.length > 3 ? ` and ${deleteIds.length - 3} more` : ''} will be removed from your site. This can’t be undone.` : undefined}
        confirmLabel={deleteIds && deleteIds.length > 1 ? `Delete ${deleteIds.length} projects` : 'Delete project'}
        requireText={deleteIds && deleteIds.length > 1 ? 'DELETE' : undefined}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default AdminProjects;
