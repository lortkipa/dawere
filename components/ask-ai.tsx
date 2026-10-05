"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { authUrl } from "@/lib/return-to";
import { Button } from "./button";
import { SparkleIcon, sampleChat } from "./mockups";

type Message = { role: "user" | "ai"; text: string; failed?: boolean };

const title = "ჰკითხე სტატიას";
const failedReply = "პასუხი ვერ მივიღე. სცადე თავიდან.";
// The server answers 503 while no OpenAI key is set.
const offlineReply = "ჩატი ჯერ არ მუშაობს. პასუხებს მალე მიიღებ.";

// Below Tailwind's `lg` the chat is a bottom sheet; from `lg` up it docks on the right.
const phoneQuery = "(max-width: 1023px)";
const widthKey = "dawere-chat-width";
const defaultWidth = 400;
const minWidth = 320;
const maxWidth = 720;
// The article keeps at least this much room beside the panel.
const minArticle = 560;
// Pulling the sheet down further than this closes it.
const closeDrag = 100;

function clampWidth(value: number) {
  const upper = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - minArticle));
  return Math.round(Math.min(upper, Math.max(minWidth, value)));
}

function storedWidth() {
  try {
    return Number(localStorage.getItem(widthKey)) || defaultWidth;
  } catch {
    return defaultWidth;
  }
}

function saveWidth(value: number) {
  try {
    localStorage.setItem(widthKey, String(value));
  } catch {}
}

function usePhone() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(phoneQuery);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(phoneQuery).matches,
    () => false,
  );
}

/*
  The reading chat. Closed, it is a button in the bottom right corner. Open on a desktop, it
  docks on the right and the page narrows beside it; the reader can drag its edge to resize it.
  On a phone it slides up from the bottom and covers most of the screen.
*/
export function AskAi({
  postId,
  signedIn,
  children,
}: {
  postId: string;
  signedIn: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(defaultWidth);
  const [resizing, setResizing] = useState(false);
  // A new chat remounts the conversation, which drops its messages and any reply on the way.
  const [chat, setChat] = useState(0);
  const [started, setStarted] = useState(false);
  const [sheetDrag, setSheetDrag] = useState<{ start: number; offset: number } | null>(null);
  const phone = usePhone();
  const openButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const refit = () => setWidth((current) => clampWidth(current));
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, []);

  useEffect(() => {
    if (wasOpen.current && !open) openButton.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // The header shows its bottom border while the chat is open, as it does once the page scrolls.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.dataset.chatOpen = "";
    return () => {
      delete root.dataset.chatOpen;
    };
  }, [open]);

  // The sheet covers the page on a phone, so the page shouldn't scroll behind it.
  useEffect(() => {
    if (!open || !phone) return;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
    };
  }, [open, phone]);

  useEffect(() => {
    if (!resizing) return;
    const body = document.body.classList;
    body.add("select-none", "cursor-col-resize");
    return () => body.remove("select-none", "cursor-col-resize");
  }, [resizing]);

  function resizeTo(value: number) {
    const next = clampWidth(value);
    setWidth(next);
    return next;
  }

  function onResizeKey(event: KeyboardEvent<HTMLDivElement>) {
    // The edge is on the panel's left, so moving it left widens the panel.
    const step = event.key === "ArrowLeft" ? 16 : event.key === "ArrowRight" ? -16 : 0;
    if (!step) return;
    event.preventDefault();
    saveWidth(resizeTo(width + step));
  }

  function endSheetDrag() {
    if (sheetDrag && sheetDrag.offset > closeDrag) setOpen(false);
    setSheetDrag(null);
  }

  const offset = sheetDrag?.offset ?? 0;

  return (
    <div style={{ "--chat-w": `${width}px` } as CSSProperties}>
      <div
        className={`${open ? "lg:pr-(--chat-w)" : ""} ${resizing ? "" : "lg:transition-[padding] lg:duration-300"}`}
      >
        {children}
      </div>

      {/* Lined up under the header's avatar: the header is max-w-6xl (72rem) with px-4 / sm:px-6. */}
      <button
        ref={openButton}
        type="button"
        onClick={() => {
          setWidth(clampWidth(storedWidth()));
          setOpen(true);
        }}
        className={`fixed right-[max(1rem,calc(50%-36rem+1rem))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 h-11 cursor-pointer items-center gap-2 rounded-full bg-accent pr-5 pl-4 text-[15px] font-medium text-white shadow-lg transition-colors hover:bg-accent-hover sm:right-[max(1.5rem,calc(50%-36rem+1.5rem))] sm:bottom-6 ${
          open ? "hidden" : "inline-flex"
        }`}
      >
        <SparkleIcon className="size-4" />
        ჰკითხე AI-ს
      </button>

      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label={title}
        inert={!open}
        style={offset ? { transform: `translateY(${offset}px)` } : undefined}
        className={`fixed inset-x-0 bottom-0 z-40 flex h-[85dvh] flex-col rounded-t-2xl bg-bg text-ink shadow-[0_-12px_30px_-14px_rgba(17,17,17,0.25)] lg:inset-x-auto lg:top-16 lg:right-0 lg:h-auto lg:w-(--chat-w) lg:rounded-none lg:border-l lg:border-line lg:shadow-none ${
          // Visibility waits for the slide out to finish but turns on at once, so the field can take focus.
          sheetDrag
            ? ""
            : `duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "transition-[translate,transform]" : "transition-[translate,transform,visibility]"
              }`
        } ${open ? "" : "invisible translate-y-full lg:translate-x-full lg:translate-y-0"}`}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="ჩატის სიგანე"
          aria-valuenow={width}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          tabIndex={0}
          onKeyDown={onResizeKey}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setResizing(true);
          }}
          onPointerMove={(event) => {
            if (resizing) resizeTo(window.innerWidth - event.clientX);
          }}
          onPointerUp={() => {
            setResizing(false);
            saveWidth(width);
          }}
          onPointerCancel={() => setResizing(false)}
          className="group absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize touch-none lg:block"
        >
          <span
            className={`absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors ${
              resizing ? "bg-ink/25" : "group-hover:bg-ink/15"
            }`}
          />
        </div>

        {/* The grab bar: pulling it down closes the sheet. */}
        <div
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setSheetDrag({ start: event.clientY, offset: 0 });
          }}
          onPointerMove={(event) => {
            if (sheetDrag) setSheetDrag({ ...sheetDrag, offset: Math.max(0, event.clientY - sheetDrag.start) });
          }}
          onPointerUp={endSheetDrag}
          onPointerCancel={() => setSheetDrag(null)}
          className="flex h-5 shrink-0 cursor-grab touch-none items-end justify-center lg:hidden"
        >
          <span className="h-1 w-9 rounded-full bg-line" />
        </div>

        <div className="flex h-12 shrink-0 items-center justify-between pr-2 pl-4 lg:h-14">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <div className="flex items-center gap-0.5">
            {signedIn && started && (
              <button
                type="button"
                aria-label="ახალი ჩატი"
                title="ახალი ჩატი"
                onClick={() => {
                  setChat((current) => current + 1);
                  setStarted(false);
                }}
                className={headerButton}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                  <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                </svg>
              </button>
            )}
            <button type="button" aria-label="დახურვა" onClick={() => setOpen(false)} className={headerButton}>
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {signedIn ? (
          <Conversation key={chat} postId={postId} focus={open && !phone} onStart={() => setStarted(true)} />
        ) : (
          <SignInGate />
        )}
      </aside>
    </div>
  );
}

const headerButton =
  "grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink";

// `onStart` tells the panel a question was sent, so it can offer a new chat. `focus` moves the cursor into the field. Phones skip it: the keyboard would cover the sheet.
function Conversation({ postId, focus, onStart }: { postId: string; focus: boolean; onStart: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  // "waiting" until the first words of the answer arrive, "streaming" while the rest come in.
  const [status, setStatus] = useState<"idle" | "waiting" | "streaming">("idle");
  const field = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController>(undefined);
  // Follows the answer down as it grows, unless the reader scrolled up to read.
  const stick = useRef(true);

  useEffect(() => {
    if (focus) field.current?.focus();
  }, [focus]);

  // A new chat or a closed page stops the answer on the way.
  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (stick.current) list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages, status]);

  function fit() {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  async function send() {
    const text = draft.trim();
    if (!text || status !== "idle") return;
    // Failed answers aren't real replies, so they don't go back to the model.
    const history = [...messages.filter((message) => !message.failed), { role: "user" as const, text }];
    setMessages((current) => [...current, { role: "user", text }]);
    onStart();
    setDraft("");
    requestAnimationFrame(fit);
    stick.current = true;
    setStatus("waiting");

    const controller = new AbortController();
    request.current = controller;
    let answer = "";
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          messages: history.map((message) => ({ role: message.role, text: message.text })),
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(response.status === 503 ? "offline" : "failed");

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!answer) setStatus("streaming");
        answer += value;
        const sofar = answer;
        setMessages((current) =>
          current.at(-1)?.role === "ai"
            ? [...current.slice(0, -1), { role: "ai", text: sofar }]
            : [...current, { role: "ai", text: sofar }],
        );
      }
      if (!answer) throw new Error("failed");
    } catch (error) {
      if (controller.signal.aborted) return;
      const reply = error instanceof Error && error.message === "offline" ? offlineReply : failedReply;
      // A cut-off answer keeps what arrived, with the error under it.
      const failed: Message = { role: "ai", text: answer ? `${answer}\n\n${reply}` : reply, failed: true };
      setMessages((current) =>
        answer ? [...current.slice(0, -1), failed] : [...current, failed],
      );
    }
    setStatus("idle");
  }

  return (
    <>
      <div
        ref={list}
        onScroll={(event) => {
          const element = event.currentTarget;
          stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
        }}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-1 pb-4"
      >
        {messages.map((message, index) =>
          message.role === "user" ? (
            <Question key={index}>{message.text}</Question>
          ) : (
            <Answer key={index} failed={message.failed}>
              {message.text}
            </Answer>
          ),
        )}
        {status === "waiting" && (
          <Answer>
            <span className="inline-flex h-6 items-center gap-1" aria-label="პასუხი იწერება">
              <Dot />
              <Dot className="[animation-delay:150ms]" />
              <Dot className="[animation-delay:300ms]" />
            </span>
          </Answer>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="shrink-0 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-bg py-1.5 pr-1.5 pl-3.5 transition-colors focus-within:border-ink">
          <textarea
            ref={field}
            rows={1}
            value={draft}
            enterKeyHint="send"
            placeholder="დასვი კითხვა…"
            aria-label="კითხვა"
            onChange={(event) => {
              setDraft(event.target.value);
              fit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            className="max-h-36 min-w-0 flex-1 resize-none bg-transparent py-1 text-base leading-6 placeholder:text-faint focus-visible:outline-none lg:text-[15px]"
          />
          <SendButton disabled={!draft.trim() || status !== "idle"} />
        </div>
      </form>
    </>
  );
}

// Signed-out readers see a blurred sample chat behind a sign-in card.
function SignInGate() {
  const pathname = usePathname();
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div inert aria-hidden="true" className="flex min-h-0 flex-1 flex-col blur-[3px] select-none">
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-4 pt-1 pb-4">
          {sampleChat.map((message) => (
            <div key={message.question} className="flex flex-col gap-5">
              <Question>{message.question}</Question>
              <Answer>{message.answer}</Answer>
            </div>
          ))}
        </div>
        <div className="shrink-0 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between rounded-xl border border-line py-1.5 pr-1.5 pl-3.5 text-[15px] text-faint">
            დასვი კითხვა…
            <SendButton disabled={false} />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 grid place-items-center bg-bg/40 p-6">
        <div className="w-full max-w-xs rounded-xl border border-line bg-bg px-6 py-7 text-center shadow-lg">
          <h3 className="text-lg font-semibold">ჩატისთვის ანგარიში გჭირდება</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">შესვლის შემდეგ ამ სტატიაზე დაბრუნდები.</p>
          <Button href={authUrl(pathname)} className="mt-5 w-full">
            შესვლა
          </Button>
        </div>
      </div>
    </div>
  );
}

function Question({ children }: { children: ReactNode }) {
  return (
    <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-line bg-surface px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
      {children}
    </p>
  );
}

function Answer({ failed = false, children }: { failed?: boolean; children: ReactNode }) {
  return (
    <div className={`text-[15px] leading-relaxed break-words whitespace-pre-wrap ${failed ? "text-muted" : ""}`}>
      {children}
    </div>
  );
}

function Dot({ className = "" }: { className?: string }) {
  return <span className={`size-1.5 animate-pulse rounded-full bg-muted ${className}`} />;
}

function SendButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      aria-label="გაგზავნა"
      disabled={disabled}
      className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
