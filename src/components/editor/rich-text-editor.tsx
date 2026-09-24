'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Columns3,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Rows3,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadResult } from '@/lib/upload-client';

/* ------------------------------------------------------------------ toolbar */

function ToolButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Keep focus in the document so commands apply to the current selection.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-35',
        active ? 'bg-hover text-ink' : 'text-muted hover:bg-hover hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-line" aria-hidden />;
}

/* --------------------------------------------------------------- link popover */

function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [value, setValue] = useState(() => (editor.getAttributes('link').href as string) ?? 'https://');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.select(), []);

  function apply() {
    const href = value.trim();
    if (!href || href === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const normalized = /^https?:\/\//i.test(href) || href.startsWith('mailto:') ? href : `https://${href}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
    }
    onClose();
  }

  return (
    <div className="animate-pop-in absolute top-full left-3 z-30 mt-2 flex w-80 max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-xl border border-line bg-raised p-1.5 shadow-lift">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
          if (e.key === 'Escape') onClose();
        }}
        placeholder="https://example.com"
        className="h-8 min-w-0 flex-1 rounded-md bg-sunken px-2.5 text-sm text-ink placeholder:text-subtle focus:outline-none"
      />
      <button
        type="button"
        onClick={apply}
        className="h-8 shrink-0 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-contrast hover:bg-primary-hover"
      >
        დადასტურება
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------- editor */

export function RichTextEditor({
  initialContent,
  onChange,
  onReady,
  onUploadImage,
  onError,
}: {
  initialContent: string;
  /** The new HTML, plus its plain-text length for the live reading estimate. */
  onChange: (html: string, textLength: number) => void;
  onReady?: (textLength: number) => void;
  onUploadImage: (file: File) => Promise<UploadResult>;
  onError?: (message: string) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    // Required in the App Router: the editor must not render during SSR.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
        codeBlock: { HTMLAttributes: { spellcheck: 'false' } },
      }),
      Placeholder.configure({ placeholder: 'მოჰყევი შენი ამბავი…' }),
      CharacterCount,
      Highlight,
      Image.configure({ HTMLAttributes: { loading: 'lazy' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: true, HTMLAttributes: { class: 'dawere-table' } } }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'article focus:outline-none',
        spellcheck: 'true',
      },
    },
    onCreate: ({ editor: instance }) => onReady?.(instance.storage.characterCount.characters()),
    onUpdate: ({ editor: instance }) =>
      onChange(instance.getHTML(), instance.storage.characterCount.characters()),
  });

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      try {
        const result = await onUploadImage(file);
        if (result.url) editor.chain().focus().setImage({ src: result.url }).run();
        else onError?.(result.error ?? 'სურათის ატვირთვა ვერ მოხერხდა.');
      } finally {
        setUploading(false);
      }
    },
    [editor, onUploadImage, onError],
  );

  // Pasting or dropping an image uploads it instead of embedding a huge data URL.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    function onPaste(event: ClipboardEvent) {
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        void insertImage(file);
      }
    }

    function onDrop(event: DragEvent) {
      const file = [...(event.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) {
        event.preventDefault();
        void insertImage(file);
      }
    }

    dom.addEventListener('paste', onPaste);
    dom.addEventListener('drop', onDrop);
    return () => {
      dom.removeEventListener('paste', onPaste);
      dom.removeEventListener('drop', onDrop);
    };
  }, [editor, insertImage]);

  if (!editor) {
    return (
      <div aria-hidden>
        <div className="shimmer mb-8 h-11 rounded-xl" />
        <div className="space-y-3">
          <div className="shimmer h-4 w-full rounded" />
          <div className="shimmer h-4 w-11/12 rounded" />
          <div className="shimmer h-4 w-4/5 rounded" />
        </div>
      </div>
    );
  }

  const inTable = editor.isActive('table');

  return (
    <div>
      {/* One row that scrolls sideways on phones; wraps from sm up. */}
      <div className="sticky top-14 z-20 -mx-4 mb-8 border-y border-line bg-surface/90 py-1 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:bg-raised/90 sm:px-1.5 sm:shadow-soft">
        <div className="no-scrollbar relative flex items-center gap-0.5 overflow-x-auto px-4 sm:flex-wrap sm:overflow-visible sm:px-0">
          <ToolButton
            label="დაბრუნება"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton
            label="გამეორება"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo2 className="size-4" />
          </ToolButton>

          <Separator />

          <ToolButton
            label="სათაური 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="size-4" />
          </ToolButton>
          <ToolButton
            label="სათაური 3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="size-4" />
          </ToolButton>
          <ToolButton
            label="სათაური 4"
            active={editor.isActive('heading', { level: 4 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          >
            <Heading4 className="size-4" />
          </ToolButton>

          <Separator />

          <ToolButton
            label="მსხვილი"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolButton>
          <ToolButton
            label="დახრილი"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolButton>
          <ToolButton
            label="ხაზგასმული"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="size-4" />
          </ToolButton>
          <ToolButton
            label="გადახაზული"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-4" />
          </ToolButton>
          <ToolButton
            label="მარკერი"
            active={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="size-4" />
          </ToolButton>

          <Separator />

          <ToolButton
            label="ნუსხა"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolButton>
          <ToolButton
            label="დანომრილი სია"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolButton>
          <ToolButton
            label="ციტატა"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-4" />
          </ToolButton>
          <ToolButton
            label="კოდი ტექსტში"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code className="size-4" />
          </ToolButton>
          <ToolButton
            label="კოდის ბლოკი"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code2 className="size-4" />
          </ToolButton>

          <Separator />

          <ToolButton
            label="მარცხნივ სწორება"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="size-4" />
          </ToolButton>
          <ToolButton
            label="ცენტრში სწორება"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="size-4" />
          </ToolButton>
          <ToolButton
            label="მარჯვნივ სწორება"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className="size-4" />
          </ToolButton>

          <Separator />

          <ToolButton label="ბმული" active={editor.isActive('link')} onClick={() => setLinkOpen((v) => !v)}>
            <Link2 className="size-4" />
          </ToolButton>
          {editor.isActive('link') ? (
            <ToolButton
              label="ბმულის მოხსნა"
              onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
            >
              <Link2Off className="size-4" />
            </ToolButton>
          ) : null}
          <ToolButton label="სურათის ჩასმა" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          </ToolButton>
          <ToolButton
            label="ცხრილის ჩასმა"
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            <TableIcon className="size-4" />
          </ToolButton>
          <ToolButton label="გამყოფი ხაზი" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="size-4" />
          </ToolButton>

          {inTable ? (
            <>
              <Separator />
              <ToolButton label="სვეტის დამატება" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                <Columns3 className="size-4" />
              </ToolButton>
              <ToolButton label="მწკრივის დამატება" onClick={() => editor.chain().focus().addRowAfter().run()}>
                <Rows3 className="size-4" />
              </ToolButton>
              <ToolButton label="ცხრილის წაშლა" onClick={() => editor.chain().focus().deleteTable().run()}>
                <Trash2 className="size-4" />
              </ToolButton>
            </>
          ) : null}

        </div>
        {/* Outside the scrolling row, which would otherwise clip it on phones. */}
        {linkOpen ? <LinkPopover editor={editor} onClose={() => setLinkOpen(false)} /> : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void insertImage(file);
          event.target.value = '';
        }}
      />

      <EditorContent editor={editor} />
    </div>
  );
}
