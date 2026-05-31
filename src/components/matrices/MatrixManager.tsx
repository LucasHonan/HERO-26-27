import { Copy, Plus, Trash2 } from "lucide-react";
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
  const active = matrices.find((matrix) => matrix.id === activeId) ?? matrices[0];
  return (
    <section>
      <SectionHeader title="Decision Matrices" eyebrow="Weighted trade studies">
        <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={onNew}>
          <Plus size={17} /> New matrix
        </button>
      </SectionHeader>
      <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="space-y-2">
            {matrices.map((matrix) => (
              <button
                key={matrix.id}
                className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${active?.id === matrix.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                onClick={() => onActiveChange(matrix.id)}
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
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => onDuplicate(active)}>
                <Copy size={16} /> Duplicate
              </button>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={() => onDelete(active)}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
            <MatrixRanking matrix={active} />
            <MatrixEditor matrix={active} onChange={onChange} />
          </div>
        )}
      </div>
    </section>
  );
}
