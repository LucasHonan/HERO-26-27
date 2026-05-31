import { BarChart3, BookOpen, ClipboardCheck, FileDown, Gauge, GitPullRequestArrow, LayoutDashboard, ListChecks, Menu, ShieldAlert, X } from "lucide-react";
import { PageId } from "../../types";

const items: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "research", label: "Research Library", icon: BookOpen },
  { id: "decisions", label: "Decision Log", icon: ClipboardCheck },
  { id: "matrices", label: "Decision Matrices", icon: BarChart3 },
  { id: "requirements", label: "Requirements", icon: ListChecks },
  { id: "tests", label: "Tests & Evidence", icon: Gauge },
  { id: "risks", label: "Risk Register", icon: ShieldAlert },
  { id: "traceability", label: "Traceability", icon: GitPullRequestArrow },
  { id: "export", label: "Export Center", icon: FileDown },
];

export function Sidebar({
  activePage,
  onNavigate,
  mobileOpen,
  onToggleMobile,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}) {
  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Campbell HERO</p>
          <h2 className="mt-1 text-lg font-black leading-tight text-slate-950">Rover Tracker</h2>
        </div>
        <button className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onToggleMobile} aria-label="Close navigation">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => {
                onNavigate(id);
                if (mobileOpen) onToggleMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <button className="fixed left-4 top-4 z-40 rounded-2xl bg-white p-3 text-slate-800 shadow-soft lg:hidden" onClick={onToggleMobile} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white/95 backdrop-blur lg:block">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={onToggleMobile} />
          <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-soft">{content}</aside>
        </div>
      )}
    </>
  );
}
