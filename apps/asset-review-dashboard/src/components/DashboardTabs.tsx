import PageContainer from "./PageContainer";

export type DashboardTab = "review" | "auto-ingest" | "backups" | "catalogs";

const TABS: { id: DashboardTab; label: string }[] = [
  { id: "review", label: "Asset Review" },
  { id: "auto-ingest", label: "Auto Ingest" },
  { id: "backups", label: "Backups" },
  { id: "catalogs", label: "Catalogs" },
];

type DashboardTabsProps = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
};

export default function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <nav
      className="border-b border-border bg-surface-raised"
      aria-label="Dashboard sections"
    >
      <PageContainer className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-accent text-white"
                  : "border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </PageContainer>
    </nav>
  );
}
