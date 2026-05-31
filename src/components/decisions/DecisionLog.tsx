import { ClipboardCheck, Plus } from "lucide-react";
import { Decision } from "../../types";
import { SectionHeader } from "../layout/SectionHeader";
import { EmptyState } from "../ui/EmptyState";
import { DecisionCard } from "./DecisionCard";
import { DecisionForm } from "./DecisionForm";

export function DecisionLog({
  decisions,
  editing,
  errors,
  onNew,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onChange,
}: {
  decisions: Decision[];
  editing: Decision | null;
  errors: string[];
  onNew: () => void;
  onEdit: (decision: Decision) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (decision: Decision) => void;
  onChange: (decision: Decision) => void;
}) {
  return (
    <section>
      <SectionHeader title="Decision Log" eyebrow="Engineering choices">
        <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={onNew}>
          <Plus size={17} /> New decision
        </button>
      </SectionHeader>
      {editing && <div className="mb-6"><DecisionForm value={editing} onChange={onChange} onSave={onSave} onCancel={onCancel} errors={errors} /></div>}
      {decisions.length === 0 ? <EmptyState icon={ClipboardCheck} title="No decisions yet" message="Capture the decision, rationale, owner, status, and alternatives as engineering choices mature." /> : (
        <div className="grid gap-4 xl:grid-cols-2">{decisions.map((decision) => <DecisionCard key={decision.id} decision={decision} onEdit={() => onEdit(decision)} onDelete={() => onDelete(decision)} />)}</div>
      )}
    </section>
  );
}
