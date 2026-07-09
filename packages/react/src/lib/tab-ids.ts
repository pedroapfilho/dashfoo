const tabDomId = (tabsetId: string, tabId: string): string => `dashfoo-tab-${tabsetId}-${tabId}`;
const panelDomId = (tabsetId: string): string => `dashfoo-panel-${tabsetId}`;

export { panelDomId, tabDomId };
