import { Decision } from "../../types";
import { Field } from "../ui/Field";

const statuses = ["Draft", "In Review", "Approved", "Open", "Retired"];
const priorities = ["Critical", "High", "Medium", "Low"];

export function DecisionForm({
  value,
  onChange,
  onSave,
  onCancel,
  errors,
}: {
  value: Decision;
  onChange: (decision: Decision) => void;
  onSave: () => void;
  onCancel: () => void;
  errors: string[];
}) {
  const set = (key: keyof Decision, next: string) => onChange({ ...value, [key]: next });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Title" value={value.title} onChange={(next) => set("title", next)} required />
        <Field label="Category" value={value.category} onChange={(next) => set("category", next)} />
        <Field label="Subsystem" value={value.subsystem} onChange={(next) => set("subsystem", next)} />
        <Field label="Owner" value={value.owner} onChange={(next) => set("owner", next)} />
        <Field label="Priority" as="select" options={priorities} value={value.priority} onChange={(next) => set("priority", next)} />
        <Field label="Status" as="select" options={statuses} value={value.status} onChange={(next) => set("status", next)} />
        <div className="lg:col-span-2"><Field label="Decision" as="textarea" value={value.decision} onChange={(next) => set("decision", next)} required /></div>
        <div className="lg:col-span-2"><Field label="Rationale" as="textarea" value={value.rationale} onChange={(next) => set("rationale", next)} required /></div>
        <Field label="Alternatives" value={value.alternatives.join(", ")} onChange={(next) => onChange({ ...value, alternatives: next.split(",").map((item) => item.trim()).filter(Boolean) })} />
        <Field label="Tags" value={value.tags.join(", ")} onChange={(next) => onChange({ ...value, tags: next.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
      </div>
      {errors.length > 0 && <p className="mt-4 text-sm font-semibold text-rose-600">{errors.join(" ")}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onCancel}>Cancel</button>
        <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={onSave}>Save decision</button>
      </div>
    </div>
  );
}
