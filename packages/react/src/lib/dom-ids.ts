const tabDomId = (documentId: string, tabsetId: string, tabId: string): string =>
  `dashfoo-tab-${encodeURIComponent(JSON.stringify([documentId, tabsetId, tabId]))}`;

const panelDomId = (documentId: string, tabsetId: string): string =>
  `dashfoo-panel-${encodeURIComponent(JSON.stringify([documentId, tabsetId]))}`;

const resizePanelId = (documentId: string, nodeId: string): string =>
  `dashfoo-resize-${encodeURIComponent(JSON.stringify([documentId, nodeId]))}`;

export { panelDomId, resizePanelId, tabDomId };
