import { Edit, Trash2 } from "lucide-react";
import { Decision } from "../../types";
import { Pill, statusTone } from "../ui/Pill";

export function DecisionCard({ decision, onEdit, onDelete }: { decision: Decision; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{decision.title}</h3>
          <p className="mt-2 text-sm font-semibold text-slate-700">{decision.decision}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{decision.rationale}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100" onClick={onEdit} aria-label="Edit decision"><Edit size={17} /></button>
          <button className="rounded-2xl p-2 text-rose-500 hover:bg-rose-50" onClick={onDelete} aria-label="Delete decision"><Trash2 size={17} /></button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone={statusTone(decision.status)}>{decision.status}</Pill>
        <Pill tone={statusTone(decision.priority)}>{decision.priority}</Pill>
        <Pill tone="blue">{decision.subsystem}</Pill>
        <Pill>{decision.owner}</Pill>
      </div>
      {decision.alternatives.length > 0 && <p className="mt-4 text-xs font-semibold text-slate-400">Alternatives: {decision.alternatives.join(", ")}</p>}
    </article>
  );
}
