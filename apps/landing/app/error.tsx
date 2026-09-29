"use client";

import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { Button } from "./_components/button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

const RouteError = ({ error, retry }: RouteErrorProps): ReactNode => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
    headingRef.current?.focus();
  }, [error]);

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
        <h1
          className="max-w-measure-35 text-foreground mx-auto font-mono text-3xl font-semibold tracking-tight text-balance outline-none sm:text-4xl"
          ref={headingRef}
          tabIndex={-1}
        >
          Something went wrong
        </h1>
        <p className="max-w-measure-56 text-muted-foreground mx-auto mt-4 text-base text-pretty">
          This page failed to load. Try again, and if it keeps happening, come back in a few
          minutes.
        </p>
        <div className="mt-8 flex justify-center">
          <Button icon="leading" onClick={retry} variant="primary">
            <RefreshCw aria-hidden="true" className="size-4" /> Try again
          </Button>
        </div>
        {error.digest !== undefined && (
          <p className="text-muted-foreground mt-6 font-mono text-xs">Reference: {error.digest}</p>
        )}
      </div>
    </section>
  );
};

export default RouteError;
