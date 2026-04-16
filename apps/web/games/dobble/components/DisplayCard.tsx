import type { DobbleCard } from '@/lib/dobble';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@402systems/core-ui/components/ui/card';
import { DobbleCardDisplay } from './DobbleCardDisplay';

export interface DisplayCardProps {
  heading: string;
  dobbleCard: DobbleCard;
  onClick?: (symbolId: number) => void;
}

export const DisplayCard: React.FC<DisplayCardProps> = ({
  heading,
  dobbleCard,
  onClick,
}) => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <div
          className="relative flex flex-wrap justify-center gap-2 rounded-full border-4 border-gray-200 bg-white shadow-xl"
          style={{ width: '300px', height: '300px' }} // The "Card"
        >
          {dobbleCard.symbols.map((symbol, index) => (
            <DobbleCardDisplay
              key={index}
              symbol={symbol}
              className="bg-blue-100"
              isClickable={true}
              onClick={onClick}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
