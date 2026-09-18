import Link from "next/link";
import { formatEffort, PriorityBadge, StatusBadge } from "./task-ui";

function TaskNode({ task, depth = 0 }) {
  return (
    <li>
      <div className="group flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between" style={{ marginLeft: `${Math.min(depth, 5) * 1.25}rem` }}>
        <div className="min-w-0">
          <Link href={`/tasks/${task.id}`} className="font-semibold text-slate-950 underline-offset-4 hover:text-sky-700 hover:underline">
            {task.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm text-slate-500 sm:text-right">
          <span>Own: <strong className="font-semibold text-slate-700">{formatEffort(task.effort)}</strong></span>
          <span>Tree: <strong className="font-semibold text-slate-950">{formatEffort(task.aggregateEffort)}</strong></span>
        </div>
      </div>
      {task.children?.length > 0 && (
        <ul className="border-l-2 border-slate-100">
          {task.children.map((child) => <TaskNode key={child.id} task={child} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

export default function TaskTree({ tasks, emptyMessage = "No tasks yet." }) {
  if (!tasks?.length) {
    return <div className="px-4 py-10 text-center text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((task) => <TaskNode key={task.id} task={task} />)}
    </ul>
  );
}
