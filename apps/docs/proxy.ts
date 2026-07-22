import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { type NextRequest, NextResponse } from "next/server";

const { rewrite } = rewritePath("/{*path}", "/llms.mdx/{*path}");

const proxy = (request: NextRequest) => {
  if (isMarkdownPreferred(request)) {
    const result = rewrite(request.nextUrl.pathname);
    if (typeof result === "string" && result !== "") {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return NextResponse.next();
};

export const config = {
  // oxlint-disable-next-line unicorn/prefer-string-raw
  matcher: ["/((?!api|llms\\.mdx|llms\\.txt|llms-full\\.txt|_next|.*\\.).*)"],
};

export default proxy;
