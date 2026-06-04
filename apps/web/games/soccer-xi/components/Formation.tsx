'use client';

import type { Lineup, Slot, SlotId } from '@/lib/types';
import { SLOT_ROWS, FORMATION_SLOTS } from '@/lib/constants';
import { PositionSlot } from './PositionSlot';

interface Props {
  lineup: Lineup;
  onSlotClick: (slot: Slot) => void;
  activeSlotId?: SlotId;
  blind?: boolean;
  compact?: boolean;
}

const SLOT_MAP = Object.fromEntries(
  FORMATION_SLOTS.map((s) => [s.id, s])
) as Record<SlotId, Slot>;

export function Formation({
  lineup,
  onSlotClick,
  activeSlotId,
  blind,
  compact,
}: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background:
          'linear-gradient(180deg, #1a472a 0%, #2d5a27 30%, #2d6e2a 60%, #1a4a20 100%)',
        minHeight: compact ? undefined : '480px',
      }}
    >
      {/* Pitch markings */}
      <PitchMarkings />

      {/* Formation rows */}
      <div
        className={`relative z-10 flex flex-col ${compact ? 'gap-2 px-2 py-3' : 'gap-4 px-4 py-6'} h-full`}
      >
        {SLOT_ROWS.map((row, i) => (
          <div
            key={i}
            className={`flex justify-center ${compact ? 'gap-1.5' : 'gap-3'}`}
          >
            {row.map((slotId) => {
              const slot = SLOT_MAP[slotId];
              return (
                <PositionSlot
                  key={slotId}
                  slot={slot}
                  player={lineup[slotId]}
                  onClick={() => onSlotClick(slot)}
                  highlight={activeSlotId === slotId}
                  blind={blind}
                  compact={compact}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PitchMarkings() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-20"
      viewBox="0 0 400 520"
      preserveAspectRatio="none"
    >
      {/* Outer boundary */}
      <rect
        x="20"
        y="20"
        width="360"
        height="480"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
      {/* Centre circle */}
      <circle
        cx="200"
        cy="260"
        r="50"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
      {/* Centre line */}
      <line
        x1="20"
        y1="260"
        x2="380"
        y2="260"
        stroke="white"
        strokeWidth="1.5"
      />
      {/* Top penalty area */}
      <rect
        x="110"
        y="20"
        width="180"
        height="80"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
      {/* Bottom penalty area */}
      <rect
        x="110"
        y="420"
        width="180"
        height="80"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
      {/* Top 6-yard box */}
      <rect
        x="155"
        y="20"
        width="90"
        height="30"
        fill="none"
        stroke="white"
        strokeWidth="1"
      />
      {/* Bottom 6-yard box */}
      <rect
        x="155"
        y="470"
        width="90"
        height="30"
        fill="none"
        stroke="white"
        strokeWidth="1"
      />
    </svg>
  );
}
