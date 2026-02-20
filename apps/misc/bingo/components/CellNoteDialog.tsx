import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@402systems/core-ui/components/ui/dialog';
import { Textarea } from '@402systems/core-ui/components/ui/textarea';
import { Button } from '@402systems/core-ui/components/ui/button';

const MAX_CHARS = 500;

interface CellNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellLabel: string;
  note: string;
  onSave: (note: string) => void;
}

export function CellNoteDialog({
  open,
  onOpenChange,
  cellLabel,
  note,
  onSave,
}: CellNoteDialogProps) {
  const [draft, setDraft] = useState(note);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setDraft(note);
    } else {
      onSave(draft);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cellLabel || 'Cell Note'}</DialogTitle>
          <DialogDescription>
            Track your progress or add details for this goal.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Textarea
            className="min-h-32 resize-none"
            placeholder="Add a note about your progress..."
            value={draft}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setDraft(e.target.value);
              }
            }}
            maxLength={MAX_CHARS}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {draft.length} / {MAX_CHARS}
            </span>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
