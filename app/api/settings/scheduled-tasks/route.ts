import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import type { ScheduledTaskUpdatePayload } from "@/lib/scheduler/types";
import {
  getScheduledTasksSettings,
  ScheduledTaskSettingsError,
  updateScheduledTask,
} from "@/lib/server/scheduler/store";

export const runtime = "nodejs";

export const GET = withAuth(async function GET() {
  return NextResponse.json({ ok: true, settings: getScheduledTasksSettings() });
}, { admin: true });

export const PUT = withAuth(async function PUT(request: Request) {
  let body: ScheduledTaskUpdatePayload;

  try {
    body = (await request.json()) as ScheduledTaskUpdatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ ok: true, settings: updateScheduledTask(body) });
  } catch (error) {
    if (error instanceof ScheduledTaskSettingsError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.error("Could not update scheduled task settings.");
    return NextResponse.json(
      { ok: false, error: "Could not update scheduled task settings." },
      { status: 500 },
    );
  }
}, { admin: true });
