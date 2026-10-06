import type { NextRequest } from "next/server";
import { getNotificationsPage } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/session";

// Later pages of /notifications; the first one comes with the page.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.onboardedAt) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { items, next } = await getNotificationsPage(user.id, request.nextUrl.searchParams.get("cursor"));
  return Response.json({ items, next });
}
