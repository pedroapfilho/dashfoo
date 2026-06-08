import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { type NextRequest, NextResponse } from "next/server";

const { rewrite } = rewritePath("/{*path}", "/llms.mdx/{*path}");

/**
 * Content negotiation: when an AI agent requests a docs URL with
 * `Accept: text/markdown`, rewrite it to the Markdown route. Browsers
 * (which prefer text/html) keep getting the rendered page.
 */
const proxy = (request: NextRequest) => {
  if (isMarkdownPreferred(request)) {
    const result = rewrite(request.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return NextResponse.next();
};

// Negotiation lives at the site root, so scope it to rendered doc pages only:
// skip the Markdown/llms endpoints (else they'd be rewritten onto themselves),
// the search API, and any file-extension asset.
export const config = {
  // A plain string literal so Next can statically extract the matcher.
  // oxlint-disable-next-line unicorn/prefer-string-raw
  matcher: ["/((?!api|llms\\.mdx|llms\\.txt|llms-full\\.txt|_next|.*\\.).*)"],
};

export default proxy;
