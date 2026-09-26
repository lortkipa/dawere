'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { ArrowUp, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import type { ChatMessage } from '@/lib/assistant';
import { ButtonLink } from '@/components/ui';
import { cn } from '@/lib/utils';

type Message = ChatMessage & { id: number; error?: boolean };

/** Offered before the first question; picking one sends it as it is. */
const SUGGESTIONS = ['მოკლედ შემიჯამე', 'რა არის მთავარი აზრი?', 'ახსენი უფრო მარტივად'];

/** The route takes at most this many turns; older ones are dropped first. */
const HISTORY = 20;

const FAILED = 'პასუხი ვერ მივიღეთ. სცადე თავიდან.';

/** From here up the panel is docked beside the page; below it, a bottom sheet. */
const DOCKED = '(width >= 48rem)';

/** Docked panel width, in px: the default, the narrowest and the widest. */
const WIDTH = 416;
const MIN_WIDTH = 320;
const MAX_WIDTH = 900;
/** The page always keeps at least this much beside the panel. */
const MIN_PAGE = 480;
const WIDTH_KEY = 'dawere-ask-width';

function clampWidth(width: number) {
  const room = window.innerWidth - MIN_PAGE;
  return Math.round(Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH, room)));
}

/** Docked, the page stays usable beside the panel; as a sheet it is modal. */
function show(dialog: HTMLDialogElement) {
  if (matchMedia(DOCKED).matches) dialog.show();
  else dialog.showModal();
}

const noopSubscribe = () => () => {};

const ICON_BUTTON =
  'flex size-9 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:bg-hover hover:text-ink [&>svg]:size-[18px]';

/**
 * "Ask AI" for one article: a button for the action bar and the panel it opens —
 * a bottom sheet on phones; from md up, a panel docked at the right edge that
 * takes its width from the page (see `html[data-ask-open]` in globals.css), so
 * the article narrows beside it as the reader drags the panel's left edge.
 * The conversation lives here, so closing the panel and opening it again keeps it.
 */
export function AskAi({ postId, postTitle, signedIn }: { postId: string; postTitle: string; signedIn: boolean }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  // Follow the answer as it arrives, unless the reader has scrolled up to reread.
  const pinned = useRef(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(WIDTH);
  // What the reader asked for; `width` is that, fitted to the window.
  const chosenWidth = useRef(WIDTH);
  // Only a press that starts on the backdrop closes the sheet, so a drag that
  // ends out there (selecting an answer) leaves it open.
  const pressedBackdrop = useRef(false);
  // The panel lives in <body>, outside the article's layout.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // Before paint, so the page and the panel never disagree on the width.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    root.dataset.askOpen = '';
    root.style.setProperty('--ask-width', `${width}px`);
    return () => {
      delete root.dataset.askOpen;
      root.style.removeProperty('--ask-width');
    };
  }, [isOpen, width]);

  useEffect(() => {
    if (!isOpen) return;
    const docked = matchMedia(DOCKED);
    const refit = () => setWidth(clampWidth(chosenWidth.current));
    // Crossing the breakpoint turns the panel into the sheet, or back.
    const reshape = () => {
      const dialog = dialogRef.current;
      if (!dialog?.open) return;
      dialog.close();
      show(dialog);
      refit();
    };
    window.addEventListener('resize', refit);
    docked.addEventListener('change', reshape);
    return () => {
      window.removeEventListener('resize', refit);
      docked.removeEventListener('change', reshape);
    };
  }, [isOpen]);

  function resize(next: number) {
    const clamped = clampWidth(next);
    chosenWidth.current = clamped;
    setWidth(clamped);
    try {
      localStorage.setItem(WIDTH_KEY, String(clamped));
    } catch {}
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Leaving the page stops an answer that is still arriving.
  useEffect(() => () => abortRef.current?.abort(), []);

  function open() {
    // The last width the reader dragged to, fitted to the window as it is now.
    let stored = 0;
    try {
      stored = Number(localStorage.getItem(WIDTH_KEY));
    } catch {}
    chosenWidth.current = stored || WIDTH;
    setWidth(clampWidth(chosenWidth.current));
    setIsOpen(true);
    if (dialogRef.current) show(dialogRef.current);
    // Only with a real keyboard: on a phone this would throw the keyboard up over the sheet.
    if (signedIn && matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
  }

  function patch(id: number, change: (message: Message) => Message) {
    setMessages((list) => list.map((m) => (m.id === id ? change(m) : m)));
  }

  async function ask(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    const history = [...messages.filter((m) => !m.error && m.content.trim()), { role: 'user' as const, content: question }]
      .slice(-HISTORY)
      .map(({ role, content }) => ({ role, content }));
    const questionId = nextId.current++;
    const replyId = nextId.current++;
    setMessages((list) => [
      ...list,
      { id: questionId, role: 'user', content: question },
      { id: replyId, role: 'assistant', content: '' },
    ]);
    setDraft('');
    setStreaming(true);
    pinned.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/posts/${postId}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        patch(replyId, (m) => ({ ...m, content: data?.error ?? FAILED, error: true }));
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        patch(replyId, (m) => ({ ...m, content: m.content + value }));
      }
    } catch {
      if (controller.signal.aborted) {
        // Stopped on purpose: keep what arrived, and drop the reply if nothing did.
        setMessages((list) => list.filter((m) => m.id !== replyId || m.content));
      } else {
        patch(replyId, (m) => ({ ...m, content: FAILED, error: true }));
      }
    } finally {
      // A newer question may already own the flag.
      if (abortRef.current === controller) {
        abortRef.current = null;
        setStreaming(false);
      }
    }
  }

  function startOver() {
    abortRef.current?.abort();
    setMessages([]);
    inputRef.current?.focus();
  }

  const panel = (
    <dialog
      ref={dialogRef}
      aria-labelledby="ask-ai-title"
      // The close event arrives a moment later, possibly after a reopen.
      onClose={() => setIsOpen(Boolean(dialogRef.current?.open))}
      onKeyDown={(event) => {
        // Only the modal sheet closes on Escape by itself.
        if (event.key === 'Escape' && !event.currentTarget.matches(':modal')) event.currentTarget.close();
      }}
      // A press on the backdrop lands on the dialog element itself.
      onPointerDown={(event) => (pressedBackdrop.current = event.target === dialogRef.current)}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === dialogRef.current) dialogRef.current.close();
      }}
      className={cn(
        'ask-sheet overflow-hidden border border-line bg-raised p-0 text-ink shadow-lift',
        'mx-0 mt-auto mb-0 h-[85dvh] max-h-none w-full max-w-none rounded-t-3xl border-b-0',
        'md:fixed md:inset-y-0 md:right-0 md:left-auto md:z-40 md:m-0 md:h-dvh md:w-(--ask-width) md:rounded-none md:border-t-0 md:border-r-0 md:shadow-none',
      )}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-1 border-b border-line py-3 pr-3 pl-5">
          <div className="min-w-0 flex-1">
            <h2 id="ask-ai-title" className="headline text-[1.2rem] text-ink">
              ჰკითხე AI-ს
            </h2>
            <p className="truncate text-[13px] text-subtle">{postTitle}</p>
          </div>
          {messages.length > 0 ? (
            <button type="button" onClick={startOver} title="ახალი საუბარი" aria-label="ახალი საუბარი" className={ICON_BUTTON}>
              <RotateCcw />
            </button>
          ) : null}
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="დახურვა" className={ICON_BUTTON}>
            <X />
          </button>
        </header>

        <div
          ref={scrollRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6"
        >
          {!signedIn ? (
            <SignInPrompt next={pathname} />
          ) : messages.length === 0 ? (
            <Suggestions onPick={ask} />
          ) : (
            <ol role="log" aria-busy={streaming} className="space-y-6 text-[15px] leading-relaxed text-ink">
              {messages.map((message, index) => (
                <Bubble
                  key={message.id}
                  message={message}
                  arriving={streaming && index === messages.length - 1}
                />
              ))}
            </ol>
          )}
        </div>

        {signedIn ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
            className="p-3 pt-0"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-raised p-1.5 pl-4 shadow-soft transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
              <textarea
                ref={inputRef}
                rows={1}
                maxLength={1000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter sends, Shift + Enter breaks the line; never mid-composition.
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    ask(draft);
                  }
                }}
                placeholder="დასვი კითხვა ამ სტატიაზე"
                aria-label="კითხვა სტატიაზე"
                // 16px on phones: anything smaller makes iOS zoom in on focus.
                className="field-sizing-content max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-base leading-relaxed text-ink placeholder:text-subtle focus-visible:outline-none sm:text-[15px]"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  aria-label="შეჩერება"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast transition-colors hover:bg-primary-hover"
                >
                  <Square className="size-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="გაგზავნა"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast transition-[background-color,opacity] hover:bg-primary-hover disabled:opacity-30"
                >
                  <ArrowUp className="size-[18px]" />
                </button>
              )}
            </div>
          </form>
        ) : null}
      </div>
      {/* Last, so opening the panel does not put focus on it first. */}
      <ResizeHandle width={width} onResize={resize} onReset={() => resize(WIDTH)} />
    </dialog>
  );

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label="ჰკითხე AI-ს"
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
      >
        <Sparkles className="size-[17px]" />
        <span className="hidden @min-[30rem]:inline">ჰკითხე AI-ს</span>
      </button>

      {mounted ? createPortal(panel, document.body) : null}
    </>
  );
}

/**
 * The panel's left edge from md up: drag it, or focus it and use the arrow keys.
 * Double-click puts the default width back.
 */
function ResizeHandle({
  width,
  onResize,
  onReset,
}: {
  width: number;
  onResize: (width: number) => void;
  onReset: () => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="პანელის სიგანე"
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        // Keeps the drag from selecting text on its way across the page.
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        // The page follows the pointer directly rather than easing after it.
        document.documentElement.dataset.askResizing = '';
      }}
      onLostPointerCapture={() => delete document.documentElement.dataset.askResizing}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) onResize(window.innerWidth - event.clientX);
      }}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 64 : 16;
        if (event.key === 'ArrowLeft') onResize(width + step);
        else if (event.key === 'ArrowRight') onResize(width - step);
        else return;
        event.preventDefault();
      }}
      className="group absolute inset-y-0 left-0 z-10 hidden w-2 cursor-col-resize touch-none focus-visible:outline-none md:block"
    >
      <span
        className="absolute inset-y-0 left-0 w-0.5 bg-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100"
        aria-hidden
      />
    </div>
  );
}

function Bubble({ message, arriving }: { message: Message; arriving: boolean }) {
  if (message.role === 'user') {
    return (
      <li className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-sunken px-4 py-2.5 whitespace-pre-wrap wrap-anywhere">
        {message.content}
      </li>
    );
  }

  const paragraphs = message.content.split(/\n{2,}/);
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        {message.error ? (
          <p className="text-danger">{message.content}</p>
        ) : !message.content ? (
          <span className="flex h-6 items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="animate-typing size-1.5 rounded-full bg-subtle"
                style={{ animationDelay: `${i * 150}ms` }}
                aria-hidden
              />
            ))}
            <span className="sr-only">პასუხი იწერება</span>
          </span>
        ) : (
          paragraphs.map((text, i) => (
            <p key={i} className="whitespace-pre-wrap wrap-anywhere">
              {text}
              {arriving && i === paragraphs.length - 1 ? (
                <span
                  className="animate-caret ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] rounded-full bg-accent"
                  aria-hidden
                />
              ) : null}
            </p>
          ))
        )}
      </div>
    </li>
  );
}

function Suggestions({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center text-center">
      <p className="headline text-[1.45rem] text-ink">რა გაინტერესებს ამ სტატიაზე?</p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onPick(question)}
              className="h-9 rounded-full border border-transparent bg-sunken px-3.5 text-[13.5px] font-medium text-ink transition-[background-color,border-color] duration-200 hover:border-line-strong hover:bg-raised"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignInPrompt({ next }: { next: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center text-center">
      <h3 className="headline max-w-xs text-[1.45rem] text-ink">კითხვის დასასმელად შედი ანგარიშზე</h3>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <ButtonLink href={`/login?next=${encodeURIComponent(next)}`}>შესვლა</ButtonLink>
        <ButtonLink href="/signup" variant="outline">
          ანგარიშის შექმნა
        </ButtonLink>
      </div>
    </div>
  );
}
