'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, Check, Heart, MessageCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import {
  toggleBookmarkAction,
  toggleFollowAction,
  toggleLikeAction,
  toggleTopicAction,
} from '@/app/actions/engage';
import { Button } from '@/components/ui';
import { toast } from '@/components/toaster';
import { cn, formatCount } from '@/lib/utils';

/**
 * All of these follow the same shape: flip the UI immediately, call the action,
 * and fall back to the server's answer. Signed-out readers are sent to sign in
 * and brought back to the page they were on.
 */
function useSignInRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/login?next=${encodeURIComponent(pathname)}`);
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  signedIn,
  withLabel = false,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
  withLabel?: boolean;
}) {
  const signIn = useSignInRedirect();
  const [state, setState] = useState({ liked: initialLiked, count: initialCount });
  const [optimistic, applyOptimistic] = useOptimistic(state, (current) => ({
    liked: !current.liked,
    count: current.count + (current.liked ? -1 : 1),
  }));
  const [, startTransition] = useTransition();
  // Bumped on each like so the heart replays its pop.
  const [pops, setPops] = useState(0);

  function onClick() {
    if (!signedIn) return signIn();
    if (!optimistic.liked) setPops((n) => n + 1);
    startTransition(async () => {
      applyOptimistic(null);
      const result = await toggleLikeAction(postId);
      if (result.ok) setState({ liked: result.active, count: result.count ?? 0 });
      else toast(result.error ?? 'ვერ მოხერხდა.', 'error');
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? 'მოწონების მოხსნა' : 'სტატიის მოწონება'}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors hover:bg-hover',
        optimistic.liked ? 'text-rose-600 dark:text-rose-400' : 'text-subtle hover:text-ink',
      )}
    >
      <Heart
        key={pops}
        className={cn('size-[17px]', optimistic.liked && 'animate-heart-pop fill-current')}
      />
      <span className="tabular-nums">{formatCount(optimistic.count)}</span>
      {withLabel ? <span className="sr-only">მოწონება</span> : null}
    </button>
  );
}

export function BookmarkButton({
  postId,
  initialSaved,
  signedIn,
  withLabel = false,
}: {
  postId: string;
  initialSaved: boolean;
  signedIn: boolean;
  withLabel?: boolean;
}) {
  const signIn = useSignInRedirect();
  const [saved, setSaved] = useState(initialSaved);
  const [optimistic, applyOptimistic] = useOptimistic(saved, (current) => !current);
  const [, startTransition] = useTransition();

  function onClick() {
    if (!signedIn) return signIn();
    startTransition(async () => {
      applyOptimistic(null);
      const result = await toggleBookmarkAction(postId);
      if (result.ok) {
        setSaved(result.active);
        toast(result.active ? 'შენახულებში დაემატა' : 'შენახულებიდან ამოიღე');
      } else {
        toast(result.error ?? 'ვერ მოხერხდა.', 'error');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic}
      aria-label={optimistic ? 'შენახულებიდან ამოღება' : 'შენახვა მოგვიანებისთვის'}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors hover:bg-hover',
        optimistic ? 'text-accent' : 'text-subtle hover:text-ink',
      )}
    >
      <Bookmark className={cn('size-[17px]', optimistic && 'fill-current')} />
      {withLabel ? <span className="hidden @min-[30rem]:inline">{optimistic ? 'შენახულია' : 'შენახვა'}</span> : null}
    </button>
  );
}

export function CommentCountLink({ href, count }: { href: string; count: number }) {
  return (
    <Link
      href={href}
      aria-label={`კომენტარები: ${count}`}
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-subtle transition-colors hover:bg-hover hover:text-ink"
    >
      <MessageCircle className="size-[17px]" />
      <span className="tabular-nums">{formatCount(count)}</span>
    </Link>
  );
}

export function FollowButton({
  authorId,
  initialFollowing,
  signedIn,
  size = 'sm',
  compact = false,
  className,
}: {
  authorId: string;
  initialFollowing: boolean;
  signedIn: boolean;
  size?: 'sm' | 'md';
  /** Text only, for tight rows like the sidebar. */
  compact?: boolean;
  className?: string;
}) {
  const signIn = useSignInRedirect();
  const [following, setFollowing] = useState(initialFollowing);
  const [optimistic, applyOptimistic] = useOptimistic(following, (current) => !current);
  const [, startTransition] = useTransition();

  function onClick() {
    if (!signedIn) return signIn();
    startTransition(async () => {
      applyOptimistic(null);
      const result = await toggleFollowAction(authorId);
      if (result.ok) setFollowing(result.active);
      else toast(result.error ?? 'ვერ მოხერხდა.', 'error');
    });
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      size={size}
      // In a list of people a row of solid buttons shouts; the rail's are quiet.
      variant={compact ? (optimistic ? 'ghost' : 'outline') : optimistic ? 'outline' : 'primary'}
      aria-pressed={optimistic}
      className={cn(compact && 'h-7 px-3 text-[12px]', className)}
    >
      {compact ? null : optimistic ? <Check /> : <Plus />}
      {optimistic ? 'გამოწერილია' : 'გამოწერა'}
    </Button>
  );
}

export function TopicFollowButton({
  topicId,
  initialFollowing,
  signedIn,
}: {
  topicId: string;
  initialFollowing: boolean;
  signedIn: boolean;
}) {
  const signIn = useSignInRedirect();
  const [following, setFollowing] = useState(initialFollowing);
  const [optimistic, applyOptimistic] = useOptimistic(following, (current) => !current);
  const [, startTransition] = useTransition();

  function onClick() {
    if (!signedIn) return signIn();
    startTransition(async () => {
      applyOptimistic(null);
      const result = await toggleTopicAction(topicId);
      if (result.ok) {
        setFollowing(result.active);
        toast(result.active ? 'თემა ინტერესებს დაემატა — ნაკადი მოერგება' : 'თემა ინტერესებიდან ამოიღე');
      } else {
        toast(result.error ?? 'ვერ მოხერხდა.', 'error');
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      variant={optimistic ? 'outline' : 'primary'}
      aria-pressed={optimistic}
    >
      {optimistic ? <Check /> : <Plus />}
      {optimistic ? 'ინტერესებშია' : 'ინტერესებში დამატება'}
    </Button>
  );
}
