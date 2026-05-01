import { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { Textarea } from '@eastlake/core-ui/components/ui/textarea';
import { CellNoteDialog } from './CellNoteDialog';
import type { CellData } from '../hooks/useBingoBoard';

interface BingoCellProps {
  cell: CellData;
  index: number;
  isPreview: boolean;
  onUpdate: (index: number, patch: Partial<CellData>) => void;
}

export function BingoCell({
  cell,
  index,
  isPreview,
  onUpdate,
}: BingoCellProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const isFreeSpace = index === 12;
  const hasNote = cell.note.trim().length > 0;

  const noteButton = (
    <button
      className="absolute top-1 right-1 z-10 p-0.5 opacity-70 transition-opacity hover:opacity-100"
      onClick={(e) => {
        e.stopPropagation();
        setNoteOpen(true);
      }}
      title={hasNote ? 'View note' : 'Add note'}
      type="button"
    >
      <StickyNote
        className={hasNote ? 'text-amber-500' : 'text-slate-300'}
        size={14}
      />
    </button>
  );

  if (isPreview) {
    return (
      <div className="group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-slate-100 bg-slate-50 p-1 text-center text-[10px] font-medium text-slate-700 sm:p-2 sm:text-sm">
        {noteButton}
        <span className="max-w-full break-words">
          {cell.text || (isFreeSpace ? 'FREE' : '-')}
        </span>
        <CellNoteDialog
          open={noteOpen}
          onOpenChange={setNoteOpen}
          cellLabel={cell.text}
          note={cell.note}
          onSave={(newNote) => onUpdate(index, { note: newNote })}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {noteButton}
      <Textarea
        className="h-full min-h-0 w-full resize-none p-1 text-center text-[10px] sm:p-2 sm:text-sm"
        value={cell.text}
        onChange={(e) => onUpdate(index, { text: e.target.value })}
        placeholder={isFreeSpace ? 'FREE' : `${index + 1}`}
      />
      <CellNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        cellLabel={cell.text}
        note={cell.note}
        onSave={(newNote) => onUpdate(index, { note: newNote })}
      />
    </div>
  );
}
