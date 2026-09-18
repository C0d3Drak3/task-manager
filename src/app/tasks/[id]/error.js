"use client";

export default function Error({ reset }) {
  return (
    <main className="shell">
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <h1 className="font-semibold">Something went wrong</h1>
        <p className="mt-1 text-sm">The task could not be displayed.</p>
        <button type="button" onClick={() => reset()} className="button-secondary mt-4">Try again</button>
      </div>
    </main>
  );
}