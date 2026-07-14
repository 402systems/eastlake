import type { StandingsRow } from '../lib/types';

export function StandingsTable({
  title,
  rows,
  points,
}: {
  title: string;
  rows: StandingsRow[];
  points: 'win_points' | 'loss_points';
}) {
  const sorted = [...rows].sort((a, b) => b[points] - a[points]);

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Member</th>
            <th className="px-4 py-2 text-right font-medium">Points</th>
            <th className="px-4 py-2 text-right font-medium">Record</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                No picks scored yet
              </td>
            </tr>
          )}
          {sorted.map((row, i) => (
            <tr
              key={row.league_member_id}
              className="border-t border-slate-100"
            >
              <td className="px-4 py-2 text-slate-400">{i + 1}</td>
              <td className="px-4 py-2 font-medium text-slate-800">
                {row.username}
              </td>
              <td className="px-4 py-2 text-right font-semibold text-slate-900">
                {row[points]}
              </td>
              <td className="px-4 py-2 text-right text-slate-500">
                {row.correct_picks}-{row.incorrect_picks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
