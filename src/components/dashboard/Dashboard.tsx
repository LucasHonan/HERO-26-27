import { BarChart3, BookOpen, ClipboardCheck, Gauge, ListChecks, ShieldAlert } from "lucide-react";
import { AppData } from "../../types";
import { SectionHeader } from "../layout/SectionHeader";
import { Pill, statusTone } from "../ui/Pill";
import { rankMatrixOptions } from "../../lib/scoring";

export function Dashboard({ data }: { data: AppData }) {
  const cards = [
    { label: "Research sources", value: data.research.length, icon: BookOpen },
    { label: "Decisions", value: data.decisions.length, icon: ClipboardCheck },
    { label: "Matrices", value: data.matrices.length, icon: BarChart3 },
    { label: "Requirements", value: data.requirements.length, icon: ListChecks },
    { label: "Tests", value: data.tests.length, icon: Gauge },
    { label: "Open risks", value: data.risks.filter((risk) => !["Complete", "Retired"].includes(risk.status)).length, icon: ShieldAlert },
  ];

  return (
    <section>
      <SectionHeader title="HERO Rover Research & Decision Tracker" eyebrow="NASA HERC 2026 Remote-Controlled Rover" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Icon size={22} /></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Recent Decisions</h2>
          <div className="mt-4 space-y-3">
            {data.decisions.slice(0, 4).map((decision) => (
              <div key={decision.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{decision.title}</p><Pill tone={statusTone(decision.status)}>{decision.status}</Pill></div>
                <p className="mt-1 text-sm text-slate-500">{decision.decision}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Leading Matrix Options</h2>
          <div className="mt-4 space-y-3">
            {data.matrices.slice(0, 5).map((matrix) => {
              const leader = rankMatrixOptions(matrix)[0];
              return (
                <div key={matrix.id} className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">{matrix.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{leader ? `${leader.option.name} leads at ${leader.total.toFixed(2)} / 5` : "No options yet"}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
