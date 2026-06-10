// Unique ids for nodes and tabs. The reducer uses these for split/dock surgery;
// they are public so consumers building addNode/moveNode payloads (or seed
// models) have one blessed generator instead of rolling their own.
const createNodeId = (prefix = "node"): string => `${prefix}-${crypto.randomUUID()}`;

const createTabId = (): string => createNodeId("tab");

export { createNodeId, createTabId };
