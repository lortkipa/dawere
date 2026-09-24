import { ViewTransition } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { signUpAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'ანგარიშის შექმნა' };

export default function SignupPage() {
  return (
    <>
      <ViewTransition name="auth-title" share="auth-morph" default="none">
        <h1 className="headline text-[2.25rem] text-ink sm:text-[2.6rem]">შექმენი ანგარიში</h1>
      </ViewTransition>

      <div className="mt-9">
        <AuthForm mode="signup" action={signUpAction} />
      </div>

      <ViewTransition enter="auth-enter" exit="auth-exit" default="none">
        <p className="mt-5 text-[13px] leading-relaxed text-subtle">
          ანგარიშის შექმნით ეთანხმები{' '}
          <Link href="/terms" className="text-muted underline underline-offset-2 hover:text-ink">
            გამოყენების წესებს
          </Link>{' '}
          და{' '}
          <Link href="/privacy" className="text-muted underline underline-offset-2 hover:text-ink">
            კონფიდენციალურობის პოლიტიკას
          </Link>
          .
        </p>
      </ViewTransition>

      <ViewTransition name="auth-switch" share="auth-morph" default="none">
        <p className="mt-8 text-[15px] text-muted">
          უკვე გაქვს ანგარიში?{' '}
          <Link href="/login" className="font-semibold text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
            შედი
          </Link>
        </p>
      </ViewTransition>
    </>
  );
}
