"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TaskForm from "./task-form";
import TaskTree from "./task-tree";
import WorkloadSummary from "./workload-summary";
import { ErrorMessage, LoadingState } from "./task-ui";

function filterTree(tasks, status, priority) {
  return tasks
    .map((task) => ({ ...task, children: filterTree(task.children ?? [], status, priority) }))
    .filter((task) => {
      const matchesStatus = !status || task.status === status;
      const matchesPriority = !priority || task.priority === priority;
      return (matchesStatus && matchesPriority) || task.children.length > 0;
    });
}

export default function DashboardClient() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message ?? "Unable to load tasks");
      setData(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const request = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/tasks", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message ?? "Unable to load tasks");
        setData(payload);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };
    void request();
  }, []);

  const filteredTasks = useMemo(() => filterTree(data?.tasks ?? [], status, priority), [data, status, priority]);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Team workload</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Tasks, in focus.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">A clear view of what the team is carrying, from top-level work down to the smallest subtask.</p>
        </div>
        <button type="button" onClick={() => setShowCreate((current) => !current)} className="button-primary self-start sm:self-auto">{showCreate ? "Close form" : "+ New task"}</button>
      </header>

      {showCreate && (
        <section className="panel max-w-2xl p-5 sm:p-6">
          <h2 className="section-title">Create a task</h2>
          <p className="section-copy">Start with a top-level task. You can add subtasks from its detail page.</p>
          <div className="mt-5"><TaskForm onSaved={() => { setShowCreate(false); loadTasks(); }} /></div>
        </section>
      )}

      {error && <ErrorMessage message={error} />}
      <WorkloadSummary workload={data?.workload} />

      <section className="panel">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Task hierarchy</h2>
            <p className="section-copy">Aggregate effort includes each task and all of its descendants.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="field text-sm">
              <option value="">All statuses</option>
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
            </select>
            <select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="field text-sm">
              <option value="">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
        <TaskTree tasks={filteredTasks} emptyMessage={data?.tasks?.length ? "No tasks match these filters." : "No tasks yet. Create your first task to get started."} />
      </section>

      {data?.tasks?.length > 0 && <p className="text-center text-xs text-slate-400">Select a task title to open its detail view.</p>}
      <Link href="/" className="sr-only">Back to dashboard</Link>
    </div>
  );
}
