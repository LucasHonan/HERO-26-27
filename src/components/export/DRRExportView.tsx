import { Download, Printer, Save, Upload } from "lucide-react";
import { ChangeEvent, useMemo } from "react";
import { AppData } from "../../types";
import { buildExportPackage } from "../../lib/export";
import { downloadTextFile, exportBackupJson } from "../../lib/storage";
import { SectionHeader } from "../layout/SectionHeader";
import { Pill } from "../ui/Pill";

export function DRRExportView({
  data,
  revision,
  onSnapshot,
  onImport,
  importError,
}: {
  data: AppData;
  revision: number;
  onSnapshot: () => void;
  onImport: (text: string) => void;
  importError: string;
}) {
  const pkg = useMemo(() => buildExportPackage(data), [data, revision]);
  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void file.text().then(onImport);
    event.target.value = "";
  };

  return (
    <section>
      <SectionHeader title="Export Center" eyebrow="DRR/CDR material">
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={onSnapshot}><Save size={16} /> Save snapshot</button>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => downloadTextFile("hero-rover-backup.json", exportBackupJson(data), "application/json")}><Download size={16} /> Backup JSON</button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"><Upload size={16} /> Import JSON<input className="hidden" type="file" accept="application/json" onChange={handleImport} /></label>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => window.print()}><Printer size={16} /> Print</button>
      </SectionHeader>
      {importError && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{importError}</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Executive Summary</h2>
            <p className="mt-3 leading-7 text-slate-600">{pkg.executiveSummary}</p>
          </div>
          <ExportSection title="Approved Decisions" items={pkg.approvedDecisions.map((decision) => `${decision.title}: ${decision.decision}`)} />
          <ExportSection title="Open Decisions" items={pkg.openDecisions.map((decision) => `${decision.title} (${decision.status}, ${decision.owner})`)} />
          <ExportSection title="Open Risks" items={pkg.openRisks.map((risk) => `${risk.title}: L${risk.likelihood} x I${risk.impact}`)} />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Markdown Export</h2>
            <textarea className="mt-4 h-80 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700" readOnly value={pkg.markdown} />
          </div>
        </div>
        <aside className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-950">CSV Exports</h3>
            <div className="mt-4 grid gap-2">
              {Object.entries(pkg.csv).map(([name, content]) => (
                <button key={name} className="rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold capitalize hover:bg-slate-50" onClick={() => downloadTextFile(`hero-${name}.csv`, content, "text/csv")}>{name}</button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-950">Requirement Coverage</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="green">Covered {pkg.coveredRequirements.length}</Pill>
              <Pill tone="amber">Partial {pkg.partialRequirements.length}</Pill>
              <Pill tone="red">Uncovered {data.requirements.length - pkg.coveredRequirements.length - pkg.partialRequirements.length}</Pill>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-950">Saved Snapshots</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {data.snapshots.length ? data.snapshots.map((snapshot) => <p key={snapshot.id}>{snapshot.label}</p>) : <p>No manual snapshots yet.</p>}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ExportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      {items.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-slate-400">None.</p>}
    </div>
  );
}
