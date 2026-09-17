export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export class TaskValidationError extends Error {
  constructor(issues) {
    super("Task validation failed");
    this.name = "TaskValidationError";
    this.issues = issues;
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isValidEnum(value, values) {
  return typeof value === "string" && values.includes(value);
}

export function validateTaskInput(input, { partial = false } = {}) {
  const issues = {};
  const value = input && typeof input === "object" ? input : {};

  if (!partial || hasOwn(value, "title")) {
    if (typeof value.title !== "string" || value.title.trim().length === 0) {
      issues.title = "Title is required";
    } else if (value.title.trim().length > 200) {
      issues.title = "Title must be 200 characters or fewer";
    }
  }

  if (hasOwn(value, "description") && typeof value.description !== "string") {
    issues.description = "Description must be a string";
  }

  if (hasOwn(value, "status") && !isValidEnum(value.status, TASK_STATUSES)) {
    issues.status = `Status must be one of: ${TASK_STATUSES.join(", ")}`;
  }

  if (hasOwn(value, "priority") && !isValidEnum(value.priority, TASK_PRIORITIES)) {
    issues.priority = `Priority must be one of: ${TASK_PRIORITIES.join(", ")}`;
  }

  if (hasOwn(value, "effort") && value.effort !== null) {
    if (typeof value.effort !== "number" || !Number.isFinite(value.effort) || value.effort < 0) {
      issues.effort = "Effort must be a non-negative number or null";
    }
  }

  if (hasOwn(value, "parentId") && value.parentId !== null && typeof value.parentId !== "string") {
    issues.parentId = "Parent ID must be a string or null";
  }

  if (hasOwn(value, "position") && (!Number.isInteger(value.position) || value.position < 0)) {
    issues.position = "Position must be a non-negative integer";
  }

  if (Object.keys(issues).length > 0) {
    throw new TaskValidationError(issues);
  }

  return value;
}

function compareTasks(left, right) {
  return (left.position ?? 0) - (right.position ?? 0)
    || new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime()
    || String(left.id).localeCompare(String(right.id));
}

function effortValue(effort) {
  return effort === null || effort === undefined ? 0 : effort;
}

export function buildTaskTree(tasks) {
  const nodes = new Map();

  for (const task of tasks) {
    if (nodes.has(task.id)) {
      throw new Error(`Duplicate task ID: ${task.id}`);
    }
    nodes.set(task.id, { ...task, children: [], aggregateEffort: 0 });
  }

  for (const node of nodes.values()) {
    if (node.parentId !== null && node.parentId !== undefined) {
      const parent = nodes.get(node.parentId);
      if (!parent) {
        throw new Error(`Parent task not found: ${node.parentId}`);
      }
      parent.children.push(node);
    }
  }

  const roots = [...nodes.values()].filter((node) => node.parentId === null || node.parentId === undefined);
  const visiting = new Set();

  function calculate(node) {
    if (visiting.has(node.id)) {
      throw new Error("Task hierarchy contains a cycle");
    }
    visiting.add(node.id);
    node.children.sort(compareTasks);
    node.aggregateEffort = effortValue(node.effort)
      + node.children.reduce((total, child) => total + calculate(child), 0);
    visiting.delete(node.id);
    return node.aggregateEffort;
  }

  roots.sort(compareTasks);
  for (const node of nodes.values()) {
    if (!node.parentId) {
      calculate(node);
    }
  }

  for (const node of nodes.values()) {
    if (!node.aggregateEffort && effortValue(node.effort) === 0 && node.children.length > 0) {
      calculate(node);
    }
  }

  return roots;
}

export function flattenTaskTree(tree) {
  const tasks = [];
  function visit(nodes) {
    for (const node of nodes) {
      tasks.push(node);
      visit(node.children ?? []);
    }
  }
  visit(tree);
  return tasks;
}

export function calculateWorkload(tasksOrTree) {
  const tasks = Array.isArray(tasksOrTree) && tasksOrTree.some((task) => Array.isArray(task.children))
    ? flattenTaskTree(tasksOrTree)
    : tasksOrTree;
  const workload = {
    totalTasks: tasks.length,
    notStartedTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    notStartedEffort: 0,
    inProgressEffort: 0,
    completedEffort: 0,
    overallEffort: 0,
  };

  for (const task of tasks) {
    const effort = effortValue(task.effort);
    workload.overallEffort += effort;
    if (task.status === "TODO") {
      workload.notStartedTasks += 1;
      workload.notStartedEffort += effort;
    } else if (task.status === "IN_PROGRESS") {
      workload.inProgressTasks += 1;
      workload.inProgressEffort += effort;
    } else if (task.status === "DONE") {
      workload.completedTasks += 1;
      workload.completedEffort += effort;
    }
  }

  return workload;
}

export function wouldCreateCycle(tasks, taskId, proposedParentId) {
  if (proposedParentId === null || proposedParentId === undefined) {
    return false;
  }
  if (taskId === proposedParentId) {
    return true;
  }

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visited = new Set();
  let currentId = proposedParentId;
  while (currentId !== null && currentId !== undefined) {
    if (currentId === taskId) {
      return true;
    }
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);
    currentId = byId.get(currentId)?.parentId ?? null;
  }
  return false;
}

export function getNextSiblingPosition(tasks, parentId, excludedTaskId = null) {
  const siblingPositions = tasks
    .filter((task) => task.id !== excludedTaskId && (task.parentId ?? null) === (parentId ?? null))
    .map((task) => task.position ?? 0);
  return siblingPositions.length === 0 ? 0 : Math.max(...siblingPositions) + 1;
}

export function reorderSiblings(tasks, { taskId, parentId = null, position = 0 }) {
  const target = tasks.find((task) => task.id === taskId);
  if (!target) {
    throw new Error(`Task not found: ${taskId}`);
  }
  if (wouldCreateCycle(tasks, taskId, parentId)) {
    throw new TaskValidationError({ parentId: "A task cannot be moved below itself or one of its descendants" });
  }

  const updated = tasks.map((task) => task.id === taskId ? { ...task, parentId, position } : { ...task });
  const groups = new Map();
  for (const task of updated) {
    const key = task.parentId ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }

  for (const siblings of groups.values()) {
    siblings.sort(compareTasks);
    siblings.forEach((task, index) => {
      task.position = index;
    });
  }

  return updated;
}
