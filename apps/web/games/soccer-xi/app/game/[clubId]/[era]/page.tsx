import { ERAS } from '@/lib/constants';
import { GameClient } from './GameClient';

// All 50 club IDs — must stay in sync with public/data/clubs.json
const CLUB_IDS = [
  'arsenal','aston-villa','chelsea','everton','liverpool',
  'man-city','man-utd','newcastle','tottenham','west-ham',
  'real-madrid','barcelona','atletico-madrid','sevilla','valencia',
  'athletic-bilbao','real-sociedad','villarreal','real-betis','celta-vigo',
  'bayern','dortmund','leverkusen','rb-leipzig','gladbach',
  'schalke','frankfurt','werder-bremen','stuttgart','wolfsburg',
  'juventus','inter','ac-milan','napoli','roma',
  'lazio','atalanta','fiorentina','torino','parma',
  'psg','marseille','lyon','monaco','lille',
  'nice','rennes','bordeaux','saint-etienne','lens',
];

export function generateStaticParams() {
  return CLUB_IDS.flatMap((clubId) =>
    ERAS.map((e) => ({ clubId, era: e.era })),
  );
}

interface Props {
  params: Promise<{ clubId: string; era: string }>;
}

export default async function GamePage({ params }: Props) {
  const { clubId, era } = await params;
  return <GameClient clubId={clubId} era={era} />;
}
