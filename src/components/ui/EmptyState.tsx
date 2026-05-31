import { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon size={22} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{message}</p>
    </div>
  );
}
