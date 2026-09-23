'use client';

import { useEffect, useState } from 'react';

const MS_PER_CHAR = 28;

/**
 * Gen 3 style message box with a typewriter reveal; tap to reveal/advance.
 * Render with `key={text}` so each message starts typing from the beginning.
 */
export function TextBox({
  text,
  revealAll,
  onAdvance,
}: {
  text: string;
  revealAll: number;
  onAdvance: () => void;
}) {
  const [count, setCount] = useState(0);
  // Any reveal request after this message appeared shows it in full.
  const [revealAtMount] = useState(revealAll);
  const shown = revealAll !== revealAtMount ? text.length : count;

  useEffect(() => {
    if (!text) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) clearInterval(id);
        return Math.min(c + 1, text.length);
      });
    }, MS_PER_CHAR);
    return () => clearInterval(id);
  }, [text]);

  return (
    <button
      type="button"
      className="textbox h-full w-full text-left"
      onClick={onAdvance}
      aria-live="polite"
      aria-label={text}
    >
      <span aria-hidden>{text.slice(0, shown)}</span>
    </button>
  );
}
