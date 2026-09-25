import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { Button } from "@/components/ui/button";
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
  FileText,
  Calendar,
  User as UserIcon,
  ChevronDown,
  Globe,
  EyeOff,
} from 'lucide-react';
import { BlogService } from '@/services/blog-service';
import { BlogPost } from '@/types';
import { toast } from "sonner";
import { format } from 'date-fns';
import { cn } from "@/shared/lib/utils";

type SortKey = 'newest' | 'oldest' | 'az';
type FilterKey = 'all' | 'published' | 'draft';

const AdminBlogs = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; title: string }>({
    open: false, id: null, title: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { fetchBlogs(); }, []);

  const fetchBlogs = async () => {
    try {
      const data = await BlogService.getAll();
      setBlogs(data);
    } catch {
      toast.error('Failed to load blog posts');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...blogs];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        (b.title?.toLowerCase().includes(q)) ||
        (b.excerpt?.toLowerCase().includes(q))
      );
    }

    if (filterStatus === 'published') result = result.filter(b => b.published);
    if (filterStatus === 'draft') result = result.filter(b => !b.published);

    if (sortKey === 'newest') result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sortKey === 'oldest') result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (sortKey === 'az') result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [blogs, searchQuery, filterStatus, sortKey]);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await BlogService.delete(deleteDialog.id);
      setBlogs(prev => prev.filter(b => b.id !== deleteDialog.id));
      toast.success(`"${deleteDialog.title}" deleted`);
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ open: false, id: null, title: '' });
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const newState = !post.published;
    setTogglingId(post.id);
    try {
      await BlogService.update(post.id, { published: newState });
      setBlogs(prev => prev.map(b => b.id === post.id ? { ...b, published: newState } : b));
      toast.success(newState ? `"${post.title}" published` : `"${post.title}" moved to drafts`);
    } catch {
      toast.error('Failed to update post status');
    } finally {
      setTogglingId(null);
    }
  };

  const filterPills: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'draft', label: 'Drafts' },
  ];

  const sortLabels: Record<SortKey, string> = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    az: 'A → Z',
  };

  const publishedCount = blogs.filter(b => b.published).length;
  const draftCount = blogs.filter(b => !b.published).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="CONTENT MANAGEMENT"
        title="Blog Posts"
        subtitle={
          <span className="text-xs font-bold uppercase tracking-widest">
            <span className="text-success-fg font-black">{publishedCount} Published</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-warning-fg font-black">{draftCount} Draft{draftCount !== 1 ? 's' : ''}</span>
          </span>
        }
        backTo="/dashboard"
        actions={
          <Button
            onClick={() => navigate('/blogs/new')}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-95 h-11 px-6 flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> New Post
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search posts by title or excerpt..."
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
          {filtered.length} post{filtered.length !== 1 ? 's' : ''} shown
        </p>
      )}

      <div className="grid gap-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((post) => (
            <Card key={post.id} interactive className="overflow-hidden group">
              <CardContent className="p-0">
                <div className="flex items-center p-4 gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0 shadow-sm">
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent/5">
                        <FileText className="w-6 h-6 text-accent/40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-black text-foreground text-sm truncate group-hover:text-accent transition-colors">
                        {post.title}
                      </h3>
                      <button
                        onClick={() => handleTogglePublish(post)}
                        disabled={togglingId === post.id}
                        title={post.published ? 'Click to unpublish' : 'Click to publish'}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border border-transparent flex-shrink-0 transition-all hover:scale-105 active:scale-95",
                          togglingId === post.id ? "opacity-50 cursor-not-allowed" :
                            post.published
                              ? "bg-success-subtle text-success-fg hover:bg-success-subtle/80"
                              : "bg-warning-subtle text-warning-fg hover:bg-warning-subtle/80"
                        )}
                      >
                        {post.published
                          ? <><Globe className="w-2.5 h-2.5" /></>
                          : <><EyeOff className="w-2.5 h-2.5" /></>
                        }
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-muted-foreground mb-1.5 font-bold uppercase tracking-wider">
                      <Calendar className="w-3 h-3 text-accent/50 flex-shrink-0" />{format(new Date(post.date), 'MMM d, yyyy')}
                      <span>·</span>
                      <UserIcon className="w-3 h-3 text-accent/50 flex-shrink-0" />{post.author}
                    </div>
                    <p className="text-caption text-muted-foreground line-clamp-1 max-w-lg">{post.excerpt}</p>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                      title="Preview"
                      onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
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
                          onClick={() => navigate(`/blogs/${post.id}`)}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="hover:bg-secondary cursor-pointer rounded-md m-1 py-2 px-3 text-xs font-bold text-muted-foreground"
                          onClick={() => handleTogglePublish(post)}
                        >
                          {post.published
                            ? <><EyeOff className="w-3.5 h-3.5 mr-2" /> Draft</>
                            : <><Globe className="w-3.5 h-3.5 mr-2" /> Publish</>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="hover:bg-danger-subtle hover:text-danger-fg cursor-pointer text-danger-fg rounded-md m-1 py-2 px-3 text-xs font-bold"
                          onClick={() => setDeleteDialog({ open: true, id: post.id, title: post.title })}
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
            icon={FileText}
            title="No posts found"
            description={searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'Write your first blog post to get started.'}
            action={
              !searchQuery && filterStatus === 'all'
                ? { label: 'New Post', onClick: () => navigate('/blogs/new') }
                : undefined
            }
          />
        )}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !isDeleting && setDeleteDialog(d => ({ ...d, open }))}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-lg shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-foreground">
              Delete Post?
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

export default AdminBlogs;
