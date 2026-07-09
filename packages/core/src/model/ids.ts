const createNodeId = (prefix = "node"): string => `${prefix}-${crypto.randomUUID()}`;

const createTabId = (): string => createNodeId("tab");

export { createNodeId, createTabId };
