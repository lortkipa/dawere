import type { Metadata } from 'next';
import Link from 'next/link';
import { signInAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth-form';
import { SUPPORT_EMAIL, supportMailto } from '@/lib/site';
import { safeNext } from '@/lib/utils';

export const metadata: Metadata = { title: 'შესვლა' };

export default async function LoginPage(props: PageProps<'/login'>) {
  const { next } = await props.searchParams;
  const destination = safeNext(next, '');

  return (
    <>
      <h1 className="text-2xl leading-tight font-semibold tracking-tight">კეთილი იყოს შენი დაბრუნება</h1>
      <p className="mt-1.5 mb-7 text-[15px] text-muted">შედი და განაგრძე კითხვა იქიდან, სადაც გაჩერდი.</p>

      <AuthForm
        mode="signin"
        action={signInAction}
        next={destination || undefined}
        forgotHref={SUPPORT_EMAIL ? supportMailto('პაროლის აღდგენა') : undefined}
      />

      <p className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">
        ანგარიში არ გაქვს?{' '}
        <Link href="/signup" className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          შექმენი უფასოდ
        </Link>
      </p>
    </>
  );
}
