import { ChangeEvent, ReactNode } from "react";

interface FieldProps {
  label: string;
  value?: string | number;
  onChange?: (value: string) => void;
  type?: "text" | "number" | "date" | "url";
  as?: "input" | "textarea" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  children?: ReactNode;
  min?: number;
  max?: number;
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  as = "input",
  options = [],
  required,
  placeholder,
  children,
  min,
  max,
}: FieldProps) {
  const base =
    "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange?.(event.target.value);

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children ??
        (as === "textarea" ? (
          <textarea className={`${base} min-h-28 resize-y`} value={value ?? ""} onChange={handleChange} placeholder={placeholder} />
        ) : as === "select" ? (
          <select className={base} value={value ?? ""} onChange={handleChange}>
            <option value="">Any</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input className={base} type={type} min={min} max={max} value={value ?? ""} onChange={handleChange} placeholder={placeholder} />
        ))}
    </label>
  );
}
