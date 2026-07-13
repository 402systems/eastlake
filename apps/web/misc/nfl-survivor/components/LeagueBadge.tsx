export function LeagueBadge({ isSimulation }: { isSimulation: boolean }) {
  if (!isSimulation) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      SIMULATION
    </span>
  );
}
