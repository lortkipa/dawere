import type { CSSProperties } from 'react';
import { topicEmoji, topicHue } from '@/lib/topic-art';
import { cn } from '@/lib/utils';

/**
 * A cover for posts that have no image: the topic's glyph on a wash of the
 * topic's own hue. Every post in a topic shares a colour, so a feed of
 * text-only posts still reads as grouped rather than as a grey wall.
 */
export function TopicArt({
  slug,
  className,
  glyph = 'md',
}: {
  /** The post's first topic; posts with none fall back to a neutral wash. */
  slug: string | null | undefined;
  className?: string;
  /** false draws the wash alone, for use as a background. */
  glyph?: 'sm' | 'md' | 'lg' | false;
}) {
  const seed = slug ?? 'dawere';
  return (
    <div
      className={cn('topic-art flex items-center justify-center overflow-hidden', className)}
      style={{ '--hue': topicHue(seed) } as CSSProperties}
      aria-hidden
    >
      {glyph ? (
        <span
          className={cn(
            'leading-none drop-shadow-sm select-none',
            glyph === 'sm' ? 'text-2xl' : glyph === 'md' ? 'text-4xl' : 'text-6xl',
          )}
        >
          {topicEmoji(seed)}
        </span>
      ) : null}
    </div>
  );
}

/** The post's own cover when it has one, generated art otherwise. */
export function PostCover({
  src,
  topicSlug,
  className,
  glyph,
}: {
  src: string | null;
  topicSlug: string | null | undefined;
  className?: string;
  glyph?: 'sm' | 'md' | 'lg';
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" className={cn('object-cover', className)} />
    );
  }
  return <TopicArt slug={topicSlug} className={className} glyph={glyph} />;
}
