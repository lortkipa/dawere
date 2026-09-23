import type { Metadata } from 'next';
import { Bookmark } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { bookmarkedFeed } from '@/lib/feed';
import { PostCardList } from '@/components/post-card';
import { Pagination } from '@/components/feed-tabs';
import { ButtonLink, EmptyState, PageHeader } from '@/components/ui';
import { pageParam } from '@/lib/utils';

export const metadata: Metadata = { title: 'შენახულები' };

const PAGE_SIZE = 12;

export default async function BookmarksPage(props: PageProps<'/bookmarks'>) {
  const searchParams = await props.searchParams;
  const user = await requireUser('/bookmarks');
  const page = pageParam(searchParams.page);
  const feed = await bookmarkedFeed(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <PageHeader title="შენახულები" className="mb-4 border-b border-line pb-6" />

      <PostCardList
        posts={feed.posts}
        signedIn
        emptyState={
          <EmptyState
            icon={<Bookmark />}
            title="ჯერ არაფერია შენახული"
            description="სანიშნის ხატულა ნებისმიერ ტექსტზე — და აქ დაგელოდება."
            action={
              <ButtonLink href="/" variant="outline">
                ტექსტების დათვალიერება
              </ButtonLink>
            }
          />
        }
      />

      {feed.posts.length > 0 ? (
        <div className="mt-6">
          <Pagination basePath="/bookmarks" page={page} hasMore={feed.hasMore} />
        </div>
      ) : null}
    </main>
  );
}
