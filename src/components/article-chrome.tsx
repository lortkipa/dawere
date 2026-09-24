'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Share2 } from 'lucide-react';
import type { Heading } from '@/lib/toc';
import { toast } from '@/components/toaster';
import { cn } from '@/lib/utils';

/** A hairline across the top of the viewport that fills as the article is read. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    let frame = 0;

    function update() {
      frame = 0;
      const rect = target!.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const progress = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total));
      // Written straight to the DOM: a state update per scroll event would
      // re-render for nothing.
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetId]);

  return (
    <div className="pointer-events-none fixed top-0 right-[var(--ask-inset,0px)] left-0 z-50 h-0.5" aria-hidden>
      <div ref={bar} className="h-full origin-left scale-x-0 bg-accent" />
    </div>
  );
}

/** The outline of a long article, with the section being read highlighted. */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // The active section is the last heading that has scrolled past the top
    // third of the screen.
    const observer = new IntersectionObserver(
      () => {
        const line = window.innerHeight * 0.3;
        let current = elements[0].id;
        for (const el of elements) {
          if (el.getBoundingClientRect().top <= line) current = el.id;
        }
        setActive(current);
      },
      { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label="შინაარსი" className="text-[13px]">
      <p className="mb-3 font-semibold text-ink">შინაარსი</p>
      <ul className="space-y-1 border-l border-line">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={active === heading.id ? 'location' : undefined}
              className={cn(
                '-ml-px block border-l py-1 leading-snug transition-colors',
                heading.level === 3 ? 'pl-6' : 'pl-3.5',
                active === heading.id
                  ? 'border-ink font-medium text-ink'
                  : 'border-transparent text-subtle hover:text-ink',
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The native share sheet where there is one (phones), a copied link otherwise.
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split('?')[0];
    if (typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed, or not allowed here: fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('ბმული დაკოპირდა');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('ბმულის კოპირება ვერ მოხერხდა', 'error');
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-subtle transition-colors hover:bg-hover hover:text-ink"
      aria-label="სტატიის გაზიარება"
    >
      {copied ? <Check className="size-[17px] text-accent" /> : <Share2 className="size-[17px]" />}
      <span className="hidden @min-[30rem]:inline">{copied ? 'დაკოპირდა' : 'გაზიარება'}</span>
    </button>
  );
}

/**
 * Shows a toast for a one-off event carried in the URL (?published=1), then
 * drops the parameter so a refresh or a shared link does not repeat it.
 */
export function FlashToast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  // Strict Mode runs effects twice in development; one toast is enough.
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast(message);
    router.replace(pathname, { scroll: false });
  }, [message, pathname, router]);
  return null;
}
