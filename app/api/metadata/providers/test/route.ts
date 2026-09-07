import { NextResponse } from "next/server";

import type { MetadataProviderPayload } from "@/lib/providers/types";
import { ProviderConnectionError } from "@/lib/server/providers/http";
import {
  MetadataProviderSettingsError,
  testMetadataProviderPayload,
} from "@/lib/server/providers/metadata-settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: MetadataProviderPayload;

  try {
    body = (await request.json()) as MetadataProviderPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    await testMetadataProviderPayload(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof MetadataProviderSettingsError ||
      error instanceof ProviderConnectionError
    ) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error instanceof ProviderConnectionError ? 502 : 400 },
      );
    }

    console.error("Unexpected metadata provider connection test error.");
    return NextResponse.json(
      { ok: false, error: "Metadata provider connection test failed." },
      { status: 500 },
    );
  }
}
