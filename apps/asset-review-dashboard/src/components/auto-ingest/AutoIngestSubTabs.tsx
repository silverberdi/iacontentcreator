export type AutoIngestSubTab = "profiles" | "runner" | "preview";

const TABS: { id: AutoIngestSubTab; label: string }[] = [
  { id: "profiles", label: "Profiles" },
  { id: "runner", label: "Runner / Watcher" },
  { id: "preview", label: "Preview / Last Run" },
];

type AutoIngestSubTabsProps = {
  active: AutoIngestSubTab;
  onChange: (tab: AutoIngestSubTab) => void;
};

export default function AutoIngestSubTabs({ active, onChange }: AutoIngestSubTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            active === tab.id
              ? "bg-accent text-white"
              : "border border-border text-gray-300 hover:border-gray-500"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
