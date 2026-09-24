import { ViewTransition } from 'react';
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
      <ViewTransition name="auth-title" share="auth-morph" default="none">
        <h1 className="headline text-[2.25rem] text-ink sm:text-[2.6rem]">კეთილი იყოს შენი დაბრუნება</h1>
      </ViewTransition>

      <div className="mt-9">
        <AuthForm
          mode="signin"
          action={signInAction}
          next={destination || undefined}
          forgotHref={SUPPORT_EMAIL ? supportMailto('პაროლის აღდგენა') : undefined}
        />
      </div>

      <ViewTransition name="auth-switch" share="auth-morph" default="none">
        <p className="mt-8 text-[15px] text-muted">
          ანგარიში არ გაქვს?{' '}
          <Link href="/signup" className="font-semibold text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
            შექმენი
          </Link>
        </p>
      </ViewTransition>
    </>
  );
}
