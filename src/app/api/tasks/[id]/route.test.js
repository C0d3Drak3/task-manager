import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskValidationError } from "@/lib/tasks/domain";
import { TaskCycleError, TaskNotFoundError } from "@/lib/tasks/service";
import { DELETE, GET, PATCH } from "./route";
import * as service from "@/lib/tasks/service";

vi.mock("@/lib/tasks/service", async () => {
  const actual = await vi.importActual("@/lib/tasks/service");
  return {
    ...actual,
    getTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  };
});

const task = {
  id: "root",
  title: "Root",
  parentId: null,
  effort: 1,
  aggregateEffort: 3,
  children: [{ id: "child", title: "Child", parentId: "root", effort: 2, aggregateEffort: 2, children: [] }],
};

const params = { params: Promise.resolve({ id: "root" }) };

describe("/api/tasks/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a task with all descendants", async () => {
    service.getTask.mockResolvedValue(task);
    const response = await GET(new Request("http://localhost/api/tasks/root"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ task });
  });

  it("updates fields and supports reparenting", async () => {
    service.updateTask.mockResolvedValue({ ...task, parentId: "parent", status: "IN_PROGRESS" });
    const response = await PATCH(new Request("http://localhost/api/tasks/root", {
      method: "PATCH",
      body: JSON.stringify({ parentId: "parent", status: "IN_PROGRESS" }),
    }), params);

    expect(response.status).toBe(200);
    expect(service.updateTask).toHaveBeenCalledWith("root", { parentId: "parent", status: "IN_PROGRESS" });
  });

  it("deletes a task subtree", async () => {
    service.deleteTask.mockResolvedValue({ id: "root" });
    const response = await DELETE(new Request("http://localhost/api/tasks/root", { method: "DELETE" }), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ task: { id: "root" } });
  });

  it("returns 404 for a missing task", async () => {
    service.getTask.mockRejectedValue(new TaskNotFoundError("missing"));
    const response = await GET(new Request("http://localhost/api/tasks/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("TASK_NOT_FOUND");
  });

  it("returns 400 when reparenting would create a cycle", async () => {
    service.updateTask.mockRejectedValue(new TaskCycleError());
    const response = await PATCH(new Request("http://localhost/api/tasks/root", {
      method: "PATCH",
      body: JSON.stringify({ parentId: "child" }),
    }), params);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("TASK_CYCLE");
  });

  it("returns 400 for malformed update data", async () => {
    service.updateTask.mockRejectedValue(new TaskValidationError({ status: "Invalid status" }));
    const response = await PATCH(new Request("http://localhost/api/tasks/root", {
      method: "PATCH",
      body: JSON.stringify({ status: "INVALID" }),
    }), params);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
