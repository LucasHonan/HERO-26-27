import { Edit, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Risk } from "../../types";
import { SectionHeader } from "../layout/SectionHeader";
import { EmptyState } from "../ui/EmptyState";
import { Field } from "../ui/Field";
import { Pill, statusTone } from "../ui/Pill";

const statuses = ["Open", "In Review", "In Progress", "Blocked", "Complete", "Retired"];
const priorities = ["Critical", "High", "Medium", "Low"];

export function RiskRegister({ risks, editing, errors, onNew, onEdit, onChange, onSave, onCancel, onDelete }: {
  risks: Risk[];
  editing: Risk | null;
  errors: string[];
  onNew: () => void;
  onEdit: (risk: Risk) => void;
  onChange: (risk: Risk) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (risk: Risk) => void;
}) {
  const set = (key: keyof Risk, value: string | number) => editing && onChange({ ...editing, [key]: value });
  return (
    <section>
      <SectionHeader title="Risk Register" eyebrow="Program risk">
        <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={onNew}><Plus size={17} /> New risk</button>
      </SectionHeader>
      {editing && (
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Title" value={editing.title} onChange={(next) => set("title", next)} required />
            <Field label="Subsystem" value={editing.subsystem} onChange={(next) => set("subsystem", next)} />
            <Field label="Owner" value={editing.owner} onChange={(next) => set("owner", next)} />
            <Field label="Priority" as="select" options={priorities} value={editing.priority} onChange={(next) => set("priority", next)} />
            <Field label="Status" as="select" options={statuses} value={editing.status} onChange={(next) => set("status", next)} />
            <Field label="Likelihood" type="number" min={1} max={5} value={editing.likelihood} onChange={(next) => set("likelihood", Number(next) || 1)} />
            <Field label="Impact" type="number" min={1} max={5} value={editing.impact} onChange={(next) => set("impact", Number(next) || 1)} />
            <Field label="Tags" value={editing.tags.join(", ")} onChange={(next) => onChange({ ...editing, tags: next.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
            <div className="lg:col-span-2"><Field label="Description" as="textarea" value={editing.description} onChange={(next) => set("description", next)} required /></div>
            <div className="lg:col-span-2"><Field label="Mitigation" as="textarea" value={editing.mitigation} onChange={(next) => set("mitigation", next)} /></div>
            <div className="lg:col-span-2"><Field label="Contingency" as="textarea" value={editing.contingency} onChange={(next) => set("contingency", next)} /></div>
          </div>
          {errors.length > 0 && <p className="mt-4 text-sm font-semibold text-rose-600">{errors.join(" ")}</p>}
          <div className="mt-5 flex justify-end gap-3"><button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={onCancel}>Cancel</button><button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={onSave}>Save risk</button></div>
        </div>
      )}
      {risks.length === 0 ? <EmptyState icon={ShieldAlert} title="No risks" message="Track integration, safety, schedule, wiring, and software scope risks." /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {risks.map((risk) => (
            <article key={risk.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex justify-between gap-4"><div><h3 className="font-bold text-slate-950">{risk.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{risk.description}</p></div><div className="flex gap-2"><button className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100" onClick={() => onEdit(risk)}><Edit size={17} /></button><button className="rounded-2xl p-2 text-rose-500 hover:bg-rose-50" onClick={() => onDelete(risk)}><Trash2 size={17} /></button></div></div>
              <div className="mt-4 flex flex-wrap gap-2"><Pill tone={statusTone(risk.priority)}>{risk.priority}</Pill><Pill tone={statusTone(risk.status)}>{risk.status}</Pill><Pill tone="red">Score {risk.likelihood * risk.impact}</Pill><Pill>{risk.owner}</Pill></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
