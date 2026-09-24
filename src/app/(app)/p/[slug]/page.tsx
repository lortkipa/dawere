import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye, PenLine } from 'lucide-react';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { getComments, getPostBySlug } from '@/lib/posts';
import { relatedPosts } from '@/lib/feed';
import { DEFAULT_SHARE_IMAGE, SITE_URL } from '@/lib/site';
import { withHeadingIds } from '@/lib/toc';
import { cn, excerpt, formatCount, formatDate } from '@/lib/utils';
import { Avatar, ButtonLink, TopicPills } from '@/components/ui';
import { BookmarkButton, CommentCountLink, FollowButton, LikeButton } from '@/components/engage-buttons';
import { FlashToast, ReadingProgress, ShareButton, TableOfContents } from '@/components/article-chrome';
import { ViewTracker } from '@/components/view-tracker';
import { Comments } from '@/components/comments';
import { ReportButton } from '@/components/report-dialog';
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
    getComments(user?.id ?? null, post.id),
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
      {searchParams.published === '1' ? <FlashToast message="სტატია გამოქვეყნდა" /> : null}
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

      <div
        className={cn(
          'mx-auto max-w-6xl px-4 sm:px-6',
          signedIn
            ? '2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)_minmax(0,1fr)] 2xl:gap-12'
            : 'xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)_minmax(0,1fr)] xl:gap-12',
        )}
      >
        <div aria-hidden className={cn('hidden', signedIn ? '2xl:block' : 'xl:block')} />

        <div className="mx-auto w-full max-w-[42rem] min-w-0">
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

          <article id="article-body" className="min-w-0 pt-12 sm:pt-20">
            <header>
              {post.topics.length > 0 ? (
                <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                  {post.topics.map((topic, index) => (
                    <span key={topic.slug} className="flex items-center gap-2">
                      {index > 0 ? (
                        <span className="text-subtle" aria-hidden>
                          ·
                        </span>
                      ) : null}
                      <Link href={`/topic/${topic.slug}`} className="text-accent transition-colors hover:text-accent-hover">
                        {topic.name}
                      </Link>
                    </span>
                  ))}
                </div>
              ) : null}

              <h1 className="headline text-[2.15rem] leading-[1.12] text-ink sm:text-[2.9rem]">
                {post.title || 'უსათაურო'}
              </h1>

              {post.subtitle ? (
                <p className="mt-5 text-lg leading-relaxed text-pretty text-muted sm:text-[1.3rem]">{post.subtitle}</p>
              ) : null}

              <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-3">
                <Link href={`/u/${post.author.username}`} className="shrink-0">
                  <Avatar name={post.author.name} src={post.author.avatarUrl} size="md" />
                </Link>
                <div className="min-w-[9rem] flex-1">
                  <Link
                    href={`/u/${post.author.username}`}
                    className="text-[15px] font-medium text-ink hover:underline"
                  >
                    {post.author.name}
                  </Link>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-subtle">
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
                className="mt-12 w-full rounded-2xl border border-line object-cover"
              />
            ) : (
              <hr className="mt-10 border-line" />
            )}

            {/* Stored HTML is sanitised on write (src/lib/sanitize.ts), never on read. */}
            <div className="article mt-12" dangerouslySetInnerHTML={{ __html: html }} />

            {post.topics.length > 0 ? (
              <TopicPills topics={post.topics} size="sm" className="mt-14" />
            ) : null}
          </article>

          {/* ------------------------------------------------- action bar */}
          {post.status === 'published' ? (
            <div
              className={cn(
                'sticky z-20 mt-12 flex justify-center',
                signedIn ? 'bottom-20 md:bottom-6' : 'bottom-6',
              )}
            >
              <div className="flex items-center gap-0.5 rounded-full border border-line bg-raised/90 p-1 shadow-lift backdrop-blur-xl">
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
          <section aria-label="ავტორი" className="mt-14 rounded-2xl bg-sunken p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/u/${post.author.username}`} className="shrink-0">
                <Avatar name={post.author.name} src={post.author.avatarUrl} size="lg" />
              </Link>
              {/* A real minimum width, so on a phone the follow button wraps
                  below instead of crushing the name into a column. */}
              <div className="min-w-[9rem] flex-1">
                <Link
                  href={`/u/${post.author.username}`}
                  className="headline block text-[1.35rem] text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4"
                >
                  {post.author.name}
                </Link>
                <p className="mt-0.5 text-[13px] text-subtle">{formatCount(post.author.followerCount)} გამომწერი</p>
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
              <p className="mt-5 text-[15px] leading-relaxed text-pretty text-muted">{post.author.bio}</p>
            ) : null}
          </section>

          {post.status === 'published' && !isAuthor ? (
            <div className="mt-5 flex justify-end">
              <ReportButton targetType="post" targetId={post.id} signedIn={signedIn} />
            </div>
          ) : null}

          <div className="mt-14 border-t border-line pt-12">
            <Comments
              postId={post.id}
              postAuthorId={post.author.id}
              total={post.commentCount}
              comments={comments}
              canModerate={isAuthor || isStaff(user)}
              canComment={post.status === 'published'}
              viewer={
                user
                  ? { id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl }
                  : null
              }
            />
          </div>
        </div>

        {/* ------------------------------------------------------- outline */}
        <div className={cn('hidden', signedIn ? '2xl:block' : 'xl:block')}>
          {showToc ? (
            <div className="sticky top-24 max-w-56 pt-40">
              <TableOfContents headings={headings} />
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="read-next" className="mt-20 border-t border-line">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 id="read-next" className="headline text-center text-[1.75rem] text-ink sm:text-[2rem]">
              წაიკითხე შემდეგ
            </h2>
            <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-border bg-warning-soft py-3 pr-3 pl-5">
      <p className="text-sm text-warning-text">{text}</p>
      {action}
    </div>
  );
}
