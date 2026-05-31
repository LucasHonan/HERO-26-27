import { DecisionMatrix } from "../../types";
import { rankMatrixOptions } from "../../lib/scoring";
import { Pill } from "../ui/Pill";

export function MatrixRanking({ matrix }: { matrix: DecisionMatrix }) {
  const rows = rankMatrixOptions(matrix);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-950">Weighted Ranking</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.option.id} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pill tone={row.rank === 1 ? "green" : "slate"}>#{row.rank}</Pill>
                <span className="font-semibold text-slate-900">{row.option.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-700">{row.total.toFixed(2)} / 5</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${row.normalizedTotal}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
