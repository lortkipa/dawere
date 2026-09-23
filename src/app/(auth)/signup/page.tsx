import type { Metadata } from 'next';
import Link from 'next/link';
import { signUpAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'ანგარიშის შექმნა' };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-serif text-[2rem] leading-tight font-bold tracking-tight">შექმენი ანგარიში</h1>
      <p className="mt-2 mb-8 text-[15px] text-muted">წერა, კითხვა და ნაკადი, რომელიც შენს გემოვნებას ერგება.</p>

      <AuthForm mode="signup" action={signUpAction} />

      <p className="mt-4 text-[13px] leading-relaxed text-subtle">
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

      <p className="mt-8 text-sm text-muted">
        უკვე გაქვს ანგარიში?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          შესვლა
        </Link>
      </p>
    </>
  );
}
