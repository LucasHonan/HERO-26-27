import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./components/dashboard/Dashboard";
import { DecisionLog } from "./components/decisions/DecisionLog";
import { DRRExportView } from "./components/export/DRRExportView";
import { Sidebar } from "./components/layout/Sidebar";
import { MatrixManager } from "./components/matrices/MatrixManager";
import { RequirementsTracker } from "./components/requirements/RequirementsTracker";
import { ResearchLibrary } from "./components/research/ResearchLibrary";
import { RiskRegister } from "./components/risks/RiskRegister";
import { TestsTracker } from "./components/tests/TestsTracker";
import { TraceabilityPage } from "./components/traceability/TraceabilityPage";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { Field } from "./components/ui/Field";
import { Pill, statusTone } from "./components/ui/Pill";
import { createSnapshot, importBackupJson, loadAppData, saveAppData } from "./lib/storage";
import { validateRequired } from "./lib/validation";
import { AppData, Decision, DecisionMatrix, FilterState, PageId, Requirement, ResearchEntry, Risk, TestEntry } from "./types";

type EntityName = "research" | "decisions" | "requirements" | "tests" | "risks";
type EditingEntity = ResearchEntry | Decision | Requirement | TestEntry | Risk;
interface FilteredData {
  research: ResearchEntry[];
  decisions: Decision[];
  requirements: Requirement[];
  tests: TestEntry[];
  risks: Risk[];
  matrices: DecisionMatrix[];
}

const blankFilters: FilterState = { subsystem: "", category: "", status: "", priority: "", owner: "", applicability: "" };
const SIDEBAR_COLLAPSED_KEY = "hero-rover-tracker:sidebar-collapsed";
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}`;

const textOf = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return String(value ?? "");
};

function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [dataRevision, setDataRevision] = useState(0);
  const [page, setPage] = useState<PageId>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [activeMatrixId, setActiveMatrixId] = useState(data.matrices[0]?.id ?? "");
  const [editing, setEditing] = useState<{ entity: EntityName; item: EditingEntity } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(blankFilters);
  const [importError, setImportError] = useState("");

  useEffect(() => saveAppData(data), [data]);
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      // storage unavailable; collapse preference just won't persist
    }
  }, [sidebarCollapsed]);

  const options = useMemo(() => {
    const all = [...data.research, ...data.decisions, ...data.requirements, ...data.tests, ...data.risks];
    return {
      subsystem: unique(all.map((item) => item.subsystem)),
      category: unique([...data.research.map((item) => item.category), ...data.decisions.map((item) => item.category), ...data.matrices.map((item) => item.category)]),
      status: unique(all.map((item) => item.status)),
      priority: unique(all.map((item) => item.priority)),
      owner: unique(all.map((item) => item.owner)),
      applicability: unique(data.research.map((item) => item.applicability)),
    };
  }, [data]);

  const filtered = useMemo(() => {
    const match = (item: unknown) => {
      const record = item as Record<string, unknown>;
      const queryOk = !search.trim() || textOf(record).toLowerCase().includes(search.toLowerCase());
      const filterOk = Object.entries(filters).every(([key, value]) => !value || String(record[key] ?? "") === value);
      return queryOk && filterOk;
    };
    return {
      research: data.research.filter(match),
      decisions: data.decisions.filter(match),
      requirements: data.requirements.filter(match),
      tests: data.tests.filter(match),
      risks: data.risks.filter(match),
      matrices: data.matrices.filter((matrix) => (!search.trim() || textOf(matrix).toLowerCase().includes(search.toLowerCase())) && (!filters.category || matrix.category === filters.category)),
    };
  }, [data, search, filters]) satisfies FilteredData;

  const hasSearchOrFilters = search.trim() || Object.values(filters).some(Boolean);

  const updateData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
    setDataRevision((revision) => revision + 1);
  };
  const navigate = (next: PageId) => {
    setPage(next);
    setSearch("");
    setFilters(blankFilters);
  };

  const saveEntity = () => {
    if (!editing) return;
    const required = requiredFields(editing.item);
    const nextErrors = validateRequired(required);
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }
    updateData((current) => {
      const list = current[editing.entity] as EditingEntity[];
      const exists = list.some((item) => item.id === editing.item.id);
      const item = { ...editing.item, updatedAt: now() };
      return { ...current, [editing.entity]: exists ? list.map((entry) => entry.id === item.id ? item : entry) : [item, ...list] };
    });
    setEditing(null);
    setErrors([]);
  };

  const deleteEntity = (entity: EntityName, item: EditingEntity) => {
    setConfirm({
      title: `Delete ${item.title}?`,
      message: "This removes the item from local storage. Existing linked IDs on other records are left intact for review.",
      onConfirm: () => {
        updateData((current) => ({ ...current, [entity]: (current[entity] as EditingEntity[]).filter((entry) => entry.id !== item.id) }));
        setConfirm(null);
      },
    });
  };

  const matrixChange = (matrix: DecisionMatrix) => updateData((current) => ({ ...current, matrices: current.matrices.map((item) => item.id === matrix.id ? matrix : item) }));

  const traceabilityData = useMemo<AppData>(() => ({
    ...data,
    research: filtered.research,
    decisions: filtered.decisions,
    requirements: filtered.requirements,
    tests: filtered.tests,
    risks: filtered.risks,
    matrices: filtered.matrices,
  }), [data, filtered]);

  const renderPage = () => {
    switch (page) {
      case "research":
        return <ResearchLibrary research={filtered.research} editing={editing?.entity === "research" ? editing.item as ResearchEntry : null} errors={errors} onNew={() => setEditing({ entity: "research", item: newResearch() })} onEdit={(item) => setEditing({ entity: "research", item: structuredClone(item) })} onChange={(item) => setEditing({ entity: "research", item })} onSave={saveEntity} onCancel={() => setEditing(null)} onDelete={(item) => deleteEntity("research", item)} />;
      case "decisions":
        return <DecisionLog decisions={filtered.decisions} editing={editing?.entity === "decisions" ? editing.item as Decision : null} errors={errors} onNew={() => setEditing({ entity: "decisions", item: newDecision() })} onEdit={(item) => setEditing({ entity: "decisions", item: structuredClone(item) })} onChange={(item) => setEditing({ entity: "decisions", item })} onSave={saveEntity} onCancel={() => setEditing(null)} onDelete={(item) => deleteEntity("decisions", item)} />;
      case "matrices":
        return <MatrixManager matrices={filtered.matrices} activeId={activeMatrixId} onActiveChange={setActiveMatrixId} onChange={matrixChange} onNew={() => { const matrix = newMatrix(); updateData((current) => ({ ...current, matrices: [matrix, ...current.matrices] })); setActiveMatrixId(matrix.id); }} onDuplicate={(matrix) => { const copy = { ...structuredClone(matrix), id: id("matrix"), title: `${matrix.title} Copy`, createdAt: now(), updatedAt: now() }; updateData((current) => ({ ...current, matrices: [copy, ...current.matrices] })); setActiveMatrixId(copy.id); }} onDelete={(matrix) => setConfirm({ title: `Delete ${matrix.title}?`, message: "This will remove the matrix and its option scores.", onConfirm: () => { updateData((current) => ({ ...current, matrices: current.matrices.filter((item) => item.id !== matrix.id) })); setActiveMatrixId(data.matrices.find((item) => item.id !== matrix.id)?.id ?? ""); setConfirm(null); } })} />;
      case "requirements":
        return <RequirementsTracker requirements={filtered.requirements} editing={editing?.entity === "requirements" ? editing.item as Requirement : null} errors={errors} onNew={() => setEditing({ entity: "requirements", item: newRequirement() })} onEdit={(item) => setEditing({ entity: "requirements", item: structuredClone(item) })} onChange={(item) => setEditing({ entity: "requirements", item })} onSave={saveEntity} onCancel={() => setEditing(null)} onDelete={(item) => deleteEntity("requirements", item)} />;
      case "tests":
        return <TestsTracker tests={filtered.tests} editing={editing?.entity === "tests" ? editing.item as TestEntry : null} errors={errors} onNew={() => setEditing({ entity: "tests", item: newTest() })} onEdit={(item) => setEditing({ entity: "tests", item: structuredClone(item) })} onChange={(item) => setEditing({ entity: "tests", item })} onSave={saveEntity} onCancel={() => setEditing(null)} onDelete={(item) => deleteEntity("tests", item)} />;
      case "risks":
        return <RiskRegister risks={filtered.risks} editing={editing?.entity === "risks" ? editing.item as Risk : null} errors={errors} onNew={() => setEditing({ entity: "risks", item: newRisk() })} onEdit={(item) => setEditing({ entity: "risks", item: structuredClone(item) })} onChange={(item) => setEditing({ entity: "risks", item })} onSave={saveEntity} onCancel={() => setEditing(null)} onDelete={(item) => deleteEntity("risks", item)} />;
      case "traceability":
        return <TraceabilityPage data={traceabilityData} />;
      case "export":
        return <DRRExportView data={data} revision={dataRevision} onSnapshot={() => updateData(createSnapshot)} importError={importError} onImport={(text) => { const result = importBackupJson(text); if (result.error) setImportError(result.error); if (result.data) { setData(result.data); setDataRevision((revision) => revision + 1); setImportError(""); } }} />;
      default:
        if (hasSearchOrFilters) return <SearchResults filtered={filtered} />;
        return <Dashboard data={data} onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        activePage={page}
        onNavigate={navigate}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((open) => !open)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />
      <main className={`transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 pt-20 lg:px-8 lg:pt-8">
          <div className="no-print mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[1fr_repeat(6,150px)_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input className="h-full min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" value={search} onChange={(event) => setSearch(event.target.value)} aria-label={page === "dashboard" ? "Search across research, decisions, requirements, tests, risks, and matrices" : "Search this tab"} />
              </label>
              <Field label="Subsystem" as="select" options={options.subsystem} value={filters.subsystem} onChange={(value) => setFilters({ ...filters, subsystem: value })} />
              <Field label="Category" as="select" options={options.category} value={filters.category} onChange={(value) => setFilters({ ...filters, category: value })} />
              <Field label="Status" as="select" options={options.status} value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} />
              <Field label="Priority" as="select" options={options.priority} value={filters.priority} onChange={(value) => setFilters({ ...filters, priority: value })} />
              <Field label="Owner" as="select" options={options.owner} value={filters.owner} onChange={(value) => setFilters({ ...filters, owner: value })} />
              <Field label="Applicability" as="select" options={options.applicability} value={filters.applicability} onChange={(value) => setFilters({ ...filters, applicability: value })} />
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => { setSearch(""); setFilters(blankFilters); }}><X size={16} /> Clear</button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={`${page}-${hasSearchOrFilters ? "search" : "page"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title ?? ""} message={confirm?.message ?? ""} onCancel={() => setConfirm(null)} onConfirm={() => confirm?.onConfirm()} />
    </div>
  );
}

function SearchResults({ filtered }: { filtered: FilteredData }) {
  const groups = [
    ["Research", filtered.research],
    ["Decisions", filtered.decisions],
    ["Requirements", filtered.requirements],
    ["Tests", filtered.tests],
    ["Risks", filtered.risks],
    ["Matrices", filtered.matrices],
  ] as const;
  return (
    <section>
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Grouped results</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Search Results</h1></div>
      <div className="space-y-5">
        {groups.map(([title, items]) => (
          <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">{title} <span className="text-slate-400">({items.length})</span></h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {items.map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-3"><p className="font-semibold text-slate-900">{item.title}</p>{"status" in item && <div className="mt-2"><Pill tone={statusTone(String(item.status))}>{String(item.status)}</Pill></div>}</div>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function requiredFields(item: EditingEntity) {
  if ("summary" in item) return { title: item.title, category: item.category, summary: item.summary };
  if ("decision" in item) return { title: item.title, category: item.category, decision: item.decision, rationale: item.rationale };
  if ("requirementId" in item) return { requirementId: item.requirementId, title: item.title, description: item.description };
  if ("procedure" in item) return { title: item.title };
  return { title: item.title, description: item.description };
}

function base(title = "") {
  return { id: id("item"), title, subsystem: "", owner: "", priority: "Medium" as const, status: "Open" as const, tags: [], createdAt: now(), updatedAt: now() };
}

function newResearch(): ResearchEntry {
  return { ...base(""), id: id("research"), status: "Draft", category: "", summary: "", sourceUrl: "", sourceTitle: "", sourceType: "", citationNotes: "", applicability: "Direct", confidence: "Medium", linkedDecisionIds: [], linkedRequirementIds: [], linkedTestIds: [], linkedRiskIds: [], linkedMatrixIds: [] };
}

function newDecision(): Decision {
  return { ...base(""), id: id("decision"), status: "Draft", category: "", decision: "", rationale: "", alternatives: [], linkedResearchIds: [], linkedRequirementIds: [], linkedTestIds: [], linkedRiskIds: [], linkedMatrixIds: [] };
}

function newRequirement(): Requirement {
  return { ...base(""), id: id("req"), requirementId: "", description: "", verificationMethod: "", acceptanceCriteria: "", linkedDecisionIds: [], linkedTestIds: [], linkedRiskIds: [] };
}

function newTest(): TestEntry {
  return { ...base(""), id: id("test"), date: new Date().toISOString().slice(0, 10), setup: "", procedure: "", expectedResult: "", actualResult: "", passFail: "Not Run", evidenceLinks: [], codeVersion: "", hardwareVersion: "", linkedRequirementIds: [], linkedDecisionIds: [], linkedResearchIds: [] };
}

function newRisk(): Risk {
  return { ...base(""), id: id("risk"), description: "", likelihood: 3, impact: 3, mitigation: "", contingency: "", linkedRequirementIds: [], linkedDecisionIds: [], linkedTestIds: [] };
}

function newMatrix(): DecisionMatrix {
  const createdAt = now();
  const criterionId = id("criterion");
  return { id: id("matrix"), title: "New Decision Matrix", description: "", category: "", criteria: [{ id: criterionId, name: "Reliability", weight: 40, description: "" }], options: [{ id: id("option"), name: "Option A", notes: "", pros: [], cons: [], scores: { [criterionId]: 3 } }], createdAt, updatedAt: createdAt };
}

export default App;
