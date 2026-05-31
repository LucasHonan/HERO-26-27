import { BookOpen, Plus } from "lucide-react";
import { ResearchEntry } from "../../types";
import { EmptyState } from "../ui/EmptyState";
import { SectionHeader } from "../layout/SectionHeader";
import { ResearchCard } from "./ResearchCard";
import { ResearchForm } from "./ResearchForm";

export function ResearchLibrary({
  research,
  editing,
  errors,
  onNew,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onChange,
}: {
  research: ResearchEntry[];
  editing: ResearchEntry | null;
  errors: string[];
  onNew: () => void;
  onEdit: (entry: ResearchEntry) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (entry: ResearchEntry) => void;
  onChange: (entry: ResearchEntry) => void;
}) {
  return (
    <section>
      <SectionHeader title="Research Library" eyebrow="Sources and evidence">
        <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={onNew}>
          <Plus size={17} /> New source
        </button>
      </SectionHeader>
      {editing && <div className="mb-6"><ResearchForm value={editing} onChange={onChange} onSave={onSave} onCancel={onCancel} errors={errors} /></div>}
      {research.length === 0 ? (
        <EmptyState icon={BookOpen} title="No research yet" message="Add controller, drivetrain, software, safety, and test-method sources as the team evaluates rover options." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {research.map((entry) => <ResearchCard key={entry.id} entry={entry} onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry)} />)}
        </div>
      )}
    </section>
  );
}
