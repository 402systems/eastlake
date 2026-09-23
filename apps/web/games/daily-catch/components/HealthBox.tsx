'use client';

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { hpBar, type MonView } from '@/lib/anim/steps';

const STATUS_LABEL: Record<string, string> = {
  slp: 'SLP',
  psn: 'PSN',
  tox: 'PSN',
  brn: 'BRN',
  frz: 'FRZ',
  par: 'PAR',
};

/** Animates a number from its previous value to `value` over `ms`. */
function useDrain(value: number, ms: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    if (origin === value || ms <= 0) {
      from.current = value;
      setShown(value);
      return;
    }
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      const v = Math.round(origin + (value - origin) * t);
      from.current = v;
      setShown(v);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);
  return shown;
}

export const HealthBox = forwardRef<
  HTMLDivElement,
  {
    mon: MonView;
    side: 'player' | 'wild';
    drainMs: number;
    style?: CSSProperties;
    hidden?: boolean;
  }
>(function HealthBox({ mon, side, drainMs, style, hidden }, ref) {
  const hp = useDrain(mon.hp, drainMs);
  const { pixels, color } = hpBar(hp, mon.maxhp);
  return (
    <div
      ref={ref}
      className="gba healthbox"
      style={{ ...style, visibility: hidden ? 'hidden' : 'visible' }}
      aria-label={`${mon.name}, level ${mon.level}, ${side === 'player' ? `${mon.hp} of ${mon.maxhp} HP` : `${Math.round((100 * mon.hp) / Math.max(1, mon.maxhp))}% HP`}`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate font-bold uppercase">
          {mon.name}
          {mon.gender === 'M' && <span className="text-[#3070e8]">♂</span>}
          {mon.gender === 'F' && <span className="text-[#e85070]">♀</span>}
        </span>
        <span className="shrink-0">Lv{mon.level}</span>
      </div>
      <div className="hp-track">
        {mon.status && STATUS_LABEL[mon.status] ? (
          <span className={`status-badge status-${mon.status}`}>
            {STATUS_LABEL[mon.status]}
          </span>
        ) : (
          <span className="hp-label">HP</span>
        )}
        <div className="hp-bar" role="presentation">
          <div
            className={`hp-fill ${color}`}
            style={{ width: `${(pixels / 48) * 100}%` }}
          />
        </div>
      </div>
      {side === 'player' && (
        <div className="text-right tabular-nums">
          {hp}/ {mon.maxhp}
        </div>
      )}
    </div>
  );
});
