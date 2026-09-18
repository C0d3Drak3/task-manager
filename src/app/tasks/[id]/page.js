import TaskDetailClient from "@/components/task-detail-client";

export default async function TaskPage({ params }) {
  const { id } = await params;
  return <main className="shell"><TaskDetailClient taskId={id} /></main>;
}