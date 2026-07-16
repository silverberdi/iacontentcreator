type CollapsibleJsonDebugProps = {
  label?: string;
  payload: unknown;
  className?: string;
};

export default function CollapsibleJsonDebug({
  label = "Raw JSON response",
  payload,
  className = "",
}: CollapsibleJsonDebugProps) {
  if (payload === undefined) return null;

  return (
    <details
      className={`rounded-md border border-border-muted bg-surface text-xs text-gray-500 ${className}`}
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-gray-400 hover:text-gray-300">
        {label}
      </summary>
      <pre className="json-debug-scroll max-h-[260px] overflow-auto border-t border-border-muted px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-500">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}
