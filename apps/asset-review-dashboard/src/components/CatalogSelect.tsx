import type { CatalogSelectOption } from "../types/catalogs";
import InfoTooltip from "./InfoTooltip";

type CatalogSelectProps = {
  label: string;
  hint?: string;
  tooltip?: string;
  value: string;
  options: CatalogSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
};

const controlClass =
  "rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent disabled:opacity-50";

export default function CatalogSelect({
  label,
  hint,
  tooltip,
  value,
  options,
  onChange,
  disabled = false,
  emptyLabel = "— No options —",
  className = "",
}: CatalogSelectProps) {
  const safeValue = value || "";
  const hasMatch = options.some((o) => o.value === safeValue);

  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="inline-flex items-center text-gray-400">
        {label}
        {tooltip && <InfoTooltip text={tooltip} label={`${label} help`} />}
      </span>
      {hint && !tooltip && <span className="text-xs leading-snug text-gray-500">{hint}</span>}
      <select
        value={hasMatch ? safeValue : options[0]?.value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className={controlClass}
      >
        {options.length === 0 ? (
          <option value="">{emptyLabel}</option>
        ) : (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.provider ? ` (${option.provider})` : ""}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
