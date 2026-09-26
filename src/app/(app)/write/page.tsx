import type { Metadata } from 'next';
import { createDraftAction } from '@/app/actions/posts';

export const metadata: Metadata = { robots: { index: false } };

/**
 * /write has no UI of its own: it opens a blank draft (reusing an untouched one
 * if there is one) and hands the writer straight to the editor, so the URL is
 * stable enough to bookmark or link from the nav.
 */
export default async function WritePage() {
  await createDraftAction();
  return null;
}
