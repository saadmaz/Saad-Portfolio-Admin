import React from 'react';
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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title = 'Delete Item?',
  description = 'This action is permanent and cannot be undone.',
  confirmLabel = 'Delete',
  isLoading = false,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
    <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-lg font-black text-foreground">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-muted-foreground text-sm">{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="gap-2">
        <AlertDialogCancel
          disabled={isLoading}
          className="bg-secondary border-border text-muted-foreground hover:bg-secondary/80 rounded-xl font-bold"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          disabled={isLoading}
          onClick={onConfirm}
          className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-black border-0 shadow-lg shadow-red-500/20"
        >
          {isLoading ? 'Deleting…' : confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
