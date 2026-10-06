import { unreadNotificationCount } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/session";

// The number on the header's bell.
export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ count: user?.onboardedAt ? await unreadNotificationCount(user.id) : 0 });
}
