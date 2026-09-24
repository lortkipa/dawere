import sanitizeHtml from 'sanitize-html';

/**
 * Post bodies are stored as HTML, so every write goes through this allow-list.
 * It mirrors exactly what the TipTap editor can produce — nothing more.
 */
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'mark',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'hr',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan', 'colwidth', 'style'],
    td: ['colspan', 'rowspan', 'colwidth', 'style'],
    col: ['style'],
    p: ['style'],
    h1: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
  },
  // TipTap emits text-align inline; keep that and drop every other declaration.
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      'min-width': [/^\d+(\.\d+)?px$/],
      width: [/^\d+(\.\d+)?px$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  transformTags: {
    // External links open safely; internal ones behave normally.
    a: (tagName, attribs) => {
      const href = attribs.href ?? '';
      const isExternal = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: isExternal
          ? { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' }
          : { ...attribs },
      };
    },
  },
};

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, options);
}

/** Plain-text mirror used for search indexing, excerpts and reading time. */
export function htmlToText(html: string): string {
  // Stripping tags alone would weld the last word of one block to the first word
  // of the next ("…clean HTML.A heading…"), which corrupts both the search
  // vector and the excerpt. Give every block boundary a space first.
  const spaced = html.replace(/<\/(p|h[1-6]|li|td|th|tr|blockquote|pre|div)>|<br\s*\/?>/gi, ' ');

  return stripTags(spaced).replace(/\s+/g, ' ').trim();
}

/**
 * Plain text that keeps the article's shape — a blank line between blocks, one
 * line per list item — for readers that follow structure, like the assistant.
 */
export function htmlToParagraphs(html: string): string {
  const broken = html
    .replace(/<\/(p|h[1-6]|blockquote|pre|div|table)>/gi, '\n\n')
    .replace(/<\/(li|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' ');

  return stripTags(broken)
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripTags(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** True when the editor produced nothing but empty paragraphs. */
export function isBlankHtml(html: string): boolean {
  return htmlToText(html).length === 0 && !/<(img|hr|table)\b/i.test(html);
}
