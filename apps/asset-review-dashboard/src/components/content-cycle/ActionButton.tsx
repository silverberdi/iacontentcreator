import type { ReactNode } from "react";

type ActionButtonProps = {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  variant?: "default" | "primary";
  className?: string;
};

export default function ActionButton({
  active = false,
  disabled = false,
  onClick,
  children,
  variant = "default",
  className = "",
}: ActionButtonProps) {
  const base =
    "rounded-md border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50";

  let styles = `${base} border-border bg-surface-overlay text-gray-200 hover:border-gray-500`;
  if (active) {
    styles = `${base} border-accent bg-accent/15 font-medium text-white ring-1 ring-accent/40`;
  } else if (variant === "primary") {
    styles = `${base} border-accent bg-accent text-white hover:bg-accent-hover font-medium`;
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${styles} ${className}`}>
      {children}
    </button>
  );
}
