import { Fragment } from 'react';
import { HL_END, HL_START } from '@/lib/search';

/**
 * Renders a `ts_headline` snippet. Postgres marks matches with sentinels rather
 * than HTML tags, so the text can be rendered as React children — no
 * dangerouslySetInnerHTML, and no way for post content to inject markup here.
 */
export function HighlightText({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(HL_START).flatMap((chunk, index) => {
    if (index === 0) return [{ marked: false, value: chunk }];
    const [marked, ...rest] = chunk.split(HL_END);
    return [
      { marked: true, value: marked },
      { marked: false, value: rest.join(HL_END) },
    ];
  });

  return (
    <>
      {parts.map((part, index) =>
        part.value ? (
          <Fragment key={index}>
            {part.marked ? (
              <mark className="rounded-sm bg-accent-soft px-0.5 font-medium text-ink">{part.value}</mark>
            ) : (
              part.value
            )}
          </Fragment>
        ) : null,
      )}
    </>
  );
}
