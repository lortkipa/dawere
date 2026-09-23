import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { quickSearch } from '@/lib/search';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  const user = await getCurrentUser();
  const results = await quickSearch(user?.id ?? null, query.slice(0, 120));

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
