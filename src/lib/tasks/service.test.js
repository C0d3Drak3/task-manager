import { describe, expect, it, vi } from "vitest";
import { createTask, getTask } from "./service";

const task = (id, parentId = null, overrides = {}) => ({
  id,
  title: id,
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  effort: null,
  parentId,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

describe("task retrieval service", () => {
  it("retrieves a subtask with descendants while preserving its parentId", async () => {
    const db = {
      task: {
        findMany: vi.fn().mockResolvedValue([
          task("parent"),
          task("child", "parent", { effort: 2 }),
          task("grandchild", "child", { effort: 3 }),
        ]),
      },
    };

    const result = await getTask("child", db);

    expect(result.id).toBe("child");
    expect(result.parentId).toBe("parent");
    expect(result.aggregateEffort).toBe(5);
    expect(result.children.map((item) => item.id)).toEqual(["grandchild"]);
  });
});

describe("task creation service", () => {
  it("returns a created subtask instead of failing during response shaping", async () => {
    const parent = task("parent");
    const created = task("child", "parent", { title: "Child", effort: 1 });
    const db = {
      task: {
        findMany: vi.fn()
          .mockResolvedValueOnce([parent])
          .mockResolvedValueOnce([parent, created]),
        create: vi.fn().mockResolvedValue(created),
      },
    };

    const result = await createTask({ title: "Child", parentId: "parent", effort: 1 }, db);

    expect(result.id).toBe("child");
    expect(result.parentId).toBe("parent");
    expect(result.aggregateEffort).toBe(1);
    expect(db.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ parentId: "parent", effort: 1 }),
    }));
  });
});
