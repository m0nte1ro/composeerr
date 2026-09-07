import { requirePageUser } from "@/lib/server/auth/pages";
import { HomePageClient } from "@/components/home/HomePageClient";

export default async function HomePage() {
  const user = await requirePageUser();
  return <HomePageClient user={user} />;
}