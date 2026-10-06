import type { NextRequest } from "next/server";
import { getSuggestions } from "@/lib/search";

// The header search box's dropdown, for readers and visitors alike.
export async function GET(request: NextRequest) {
  return Response.json(await getSuggestions(request.nextUrl.searchParams.get("q") ?? ""));
}
