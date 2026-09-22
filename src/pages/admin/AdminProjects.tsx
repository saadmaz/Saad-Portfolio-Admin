import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  Star,
} from 'lucide-react';
import { ProjectService } from '@/services/project-service';
import { Project } from '@/types';
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

type SortKey = 'newest' | 'oldest' | 'az';
type FilterKey = 'all' | 'featured' | 'regular';

const AdminProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; title: string }>({
    open: false, id: null, title: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const data = await ProjectService.getAll();
      setProjects(data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...projects];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.title?.toLowerCase().includes(q)) ||
        (p.tagline?.toLowerCase().includes(q))
      );
    }

    if (filterStatus === 'featured') result = result.filter(p => p.featured);
    if (filterStatus === 'regular') result = result.filter(p => !p.featured);

    if (sortKey === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortKey === 'newest') result.sort((a, b) => (b.order_index ?? 0) - (a.order_index ?? 0));
    else if (sortKey === 'oldest') result.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    return result;
  }, [projects, searchQuery, filterStatus, sortKey]);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await ProjectService.delete(deleteDialog.id);
      setProjects(prev => prev.filter(p => p.id !== deleteDialog.id));
      toast.success(`"${deleteDialog.title}" deleted`);
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ open: false, id: null, title: '' });
    }
  };

  const filterPills: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'featured', label: 'Featured' },
    { key: 'regular', label: 'Regular' },
  ];

  const sortLabels: Record<SortKey, string> = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    az: 'A → Z',
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="PORTFOLIO"
        title="Projects"
        subtitle="Manage your portfolio showcase."
        backTo="/dashboard"
        actions={
          <Button
            onClick={() => navigate('/projects/new')}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-95 h-11 px-6 flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Project
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or tagline..."
            className="w-full bg-card border border-border rounded-lg pl-11 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-accent/40 outline-none transition-all font-medium shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-lg p-1 shadow-sm">
          {filterPills.map(pill => (
            <button
              key={pill.key}
              onClick={() => setFilterStatus(pill.key)}
              className={cn(
                "px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-[0.12em] transition-all",
                filterStatus === pill.key
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border bg-card hover:bg-secondary rounded-lg text-muted-foreground text-[10px] font-black uppercase tracking-[0.12em] gap-2 h-10 px-4 shadow-sm">
              {sortLabels[sortKey]} <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border bg-card text-foreground rounded-lg shadow-xl p-1 min-w-[140px]">
            {(Object.keys(sortLabels) as SortKey[]).map(k => (
              <DropdownMenuItem
                key={k}
                onClick={() => setSortKey(k)}
                className={cn(
                  "rounded-md m-1 py-2 px-3 text-xs font-bold uppercase tracking-wider cursor-pointer",
                  sortKey === k ? "bg-accent/10 text-accent" : "hover:bg-secondary text-foreground"
                )}
              >
                {sortLabels[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!isLoading && (
        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.15em]">
          {filtered.length} project{filtered.length !== 1 ? 's' : ''} shown
        </p>
      )}

      <div className="grid gap-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((project) => (
            <Card key={project.id} interactive className="overflow-hidden group">
              <CardContent className="p-0">
                <div className="flex items-center p-4 gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0 shadow-sm">
                    <img
                      src={project.heroImage}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Project';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-black text-foreground text-sm truncate group-hover:text-accent transition-colors">
                        {project.title}
                      </h3>
                      {project.featured && (
                        <Badge variant="neutral" className="gap-1 flex-shrink-0">
                          <Star className="w-2.5 h-2.5 fill-current" /> Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-caption text-muted-foreground truncate mb-2.5">{project.tagline}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(project.techStack || []).slice(0, 4).map(tech => (
                        <span key={tech} className="text-[9px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border font-medium">
                          {tech}
                        </span>
                      ))}
                      {(project.techStack || []).length > 4 && (
                        <span className="text-[9px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border font-medium">
                          +{(project.techStack || []).length - 4}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                      title="Preview"
                      onClick={() => window.open(`/projects/${project.slug}`, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-secondary active:scale-90">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-border bg-card text-foreground rounded-lg shadow-xl p-1">
                        <DropdownMenuItem
                          className="hover:bg-accent/10 hover:text-accent cursor-pointer rounded-md m-1 py-2 px-3 text-xs font-bold"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="hover:bg-danger-subtle hover:text-danger-fg cursor-pointer text-danger-fg rounded-md m-1 py-2 px-3 text-xs font-bold"
                          onClick={() => setDeleteDialog({ open: true, id: project.id, title: project.title })}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Plus}
            title="No projects found"
            description={searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'Add your first project to get started.'}
            action={
              !searchQuery && filterStatus === 'all'
                ? { label: 'Add Project', onClick: () => navigate('/projects/new') }
                : undefined
            }
          />
        )}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !isDeleting && setDeleteDialog(d => ({ ...d, open }))}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-lg shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-foreground">
              Delete Project?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Deleting <span className="text-foreground font-bold">"{deleteDialog.title}"</span> cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-secondary border-border text-muted-foreground hover:bg-secondary/80 rounded-lg font-black"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg font-black border-0"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProjects;
