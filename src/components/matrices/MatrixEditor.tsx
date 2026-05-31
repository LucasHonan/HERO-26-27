import { Plus, Trash2 } from "lucide-react";
import { DecisionMatrix } from "../../types";
import { calculateOptionTotal, clampScore } from "../../lib/scoring";
import { Field } from "../ui/Field";

export function MatrixEditor({ matrix, onChange }: { matrix: DecisionMatrix; onChange: (matrix: DecisionMatrix) => void }) {
  const update = (patch: Partial<DecisionMatrix>) => onChange({ ...matrix, ...patch, updatedAt: new Date().toISOString() });

  const addCriterion = () => {
    const id = `criterion-${Date.now()}`;
    update({
      criteria: [...matrix.criteria, { id, name: "New criterion", weight: 10, description: "" }],
      options: matrix.options.map((option) => ({ ...option, scores: { ...option.scores, [id]: 3 } })),
    });
  };

  const removeCriterion = (id: string) => {
    update({
      criteria: matrix.criteria.filter((criterion) => criterion.id !== id),
      options: matrix.options.map((option) => {
        const scores = { ...option.scores };
        delete scores[id];
        return { ...option, scores };
      }),
    });
  };

  const addOption = () => {
    update({
      options: [
        ...matrix.options,
        {
          id: `option-${Date.now()}`,
          name: "New option",
          notes: "",
          pros: [],
          cons: [],
          scores: Object.fromEntries(matrix.criteria.map((criterion) => [criterion.id, 3])),
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Matrix title" value={matrix.title} onChange={(title) => update({ title })} required />
          <Field label="Category" value={matrix.category} onChange={(category) => update({ category })} />
          <div className="lg:col-span-2">
            <Field label="Description" as="textarea" value={matrix.description} onChange={(description) => update({ description })} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-950">Criteria</h3>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={addCriterion}>
            <Plus size={16} /> Add criterion
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {matrix.criteria.map((criterion) => (
            <div key={criterion.id} className="grid gap-3 rounded-2xl bg-slate-50 p-3 lg:grid-cols-[1fr_120px_1.4fr_auto]">
              <Field label="Name" value={criterion.name} onChange={(name) => update({ criteria: matrix.criteria.map((item) => item.id === criterion.id ? { ...item, name } : item) })} />
              <Field label="Weight" type="number" value={criterion.weight} onChange={(weight) => update({ criteria: matrix.criteria.map((item) => item.id === criterion.id ? { ...item, weight: Number(weight) || 0 } : item) })} />
              <Field label="Description" value={criterion.description} onChange={(description) => update({ criteria: matrix.criteria.map((item) => item.id === criterion.id ? { ...item, description } : item) })} />
              <button className="mt-5 rounded-2xl p-2 text-rose-500 hover:bg-rose-50" onClick={() => removeCriterion(criterion.id)} aria-label="Remove criterion"><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-950">Options and Scores</h3>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={addOption}>
            <Plus size={16} /> Add option
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Option</th>
                <th className="px-3 py-2">Notes</th>
                {matrix.criteria.map((criterion) => <th key={criterion.id} className="px-3 py-2">{criterion.name}</th>)}
                <th className="px-3 py-2">Weighted Total /100</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {matrix.options.map((option) => (
                <tr key={option.id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3"><input className="w-44 rounded-xl border border-slate-200 px-2 py-1" value={option.name} onChange={(event) => update({ options: matrix.options.map((item) => item.id === option.id ? { ...item, name: event.target.value } : item) })} /></td>
                  <td className="px-3 py-3"><input className="w-56 rounded-xl border border-slate-200 px-2 py-1" value={option.notes} onChange={(event) => update({ options: matrix.options.map((item) => item.id === option.id ? { ...item, notes: event.target.value } : item) })} /></td>
                  {matrix.criteria.map((criterion) => (
                    <td key={criterion.id} className="px-3 py-3">
                      <input
                        className="w-16 rounded-xl border border-slate-200 px-2 py-1"
                        type="number"
                        min={1}
                        max={5}
                        value={option.scores[criterion.id] ?? 3}
                        onChange={(event) => update({ options: matrix.options.map((item) => item.id === option.id ? { ...item, scores: { ...item.scores, [criterion.id]: clampScore(Number(event.target.value)) } } : item) })}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 text-base font-bold text-slate-950">{(calculateOptionTotal(matrix, option) * 20).toFixed(1)}</td>
                  <td className="px-3 py-3">
                    <button className="rounded-2xl p-2 text-rose-500 hover:bg-rose-50" onClick={() => update({ options: matrix.options.filter((item) => item.id !== option.id) })} aria-label="Remove option"><Trash2 size={17} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
