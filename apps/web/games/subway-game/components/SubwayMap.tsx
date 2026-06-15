import type { BoroughsData, LineData, StreetsData } from '@/lib/types';
import { computeLineViewBox } from '@/lib/viewBox';

const BOROUGH_STROKE = '#283246';
const STREET_STROKE = '#283246';
const STREET_WIDTH = 0.5;
const STREET_OPACITY = 0.4;
const TRACK_COLOR = '#475569';
const BULLET_RADIUS = 4;
const GUESSED_BULLET_RADIUS = 5;
const LABEL_OFFSET = 8;

interface SubwayMapProps {
  line: LineData;
  boroughs: BoroughsData;
  streets: StreetsData;
  guessedIds: Set<string>;
}

export function SubwayMap({
  line,
  boroughs,
  streets,
  guessedIds,
}: SubwayMapProps) {
  const viewBox = computeLineViewBox(line.stations, boroughs.viewBox);
  const trackPath = line.stations
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`)
    .join(' ');

  return (
    <svg
      viewBox={viewBox}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {streets.streets.map((street) => (
        <path
          key={street.name}
          d={street.path}
          stroke={STREET_STROKE}
          strokeWidth={STREET_WIDTH}
          strokeOpacity={STREET_OPACITY}
          fill="none"
        />
      ))}

      {boroughs.boroughs.map((borough, i) => (
        <path
          key={`${borough.name}-${i}`}
          d={borough.path}
          stroke={BOROUGH_STROKE}
          strokeWidth={1}
          fill="none"
        />
      ))}

      <path
        d={trackPath}
        stroke={TRACK_COLOR}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {line.stations.slice(0, -1).map((station, i) => {
        const next = line.stations[i + 1];
        if (!guessedIds.has(station.id) || !guessedIds.has(next.id))
          return null;
        return (
          <line
            key={`seg-${station.id}-${next.id}`}
            x1={station.x}
            y1={station.y}
            x2={next.x}
            y2={next.y}
            stroke={line.color}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}

      {line.stations.map((station) => {
        const guessed = guessedIds.has(station.id);
        return (
          <g key={station.id}>
            <circle
              cx={station.x}
              cy={station.y}
              r={guessed ? GUESSED_BULLET_RADIUS : BULLET_RADIUS}
              fill={guessed ? line.color : '#0a0e17'}
              stroke={guessed ? line.color : '#94a3b8'}
              strokeWidth={2}
            />
            {guessed && (
              <text
                x={station.x + LABEL_OFFSET}
                y={station.y}
                fill="#e2e8f0"
                fontSize={10}
                dominantBaseline="middle"
              >
                {station.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
