const warned = new Set<string>();

const warn = (message: string, cause?: unknown): void => {
  const text = `[dashfoo] ${message}`;
  // oxlint-disable-next-line no-console -- dashfoo reports degraded paths on the developer console instead of failing silently
  console.warn(...(cause === undefined ? [text] : [text, cause]));
};

const warnOnce = (key: string, message: string): void => {
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  warn(message);
};

export { warn, warnOnce };
