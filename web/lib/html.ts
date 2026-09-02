import sanitizeHtml from "sanitize-html";

/**
 * Everything the editor's toolbar can produce, and nothing else. The reader
 * renders stored article HTML verbatim with `dangerouslySetInnerHTML`, and a
 * Server Action is reachable by POST without ever touching our editor — so this
 * runs on the server, on the way *in*, and is the only thing standing between a
 * crafted request and stored XSS on every reader's page.
 */
const ALLOWED_TAGS = [
  "p", "h2", "h3", "strong", "em", "s", "u", "code", "pre",
  "blockquote", "ul", "ol", "li", "a", "br", "hr",
];

/** Block ends stand in for the whitespace HTML implies but does not contain. */
const BLOCK_END = /<\/(?:p|h2|h3|li|blockquote|pre)>|<br\s*\/?>|<hr\s*\/?>/g;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/** Words per minute — the figure behind the "N წუთი" on every article. */
const READING_SPEED = 180;

/** Excerpts are cut to roughly this many characters, at a word boundary. */
const EXCERPT_LENGTH = 180;

export function cleanArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // Links in an article point off the platform, so they open in a new tab
      // and carry no ranking or opener. An anchor with no href is left bare —
      // it is inert text, and dropping it would take its words with it.
      a: (tagName, attribs): sanitizeHtml.Tag =>
        attribs.href
          ? {
              tagName,
              attribs: {
                href: attribs.href,
                rel: "nofollow noopener noreferrer",
                target: "_blank",
              },
            }
          : { tagName, attribs: {} },
    },
  });
}

/**
 * The article as prose: tags gone, entities back to the characters they stand
 * for. Feed it *sanitised* HTML — it is what the word count, the excerpt and
 * the meta description are all measured from.
 */
export function toPlainText(html: string): string {
  const spaced = html.replace(BLOCK_END, " ");
  const stripped = sanitizeHtml(spaced, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return stripped
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(text: string): number {
  return text ? text.split(" ").length : 0;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / READING_SPEED));
}

/** The lede shown on dashboard cards and used as the page's meta description. */
export function excerptFrom(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text;

  const cut = text.slice(0, EXCERPT_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");

  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}
