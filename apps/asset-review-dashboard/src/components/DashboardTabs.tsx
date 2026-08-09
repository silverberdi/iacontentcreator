import PageContainer from "./PageContainer";

export type DashboardTab =
  | "home"
  | "review"
  | "publications"
  | "characters"
  | "content-cycle"
  | "ops";

const BASE_TABS: { id: DashboardTab; label: string; technicalOnly?: boolean }[] = [
  { id: "home", label: "Home" },
  { id: "review", label: "Asset Review" },
  { id: "publications", label: "Publications" },
  { id: "characters", label: "Characters" },
  { id: "content-cycle", label: "Content Lab", technicalOnly: true },
  { id: "ops", label: "Ops / Admin" },
];

type DashboardTabsProps = {
  activeTab: DashboardTab;
  technicalMode?: boolean;
  onTabChange: (tab: DashboardTab) => void;
};

export default function DashboardTabs({
  activeTab,
  technicalMode = false,
  onTabChange,
}: DashboardTabsProps) {
  const tabs = BASE_TABS.filter((tab) => !tab.technicalOnly || technicalMode);

  return (
    <nav
      className="border-b border-border bg-surface-raised"
      aria-label="Dashboard sections"
    >
      <PageContainer className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
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
