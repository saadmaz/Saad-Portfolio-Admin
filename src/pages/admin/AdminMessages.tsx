import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/admin/PageHeader';
import {
  Mail,
  User,
  Clock,
  Trash2,
  CheckCircle,
  Circle,
  ExternalLink,
  Search,
  AlertCircle
} from 'lucide-react';
import { CommonService } from '@/shared/services/common-service';
import { Message } from '@/types';
import { Button } from "@/components/ui/button";
import EmptyState from '@/components/admin/EmptyState';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { toJsDate } from '@/shared/lib/utils';

const AdminMessages = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => CommonService.getMessages()
  });

  const markReadMutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      CommonService.updateMessage(id, { read }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message status updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CommonService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message deleted permanently');
    }
  });

  const filteredMessages = messages.filter(msg =>
    msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Message['created_at']) => {
    if (!date) return 'Unknown';
    try {
      return format(toJsDate(date), 'MMM d, h:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-secondary animate-pulse rounded-lg" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 w-full bg-secondary animate-pulse rounded-lg border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        eyebrow="INQUIRIES"
        title="Contact Messages"
        subtitle="Manage inquiries and messages from your contact portal."
        backTo="/dashboard"
        actions={
          <div className="relative group max-w-md w-full flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search name, email or content..."
              className="w-full bg-secondary border border-border rounded-lg py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-accent/40 transition-all text-foreground placeholder:text-muted-foreground font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      {error ? (
        <div className="flex flex-col items-center justify-center p-12 bg-danger-subtle rounded-lg border border-danger/20 text-center">
          <AlertCircle className="w-12 h-12 text-danger-fg mb-4 opacity-50" />
          <h3 className="text-lg font-black mb-2">Error Loading Messages</h3>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No messages found"
          description="Try adjusting your search or check back later."
        />
      ) : (
        <div className="grid gap-4">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`group relative bg-card border shadow-sm ${msg.read ? 'border-border' : 'border-warning/40 bg-warning-subtle/40'} rounded-lg p-6 transition-all duration-300 hover:border-border-strong hover:bg-secondary`}
            >
              {!msg.read && (
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-warning rounded-full animate-pulse" />
              )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Meta info */}
                <div className="md:w-64 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border border-border group-hover:border-border-strong transition-colors">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-sm truncate text-foreground">{msg.name}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider truncate font-bold">{msg.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="tabular">{formatDate(msg.created_at)}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 rounded-lg flex-1 text-[9px] uppercase font-black tracking-wider transition-all ${msg.read ? 'hover:bg-secondary hover:text-foreground' : 'bg-warning-subtle text-warning-fg hover:bg-warning-subtle/70'}`}
                      onClick={() => markReadMutation.mutate({ id: msg.id, read: !msg.read })}
                    >
                      {msg.read ? <Circle className="w-3 h-3 mr-1.5" /> : <CheckCircle className="w-3 h-3 mr-1.5" />}
                      {msg.read ? 'Unread' : 'Read'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-lg flex-shrink-0 hover:bg-danger-subtle hover:text-danger-fg transition-all"
                      onClick={() => {
                        if (confirm('Delete this message permanently?')) {
                          deleteMutation.mutate(msg.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  {msg.subject && (
                    <div className="inline-block px-3 py-1.5 rounded-lg bg-secondary border border-border text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                      Subject: {msg.subject}
                    </div>
                  )}
                  <p className="text-foreground/80 leading-relaxed text-sm whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>

                <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`mailto:${msg.email}`}
                    className="p-2 rounded-lg bg-secondary border border-border text-accent hover:bg-accent/10 transition-all flex items-center justify-center"
                    title="Reply via Email"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMessages;
