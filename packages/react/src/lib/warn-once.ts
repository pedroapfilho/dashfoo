// Dev warnings for soft misuse (duplicate parts, orphan tabs, missing editors)
// fire once per key so a render loop can't flood the console, mirroring the
// unregistered-component warning in dashfoo-layout.
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
