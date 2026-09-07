import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import type { ScheduledTaskKey } from "@/lib/scheduler/types";
import {
  runScheduledTask,
  ScheduledTaskRunningError,
  ScheduledTaskUnavailableError,
} from "@/lib/server/scheduler/runner";
import { getScheduledTasksSettings } from "@/lib/server/scheduler/store";

export const runtime = "nodejs";

export const POST = withAuth(async function POST(request: Request) {
  let key: ScheduledTaskKey;

  try {
    const body = (await request.json()) as { key?: ScheduledTaskKey };
    key = body.key as ScheduledTaskKey;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const result = await runScheduledTask(key);
    return NextResponse.json({
      ok: result.status !== "error",
      result,
      settings: getScheduledTasksSettings(),
    }, { status: result.status === "error" ? 502 : 200 });
  } catch (error) {
    if (error instanceof ScheduledTaskRunningError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }

    if (error instanceof ScheduledTaskUnavailableError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.error("Could not run scheduled task.");
    return NextResponse.json(
      { ok: false, error: "Could not run scheduled task." },
      { status: 500 },
    );
  }
}, { admin: true });
