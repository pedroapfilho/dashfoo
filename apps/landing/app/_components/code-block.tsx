import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { codeToHast } from "shiki";

type CodeBlockProps = {
  code: string;
  lang?: string;
};

const CodeBlock = async ({ code, lang = "tsx" }: CodeBlockProps) => {
  const hast = await codeToHast(code, {
    defaultColor: false,
    lang,
    themes: { dark: "vitesse-dark", light: "vitesse-light" },
  });

  return (
    <div className="border-dashfoo-border bg-dashfoo-code-bg rounded-dashfoo [&_pre]:focus-visible:outline-dashfoo-ring overflow-hidden border text-base/7 sm:text-sm/6 [&_pre]:overflow-x-auto [&_pre]:p-5 [&_pre]:focus-visible:outline-2 [&_pre]:focus-visible:outline-offset-2">
      {toJsxRuntime(hast, { Fragment, jsx, jsxs })}
    </div>
  );
};

export { CodeBlock };
