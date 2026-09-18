"use client";

import { useState } from "react";
import { ErrorMessage } from "./task-ui";

const emptyValues = { title: "", description: "", status: "TODO", priority: "MEDIUM", effort: "" };

async function sendTaskRequest(url, method, values) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      effort: values.effort === "" ? null : Number(values.effort),
      ...(values.parentId !== undefined ? { parentId: values.parentId || null } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Unable to save task");
  }
  return payload.task;
}

export default function TaskForm({ task, parentId = null, onSaved, onCancel, submitLabel }) {
  const isEditing = Boolean(task);
  const [values, setValues] = useState(() => task ? {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    effort: task.effort ?? "",
    parentId: task.parentId ?? "",
  } : { ...emptyValues, parentId });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function change(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const saved = await sendTaskRequest(isEditing ? `/api/tasks/${task.id}` : "/api/tasks", isEditing ? "PATCH" : "POST", values);
      onSaved(saved);
      if (!isEditing) setValues({ ...emptyValues, parentId });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorMessage message={error} />}
      <label className="block text-sm font-medium text-slate-700">
        Title
        <input required maxLength={200} name="title" value={values.title} onChange={change} className="field mt-1" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Description
        <textarea name="description" value={values.description} onChange={change} rows={4} className="field mt-1 resize-y" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Status
          <select name="status" value={values.status} onChange={change} className="field mt-1">
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Priority
          <select name="priority" value={values.priority} onChange={change} className="field mt-1">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Own effort <span className="font-normal text-slate-400">(hours, optional)</span>
        <input type="number" min="0" step="0.25" name="effort" value={values.effort} onChange={change} className="field mt-1" />
      </label>
      {isEditing && (
        <label className="block text-sm font-medium text-slate-700">
          Parent task ID <span className="font-normal text-slate-400">(optional)</span>
          <input name="parentId" value={values.parentId} onChange={change} className="field mt-1" placeholder="Leave empty for a top-level task" />
        </label>
      )}
      <div className="flex flex-wrap justify-end gap-3 pt-2">
        {onCancel && <button type="button" onClick={onCancel} className="button-secondary">Cancel</button>}
        <button disabled={saving} type="submit" className="button-primary">{saving ? "Saving..." : (submitLabel ?? (isEditing ? "Save changes" : "Create task"))}</button>
      </div>
    </form>
  );
}
