import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { AlertCircle, ArrowUpRight, ChevronLeft, CircleDot, Inbox, MailOpen, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { OVERVIEW_QUERY_KEY } from '@/components/admin/useAdminOverview';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CommonService } from '@/shared/services/common-service';
import { cn, toJsDate } from '@/shared/lib/utils';
import type { Message } from '@/types';

type Tab = 'all' | 'unread' | 'read';

const AVATAR_TONES = [
  'bg-[#FF8A5C] text-[#2A1208]',
  'bg-[#7C9CFF] text-[#0E1630]',
  'bg-[#86E08A] text-[#0F2A12]',
  'bg-[#B79CFF] text-[#1D1236]',
  'bg-[#C9C9C4] text-[#1F1F1D]',
];

const toneFor = (seed: string) => {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';

const shortAgo = (date: Date) => {
  const s = formatDistanceToNowStrict(date);
  const [n, unit] = s.split(' ');
  const map: Record<string, string> = { second: 's', minute: 'm', hour: 'h', day: 'd', month: 'mo', year: 'y' };
  return `${n}${map[unit.replace(/s$/, '')] ?? ''}`;
};

const Avatar = ({ name, className }: { name: string; className?: string }) => (
  <span
    className={cn('flex shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-medium', toneFor(name), className)}
    aria-hidden="true"
  >
    {initials(name)}
  </span>
);

const AdminMessages = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => CommonService.getMessages(),
    select: (all: Message[]) =>
      [...all].sort((a, b) => toJsDate(b.created_at).getTime() - toJsDate(a.created_at).getTime()),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
  };

  const markReadMutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => CommonService.updateMessage(id, { read }),
    onSuccess: refresh,
    onError: () => toast.error('Couldn’t update the message'),
  });

  const markAllMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => CommonService.updateMessage(id, { read: true }))),
    onSuccess: () => { refresh(); toast.success('All caught up'); },
    onError: () => toast.error('Couldn’t mark everything as read'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CommonService.deleteMessage(id),
    onSuccess: () => { refresh(); toast.success('Message deleted'); },
    onError: () => toast.error('Couldn’t delete the message'),
  });

  const unread = messages.filter((m) => !m.read);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (tab === 'unread' && m.read) return false;
      if (tab === 'read' && !m.read) return false;
      if (!q) return true;
      return [m.name, m.email, m.subject, m.message].some((v) => v?.toLowerCase().includes(q));
    });
  }, [messages, tab, search]);

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  // Desktop opens the newest message by default.
  useEffect(() => {
    if (selectedId || !visible.length) return;
    if (window.matchMedia('(min-width: 1024px)').matches) setSelectedId(visible[0].id);
  }, [visible, selectedId]);

  // Opening a message marks it read.
  useEffect(() => {
    if (selected && !selected.read) markReadMutation.mutate({ id: selected.id, read: true });
    setReply('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const mailto = (msg: Message, body?: string) => {
    const subject = `Re: ${msg.subject || 'Your message'}`;
    const quoted = msg.message.split('\n').map((l) => `> ${l}`).join('\n');
    const text = body ? `${body}\n\n${quoted}` : `\n\n${quoted}`;
    return `mailto:${msg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      if (selectedId === deleteTarget.id) setSelectedId(null);
    } finally {
      setDeleteTarget(null);
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: messages.length },
    { key: 'unread', label: 'Unread', count: unread.length },
    { key: 'read', label: 'Read' },
  ];

  return (
    <div className="space-y-6">
      <div className={cn(selected && 'hidden lg:block')}>
        <PageHeader
          title="Inbox"
          subtitle={`${unread.length} unread · ${messages.length} total · from the contact form`}
          actions={
            unread.length > 0 && (
              <Button
                variant="outline"
                loading={markAllMutation.isPending}
                onClick={() => markAllMutation.mutate(unread.map((m) => m.id))}
              >
                Mark all read
              </Button>
            )
          }
        />
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl bg-danger-subtle/70 px-4 py-3 text-sm text-danger-fg">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error instanceof Error ? error.message : 'Failed to load messages'}
        </div>
      ) : isLoading ? (
        <div className="h-[560px] animate-pulse rounded-2xl border border-border-subtle bg-card" />
      ) : messages.length === 0 ? (
        <EmptyState icon={Inbox} title="No messages yet" description="Messages sent through the contact form on your site land here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border-border-subtle lg:grid lg:h-[calc(100vh-240px)] lg:min-h-[560px] lg:grid-cols-[400px_minmax(0,1fr)] lg:border lg:bg-card">
          {/* List */}
          <div className={cn('flex min-h-0 flex-col lg:border-r lg:border-border-subtle', selected && 'hidden lg:flex')}>
            <div className="flex items-center gap-1.5 pb-3 lg:border-b lg:border-border-subtle lg:p-3">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm transition-colors',
                    tab === t.key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}{t.count !== undefined && <span className="ml-1.5 tabular">{t.count}</span>}
                </button>
              ))}
              <div className="relative ml-auto w-36 sm:w-44">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search"
                  aria-label="Search messages"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-full rounded-full border border-transparent bg-transparent pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:bg-background focus:outline-none"
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 divide-y divide-border-subtle overflow-y-auto border-y border-border-subtle lg:border-0">
              {visible.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing here.</li>
              )}
              {visible.map((msg) => {
                const at = toJsDate(msg.created_at);
                const active = msg.id === selectedId;
                return (
                  <li key={msg.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(msg.id)}
                      className={cn(
                        'relative flex w-full gap-3 px-1 py-4 text-left lg:px-5 transition-colors hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:outline-none',
                        active && 'bg-secondary/60 hover:bg-secondary/60',
                      )}
                    >
                      {active && <span className="absolute inset-y-0 left-0 hidden w-0.5 bg-accent lg:block" aria-hidden="true" />}
                      <Avatar name={msg.name} className="h-9 w-9" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className={cn('flex-1 truncate text-sm', msg.read ? 'text-fg-2' : 'text-foreground')}>{msg.name}</span>
                          <span className="shrink-0 font-mono text-[13px] text-muted-foreground">{shortAgo(at)}</span>
                          {!msg.read && <span className="h-1.5 w-1.5 shrink-0 self-center rounded-full bg-accent" aria-label="Unread" />}
                        </span>
                        <span className={cn('mt-0.5 block truncate text-sm', msg.read ? 'text-muted-foreground' : 'text-foreground')}>
                          {msg.subject || 'No subject'}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{msg.message}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Reader */}
          <div className={cn('min-h-0 flex-col overflow-y-auto', selected ? 'flex' : 'hidden lg:flex')}>
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <MailOpen className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                Select a message to read it.
              </div>
            ) : (
              <article className="flex flex-1 flex-col lg:p-7">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="mb-5 flex items-center gap-1 self-start text-sm text-fg-2 lg:hidden"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Inbox
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm">
                    <a href={mailto(selected)}>Reply via email</a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markReadMutation.mutate({ id: selected.id, read: !selected.read })}
                  >
                    <CircleDot aria-hidden="true" /> Mark {selected.read ? 'unread' : 'read'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-danger/40 text-danger-fg hover:border-danger hover:bg-danger-subtle"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </Button>
                </div>

                <h2 className="mt-7 text-[24px] font-medium leading-tight tracking-[-0.02em] text-foreground">
                  {selected.subject || 'No subject'}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-border-subtle pb-5">
                  <Avatar name={selected.name} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{selected.name}</p>
                    <a href={`mailto:${selected.email}`} className="block truncate font-mono text-[13px] text-muted-foreground hover:text-foreground">
                      {selected.email}
                    </a>
                  </div>
                  <time className="font-mono text-[13px] text-muted-foreground" dateTime={toJsDate(selected.created_at).toISOString()}>
                    {format(toJsDate(selected.created_at), 'EEE d MMM · HH:mm')}
                  </time>
                </div>

                <p className="whitespace-pre-wrap py-6 text-[15px] leading-[1.75] text-fg-2">{selected.message}</p>

                <form
                  className="mt-auto rounded-xl border border-border bg-background p-4"
                  onSubmit={(e) => { e.preventDefault(); window.location.href = mailto(selected, reply.trim()); }}
                >
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply… it opens in your mail app with the thread quoted."
                    aria-label="Reply"
                    className="min-h-[56px] resize-none border-0 bg-transparent p-0 hover:border-0 focus-visible:border-0"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-muted-foreground">To {selected.email}</span>
                    <Button type="submit" size="sm">
                      Send <ArrowUpRight aria-hidden="true" />
                    </Button>
                  </div>
                </form>
              </article>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this message?"
        description={deleteTarget ? `The message from ${deleteTarget.name} will be permanently deleted.` : undefined}
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default AdminMessages;
