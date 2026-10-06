import type { NextRequest } from "next/server";
import { buildDataExport } from "@/lib/data-export";
import { getCurrentUser } from "@/lib/session";

// The "download your data" file from settings, built fresh on every request.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const data = await buildDataExport(user, `${proto}://${host}`);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dawere-${user.handle}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
