"use client";

import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { RefreshCw } from "lucide-react";

import { type ErrorBoundaryProps, useErrorHeading } from "@/app/use-error-heading";
import { Button } from "@/components/ui/button";

const RouteError = ({ error, retry }: ErrorBoundaryProps) => {
  const headingRef = useErrorHeading(error);

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
