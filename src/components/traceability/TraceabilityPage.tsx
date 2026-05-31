import { GitPullRequestArrow } from "lucide-react";
import { AppData, CoverageStatus } from "../../types";
import { SectionHeader } from "../layout/SectionHeader";
import { EmptyState } from "../ui/EmptyState";
import { Pill, statusTone } from "../ui/Pill";

const coverageFor = (decisionCount: number, testCount: number, riskCount: number): CoverageStatus => {
  if (decisionCount > 0 && testCount > 0) return "Covered";
  if (decisionCount > 0 || testCount > 0 || riskCount > 0) return "Partially covered";
  return "Uncovered";
};

export function TraceabilityPage({ data }: { data: AppData }) {
  return (
    <section>
      <SectionHeader title="Traceability" eyebrow="Requirement coverage" />
      {data.requirements.length === 0 ? <EmptyState icon={GitPullRequestArrow} title="No requirements to trace" message="Add requirements, then link decisions, tests, risks, and sources to show coverage." /> : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {data.requirements.map((requirement) => {
            const decisions = data.decisions.filter((decision) => requirement.linkedDecisionIds.includes(decision.id) || decision.linkedRequirementIds.includes(requirement.id));
            const tests = data.tests.filter((test) => requirement.linkedTestIds.includes(test.id) || test.linkedRequirementIds.includes(requirement.id));
            const risks = data.risks.filter((risk) => requirement.linkedRiskIds.includes(risk.id) || risk.linkedRequirementIds.includes(requirement.id));
            const research = data.research.filter((entry) => entry.linkedRequirementIds.includes(requirement.id));
            const coverage = coverageFor(decisions.length, tests.length, risks.length);
            return (
              <div key={requirement.id} className="grid gap-4 border-b border-slate-100 p-5 last:border-b-0 xl:grid-cols-[240px_1fr]">
                <div>
                  <p className="text-sm font-black text-slate-950">{requirement.requirementId}</p>
                  <h3 className="mt-1 font-bold text-slate-900">{requirement.title}</h3>
                  <div className="mt-3"><Pill tone={statusTone(coverage)}>{coverage}</Pill></div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <TraceColumn title="Decisions" items={decisions.map((item) => item.title)} />
                  <TraceColumn title="Tests" items={tests.map((item) => item.title)} />
                  <TraceColumn title="Risks" items={risks.map((item) => item.title)} />
                  <TraceColumn title="Research" items={research.map((item) => item.title)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TraceColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {items.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-400">None linked</p>}
    </div>
  );
}
