import type { Extensions } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { StarterKit } from "@tiptap/starter-kit";
import { isSafeHref } from "./post-rules";

// One list for the editor, the publish action's validation and the read page, so the three
// always agree on what a post can contain.
export const postExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    // Underlined text reads as a link.
    underline: false,
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      isAllowedUri: (url) => isSafeHref(url),
    },
  }),
  // Only photos the editor added itself parse from HTML: pasted pages bring remote images,
  // which the publish action would refuse.
  Image.extend({
    parseHTML: () => [{ tag: 'img[src^="blob:"]' }],
  }),
];
