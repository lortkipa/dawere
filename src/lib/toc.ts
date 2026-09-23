import { slugify } from './utils';

export type Heading = { id: string; text: string; level: 2 | 3 };

const HEADING = /<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/gi;

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gives every h2/h3 an id so the table of contents can link to it, and returns
 * the outline. Runs at render time on HTML that was sanitised on write; the ids
 * come from slugify, so they are always [a-z0-9-] and safe to splice in.
 */
export function withHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const used = new Map<string, number>();

  const out = html.replace(HEADING, (_match, level: string, attrs: string, inner: string) => {
    const text = plain(inner);
    if (!text) return _match;
    const base = `h-${slugify(text, 48)}`;
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    const id = seen === 0 ? base : `${base}-${seen + 1}`;
    headings.push({ id, text, level: Number(level) as 2 | 3 });
    return `<h${level} id="${id}"${attrs ?? ''}>${inner}</h${level}>`;
  });

  return { html: out, headings };
}
