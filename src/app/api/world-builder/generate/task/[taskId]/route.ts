import { NextResponse } from "next/server";
import { getTask, taskToResult } from "@/lib/providers/tasks/taskStore";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { taskId } = await params;
  const task = getTask(taskId);
  const result = taskToResult(task);
  return NextResponse.json({
    ...result,
    videoUrl: task?.kind === "video" ? result.resultUrl : undefined,
    imageUrl: task?.kind === "image" ? result.resultUrl : undefined,
    nodeId: task?.nodeId,
    targetField: task?.targetField,
    targetEntityId: task?.targetEntityId,
  });
}
