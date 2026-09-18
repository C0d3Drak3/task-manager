import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tasks = [
  {
    key: "release",
    title: "Prepare product release",
    description: "Coordinate the next product release.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    effort: 4,
    position: 0,
    parentKey: null,
  },
  {
    key: "qa",
    title: "Complete QA pass",
    description: "Verify the release candidate across supported browsers.",
    status: "TODO",
    priority: "URGENT",
    effort: 3,
    position: 0,
    parentKey: "release",
  },
  {
    key: "regression",
    title: "Run regression checks",
    description: "Run the critical regression suite.",
    status: "TODO",
    priority: "HIGH",
    effort: 2,
    position: 0,
    parentKey: "qa",
  },
  {
    key: "notes",
    title: "Write release notes",
    description: "Summarize the user-facing changes.",
    status: "DONE",
    priority: "MEDIUM",
    effort: 1,
    position: 1,
    parentKey: "release",
  },
  {
    key: "research",
    title: "Explore team reporting",
    description: "Capture ideas for a future reporting view.",
    status: "TODO",
    priority: "LOW",
    effort: 2,
    position: 1,
    parentKey: null,
  },
];

async function main() {
  const ids = new Map();

  for (const task of tasks) {
    const parentId = task.parentKey ? ids.get(task.parentKey) : null;
    const record = await prisma.task.upsert({
      where: { id: `seed-${task.key}` },
      update: {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        effort: task.effort,
        position: task.position,
        parentId,
      },
      create: {
        id: `seed-${task.key}`,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        effort: task.effort,
        position: task.position,
        parentId,
      },
    });
    ids.set(task.key, record.id);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
