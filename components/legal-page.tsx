import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLegal } from "@/lib/legal";
import type { LegalDoc } from "@/lib/legal-docs";
import { legalExtensions } from "@/lib/legal-schema";
import { getCurrentUser } from "@/lib/session";
import { formatDate, menuUser } from "@/lib/user-view";
import { Footer } from "./footer";
import { Header } from "./header";
import { LightOnly } from "./light-only";

export async function legalMetadata(doc: LegalDoc): Promise<Metadata> {
  return { title: `${(await getLegal(doc)).title} — dawere` };
}

// The shell of /terms, /privacy and /help. They are open to everyone, including someone halfway
// through signing up. Visitors come here from the landing page and /auth, which are always light,
// so it stays light for them too; signed-in readers get their own theme.
export async function OpenPage({ children }: { children: ReactNode }) {
  const viewer = await getCurrentUser();
  return (
    <>
      {!viewer?.onboardedAt && <LightOnly />}
      <Header user={viewer?.onboardedAt ? menuUser(viewer) : undefined} />
      {children}
      <Footer />
    </>
  );
}

export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const legal = await getLegal(doc);

  return (
    <OpenPage>
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <article>
          <h1 className="text-[clamp(1.5rem,6vw,2.25rem)] leading-tight font-extrabold tracking-[-0.015em] text-balance break-words">
            {legal.title}
          </h1>
          <p className="mt-3 text-muted">
            ბოლო განახლება: <time dateTime={legal.createdAt.toISOString()}>{formatDate(legal.createdAt)}</time>
          </p>
          <div className="post-body mt-8">{renderToReactElement({ content: legal.body, extensions: legalExtensions })}</div>
        </article>
      </main>
    </OpenPage>
  );
}
