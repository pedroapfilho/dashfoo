import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { codeToHast } from "shiki";

type CodeBlockProps = {
  code: string;
  lang?: string;
};

/**
 * Server-rendered syntax highlighting via shiki. The panel is always dark —
 * a deliberate fixed surface, which reads as intentional and avoids shipping
 * a dual-theme runtime to a static marketing page.
 *
 * shiki's HAST is rendered into real React elements (not raw innerHTML) so the
 * markup goes through JSX escaping like any other component.
 */
const CodeBlock = async ({ code, lang = "tsx" }: CodeBlockProps) => {
  const hast = await codeToHast(code, { lang, theme: "dracula" });

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 font-mono text-sm shadow-lg [&_pre]:overflow-x-auto [&_pre]:p-5 [&_pre]:leading-relaxed">
      {toJsxRuntime(hast, { Fragment, jsx, jsxs })}
    </div>
  );
};

export { CodeBlock };
