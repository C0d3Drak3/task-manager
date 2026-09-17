import { describe, expect, it } from "vitest";
import {
  buildTaskTree,
  calculateWorkload,
  getNextSiblingPosition,
  reorderSiblings,
  TaskValidationError,
  validateTaskInput,
  wouldCreateCycle,
} from "./domain";

const task = (id, parentId = null, overrides = {}) => ({
  id,
  parentId,
  title: id,
  status: "TODO",
  priority: "MEDIUM",
  effort: null,
  position: 0,
  ...overrides,
});

describe("validateTaskInput", () => {
  it("accepts a valid complete task", () => {
    expect(validateTaskInput({ title: "Ship feature", effort: 2.5 })).toMatchObject({ title: "Ship feature" });
  });

  it("rejects invalid required and numeric fields", () => {
    expect(() => validateTaskInput({ title: "", effort: -1 })).toThrow(TaskValidationError);
    try {
      validateTaskInput({ title: "", effort: -1 });
    } catch (error) {
      expect(error.issues).toEqual({
        title: "Title is required",
        effort: "Effort must be a non-negative number or null",
      });
    }
  });

  it("allows partial updates without requiring a title", () => {
    expect(validateTaskInput({ status: "DONE" }, { partial: true })).toEqual({ status: "DONE" });
  });
});

describe("task hierarchy", () => {
  it("builds unlimited-depth trees and aggregates effort", () => {
    const tree = buildTaskTree([
      task("root", null, { effort: 1, position: 0 }),
      task("child", "root", { effort: 2, position: 0 }),
      task("grandchild", "child", { effort: 3, position: 0 }),
    ]);

    expect(tree[0].aggregateEffort).toBe(6);
    expect(tree[0].children[0].aggregateEffort).toBe(5);
    expect(tree[0].children[0].children[0].id).toBe("grandchild");
  });

  it("rejects a cyclic flat hierarchy", () => {
    expect(() => buildTaskTree([
      task("a", "b"),
      task("b", "a"),
    ])).toThrow("Task hierarchy contains a cycle");
  });

  it("orders roots and children by position", () => {
    const tree = buildTaskTree([
      task("second", null, { position: 1 }),
      task("first", null, { position: 0 }),
      task("child", "first", { position: 0 }),
    ]);
    expect(tree.map((node) => node.id)).toEqual(["first", "second"]);
    expect(tree[0].children.map((node) => node.id)).toEqual(["child"]);
  });
});

describe("workload calculations", () => {
  it("sums node-local effort exactly once by status", () => {
    const tree = buildTaskTree([
      task("root", null, { effort: 4, status: "IN_PROGRESS" }),
      task("todo", "root", { effort: 2, status: "TODO" }),
      task("done", "root", { effort: 3, status: "DONE" }),
    ]);

    expect(calculateWorkload(tree)).toMatchObject({
      totalTasks: 3,
      notStartedEffort: 2,
      inProgressEffort: 4,
      completedEffort: 3,
      overallEffort: 9,
    });
  });
});

describe("cycles and sibling ordering", () => {
  const tasks = [task("a"), task("b", "a"), task("c", "b")];

  it("detects self and descendant cycles", () => {
    expect(wouldCreateCycle(tasks, "a", "a")).toBe(true);
    expect(wouldCreateCycle(tasks, "a", "c")).toBe(true);
    expect(wouldCreateCycle(tasks, "c", "a")).toBe(false);
  });

  it("computes the next sibling position", () => {
    expect(getNextSiblingPosition([...tasks, task("d", "a", { position: 4 })], "a")).toBe(5);
    expect(getNextSiblingPosition(tasks, null)).toBe(1);
  });

  it("reparents and normalizes sibling positions", () => {
    const moved = reorderSiblings([
      task("a", null, { position: 0 }),
      task("b", null, { position: 1 }),
      task("c", "a", { position: 0 }),
    ], { taskId: "b", parentId: "a", position: 0 });

    expect(moved.filter((item) => item.parentId === "a").map((item) => [item.id, item.position]))
      .toEqual([["b", 0], ["c", 1]]);
    expect(() => reorderSiblings(tasks, { taskId: "a", parentId: "c" })).toThrow(TaskValidationError);
  });
});
