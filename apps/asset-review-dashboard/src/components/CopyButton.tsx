import { useCallback, useEffect, useState } from "react";
import { copyToClipboard } from "../utils/clipboard";

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export default function CopyButton({ value, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`rounded-md border border-border bg-surface-overlay px-2.5 py-1 text-xs text-gray-300 transition hover:border-gray-500 hover:text-white ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
