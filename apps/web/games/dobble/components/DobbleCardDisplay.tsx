import type { DobbleSymbol } from '@/lib/dobble';
import { SYMBOL_MAP } from '@/lib/dobble/symbols';

interface SymbolDisplayProps {
  symbol: DobbleSymbol;
  onClick?: (symbolId: number) => void;
  className?: string;
  isClickable?: boolean;
}

export const DobbleCardDisplay: React.FC<SymbolDisplayProps> = ({
  symbol,
  onClick,
  isClickable = false,
}) => {
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick(symbol.id);
    }
  };

  const style = {
    position: 'absolute',
    display: 'inline-block', // Required for transform to work on span
    left: `${50 + symbol.x}%`,
    top: `${50 + symbol.y}%`,
    transform: `translate(-50%, -50%) rotate(${symbol.rotation}deg) scale(${symbol.scale})`,
    fontSize: '2rem',
  } as const;

  return (
    <span onClick={handleClick} style={style}>
      {SYMBOL_MAP.get(symbol.id)}
    </span>
  );
};
