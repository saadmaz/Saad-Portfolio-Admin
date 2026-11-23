import { useEffect, useMemo, useState } from 'react';
import type { Editor, JSONContent } from '@tiptap/core';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/shared/lib/utils';
import { convertPrompts, findPromptCandidates, type PromptCandidate } from './convert-prompts';

type Row = PromptCandidate & { selected: boolean };

const inputCls =
  'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-accent';

/**
 * Lists prompts written as code blocks or inline code and converts the
 * chosen ones into Prompt blocks in one step (undo with Ctrl+Z). Titles and
 * stages are taken from the surrounding headings and can be edited here.
 */
export function ConvertPromptsDialog({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [doc, setDoc] = useState<JSONContent | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    const json = editor.getJSON();
    setDoc(json);
    setRows(findPromptCandidates(json).map((c) => ({ ...c, selected: c.suggested })));
  }, [open, editor]);

  const selected = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const patch = (index: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.index === index ? { ...r, ...p } : r)));

  const apply = () => {
    if (!doc || !selected.length) return;
    const next = convertPrompts(
      doc,
      selected.map((r) => ({ index: r.index, title: r.title, stage: r.stage })),
    );
    editor.chain().setContent(next, { emitUpdate: true }).run();
    onOpenChange(false);
    toast.success(`${selected.length} prompt${selected.length === 1 ? '' : 's'} converted`, {
      description: 'Press Ctrl+Z to undo.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Convert to prompt blocks</DialogTitle>
          <DialogDescription>
            Prompt blocks get a copy button, fill-in variables, stage navigation and “Copy all / Download” on the site.
            Likely prompts are ticked; untick anything that is real code (folder trees, config, commands).
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            No code blocks or inline-code passages that could be prompts were found.
          </p>
        ) : (
          <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
            <div className="flex items-center justify-between text-[12px] text-muted-foreground">
              <span>
                {selected.length} of {rows.length} selected
              </span>
              <span className="flex gap-3">
                <button type="button" className="hover:text-foreground" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, selected: true })))}>
                  Select all
                </button>
                <button type="button" className="hover:text-foreground" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, selected: false })))}>
                  Select none
                </button>
              </span>
            </div>
            {rows.map((r) => (
              <div
                key={r.index}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  r.selected ? 'border-accent/50 bg-accent/[0.04]' : 'border-border-subtle',
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1.5"
                    checked={r.selected}
                    onCheckedChange={(v) => patch(r.index, { selected: v === true })}
                    aria-label={`Convert “${r.title || r.text.slice(0, 40)}”`}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={inputCls} value={r.title} placeholder="Title" aria-label="Prompt title" onChange={(e) => patch(r.index, { title: e.target.value })} />
                      <input className={inputCls} value={r.stage} placeholder="Stage (optional)" aria-label="Prompt stage" onChange={(e) => patch(r.index, { stage: e.target.value })} />
                    </div>
                    <pre className="max-h-20 overflow-hidden whitespace-pre-wrap break-words rounded-md bg-secondary/60 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-fg-2">
                      {r.text.slice(0, 280)}
                      {r.text.length > 280 && '…'}
                    </pre>
                    <p className="text-[11px] text-muted-foreground">
                      {r.kind === 'code' ? 'Code block' : 'Inline-code passage'} · {r.text.length.toLocaleString()} characters
                      {r.dropHeading && ' · its “Copy-ready prompt” heading will be removed'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!selected.length}>
            Convert {selected.length || ''} to prompt{selected.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
