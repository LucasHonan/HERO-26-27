import { Copy, Edit3, Eye, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { calculateOptionTotal } from "../../lib/scoring";
import { DecisionMatrix } from "../../types";
import { SectionHeader } from "../layout/SectionHeader";
import { MatrixEditor } from "./MatrixEditor";
import { MatrixRanking } from "./MatrixRanking";

export function MatrixManager({
  matrices,
  activeId,
  onActiveChange,
  onChange,
  onNew,
  onDuplicate,
  onDelete,
}: {
  matrices: DecisionMatrix[];
  activeId: string;
  onActiveChange: (id: string) => void;
  onChange: (matrix: DecisionMatrix) => void;
  onNew: () => void;
  onDuplicate: (matrix: DecisionMatrix) => void;
  onDelete: (matrix: DecisionMatrix) => void;
}) {
  const [editing, setEditing] = useState(false);
  const active = matrices.find((matrix) => matrix.id === activeId) ?? matrices[0];
  const navigate = (id: string) => {
    onActiveChange(id);
    setEditing(false);
  };

  return (
    <section>
      <SectionHeader title="Decision Matrices" eyebrow="Weighted trade studies">
        {editing ? (
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={onNew}>
            <Plus size={17} /> New matrix
          </button>
        ) : null}
      </SectionHeader>
      <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="space-y-2">
            {matrices.map((matrix) => (
              <button
                key={matrix.id}
                className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${active?.id === matrix.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                onClick={() => navigate(matrix.id)}
              >
                <span className="block">{matrix.title}</span>
                <span className={`mt-1 block text-xs ${active?.id === matrix.id ? "text-slate-300" : "text-slate-400"}`}>{matrix.category}</span>
              </button>
            ))}
          </div>
        </aside>
        {active && (
          <div className="space-y-5">
            <div className="flex flex-wrap justify-end gap-2">
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => setEditing((current) => !current)}>
                {editing ? <Eye size={16} /> : <Edit3 size={16} />}
                {editing ? "View mode" : "Edit matrix"}
              </button>
              {editing ? (
                <>
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => onDuplicate(active)}>
                    <Copy size={16} /> Duplicate
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={() => onDelete(active)}>
                    <Trash2 size={16} /> Delete
                  </button>
                </>
              ) : null}
            </div>
            <MatrixRanking matrix={active} />
            {editing ? <MatrixEditor matrix={active} onChange={onChange} /> : <MatrixReadOnly matrix={active} />}
          </div>
        )}
      </div>
    </section>
  );
}

function MatrixReadOnly({ matrix }: { matrix: DecisionMatrix }) {
  const weightedTotal = (optionId: string) => {
    const option = matrix.options.find((item) => item.id === optionId);
    return option ? (calculateOptionTotal(matrix, option) * 20).toFixed(1) : "-";
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{matrix.category}</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{matrix.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{matrix.description}</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-950">Criteria</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {matrix.criteria.map((criterion) => (
            <div key={criterion.id} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">{criterion.name}</p>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600">{criterion.weight}%</span>
              </div>
              {criterion.description ? <p className="mt-2 text-sm leading-5 text-slate-600">{criterion.description}</p> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-950">Options and Scores</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Option</th>
                <th className="px-3 py-2">Notes</th>
                {matrix.criteria.map((criterion) => <th key={criterion.id} className="px-3 py-2">{criterion.name}</th>)}
                <th className="px-3 py-2">Weighted Total /100</th>
              </tr>
            </thead>
            <tbody>
              {matrix.options.map((option) => (
                <tr key={option.id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3 font-semibold text-slate-900">{option.name}</td>
                  <td className="max-w-sm px-3 py-3 text-slate-600">{option.notes}</td>
                  {matrix.criteria.map((criterion) => (
                    <td key={criterion.id} className="px-3 py-3 font-semibold text-slate-700">{option.scores[criterion.id] ?? "-"}</td>
                  ))}
                  <td className="px-3 py-3 text-base font-bold text-slate-950">{weightedTotal(option.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
