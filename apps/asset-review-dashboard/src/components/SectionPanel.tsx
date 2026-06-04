import type { ReactNode } from "react";

type SectionPanelProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function SectionPanel({
  title,
  description,
  actions,
  children,
}: SectionPanelProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-300">
            {title}
          </h3>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
