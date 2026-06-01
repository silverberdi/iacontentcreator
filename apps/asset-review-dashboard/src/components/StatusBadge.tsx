type StatusBadgeProps = {
  status: string;
};

const statusStyles: Record<string, string> = {
  raw: "bg-slate-700 text-slate-200",
  selected: "bg-blue-900/60 text-blue-200",
  canonical: "bg-emerald-900/60 text-emerald-200",
  rejected: "bg-red-900/60 text-red-200",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const style = statusStyles[normalized] ?? "bg-gray-700 text-gray-200";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${style}`}
    >
      {status}
    </span>
  );
}
