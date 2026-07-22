import { v4 as uuidv4 } from "uuid";
import type { GenerateTask, TaskResult, TaskStatus } from "../types";

type TaskStoreGlobal = typeof globalThis & {
  __dramaEditorTaskStore?: Map<string, GenerateTask>;
};

const taskGlobal = globalThis as TaskStoreGlobal;
if (!taskGlobal.__dramaEditorTaskStore) {
  taskGlobal.__dramaEditorTaskStore = new Map<string, GenerateTask>();
}
const tasks = taskGlobal.__dramaEditorTaskStore;

export function createTask(
  input: Omit<GenerateTask, "id" | "status" | "createdAt" | "updatedAt"> & { status?: TaskStatus },
): GenerateTask {
  const now = new Date().toISOString();
  const task: GenerateTask = {
    id: uuidv4(),
    status: input.status ?? "queued",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  tasks.set(task.id, task);
  return task;
}

export function getTask(taskId: string): GenerateTask | undefined {
  return tasks.get(taskId);
}

export function updateTask(taskId: string, patch: Partial<GenerateTask>): GenerateTask | undefined {
  const current = tasks.get(taskId);
  if (!current) return undefined;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  tasks.set(taskId, next);
  return next;
}

export function taskToResult(task: GenerateTask | undefined): TaskResult {
  if (!task) {
    return { status: "failed", error: "任务不存在" };
  }
  return {
    status: task.status,
    progress: task.progress,
    resultUrl: task.resultUrl,
    error: task.error,
  };
}

export function listTasksByNode(nodeId: string): GenerateTask[] {
  return [...tasks.values()].filter((task) => task.nodeId === nodeId);
}
