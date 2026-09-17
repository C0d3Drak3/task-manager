import {
  ParentTaskNotFoundError,
  TaskCycleError,
  TaskNotFoundError,
} from "./tasks/service";
import { TaskValidationError } from "./tasks/domain";

export function jsonError(error) {
  if (error instanceof TaskValidationError) {
    return Response.json({
      error: {
        code: "VALIDATION_ERROR",
        message: error.message,
        issues: error.issues,
      },
    }, { status: 400 });
  }

  if (error instanceof TaskCycleError) {
    return Response.json({
      error: { code: "TASK_CYCLE", message: error.message },
    }, { status: 400 });
  }

  if (error instanceof ParentTaskNotFoundError) {
    return Response.json({
      error: { code: "PARENT_NOT_FOUND", message: error.message },
    }, { status: 404 });
  }

  if (error instanceof TaskNotFoundError) {
    return Response.json({
      error: { code: "TASK_NOT_FOUND", message: error.message },
    }, { status: 404 });
  }

  if (error?.code === "P2002") {
    return Response.json({
      error: { code: "CONFLICT", message: "The task conflicts with an existing record" },
    }, { status: 409 });
  }

  console.error(error);
  return Response.json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  }, { status: 500 });
}

export async function readJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: new TaskValidationError({ body: "Request body must be a JSON object" }) };
    }
    return { body };
  } catch {
    return { error: new TaskValidationError({ body: "Request body must contain valid JSON" }) };
  }
}