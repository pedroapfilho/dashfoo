"use client";

import styles from "./global-error.module.css";
import { type ErrorBoundaryProps, useErrorHeading } from "./use-error-heading";

const GlobalError = ({ error, retry }: ErrorBoundaryProps) => {
  const headingRef = useErrorHeading(error);

  return (
    <html className={styles.document} lang="en">
      <body className={styles.body}>
        <title>Something went wrong</title>
        <main className={styles.main}>
          <h1 className={styles.heading} ref={headingRef} tabIndex={-1}>
            Something went wrong
          </h1>
          <p className={styles.text}>
            The dashfoo docs stopped unexpectedly. Try again, and if the problem continues, reload
            the page or come back in a few minutes.
          </p>
          <button className={styles.button} onClick={retry} type="button">
            Try again
          </button>
          {error.digest !== undefined && <p className={styles.digest}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
