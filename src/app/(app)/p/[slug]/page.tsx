import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye, Flag, PenLine } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getComments, getPostBySlug } from '@/lib/posts';
import { relatedPosts } from '@/lib/feed';
import { DEFAULT_SHARE_IMAGE, SITE_URL, SUPPORT_EMAIL, supportMailto } from '@/lib/site';
import { withHeadingIds } from '@/lib/toc';
import { cn, excerpt, formatCount, formatDate } from '@/lib/utils';
import { Avatar, ButtonLink, SectionHeading } from '@/components/ui';
import { BookmarkButton, CommentCountLink, FollowButton, LikeButton } from '@/components/engage-buttons';
import { FlashToast, ReadingProgress, ShareButton, TableOfContents } from '@/components/article-chrome';
import { ViewTracker } from '@/components/view-tracker';
import { Comments } from '@/components/comments';
import { CompactPostCard } from '@/components/post-card';

/** Below this many sections an outline adds clutter, not navigation. */
const TOC_MIN_HEADINGS = 3;

export async function generateMetadata(props: PageProps<'/p/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const user = await getCurrentUser();
  const post = await getPostBySlug(user?.id ?? null, slug);
  // Drafts get nothing: their titles are the author's business.
  if (!post || post.status !== 'published') return { title: 'სტატია ვერ მოიძებნა', robots: { index: false } };

  const description = post.subtitle || excerpt(post.preview, 155);
  const image = post.coverImageUrl ?? DEFAULT_SHARE_IMAGE;
  return {
    title: post.title,
    description,
    authors: [{ name: post.author.name, url: `/u/${post.author.username}` }],
    alternates: { canonical: `/p/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url: `/p/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: [post.author.name],
      tags: post.topics.map((t) => t.name),
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: post.title, description, images: [image] },
  };
}

export default async function PostPage(props: PageProps<'/p/[slug]'>) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  const post = await getPostBySlug(user?.id ?? null, slug);

  if (!post) notFound();

  const isAuthor = user?.id === post.author.id;
  // Drafts are visible only to the person writing them.
  if (post.status !== 'published' && !isAuthor) notFound();

  const [comments, related] = await Promise.all([
    getComments(post.id),
    relatedPosts(user?.id ?? null, post.id, 3),
  ]);

  const { html, headings } = withHeadingIds(post.contentHtml);
  const showToc = headings.length >= TOC_MIN_HEADINGS;
  const signedIn = Boolean(user);

  // Structured data for search engines: the article, its author and dates.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.subtitle || excerpt(post.preview, 155),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: { '@type': 'Person', name: post.author.name, url: `${SITE_URL}/u/${post.author.username}` },
    mainEntityOfPage: `${SITE_URL}/p/${post.slug}`,
    image: post.coverImageUrl ? new URL(post.coverImageUrl, SITE_URL).toString() : undefined,
    inLanguage: 'ka',
  };

  return (
    <main className="w-full flex-1 pb-16">
      <ReadingProgress targetId="article-body" />
      {searchParams.published === '1' ? <FlashToast message="სტატია გამოქვეყნდა 🎉" /> : null}
      {post.status === 'published' ? (
        <>
          <ViewTracker postId={post.id} fromSearch={searchParams.from === 'search'} />
          <script
            type="application/ld+json"
            // Escaped so a "</script>" inside a title cannot close the tag.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
          />
        </>
      ) : null}

      <div className="mx-auto max-w-[76rem] px-5 sm:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,46rem)_minmax(0,1fr)] xl:gap-12">
        {/* ------------------------------------------------------- outline */}
        <div className="hidden xl:block">
          {showToc ? (
            <div className="sticky top-28 ml-auto max-w-56 pt-40">
              <TableOfContents headings={headings} />
            </div>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-[46rem] min-w-0">
          {post.status !== 'published' ? (
            <Notice
              text="მონახაზი — ხედავ მხოლოდ შენ."
              action={
                <ButtonLink href={`/write/${post.id}`} size="sm" variant="outline">
                  <PenLine />
                  რედაქტირება
                </ButtonLink>
              }
            />
          ) : isAuthor && post.hasPendingRevision ? (
            <Notice
              text="გაქვს ცვლილებები, რომლებიც ჯერ არ გამოქვეყნებულა."
              action={
                <ButtonLink href={`/write/${post.id}`} size="sm" variant="outline">
                  <PenLine />
                  გაგრძელება
                </ButtonLink>
              }
            />
          ) : null}

          <article id="article-body" className="min-w-0 pt-10 sm:pt-14">
            <header>
              {post.topics.length > 0 ? (
                <div className="mb-6 flex flex-wrap gap-2">
                  {post.topics.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={`/topic/${topic.slug}`}
                      className="rounded-full bg-accent-soft px-3 py-1 text-[13px] font-medium text-accent transition-opacity hover:opacity-80"
                    >
                      {topic.name}
                    </Link>
                  ))}
                </div>
              ) : null}

              <h1 className="font-serif text-[2.1rem] leading-[1.13] font-bold tracking-tight text-ink sm:text-[2.9rem]">
                {post.title || 'უსათაურო'}
              </h1>

              {post.subtitle ? (
                <p className="mt-5 text-lg leading-relaxed text-muted sm:text-[1.3rem]">{post.subtitle}</p>
              ) : null}

              <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-line py-4">
                <Link href={`/u/${post.author.username}`} className="shrink-0">
                  <Avatar name={post.author.name} src={post.author.avatarUrl} size="md" />
                </Link>
                <div className="min-w-[9rem] flex-1">
                  <div className="flex flex-wrap items-center gap-x-3">
                    <Link
                      href={`/u/${post.author.username}`}
                      className="text-[15px] font-semibold text-ink hover:text-accent"
                    >
                      {post.author.name}
                    </Link>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-subtle">
                    <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt ?? post.updatedAt)}</time>
                    <span aria-hidden>·</span>
                    <span>{post.readingMinutes} წთ კითხვა</span>
                    {post.status === 'published' ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3.5" aria-hidden />
                          {formatCount(post.viewCount)}
                          <span className="sr-only">ნახვა</span>
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                {isAuthor ? (
                  <ButtonLink href={`/write/${post.id}`} size="sm" variant="outline">
                    <PenLine />
                    რედაქტირება
                  </ButtonLink>
                ) : (
                  <FollowButton
                    authorId={post.author.id}
                    initialFollowing={post.author.followedByViewer}
                    signedIn={signedIn}
                  />
                )}
              </div>
            </header>

            {post.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.coverImageUrl}
                alt=""
                className="mt-10 w-full rounded-2xl border border-line object-cover"
              />
            ) : null}

            {/* Stored HTML is sanitised on write (src/lib/sanitize.ts), never on read. */}
            <div className="article mt-10" dangerouslySetInnerHTML={{ __html: html }} />

            {post.topics.length > 0 ? (
              <div className="mt-12 flex flex-wrap gap-2">
                {post.topics.map((topic) => (
                  <Link
                    key={topic.slug}
                    href={`/topic/${topic.slug}`}
                    className="rounded-full border border-line bg-raised px-3.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {topic.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </article>

          {post.status === 'published' && !isAuthor && SUPPORT_EMAIL ? (
            <a
              href={`${supportMailto('დარღვევის შეტყობინება')}&body=${encodeURIComponent(`${SITE_URL}/p/${post.slug}\n\n`)}`}
              className="mt-8 inline-flex items-center gap-1.5 text-[13px] text-subtle transition-colors hover:text-ink"
            >
              <Flag className="size-3.5" aria-hidden />
              დარღვევის შეტყობინება
            </a>
          ) : null}

          {/* ------------------------------------------------- action bar */}
          {post.status === 'published' ? (
            <div
              className={cn(
                'sticky z-20 mt-10 flex justify-center',
                signedIn ? 'bottom-20 md:bottom-6' : 'bottom-6',
              )}
            >
              <div className="flex items-center gap-0.5 rounded-full border border-line bg-raised/95 px-2 py-1 shadow-lift backdrop-blur-xl">
                <LikeButton
                  postId={post.id}
                  initialLiked={post.liked}
                  initialCount={post.likeCount}
                  signedIn={signedIn}
                />
                <CommentCountLink href="#comments" count={post.commentCount} />
                <span className="mx-1 h-5 w-px bg-line" aria-hidden />
                <BookmarkButton
                  postId={post.id}
                  initialSaved={post.bookmarked}
                  signedIn={signedIn}
                  withLabel
                />
                <ShareButton title={post.title} />
              </div>
            </div>
          ) : null}

          {/* ------------------------------------------------- author card */}
          <section className="mt-14 rounded-3xl border border-line bg-raised p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-start gap-5">
              <Link href={`/u/${post.author.username}`} className="shrink-0">
                <Avatar name={post.author.name} src={post.author.avatarUrl} size="lg" />
              </Link>
              {/* A real minimum width, so on a phone the follow button wraps
                  below instead of crushing the name into a column. */}
              <div className="min-w-[9rem] flex-1">
                <p className="text-[12px] font-semibold tracking-wide text-subtle uppercase">ავტორი</p>
                <Link
                  href={`/u/${post.author.username}`}
                  className="mt-1 block text-lg font-semibold text-ink hover:text-accent"
                >
                  {post.author.name}
                </Link>
                <p className="text-[13px] text-subtle">{formatCount(post.author.followerCount)} გამომწერი</p>
              </div>
              {isAuthor ? null : (
                <FollowButton
                  authorId={post.author.id}
                  initialFollowing={post.author.followedByViewer}
                  signedIn={signedIn}
                  size="md"
                />
              )}
            </div>
            {post.author.bio ? (
              <p className="mt-5 text-[15px] leading-relaxed text-muted">{post.author.bio}</p>
            ) : null}
          </section>

          <div className="mt-16">
            <Comments
              postId={post.id}
              total={post.commentCount}
              comments={comments}
              canModerate={isAuthor}
              canComment={post.status === 'published'}
              viewer={
                user
                  ? { id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl }
                  : null
              }
            />
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-20 border-t border-line bg-sunken">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
            <SectionHeading>წაიკითხე შემდეგ</SectionHeading>
            <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <CompactPostCard key={item.id} post={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Notice({ text, action }: { text: string; action: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-3.5 dark:border-amber-400/20 dark:bg-amber-400/10">
      <p className="text-sm text-amber-900 dark:text-amber-200">{text}</p>
      {action}
    </div>
  );
}
