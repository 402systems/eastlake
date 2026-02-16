import { forwardRef } from 'react';
import { Card } from '@402systems/core-ui/components/ui/card';
import { Loader2 } from 'lucide-react';
import { BingoCell } from './BingoCell';

interface BingoGridProps {
  grid: string[];
  isPreview: boolean;
  isLoadingBoard: boolean;
  onUpdateCell: (index: number, value: string) => void;
}

export const BingoGrid = forwardRef<HTMLDivElement, BingoGridProps>(
  ({ grid, isPreview, isLoadingBoard, onUpdateCell }, ref) => {
    return (
      <Card
        ref={ref}
        className="relative w-full max-w-2xl border-slate-200 bg-white p-3 shadow-xl sm:p-6"
      >
        {isLoadingBoard && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              <p className="text-sm text-slate-500">Loading your board...</p>
            </div>
          </div>
        )}

        <div className="grid w-full grid-cols-5 gap-2 sm:gap-3">
          {grid.map((cell, i) => (
            <div key={i} className="aspect-square w-full">
              <BingoCell
                value={cell}
                index={i}
                isPreview={isPreview}
                onUpdate={onUpdateCell}
              />
            </div>
          ))}
        </div>
      </Card>
    );
  }
);

BingoGrid.displayName = 'BingoGrid';
