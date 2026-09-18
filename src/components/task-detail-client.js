"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TaskForm from "./task-form";
import TaskTree from "./task-tree";
import { ErrorMessage, formatDate, formatEffort, PriorityBadge, StatusBadge, LoadingState } from "./task-ui";

async function fetchTask(id) {
  const response = await fetch(`/api/tasks/${id}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message ?? "Unable to load this task");
  return payload.task;
}

export default function TaskDetailClient({ taskId }) {
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadTask() {
    setLoading(true);
    setError("");
    try {
      setTask(await fetchTask(taskId));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTask(); }, [taskId]);

  async function deleteCurrentTask() {
    if (!window.confirm("Delete this task and all of its subtasks? This cannot be undone.")) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message ?? "Unable to delete this task");
      window.location.assign("/");
    } catch (requestError) {
      setError(requestError.message);
      setDeleting(false);
    }
  }

  if (loading && !task) return <LoadingState label="Loading task..." />;
  if (error && !task) return <div className="space-y-4"><Link href="/" className="back-link">← Back to dashboard</Link><ErrorMessage message={error} /></div>;
  if (!task) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="back-link">← Back to dashboard</Link>
        <button type="button" onClick={deleteCurrentTask} disabled={deleting} className="button-danger">{deleting ? "Deleting..." : "Delete task"}</button>
      </div>
      {error && <ErrorMessage message={error} />}

      <header className="border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{task.title}</h1>
        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description || "No description provided."}</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          <span>Own effort: <strong className="text-slate-800">{formatEffort(task.effort)}</strong></span>
          <span>Aggregate effort: <strong className="text-slate-950">{formatEffort(task.aggregateEffort)}</strong></span>
          <span>Updated {formatDate(task.updatedAt)}</span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="panel order-2 lg:order-1">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title">Subtasks</h2>
              <p className="section-copy">{task.children?.length ? "Work nested under this task." : "No subtasks yet."}</p>
            </div>
            <button type="button" onClick={() => setAddingSubtask((current) => !current)} className="button-secondary">{addingSubtask ? "Close form" : "+ Add subtask"}</button>
          </div>
          {addingSubtask && <div className="border-b border-slate-100 bg-slate-50/70 p-5"><TaskForm parentId={task.id} submitLabel="Create subtask" onSaved={() => { setAddingSubtask(false); loadTask(); }} /></div>}
          <TaskTree tasks={task.children} emptyMessage="This task has no subtasks." />
        </section>

        <aside className="panel order-1 p-5 lg:order-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Task details</h2>
              <p className="section-copy">Update the fields managed by the task API.</p>
            </div>
            <button type="button" onClick={() => setEditing((current) => !current)} className="button-secondary">{editing ? "Close" : "Edit"}</button>
          </div>
          {editing && <div className="mt-5"><TaskForm task={task} onCancel={() => setEditing(false)} onSaved={(saved) => { setTask(saved); setEditing(false); }} /></div>}
          {!editing && <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="text-slate-500">Status</dt><dd className="mt-1"><StatusBadge status={task.status} /></dd></div>
            <div><dt className="text-slate-500">Priority</dt><dd className="mt-1"><PriorityBadge priority={task.priority} /></dd></div>
            <div><dt className="text-slate-500">Task ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{task.id}</dd></div>
          </dl>}
        </aside>
      </div>
    </div>
  );
}
