// Validation shared by the category dialogs and their actions.

// Latin, so it reads well in URLs and filters; it never changes once made.
export const categorySlugPattern = /^[a-z0-9][a-z0-9-]{1,29}$/;
// The same characters a tag may have, so the label can stand in for the category as a tag.
export const categoryLabelPattern = /^[\p{L}\p{N}][\p{L}\p{N} -]*$/u;
export const maxCategoryLabelLength = 30;
export const maxCategoryEmojiLength = 8;
