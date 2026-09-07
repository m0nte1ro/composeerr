import { redirect } from "next/navigation";
import { currentUser } from "./sessions";

export async function requirePageUser(options: { admin?: boolean; allowPasswordChange?: boolean } = {}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !options.allowPasswordChange) redirect("/settings/general");
  if (options.admin && user.role !== "admin") redirect("/settings/general");
  return user;
}
