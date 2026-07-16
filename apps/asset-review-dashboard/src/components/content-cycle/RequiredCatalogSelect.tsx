import type { CatalogSelectOption } from "../../types/catalogs";

type RequiredCatalogSelectProps = {
  label: string;
  value: string;
  options: CatalogSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

const controlClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50";

export default function RequiredCatalogSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  className = "",
}: RequiredCatalogSelectProps) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || options.length === 0}
        className={controlClass}
        aria-required
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.provider ? ` (${option.provider})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
