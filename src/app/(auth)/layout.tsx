import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { SceneShell } from '@/components/scene-shell';

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  // Nobody signed in should be looking at the sign-in screen.
  if (await getCurrentUser()) redirect('/');

  // The layout outlives the switch between sign-in and sign-up, so the
  // picture stays put while the form changes beside it.
  return <SceneShell>{children}</SceneShell>;
}
