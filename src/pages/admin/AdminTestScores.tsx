import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { TestScore } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ClipboardList } from 'lucide-react';
import SearchInput from '@/components/admin/SearchInput';
import RowActions from '@/components/admin/RowActions';
import { ROW_CARD, ICON_TILE, ROW_TITLE, ROW_META, SKELETON } from '@/components/admin/listStyles';
import { toast } from "sonner";
import AdminEntityDialog from '@/components/admin/AdminEntityDialog';
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { cn, plural } from '@/shared/lib/utils';
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
  { name: 'description', label: 'Description / Notes (Optional)', type: 'textarea' as const, placeholder: 'Additional context about the score…' },
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
  useCreateIntent(handleAdd);
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
    <div className="space-y-6">
      <PageHeader
        title="Test scores"
        subtitle={plural(scores.length, "score")}
        actions={
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Add score
          </Button>
        }
      />

      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search test scores…" />

      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2, 3].map(i => (
            <div key={i} className={cn(SKELETON, 'h-20')} />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((score) => (
            <Card key={score.id} className={ROW_CARD}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={ICON_TILE}>
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={ROW_TITLE}>
                        {score.testName}
                      </h3>
                      <p className={ROW_META}>
                        Score: <span className="text-accent font-medium tabular">{score.score}</span>
                        {score.date ? ` · ${score.date}` : ''}
                      </p>
                    </div>
                  </div>
                  <RowActions label="score" onEdit={() => handleEdit(score)} onDelete={() => handleDelete(score.id, score.testName)} />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={searchQuery ? 'No test scores found' : 'No test scores yet'}
            description={searchQuery ? 'Try a different search.' : 'Add your standardized test results.'}
            action={!searchQuery ? { label: 'Add score', onClick: handleAdd } : undefined}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete test score?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete score"
        onConfirm={handleConfirmDelete}
      />
      <AdminEntityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={current ? 'Edit test score' : 'Add test score'}
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
