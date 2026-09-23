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
      <h1 className="font-serif text-[2rem] leading-tight font-bold tracking-tight">კეთილი იყოს შენი დაბრუნება</h1>
      <p className="mt-2 mb-8 text-[15px] text-muted">შედი და განაგრძე კითხვა იქიდან, სადაც გაჩერდი.</p>

      <AuthForm
        mode="signin"
        action={signInAction}
        next={destination || undefined}
        forgotHref={SUPPORT_EMAIL ? supportMailto('პაროლის აღდგენა') : undefined}
      />

      <p className="mt-8 text-sm text-muted">
        ანგარიში არ გაქვს?{' '}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          შექმენი უფასოდ
        </Link>
      </p>
    </>
  );
}
