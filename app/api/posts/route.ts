import type { NextRequest } from "next/server";
import { getProfilePage } from "@/lib/feed";
import { uuidPattern } from "@/lib/ids";

// Later pages of a profile's posts; the first one comes with the page.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const author = searchParams.get("author") ?? "";
  if (!uuidPattern.test(author)) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(await getProfilePage(author, searchParams.get("cursor")));
}
