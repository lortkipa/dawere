import "server-only";
import type { JSONContent } from "@tiptap/core";
import { cache } from "react";
import type { DialogArtName } from "@/components/dialog-art";
import { getLegal } from "./legal";

export type HelpTopic = { slug: string; title: string; art: DialogArtName; content: JSONContent[]; text: string };

// Pictures for the topics in the built-in text, by heading. A topic an admin adds gets the plain one.
const arts: Record<string, DialogArtName> = {
  შესვლა: "email",
  პროფილი: "profile",
  წერა: "write",
  არხი: "topics",
  რჩეულები: "favorites",
  "ai ჩატი": "comment",
  ჩივილი: "report",
  პარამეტრები: "theme",
};

// Words inside a paragraph are already spaced; separate blocks need a space between them.
function textOf(node: JSONContent): string {
  if (node.text) return node.text;
  const inline = node.type === "paragraph" || node.type === "heading";
  return (node.content ?? []).map(textOf).join(inline ? "" : " ");
}

// The help document split at its level-2 headings: each one starts a topic with its own card on
// /help and its own page. Anything above the first heading isn't shown.
export function splitTopics(body: JSONContent): HelpTopic[] {
  const topics: HelpTopic[] = [];
  for (const node of body.content ?? []) {
    const title = node.type === "heading" && node.attrs?.level === 2 ? textOf(node).trim().replace(/\s+/g, " ") : "";
    if (title) {
      const base = title.toLowerCase().replace(/\s+/g, "-");
      let slug = base;
      for (let n = 2; topics.some((topic) => topic.slug === slug); n++) slug = `${base}-${n}`;
      topics.push({ slug, title, art: arts[title.toLowerCase()] ?? "help", content: [], text: "" });
    } else {
      topics.at(-1)?.content.push(node);
    }
  }
  for (const topic of topics) topic.text = topic.content.map(textOf).join(" ").replace(/\s+/g, " ").trim();
  return topics;
}

export const getHelpTopics = cache(async () => splitTopics((await getLegal("help")).body));
