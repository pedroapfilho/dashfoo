"use client";

import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

const RouteError = ({ error, retry }: RouteErrorProps) => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
    headingRef.current?.focus();
  }, [error]);

  return (
    <DocsPage>
      <DocsTitle className="outline-none" ref={headingRef} tabIndex={-1}>
        Something went wrong
      </DocsTitle>
      <DocsBody>
        <p>This page failed to render. Try again, and if it keeps happening, reload the page.</p>
        {error.digest !== undefined && (
          <p>
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <Button onClick={retry} variant="outline">
          <RefreshCw aria-hidden="true" data-icon="inline-start" />
          Try again
        </Button>
      </DocsBody>
    </DocsPage>
  );
};

export default RouteError;
