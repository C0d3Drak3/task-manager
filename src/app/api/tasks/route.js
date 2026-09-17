import { jsonError, readJson } from "@/lib/api-errors";
import { createTask, listTasks } from "@/lib/tasks/service";

export async function GET() {
  try {
    return Response.json(await listTasks());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  const parsed = await readJson(request);
  if (parsed.error) return jsonError(parsed.error);

  try {
    const task = await createTask(parsed.body);
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}