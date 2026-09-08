import { NextResponse } from "next/server";
import { readAuthBody, withAuth } from "@/lib/server/auth/http";
import { consumeLimit } from "@/lib/server/auth/rate-limit";
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
} from "@/lib/server/auth/user-management";
export const GET = withAuth(
  async () => NextResponse.json({ ok: true, users: listUsers() }),
  { admin: true },
);
export const POST = withAuth(
  async (request, user) => {
    consumeLimit(`manage-users:${user.id}`, 30, 5 * 60_000);
    return NextResponse.json({
      ok: true,
      users: await createUser(await readAuthBody(request)),
    });
  },
  { admin: true },
);
export const DELETE = withAuth(
  async (request, user) => {
    return NextResponse.json({
      ok: true,
      users: deleteUser((await readAuthBody(request)).id, user.id),
    });
  },
  { admin: true },
);
export const PATCH = withAuth(
  async (request, user) => {
    consumeLimit(`manage-users:${user.id}`, 30, 5 * 60_000);
    return NextResponse.json({
      ok: true,
      ...(await resetUserPassword((await readAuthBody(request)).id, user.id)),
    });
  },
  { admin: true },
);
