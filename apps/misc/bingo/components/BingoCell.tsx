import { Textarea } from '@402systems/core-ui/components/ui/textarea';

interface BingoCellProps {
  value: string;
  index: number;
  isPreview: boolean;
  onUpdate: (index: number, value: string) => void;
}

export function BingoCell({
  value,
  index,
  isPreview,
  onUpdate,
}: BingoCellProps) {
  const isFreeSpace = index === 12;

  if (isPreview) {
    return (
      <div className="group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-slate-100 bg-slate-50 p-1 text-center text-[10px] font-medium text-slate-700 sm:p-2 sm:text-sm">
        <span className="max-w-full break-words">
          {value || (isFreeSpace ? 'FREE' : '-')}
        </span>
      </div>
    );
  }

  return (
    <Textarea
      className="h-full min-h-0 w-full resize-none p-1 text-center text-[10px] sm:p-2 sm:text-sm"
      value={value}
      onChange={(e) => onUpdate(index, e.target.value)}
      placeholder={isFreeSpace ? 'FREE' : `${index + 1}`}
    />
  );
}
