// Stable ids wiring each tab to its panel (aria-controls / aria-labelledby).
// Shared by tabset-view and tab-button so the wiring stays in one place with no
// circular import between those two modules.
const tabDomId = (tabsetId: string, tabId: string): string => `dashfoo-tab-${tabsetId}-${tabId}`;
const panelDomId = (tabsetId: string): string => `dashfoo-panel-${tabsetId}`;

export { panelDomId, tabDomId };
