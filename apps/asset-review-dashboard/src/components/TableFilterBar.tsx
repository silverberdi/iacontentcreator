import { PAGE_SIZE_OPTIONS } from "../utils/tableUi";

type TableFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
};

export default function TableFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: TableFilterBarProps) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        disabled={disabled}
        className="w-full min-w-[200px] max-w-md rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent disabled:opacity-50 sm:flex-1"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <label className="flex items-center gap-1.5">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="rounded-md border border-border bg-surface-overlay px-2 py-1 text-gray-200 disabled:opacity-50"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span>
          {totalItems === 0 ? "0 items" : `${from}–${to} of ${totalItems}`}
        </span>
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-border px-2 py-1 text-gray-200 hover:border-gray-500 disabled:opacity-40"
        >
          Prev
        </button>
        <span>
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-border px-2 py-1 text-gray-200 hover:border-gray-500 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
