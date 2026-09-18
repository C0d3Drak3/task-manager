import { prisma } from "../prisma";
import {
  buildTaskTree,
  calculateWorkload,
  getNextSiblingPosition,
  reorderSiblings,
  TaskValidationError,
  validateTaskInput,
  wouldCreateCycle,
} from "./domain";

export class TaskNotFoundError extends Error {
  constructor(taskId) {
    super(`Task not found: ${taskId}`);
    this.name = "TaskNotFoundError";
    this.taskId = taskId;
  }
}

export class ParentTaskNotFoundError extends Error {
  constructor(parentId) {
    super(`Parent task not found: ${parentId}`);
    this.name = "ParentTaskNotFoundError";
    this.parentId = parentId;
  }
}

export class TaskCycleError extends Error {
  constructor() {
    super("A task cannot be moved below itself or one of its descendants");
    this.name = "TaskCycleError";
  }
}

const taskFields = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  effort: true,
  parentId: true,
  position: true,
  createdAt: true,
  updatedAt: true,
};

function taskInputData(input) {
  const data = {};
  for (const field of ["title", "description", "status", "priority", "effort"]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      data[field] = field === "title" ? input[field].trim() : input[field];
    }
  }
  return data;
}

async function getAllTasks(db) {
  return db.task.findMany({
    select: taskFields,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

function findTask(tasks, taskId) {
  return tasks.find((task) => task.id === taskId);
}

function findSubtree(tasks, taskId) {
  const byParent = new Map();
  for (const task of tasks) {
    const parentId = task.parentId ?? null;
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(task);
  }

  const subtree = [];
  const pending = [taskId];
  const visited = new Set();
  while (pending.length > 0) {
    const currentId = pending.pop();
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const children = byParent.get(currentId) ?? [];
    subtree.push(...children);
    pending.push(...children.map((child) => child.id));
  }
  return subtree;
}

function treeForTask(tasks, taskId) {
  const task = findTask(tasks, taskId);
  if (!task) throw new TaskNotFoundError(taskId);
  const descendants = findSubtree(tasks, taskId);
  const tree = buildTaskTree([{ ...task, parentId: null }, ...descendants]);
  tree[0].parentId = task.parentId;
  return tree[0];
}

export async function listTasks(db = prisma) {
  const tasks = await getAllTasks(db);
  const tree = buildTaskTree(tasks);
  return {
    tasks: tree,
    workload: calculateWorkload(tree),
  };
}

export async function getTask(taskId, db = prisma) {
  const tasks = await getAllTasks(db);
  return treeForTask(tasks, taskId);
}

export async function createTask(input, db = prisma) {
  validateTaskInput(input);
  const tasks = await getAllTasks(db);
  const parentId = input.parentId ?? null;

  if (parentId !== null && !findTask(tasks, parentId)) {
    throw new ParentTaskNotFoundError(parentId);
  }

  const position = input.position ?? getNextSiblingPosition(tasks, parentId);
  const created = await db.task.create({
    data: {
      ...taskInputData(input),
      parentId,
      position,
    },
    select: taskFields,
  });
  return getTask(created.id, db);
}

export async function updateTask(taskId, input, db = prisma) {
  validateTaskInput(input, { partial: true });
  const tasks = await getAllTasks(db);
  const current = findTask(tasks, taskId);
  if (!current) throw new TaskNotFoundError(taskId);

  const hasParentChange = Object.prototype.hasOwnProperty.call(input, "parentId");
  const hasPositionChange = Object.prototype.hasOwnProperty.call(input, "position");
  const parentId = hasParentChange ? input.parentId : current.parentId;

  if (parentId !== null && !findTask(tasks, parentId)) {
    throw new ParentTaskNotFoundError(parentId);
  }
  if (wouldCreateCycle(tasks, taskId, parentId)) {
    throw new TaskCycleError();
  }

  const needsReorder = hasParentChange || hasPositionChange;
  const desiredPosition = input.position ?? current.position;
  const reordered = needsReorder
    ? reorderSiblings(tasks, { taskId, parentId, position: desiredPosition })
    : tasks;
  const nextTask = reordered.find((task) => task.id === taskId);
  const data = {
    ...taskInputData(input),
    ...(needsReorder ? { parentId: nextTask.parentId, position: nextTask.position } : {}),
  };

  await db.$transaction(async (transaction) => {
    if (needsReorder) {
      const changedSiblings = reordered.filter((task) => {
        const previous = findTask(tasks, task.id);
        return previous.parentId !== task.parentId || previous.position !== task.position;
      });
      for (const sibling of changedSiblings) {
        if (sibling.id !== taskId) {
          await transaction.task.update({
            where: { id: sibling.id },
            data: { parentId: sibling.parentId, position: sibling.position },
          });
        }
      }
    }
    await transaction.task.update({ where: { id: taskId }, data });
  });

  return getTask(taskId, db);
}

export async function deleteTask(taskId, db = prisma) {
  const exists = await db.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!exists) throw new TaskNotFoundError(taskId);
  await db.$transaction(async (transaction) => {
    await transaction.task.delete({ where: { id: taskId } });
  });
  return { id: taskId };
}

export { findSubtree };
