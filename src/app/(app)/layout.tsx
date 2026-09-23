import { getCurrentUser } from '@/lib/auth';
import { MobileNav } from '@/components/nav-links';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      {user ? (
        <>
          {/* Room for the fixed tab bar, so it never covers the footer. */}
          <div className="h-16 md:hidden" aria-hidden />
          <MobileNav user={{ name: user.name, username: user.username, avatarUrl: user.avatarUrl }} />
        </>
      ) : null}
    </>
  );
}
