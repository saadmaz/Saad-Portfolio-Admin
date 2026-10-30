import React, { useEffect, useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  isLoading?: boolean;
  /** When set, the confirm button stays disabled until this word is typed. */
  requireText?: string;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title = 'Delete this item?',
  description = 'This is permanent and can’t be undone.',
  confirmLabel = 'Delete',
  isLoading = false,
  requireText,
  onConfirm,
}) => {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  useEffect(() => { if (!open) setTyped(''); }, [open]);
  const locked = !!requireText && typed.trim().toUpperCase() !== requireText.toUpperCase();

  return (
    <AlertDialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
      <AlertDialogContent className="max-w-[460px]">
        <AlertDialogHeader className="space-y-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-subtle text-danger-fg">
            <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <AlertDialogTitle className="pt-2">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireText && (
          <div className="space-y-2">
            <Label htmlFor={inputId}>Type {requireText} to confirm</Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="font-mono uppercase"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isLoading}>Cancel</Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            loading={isLoading}
            disabled={locked}
            onClick={onConfirm}
          >
            <Trash2 aria-hidden="true" />
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
