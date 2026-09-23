import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { MAX_UPLOAD_BYTES, storeImage } from '@/lib/storage';
import { TOO_MANY, rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'სურათის ასატვირთად საჭიროა შესვლა.' }, { status: 401 });

  if (!(await rateLimit(`upload:${user.id}`, 30, 600))) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES * 1.1) {
    return NextResponse.json({ error: 'სურათი 5 მბ-ზე მეტი არ უნდა იყოს.' }, { status: 413 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'ფაილი ვერ მივიღეთ.' }, { status: 400 });
  }

  const result = await storeImage(file, user.id);
  if ('error' in result) return NextResponse.json(result, { status: 400 });

  return NextResponse.json(result, { status: 201 });
}
