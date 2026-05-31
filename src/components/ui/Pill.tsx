import { ReactNode } from "react";

const toneClasses = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof toneClasses }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses[tone]}`}>{children}</span>;
}

export const statusTone = (status: string): keyof typeof toneClasses => {
  if (["Approved", "Complete", "Pass", "Covered"].includes(status)) return "green";
  if (["Critical", "High", "Fail", "Uncovered", "Blocked"].includes(status)) return "red";
  if (["In Review", "In Progress", "Partial", "Partially covered"].includes(status)) return "amber";
  if (["Draft", "Open", "Not Run"].includes(status)) return "blue";
  return "slate";
};
