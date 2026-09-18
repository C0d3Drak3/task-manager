import { formatEffort } from "./task-ui";

const metrics = [
  { key: "notStartedEffort", label: "To do effort", accent: "border-slate-300 bg-slate-50" },
  { key: "inProgressEffort", label: "In progress effort", accent: "border-amber-200 bg-amber-50" },
  { key: "overallEffort", label: "Total estimated effort", accent: "border-sky-200 bg-sky-50" },
];

export default function WorkloadSummary({ workload }) {
  return (
    <section aria-label="Workload summary" className="grid gap-3 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.key} className={`rounded-2xl border p-4 ${metric.accent}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{formatEffort(workload?.[metric.key] ?? 0)}</p>
        </div>
      ))}
    </section>
  );
}
