import { NextResponse } from "next/server";

import type { ArtworkProviderPayload } from "@/lib/providers/types";
import {
  addFanart,
  ArtworkProviderSettingsError,
  getArtworkSettings,
  removeFanart,
  resetCoverArtArchive,
  updateCoverArtArchive,
  updateFanart,
} from "@/lib/server/providers/artwork-settings";

export const runtime = "nodejs";

async function readBody(request: Request) {
  try {
    return (await request.json()) as ArtworkProviderPayload;
  } catch {
    throw new ArtworkProviderSettingsError("Invalid request body.");
  }
}

function handleError(error: unknown) {
  if (error instanceof ArtworkProviderSettingsError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  console.error("Artwork provider settings operation failed.");
  return NextResponse.json(
    { ok: false, error: "Could not update artwork provider settings." },
    { status: 500 },
  );
}

export async function GET() {
  return NextResponse.json({ ok: true, settings: getArtworkSettings() });
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);

    if (body.key !== "fanart") {
      throw new ArtworkProviderSettingsError("Only Fanart.tv can be added.");
    }

    return NextResponse.json({ ok: true, settings: addFanart(body) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readBody(request);
    let settings;

    if (body.key === "cover-art-archive") {
      settings = updateCoverArtArchive(body);
    } else if (body.key === "fanart") {
      settings = updateFanart(body);
    } else {
      throw new ArtworkProviderSettingsError("Choose a valid artwork provider.");
    }

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    let key: unknown;

    try {
      key = ((await request.json()) as { key?: unknown }).key;
    } catch {
      throw new ArtworkProviderSettingsError("Invalid request body.");
    }

    if (key === "cover-art-archive") {
      return NextResponse.json({ ok: true, settings: resetCoverArtArchive() });
    }

    if (key === "fanart") {
      return NextResponse.json({ ok: true, settings: removeFanart() });
    }

    throw new ArtworkProviderSettingsError("Choose a valid artwork provider.");
  } catch (error) {
    return handleError(error);
  }
}
