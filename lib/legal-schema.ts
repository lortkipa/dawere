import type { Extensions } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { isSafeHref } from "./post-rules";

// A post's formatting without photos, shared by the admin editor, the save action and the
// public pages.
export const legalExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    underline: false,
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      isAllowedUri: (url) => isSafeHref(url),
    },
  }),
];
