import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { TestScore } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, ClipboardList, Edit2, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import * as z from 'zod';

const testScoreSchema = z.object({
  testName: z.string().min(1, 'Test name is required'),
  score: z.string().min(1, 'Score is required'),
  date: z.string().optional(),
  description: z.string().optional(),
});

type TestScoreFormData = z.infer<typeof testScoreSchema>;

const testScoreFields = [
  { name: 'testName', label: 'Test Name', type: 'text' as const, placeholder: 'e.g. SAT, IELTS, GRE, TOEFL' },
  { name: 'score', label: 'Score', type: 'text' as const, placeholder: 'e.g. 1550 / 1600, 8.5 / 9.0' },
  { name: 'date', label: 'Date Taken (Optional)', type: 'text' as const, placeholder: 'e.g. March 2022' },
  { name: 'description', label: 'Description / Notes (Optional)', type: 'textarea' as const, placeholder: 'Additional context about the score...' },
] as const;

const AdminTestScores = () => {
  const [scores, setScores] = useState<TestScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [current, setCurrent] = useState<TestScore | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchScores(); }, []);

  const fetchScores = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getTestScores();
      setScores(data);
    } catch {
      toast.error('Failed to load test scores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrent(null); setIsDialogOpen(true); };
  const handleEdit = (s: TestScore) => { setCurrent(s); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteTestScore(deleteTarget.id);
      toast.success('Test score deleted');
      fetchScores();
    } catch { toast.error('Failed to delete test score'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: TestScoreFormData) => {
    try {
      if (current) {
        await CommonService.updateTestScore(current.id, data);
        toast.success('Test score updated');
      } else {
        await CommonService.createTestScore(data);
        toast.success('Test score added');
      }
      fetchScores();
    } catch {
      toast.error('Failed to save test score');
      throw new Error('save failed');
    }
  };

  const filtered = scores.filter(s =>
    s.testName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="METADATA"
        title="Test Scores"
        subtitle="Standardized test results and academic assessments."
        backTo="/dashboard"
        actions={
          <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-accent-foreground font-black h-11 px-6 rounded-lg flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Score
          </Button>
        }
      />

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search test scores..."
            className="w-full bg-secondary border border-border rounded-lg pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-accent outline-none transition-all text-foreground placeholder:text-muted-foreground font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-20 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((score) => (
            <Card key={score.id} className="bg-card border-border hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-foreground text-sm">
                        {score.testName}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        Score: <span className="text-accent font-black tabular">{score.score}</span>
                        {score.date ? ` · ${score.date}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(score)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(score.id, score.testName)} className="h-9 w-9 hover:bg-danger-subtle text-danger hover:text-danger-fg rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No test scores found"
            description={searchQuery ? 'Try a different search.' : 'Add your standardized test results.'}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Test Score?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete Score"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit Test Score' : 'Add Test Score'}
        fields={testScoreFields}
        schema={testScoreSchema}
        defaultValues={current || {}}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminTestScores;
