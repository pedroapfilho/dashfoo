const warned = new Set<string>();

const warnOnce = (key: string, message: string): void => {
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  // oxlint-disable-next-line no-console
  console.warn(`[dashfoo] ${message}`);
};

export { warnOnce };
