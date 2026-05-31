import { Edit, ListChecks, Plus, Trash2 } from "lucide-react";
import { Requirement } from "../../types";
import { SectionHeader } from "../layout/SectionHeader";
import { EmptyState } from "../ui/EmptyState";
import { Field } from "../ui/Field";
import { Pill, statusTone } from "../ui/Pill";

const statuses = ["Open", "In Progress", "Blocked", "Complete", "Retired"];
const priorities = ["Critical", "High", "Medium", "Low"];

export function RequirementsTracker({
  requirements,
  editing,
  errors,
  onNew,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  requirements: Requirement[];
  editing: Requirement | null;
  errors: string[];
  onNew: () => void;
  onEdit: (requirement: Requirement) => void;
  onChange: (requirement: Requirement) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (requirement: Requirement) => void;
}) {
  const set = (key: keyof Requirement, value: string) => editing && onChange({ ...editing, [key]: value });
  return (
    <section>
      <SectionHeader title="Requirements Tracker" eyebrow="Verification backbone">
        <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={onNew}><Plus size={17} /> New requirement</button>
      </SectionHeader>
      {editing && (
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Requirement ID" value={editing.requirementId} onChange={(next) => set("requirementId", next)} required />
            <Field label="Title" value={editing.title} onChange={(next) => set("title", next)} required />
            <Field label="Subsystem" value={editing.subsystem} onChange={(next) => set("subsystem", next)} />
            <Field label="Owner" value={editing.owner} onChange={(next) => set("owner", next)} />
            <Field label="Priority" as="select" options={priorities} value={editing.priority} onChange={(next) => set("priority", next)} />
            <Field label="Status" as="select" options={statuses} value={editing.status} onChange={(next) => set("status", next)} />
            <div className="lg:col-span-2"><Field label="Description" as="textarea" value={editing.description} onChange={(next) => set("description", next)} required /></div>
            <Field label="Verification method" value={editing.verificationMethod} onChange={(next) => set("verificationMethod", next)} />
            <Field label="Acceptance criteria" value={editing.acceptanceCriteria} onChange={(next) => set("acceptanceCriteria", next)} />
            <Field label="Tags" value={editing.tags.join(", ")} onChange={(next) => onChange({ ...editing, tags: next.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
          </div>
          {errors.length > 0 && <p className="mt-4 text-sm font-semibold text-rose-600">{errors.join(" ")}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={onCancel}>Cancel</button>
            <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={onSave}>Save requirement</button>
          </div>
        </div>
      )}
      {requirements.length === 0 ? <EmptyState icon={ListChecks} title="No requirements" message="Add measurable safety, drivetrain, software, and evidence requirements." /> : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {requirements.map((requirement) => (
            <div key={requirement.id} className="grid gap-4 border-b border-slate-100 p-5 last:border-b-0 lg:grid-cols-[160px_1fr_auto]">
              <div><p className="font-black text-slate-950">{requirement.requirementId}</p><p className="text-sm text-slate-500">{requirement.subsystem}</p></div>
              <div><h3 className="font-bold text-slate-950">{requirement.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{requirement.description}</p><div className="mt-3 flex flex-wrap gap-2"><Pill tone={statusTone(requirement.status)}>{requirement.status}</Pill><Pill tone={statusTone(requirement.priority)}>{requirement.priority}</Pill><Pill>{requirement.owner}</Pill></div></div>
              <div className="flex gap-2"><button className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100" onClick={() => onEdit(requirement)}><Edit size={17} /></button><button className="rounded-2xl p-2 text-rose-500 hover:bg-rose-50" onClick={() => onDelete(requirement)}><Trash2 size={17} /></button></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
