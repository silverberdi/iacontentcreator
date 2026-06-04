export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function paginateArray<T>(items: T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) return items;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize: number): number {
  if (pageSize <= 0 || count === 0) return 1;
  return Math.max(1, Math.ceil(count / pageSize));
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesSearch(values: Array<string | number | boolean | null | undefined>, query: string): boolean {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  return values.some((v) => String(v ?? "").toLowerCase().includes(q));
}
