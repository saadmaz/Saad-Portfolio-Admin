import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BackButton from '@/components/admin/BackButton';
import {
  Mail,
  User,
  Clock,
  Trash2,
  CheckCircle,
  Circle,
  ExternalLink,
  Search,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { CommonService } from '@/shared/services/common-service';
import { Message } from '@/types';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { toast } from 'sonner';

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
      const d = date.toDate ? date.toDate() : new Date(date);
      return format(d, 'MMM d, h:mm a');
    } catch (e) {
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
            <div key={i} className="h-32 w-full bg-secondary animate-pulse rounded-2xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-3">
          <BackButton to="/dashboard" className="mt-1 flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent mb-3">INQUIRIES</p>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground" style={{ fontFamily: 'DM Sans' }}>
              Contact Messages
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Manage inquiries and messages from your contact portal.
            </p>
          </div>
        </div>

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
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-12 bg-red-500/5 rounded-lg border border-red-500/10 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-50" />
          <h3 className="text-lg font-black mb-2" style={{ fontFamily: 'DM Sans' }}>Error Loading Messages</h3>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-card rounded-lg border border-dashed border-border shadow-sm text-center">
          <Mail className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-black mb-2 text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>No messages found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your search or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`group relative bg-card border shadow-sm ${msg.read ? 'border-border' : 'border-accent/40 bg-accent/[0.03]'} rounded-lg p-6 transition-all duration-300 hover:border-accent/30 hover:bg-secondary`}
            >
              {!msg.read && (
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-accent rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--accent)/0.45)]" />
              )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Meta info */}
                <div className="md:w-64 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border border-border group-hover:border-accent/30 transition-colors">
                      <User className="w-5 h-5 text-accent/60" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-sm truncate text-foreground" style={{ fontFamily: 'DM Sans' }}>{msg.name}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider truncate font-bold">{msg.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formatDate(msg.created_at)}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 rounded-lg flex-1 text-[9px] uppercase font-black tracking-wider transition-all ${msg.read ? 'hover:bg-accent/10 hover:text-accent' : 'bg-accent/20 text-accent hover:bg-accent/30'}`}
                      onClick={() => markReadMutation.mutate({ id: msg.id, read: !msg.read })}
                    >
                      {msg.read ? <Circle className="w-3 h-3 mr-1.5" /> : <CheckCircle className="w-3 h-3 mr-1.5" />}
                      {msg.read ? 'Unread' : 'Read'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-lg flex-shrink-0 hover:bg-red-500/10 hover:text-red-500 transition-all"
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
