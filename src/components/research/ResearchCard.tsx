import { Edit, Trash2 } from "lucide-react";
import { ResearchEntry } from "../../types";
import { Pill, statusTone } from "../ui/Pill";

export function ResearchCard({ entry, onEdit, onDelete }: { entry: ResearchEntry; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{entry.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{entry.summary}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100" onClick={onEdit} aria-label="Edit research">
            <Edit size={17} />
          </button>
          <button className="rounded-2xl p-2 text-rose-500 hover:bg-rose-50" onClick={onDelete} aria-label="Delete research">
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone={statusTone(entry.status)}>{entry.status}</Pill>
        <Pill tone={statusTone(entry.priority)}>{entry.priority}</Pill>
        <Pill tone="blue">{entry.subsystem}</Pill>
        <Pill>{entry.owner}</Pill>
        <Pill tone={statusTone(entry.applicability)}>{entry.applicability}</Pill>
      </div>
      <div className="mt-4 text-sm text-slate-500">
        <a className="font-semibold text-blue-700 hover:underline" href={entry.sourceUrl} target="_blank" rel="noreferrer">
          {entry.sourceTitle}
        </a>
        <span> · {entry.sourceType} · Confidence: {entry.confidence}</span>
      </div>
      {entry.tags.length > 0 && <p className="mt-3 text-xs font-semibold text-slate-400">Tags: {entry.tags.join(", ")}</p>}
    </article>
  );
}
