import { Edit, Gauge, Plus, Trash2 } from "lucide-react";
import { TestEntry } from "../../types";
import { SectionHeader } from "../layout/SectionHeader";
import { EmptyState } from "../ui/EmptyState";
import { Field } from "../ui/Field";
import { Pill, statusTone } from "../ui/Pill";

const passFail = ["Pass", "Fail", "Partial", "Not Run"];
const statuses = ["Open", "In Progress", "Blocked", "Complete", "Retired"];
const priorities = ["Critical", "High", "Medium", "Low"];

export function TestsTracker({ tests, editing, errors, onNew, onEdit, onChange, onSave, onCancel, onDelete }: {
  tests: TestEntry[];
  editing: TestEntry | null;
  errors: string[];
  onNew: () => void;
  onEdit: (test: TestEntry) => void;
  onChange: (test: TestEntry) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (test: TestEntry) => void;
}) {
  const set = (key: keyof TestEntry, value: string) => editing && onChange({ ...editing, [key]: value });
  return (
    <section>
      <SectionHeader title="Test & Evidence Log" eyebrow="Verification evidence">
        <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={onNew}><Plus size={17} /> New test</button>
      </SectionHeader>
      {editing && (
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Title" value={editing.title} onChange={(next) => set("title", next)} required />
            <Field label="Date" type="date" value={editing.date} onChange={(next) => set("date", next)} />
            <Field label="Subsystem" value={editing.subsystem} onChange={(next) => set("subsystem", next)} />
            <Field label="Owner" value={editing.owner} onChange={(next) => set("owner", next)} />
            <Field label="Priority" as="select" options={priorities} value={editing.priority} onChange={(next) => set("priority", next)} />
            <Field label="Status" as="select" options={statuses} value={editing.status} onChange={(next) => set("status", next)} />
            <Field label="Pass/fail" as="select" options={passFail} value={editing.passFail} onChange={(next) => set("passFail", next)} />
            <Field label="Evidence links" value={editing.evidenceLinks.join(", ")} onChange={(next) => onChange({ ...editing, evidenceLinks: next.split(",").map((link) => link.trim()).filter(Boolean) })} />
            <Field label="Code version" value={editing.codeVersion} onChange={(next) => set("codeVersion", next)} />
            <Field label="Hardware version" value={editing.hardwareVersion} onChange={(next) => set("hardwareVersion", next)} />
            <div className="lg:col-span-2"><Field label="Setup" as="textarea" value={editing.setup} onChange={(next) => set("setup", next)} /></div>
            <div className="lg:col-span-2"><Field label="Procedure" as="textarea" value={editing.procedure} onChange={(next) => set("procedure", next)} /></div>
            <Field label="Expected result" value={editing.expectedResult} onChange={(next) => set("expectedResult", next)} />
            <Field label="Actual result" value={editing.actualResult} onChange={(next) => set("actualResult", next)} />
          </div>
          {errors.length > 0 && <p className="mt-4 text-sm font-semibold text-rose-600">{errors.join(" ")}</p>}
          <div className="mt-5 flex justify-end gap-3"><button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={onCancel}>Cancel</button><button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={onSave}>Save test</button></div>
        </div>
      )}
      {tests.length === 0 ? <EmptyState icon={Gauge} title="No tests yet" message="Create bench, field, slope, obstacle, and telemetry tests with evidence links." /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tests.map((test) => (
            <article key={test.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex justify-between gap-4"><div><h3 className="font-bold text-slate-950">{test.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{test.procedure}</p></div><div className="flex gap-2"><button className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100" onClick={() => onEdit(test)}><Edit size={17} /></button><button className="rounded-2xl p-2 text-rose-500 hover:bg-rose-50" onClick={() => onDelete(test)}><Trash2 size={17} /></button></div></div>
              <div className="mt-4 flex flex-wrap gap-2"><Pill tone={statusTone(test.passFail)}>{test.passFail}</Pill><Pill tone={statusTone(test.status)}>{test.status}</Pill><Pill tone="blue">{test.subsystem}</Pill><Pill>{test.date}</Pill></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
