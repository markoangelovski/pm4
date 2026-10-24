"use client";

import type { ComponentProps, ElementType } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * The Markdown PM4 supports: GitHub-flavoured Markdown without raw HTML (react-markdown escapes it) and without
 * images (no file storage). Every element maps to an Editor.js block, so a note can sync to PMSPA later.
 */
const DISALLOWED = ["img"];

/**
 * A styled element for react-markdown: drops the syntax-tree `node` it passes (the DOM mustn't get it) and adds
 * `className` (a function of the element's own class, e.g. GFM's `contains-task-list`).
 */
function styled<T extends ElementType>(
  Tag: T,
  className: string | ((own: string | undefined) => string)
) {
  function Styled(props: ComponentProps<T> & { node?: unknown }) {
    const { node, className: own, ...rest } = props;
    void node;
    const extra = typeof className === "function" ? className(own) : className;
    const Element = Tag as ElementType;
    return <Element className={cn(extra, own)} {...rest} />;
  }
  return Styled;
}

const heading = "mt-3 mb-1.5 text-sm font-semibold first:mt-0";

const components: Components = {
  h1: styled("h3", "mt-4 mb-2 text-lg font-semibold first:mt-0"),
  h2: styled("h4", "mt-4 mb-2 text-base font-semibold first:mt-0"),
  h3: styled("h5", heading),
  h4: styled("h6", heading),
  h5: styled("h6", heading),
  h6: styled("h6", heading),
  p: styled("p", "my-2 first:mt-0 last:mb-0"),
  a: ({ node, ...props }) => {
    void node;
    return (
      <a
        className="text-primary underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    );
  },
  ul: styled("ul", (own) =>
    own?.includes("contains-task-list")
      ? "my-2 list-none pl-0 [&_ul]:pl-5"
      : "my-2 list-disc pl-5"
  ),
  ol: styled("ol", "my-2 list-decimal pl-5"),
  li: styled("li", (own) =>
    cn("my-0.5", own?.includes("task-list-item") && "flex items-start gap-2")
  ),
  input: ({ node, ...props }) => {
    void node;
    return (
      <input
        {...props}
        disabled
        className="mt-1 size-3.5 shrink-0 accent-primary"
      />
    );
  },
  blockquote: styled(
    "blockquote",
    "my-2 border-l-2 pl-3 text-muted-foreground"
  ),
  // A fenced block's code has a `language-*` class; inline code has none.
  code: styled("code", (own) =>
    own
      ? "font-mono text-xs"
      : "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
  ),
  pre: styled(
    "pre",
    "my-2 overflow-x-auto rounded-md bg-muted p-3 [&_code]:bg-transparent [&_code]:p-0"
  ),
  hr: styled("hr", "my-3 border-border"),
  table: ({ node, ...props }) => {
    void node;
    return (
      <div className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...props} />
      </div>
    );
  },
  th: styled("th", "border px-2 py-1 text-left font-medium"),
  td: styled("td", "border px-2 py-1")
};

/** A note's body, rendered. */
export function Markdown({
  children,
  className
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={DISALLOWED}
        unwrapDisallowed
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
