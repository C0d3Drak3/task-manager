import { jsonError, readJson } from "@/lib/api-errors";
import { deleteTask, getTask, updateTask } from "@/lib/tasks/service";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    return Response.json({ task: await getTask(id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request, { params }) {
  const parsed = await readJson(request);
  if (parsed.error) return jsonError(parsed.error);

  try {
    const { id } = await params;
    return Response.json({ task: await updateTask(id, parsed.body) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    return Response.json({ task: await deleteTask(id) });
  } catch (error) {
    return jsonError(error);
  }
}