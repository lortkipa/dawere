import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuthArt } from '@/components/auth-art';
import { Logo } from '@/components/logo';

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  // Nobody signed in should be looking at the sign-in screen.
  if (await getCurrentUser()) redirect('/');

  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>

        <div className="flex flex-1 items-center justify-center py-14">
          <div className="w-full max-w-[22rem]">{children}</div>
        </div>
      </main>

      <AuthArt className="hidden border-l border-line lg:block" />
    </div>
  );
}
