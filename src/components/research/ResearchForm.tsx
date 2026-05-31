import { ResearchEntry } from "../../types";
import { Field } from "../ui/Field";

const statuses = ["Draft", "In Review", "Approved", "Retired"];
const priorities = ["Critical", "High", "Medium", "Low"];
const applicability = ["Direct", "Related", "Background", "Rejected"];
const confidence = ["High", "Medium", "Low"];

export function ResearchForm({
  value,
  onChange,
  onSave,
  onCancel,
  errors,
}: {
  value: ResearchEntry;
  onChange: (entry: ResearchEntry) => void;
  onSave: () => void;
  onCancel: () => void;
  errors: string[];
}) {
  const set = (key: keyof ResearchEntry, next: string) => onChange({ ...value, [key]: next });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Title" value={value.title} onChange={(next) => set("title", next)} required />
        <Field label="Category" value={value.category} onChange={(next) => set("category", next)} required />
        <Field label="Subsystem" value={value.subsystem} onChange={(next) => set("subsystem", next)} />
        <Field label="Owner" value={value.owner} onChange={(next) => set("owner", next)} />
        <Field label="Priority" as="select" options={priorities} value={value.priority} onChange={(next) => set("priority", next)} />
        <Field label="Status" as="select" options={statuses} value={value.status} onChange={(next) => set("status", next)} />
        <Field label="Applicability" as="select" options={applicability} value={value.applicability} onChange={(next) => set("applicability", next)} />
        <Field label="Confidence" as="select" options={confidence} value={value.confidence} onChange={(next) => set("confidence", next)} />
        <Field label="Source title" value={value.sourceTitle} onChange={(next) => set("sourceTitle", next)} />
        <Field label="Source URL" type="url" value={value.sourceUrl} onChange={(next) => set("sourceUrl", next)} />
        <Field label="Source type" value={value.sourceType} onChange={(next) => set("sourceType", next)} />
        <Field label="Tags" value={value.tags.join(", ")} onChange={(next) => onChange({ ...value, tags: next.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
        <div className="lg:col-span-2">
          <Field label="Summary" as="textarea" value={value.summary} onChange={(next) => set("summary", next)} required />
        </div>
        <div className="lg:col-span-2">
          <Field label="Citation notes" as="textarea" value={value.citationNotes} onChange={(next) => set("citationNotes", next)} />
        </div>
      </div>
      {errors.length > 0 && <p className="mt-4 text-sm font-semibold text-rose-600">{errors.join(" ")}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onCancel}>
          Cancel
        </button>
        <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={onSave}>
          Save research
        </button>
      </div>
    </div>
  );
}
