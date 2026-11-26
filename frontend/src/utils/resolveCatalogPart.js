// The assistant's part cards carry a projected part whose `price` is already the
// selling price. PartDetailDrawer applies the markup itself and needs catalogue
// fields (minStock, reservedStock, markupOverride...), so it must only ever be
// opened with a full catalogue part. Returns null when none can be found.
export const resolveCatalogPart = async (chatPart, catalogue, fetchParts) => {
  if (!chatPart?.id) return null;
  const loaded = catalogue.find((p) => p.id === chatPart.id);
  if (loaded) return loaded;
  try {
    const rows = await fetchParts(chatPart.sku);
    return (Array.isArray(rows) ? rows : []).find((p) => p.id === chatPart.id) ?? null;
  } catch {
    return null;
  }
};
