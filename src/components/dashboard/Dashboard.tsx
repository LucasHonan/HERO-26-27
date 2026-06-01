import { BarChart3, BookOpen, ClipboardCheck, Gauge, ListChecks, ShieldAlert } from "lucide-react";
import { AppData, PageId } from "../../types";
import { SectionHeader } from "../layout/SectionHeader";
import { Pill, statusTone } from "../ui/Pill";
import { rankMatrixOptions } from "../../lib/scoring";

export function Dashboard({ data, onNavigate }: { data: AppData; onNavigate: (page: PageId) => void }) {
  const cards = [
    { label: "Research sources", value: data.research.length, icon: BookOpen, page: "research" as const },
    { label: "Decisions", value: data.decisions.length, icon: ClipboardCheck, page: "decisions" as const },
    { label: "Matrices", value: data.matrices.length, icon: BarChart3, page: "matrices" as const },
    { label: "Requirements", value: data.requirements.length, icon: ListChecks, page: "requirements" as const },
    { label: "Tests", value: data.tests.length, icon: Gauge, page: "tests" as const },
    { label: "Open risks", value: data.risks.filter((risk) => !["Complete", "Retired"].includes(risk.status)).length, icon: ShieldAlert, page: "risks" as const },
  ];

  return (
    <section>
      <SectionHeader title="HERO Rover Research & Decision Tracker" eyebrow="NASA HERC 2026 Remote-Controlled Rover" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, page }) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>
              <button className="rounded-2xl bg-blue-50 p-3 text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => onNavigate(page)} aria-label={`Open ${label}`}>
                <Icon size={22} />
              </button>
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
