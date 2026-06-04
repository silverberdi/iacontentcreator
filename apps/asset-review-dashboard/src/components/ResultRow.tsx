type ResultRowProps = {
  label: string;
  value: string | boolean | number | null | undefined;
};

export function formatResultValue(value: string | boolean | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function ResultRow({ label, value }: ResultRowProps) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 break-words font-mono text-sm text-gray-200">
        {formatResultValue(value)}
      </dd>
    </div>
  );
}
