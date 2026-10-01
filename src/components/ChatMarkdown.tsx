import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

// Minimal, safe Markdown for chat replies: paragraphs, bullet/numbered lists, headings,
// **bold**, `code`, ``` code blocks ```, [links](url), bare URLs and emails.
// Builds React elements only (no HTML injection) and only allows http(s), mailto, tel
// and same-site paths as link targets.

const INLINE =
  /(\*\*[^*\n]+\*\*)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s<>()]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

const linkClass = "text-primary underline underline-offset-2 break-words hover:opacity-80";

const renderLink = (label: ReactNode, href: string, key: string): ReactNode => {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link key={key} to={href} className={linkClass}>
        {label}
      </Link>
    );
  }
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    const external = /^https?:/i.test(href);
    return (
      <a
        key={key}
        href={href}
        className={linkClass}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {label}
      </a>
    );
  }
  return <Fragment key={key}>{label}</Fragment>;
};

const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const [token, bold, code, mdLink, url, email] = match;
    const key = `${keyPrefix}-${i++}`;
    if (bold) {
      out.push(<strong key={key}>{renderInline(bold.slice(2, -2), key)}</strong>);
    } else if (code) {
      out.push(
        <code key={key} className="rounded bg-background/60 px-1 py-0.5 font-mono text-[0.85em]">
          {code.slice(1, -1)}
        </code>,
      );
    } else if (mdLink) {
      const split = mdLink.indexOf("](");
      out.push(renderLink(mdLink.slice(1, split), mdLink.slice(split + 2, -1), key));
    } else if (url) {
      // Leave trailing punctuation outside the link.
      const clean = url.replace(/[.,;:!?]+$/, "");
      out.push(renderLink(clean, clean, key));
      if (clean.length < url.length) out.push(url.slice(clean.length));
    } else if (email) {
      out.push(renderLink(email, `mailto:${email}`, key));
    } else {
      out.push(token);
    }
    last = index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

export const ChatMarkdown = ({ content }: { content: string }) => {
  const blocks: ReactNode[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;

  const flushList = () => {
    if (!list) return;
    const key = `l-${blocks.length}`;
    const items = list.items.map((item, i) => <li key={i}>{renderInline(item, `${key}-${i}`)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key} className="list-decimal pl-5 space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={key} className="list-disc pl-5 space-y-1">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const rawLine of lines) {
    if (code) {
      if (rawLine.trim().startsWith("```")) {
        blocks.push(
          <pre key={`c-${blocks.length}`} className="overflow-x-auto rounded-lg bg-background/70 p-3 text-xs">
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      } else {
        code.push(rawLine);
      }
      continue;
    }

    const line = rawLine.trim();
    if (line.startsWith("```")) {
      flushList();
      code = [];
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    flushList();
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const key = `p-${blocks.length}`;
    blocks.push(
      heading ? (
        <p key={key} className="font-semibold">
          {renderInline(heading[1].replace(/\*\*/g, ""), key)}
        </p>
      ) : (
        <p key={key}>{renderInline(line, key)}</p>
      ),
    );
  }
  flushList();
  // Unterminated code block (e.g. while a reply is still streaming).
  if (code) {
    blocks.push(
      <pre key={`c-${blocks.length}`} className="overflow-x-auto rounded-lg bg-background/70 p-3 text-xs">
        <code>{(code as string[]).join("\n")}</code>
      </pre>,
    );
  }

  return <div className="space-y-2 text-sm leading-relaxed break-words">{blocks}</div>;
};
