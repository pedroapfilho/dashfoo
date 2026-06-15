import { codeToHtml } from "shiki";

type CodeBlockProps = {
  code: string;
  lang?: string;
};

/**
 * Server-rendered syntax highlighting via shiki. The panel is always dark —
 * a deliberate fixed surface, which reads as intentional and avoids shipping
 * a dual-theme runtime to a static marketing page.
 */
const CodeBlock = async ({ code, lang = "tsx" }: CodeBlockProps) => {
  const html = await codeToHtml(code, { lang, theme: "dracula" });

  return (
    <div
      className="overflow-hidden rounded-lg border border-white/10 font-mono text-sm shadow-lg [&_pre]:overflow-x-auto [&_pre]:p-5 [&_pre]:leading-relaxed"
      // shiki returns trusted, escaped markup for our own static code string.
      // oxlint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export { CodeBlock };
