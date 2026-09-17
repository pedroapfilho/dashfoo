import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

const NotFound = () => (
  <DocsPage>
    <DocsTitle>Page not found</DocsTitle>
    <DocsBody>
      <p>There is no page at this address.</p>
      <p>
        <Link href="/">Back to the docs</Link>
      </p>
    </DocsBody>
  </DocsPage>
);

export default NotFound;
