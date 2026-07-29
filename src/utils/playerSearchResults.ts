export const toPlayerSearchResults = (result: PlayerPayload | PlayerPayload[]) => (
  Array.isArray(result) ? [...result] : [result]
)
