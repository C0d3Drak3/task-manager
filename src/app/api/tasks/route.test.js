import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskValidationError } from "@/lib/tasks/domain";
import { ParentTaskNotFoundError } from "@/lib/tasks/service";
import { GET, POST } from "./route";
import * as service from "@/lib/tasks/service";

vi.mock("@/lib/tasks/service", async () => {
  const actual = await vi.importActual("@/lib/tasks/service");
  return {
    ...actual,
    listTasks: vi.fn(),
    createTask: vi.fn(),
  };
});

const taskTree = {
  id: "root",
  title: "Root",
  parentId: null,
  effort: 2,
  aggregateEffort: 4,
  children: [{ id: "child", title: "Child", parentId: "root", effort: 2, aggregateEffort: 2, children: [] }],
};

describe("/api/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns recursive top-level tasks and workload", async () => {
    service.listTasks.mockResolvedValue({
      tasks: [taskTree],
      workload: { totalTasks: 2, overallEffort: 4 },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      tasks: [taskTree],
      workload: { totalTasks: 2, overallEffort: 4 },
    });
  });

  it("creates a task and returns 201", async () => {
    service.createTask.mockResolvedValue(taskTree);
    const response = await POST(new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Root", effort: 2 }),
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ task: taskTree });
    expect(service.createTask).toHaveBeenCalledWith({ title: "Root", effort: 2 });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/tasks", {
      method: "POST",
      body: "{invalid",
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(service.createTask).not.toHaveBeenCalled();
  });

  it("returns 400 for domain validation errors", async () => {
    service.createTask.mockRejectedValue(new TaskValidationError({ title: "Title is required" }));
    const response = await POST(new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "" }),
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.issues.title).toBe("Title is required");
  });

  it("returns 404 when the parent does not exist", async () => {
    service.createTask.mockRejectedValue(new ParentTaskNotFoundError("missing"));
    const response = await POST(new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Child", parentId: "missing" }),
    }));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("PARENT_NOT_FOUND");
  });
});
