"use client";

import { useState } from "react";
import { type Editor, useEditorState } from "@tiptap/react";
import styles from "./EditorToolbar.module.css";

type ToolbarProps = { editor: Editor };

export function EditorToolbar({ editor }: ToolbarProps) {
  // A link is opened over the toolbar rather than through window.prompt, which
  // cannot be styled and reads as a browser warning.
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      quote: editor.isActive("blockquote"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      codeBlock: editor.isActive("codeBlock"),
      link: editor.isActive("link"),
      // Nothing to hang a link on unless there is a selection or one already.
      linkable: editor.isActive("link") || !editor.state.selection.empty,
    }),
  });

  const openLink = () => {
    setHref(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = href.trim();
    // extendMarkRange so editing a link works from a caret inside it, without
    // having to select the whole thing first.
    const chain = editor.chain().focus().extendMarkRange("link");

    if (url) chain.setLink({ href: url }).run();
    else chain.unsetLink().run();

    setLinkOpen(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.tools} role="toolbar" aria-label="ფორმატირება">
        <Tool
          label="მსხვილი"
          active={active.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </Tool>
        <Tool
          label="დახრილი"
          active={active.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </Tool>

        <span className={styles.divider} />

        <Tool
          label="სათაური"
          active={active.h2}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </Tool>
        <Tool
          label="ქვესათაური"
          active={active.h3}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </Tool>

        <span className={styles.divider} />

        <Tool
          label="ციტატა"
          active={active.quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuoteGlyph />
        </Tool>
        <Tool
          label="სია"
          active={active.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListGlyph ordered={false} />
        </Tool>
        <Tool
          label="დანომრილი სია"
          active={active.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListGlyph ordered />
        </Tool>
        <Tool
          label="კოდი"
          active={active.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"</>"}
        </Tool>

        <span className={styles.divider} />

        <Tool
          label="ბმული"
          active={active.link}
          disabled={!active.linkable}
          onClick={openLink}
        >
          <LinkGlyph />
        </Tool>
        <Tool
          label="ხაზი"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          ―
        </Tool>
      </div>

      {linkOpen && (
        <div className={styles.linkRow}>
          <input
            autoFocus
            type="url"
            inputMode="url"
            className={styles.linkField}
            placeholder="https://"
            aria-label="ბმულის მისამართი"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyLink();
              if (event.key === "Escape") setLinkOpen(false);
            }}
          />
          <button type="button" className={styles.linkApply} onClick={applyLink}>
            {/* An emptied field is how you take a link off. */}
            {href.trim() ? "დამატება" : "მოხსნა"}
          </button>
          <button
            type="button"
            className={styles.linkCancel}
            aria-label="დახურვა"
            onClick={() => setLinkOpen(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

type ToolProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function Tool({ label, active = false, disabled, onClick, children }: ToolProps) {
  return (
    <button
      type="button"
      className={active ? `${styles.tool} ${styles.on}` : styles.tool}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // The toolbar must not steal the selection it is about to format.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function QuoteGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 10.5 V8 C3 6 4.2 4.8 6 4.5 M9 10.5 V8 C9 6 10.2 4.8 12 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 8 H6 V11.5 H3 Z M9 8 H12 V11.5 H9 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function ListGlyph({ ordered }: { ordered: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6.5 4 H13.5 M6.5 8 H13.5 M6.5 12 H13.5" />
      </g>
      {ordered ? (
        <g fill="currentColor" fontSize="6" fontFamily="inherit">
          <text x="1.4" y="6">1</text>
          <text x="1.4" y="10">2</text>
          <text x="1.4" y="14">3</text>
        </g>
      ) : (
        <g fill="currentColor">
          <circle cx="2.8" cy="4" r="1.3" />
          <circle cx="2.8" cy="8" r="1.3" />
          <circle cx="2.8" cy="12" r="1.3" />
        </g>
      )}
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M6.6 9.4 L9.4 6.6" />
        <path d="M7.2 4.6 L8.8 3 A2.6 2.6 0 0 1 13 6.6 L11.4 8.2" />
        <path d="M8.8 11.4 L7.2 13 A2.6 2.6 0 0 1 3 9.4 L4.6 7.8" />
      </g>
    </svg>
  );
}
