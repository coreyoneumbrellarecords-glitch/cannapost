/**
 * Older databases may still contain integer primary keys even though the
 * current API contract and Drizzle schema use UUID strings. Normalize IDs at
 * the response boundary so legacy rows remain readable without mutating data.
 */
export function normalizeApiIds<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeApiIds(item)) as T;
  }

  if (value instanceof Date || value === null || typeof value !== "object") {
    return value;
  }

  const normalized = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      key === "id" && typeof item === "number"
        ? String(item)
        : normalizeApiIds(item),
    ]),
  );

  return normalized as T;
}