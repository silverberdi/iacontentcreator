import PageContainer from "./PageContainer";

type HeaderProps = {
  subtitle?: string;
  filterPills?: {
    avatarLabel: string;
    sceneLabel: string;
    assetTypeLabel: string;
  } | null;
};

export default function Header({ subtitle, filterPills }: HeaderProps) {
  return (
    <header className="border-b border-border bg-surface-raised py-5">
      <PageContainer className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Avatares AI — Asset Review Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {subtitle ?? "Review, promote, and reject generated avatar assets"}
          </p>
        </div>
        {filterPills && (
          <div className="flex flex-wrap gap-2 text-sm" aria-label="Asset Review filters">
            <span className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-gray-300">
              {filterPills.avatarLabel}
            </span>
            <span className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-gray-300">
              {filterPills.sceneLabel}
            </span>
            <span className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-gray-300">
              {filterPills.assetTypeLabel}
            </span>
          </div>
        )}
      </PageContainer>
    </header>
  );
}
