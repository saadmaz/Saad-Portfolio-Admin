import { useEffect, useState } from 'react';
import { CommonService } from '@/shared/services/common-service';
import { ActivityLog } from '@/types';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Shield, Clock, Search } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { toast } from "sonner";
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";
import { toJsDate } from '@/shared/lib/utils';

const AdminLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredLogs(
      logs.filter(log =>
        (log.adminEmail?.toLowerCase().includes(query)) ||
        (log.action?.toLowerCase().includes(query)) ||
        (log.entityType?.toLowerCase().includes(query)) ||
        (log.details?.toLowerCase().includes(query))
      )
    );
  }, [searchQuery, logs]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getActivityLogs();
      setLogs(data);
      setFilteredLogs(data);
    } catch {
      toast.error('Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  type ActionVariant = 'success' | 'info' | 'danger' | 'warning' | 'neutral';

  const getActionVariant = (action: string): ActionVariant => {
    switch (action.toUpperCase()) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'info';
      case 'DELETE': return 'danger';
      case 'LOGIN':  return 'warning';
      default:       return 'neutral';
    }
  };

  // Icon-avatar treatment for each action, sharing the same semantic mapping
  // as the Badge variant below instead of a separate hand-rolled color map.
  const actionIconClasses: Record<ActionVariant, string> = {
    success: 'text-success-fg bg-success-subtle border-success/20',
    info: 'text-info-fg bg-info-subtle border-info/20',
    danger: 'text-danger-fg bg-danger-subtle border-danger/20',
    warning: 'text-warning-fg bg-warning-subtle border-warning/20',
    neutral: 'text-muted-foreground bg-secondary border-border',
  };

  const getTimestamp = (timestamp: ActivityLog['timestamp']) => {
    if (!timestamp) return 'Just now';
    try {
      return format(toJsDate(timestamp), 'MMM d, h:mm a');
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="LOG HISTORY"
        title="Activity Logs"
        subtitle="Monitor administrative actions and security events across your portfolio platform."
        backTo="/dashboard"
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by admin email, action, or entity type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 h-11 bg-card border border-border focus:border-accent/50 transition-all rounded-xl text-foreground placeholder:text-muted-foreground font-medium"
        />
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 w-full bg-secondary border border-border rounded-xl animate-pulse" />
          ))
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <Card key={log.id} className="bg-card border border-border shadow-sm hover:border-accent/30 hover:bg-secondary transition-all overflow-hidden group rounded-xl">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2.5 rounded-lg border flex-shrink-0 transition-transform group-hover:scale-110 duration-300 ${actionIconClasses[getActionVariant(log.action)]}`}>
                    <Shield className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                      <span className="font-semibold text-foreground text-sm truncate">{log.adminEmail}</span>
                      <Badge variant={getActionVariant(log.action)} className="text-[9px] py-1 font-black uppercase tracking-wider">
                        {log.action}
                      </Badge>
                      <span className="text-[9px] text-accent font-black px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-full uppercase tracking-wider">
                        {log.entityType}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                      {log.details || `Performed ${log.action?.toLowerCase() || 'action'} on ${log.entityType || 'entry'}.`}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 border-border pt-3 sm:pt-0 text-right">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider tabular">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">{getTimestamp(log.timestamp)}</span>
                    <span className="sm:hidden">{getTimestamp(log.timestamp).split(',')[0]}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono bg-secondary px-2 py-1 rounded border border-border tabular">
                    {log.entityId ? log.entityId.slice(0, 8) : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={History}
            title="No logs found"
            description={searchQuery ? `No results for "${searchQuery}". Try a different search.` : "Administrative actions will appear here."}
            className="p-16"
          />
        )}
      </div>
    </div>
  );
};

export default AdminLogs;
