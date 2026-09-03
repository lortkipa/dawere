import { headers } from "next/headers";

/**
 * The address this visitor actually arrived on — localhost while developing, the
 * real host in production. Taken from the request rather than from an env var,
 * so a URL we show an author is always one they can click.
 */
export async function siteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${host}`;
}
