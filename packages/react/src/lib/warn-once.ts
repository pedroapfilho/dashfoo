const warned = new Set<string>();

const warnOnce = (key: string, message: string): void => {
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  // oxlint-disable-next-line no-console -- dashfoo reports degraded paths on the developer console instead of failing silently
  console.warn(`[dashfoo] ${message}`);
};

export { warnOnce };
