import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Patent } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Lightbulb, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import BackButton from '@/components/admin/BackButton';
import * as z from 'zod';

const patentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  patentOffice: z.string().min(1, 'Patent office is required'),
  status: z.string().min(1, 'Status is required'),
  patentNumber: z.string().optional(),
  filingDate: z.string().optional(),
  issueDate: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type PatentFormData = z.infer<typeof patentSchema>;

const patentFields = [
  { name: 'title', label: 'Patent Title', type: 'text' as const, placeholder: 'e.g. Method for Efficient Neural Network Pruning' },
  { name: 'patentOffice', label: 'Patent Office', type: 'text' as const, placeholder: 'e.g. USPTO, EPO, WIPO' },
  { name: 'status', label: 'Status', type: 'text' as const, placeholder: 'e.g. Pending, Issued, Abandoned' },
  { name: 'patentNumber', label: 'Patent Number (Optional)', type: 'text' as const, placeholder: 'e.g. US10,123,456' },
  { name: 'filingDate', label: 'Filing Date (Optional)', type: 'text' as const, placeholder: 'e.g. Jan 2023' },
  { name: 'issueDate', label: 'Issue Date (Optional)', type: 'text' as const, placeholder: 'e.g. June 2024' },
  { name: 'description', label: 'Description (Optional)', type: 'textarea' as const, placeholder: 'Brief description of the invention...' },
  { name: 'link', label: 'Patent Link (Optional)', type: 'text' as const, placeholder: 'https://...' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  issued: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  abandoned: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const getStatusColor = (status: string) =>
  STATUS_COLORS[status.toLowerCase()] ?? 'bg-secondary text-muted-foreground border-border';

const AdminPatents = () => {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [current, setCurrent] = useState<Patent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchPatents(); }, []);

  const fetchPatents = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getPatents();
      setPatents(data);
    } catch {
      toast.error('Failed to load patents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrent(null); setIsDialogOpen(true); };
  const handleEdit = (p: Patent) => { setCurrent(p); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deletePatent(deleteTarget.id);
      toast.success('Patent deleted');
      fetchPatents();
    } catch { toast.error('Failed to delete patent'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: PatentFormData) => {
    try {
      if (current) {
        await CommonService.updatePatent(current.id, data);
        toast.success('Patent updated');
      } else {
        await CommonService.createPatent(data);
        toast.success('Patent added');
      }
      fetchPatents();
    } catch {
      toast.error('Failed to save patent');
      throw new Error('save failed');
    }
  };

  const filtered = patents.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.patentOffice?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-3">
          <BackButton to="/dashboard" className="mt-1 flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent mb-3">METADATA</p>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground" style={{ fontFamily: 'DM Sans' }}>
              Patents
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Inventions and intellectual property filings.
            </p>
          </div>
        </div>
        <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-black font-black h-11 px-6 rounded-lg flex-shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Add Patent
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patents..."
            className="w-full bg-secondary border border-border rounded-lg pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-accent outline-none transition-all text-foreground placeholder:text-muted-foreground font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className="h-24 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((patent) => (
            <Card key={patent.id} className="bg-card border-border hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-foreground text-sm" style={{ fontFamily: 'DM Sans' }}>
                          {patent.title}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getStatusColor(patent.status)}`}>
                          {patent.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        {patent.patentOffice}{patent.patentNumber ? ` · ${patent.patentNumber}` : ''}
                      </p>
                      {(patent.filingDate || patent.issueDate) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {patent.filingDate ? `Filed: ${patent.filingDate}` : ''}
                          {patent.filingDate && patent.issueDate ? ' · ' : ''}
                          {patent.issueDate ? `Issued: ${patent.issueDate}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {patent.link && (
                      <a href={patent.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(patent)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(patent.id, patent.title)} className="h-9 w-9 hover:bg-red-500/10 text-red-400 hover:text-red-500 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
            <h3 className="text-lg font-black text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>No patents found</h3>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {searchQuery ? 'Try a different search.' : 'Add your patent filings and inventions.'}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Patent?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete Patent"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit Patent' : 'Add Patent'}
        fields={patentFields}
        schema={patentSchema}
        defaultValues={current || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminPatents;
