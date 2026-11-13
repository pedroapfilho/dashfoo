const apps = {
  "demo-vite": { name: "dashfoo.demo", port: 4173 },
  docs: { name: "dashfoo.docs", port: 4000 },
  landing: { name: "dashfoo", port: 4100 },
} as const;

const urlEnv = {
  NEXT_PUBLIC_DEMO_URL: ["demo-vite"],
  NEXT_PUBLIC_DOCS_URL: ["docs"],
  NEXT_PUBLIC_WEB_URL: ["landing"],
} as const satisfies Record<string, ReadonlyArray<keyof typeof apps>>;

export { apps, urlEnv };
