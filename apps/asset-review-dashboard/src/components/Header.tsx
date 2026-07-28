import PageContainer from "./PageContainer";
import { logout } from "../api/authApi";
import type { AuthUser } from "../types/auth";

type HeaderProps = {
  title?: string;
  subtitle?: string;
  currentUser: AuthUser;
  filterPills?: {
    avatarLabel: string;
    sceneLabel: string;
  } | null;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AI";
}

export default function Header({
  title = "Home",
  subtitle,
  currentUser,
  filterPills,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-surface-raised py-2.5">
      <PageContainer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            {title}
          </h1>
          <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-xs text-gray-400">
            {subtitle ?? "What needs attention next"}
          </span>
          {filterPills && (
            <div className="flex flex-wrap gap-2 text-xs" aria-label="Asset Review filters">
              <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                {filterPills.avatarLabel}
              </span>
              <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                {filterPills.sceneLabel}
              </span>
            </div>
          )}
        </div>

        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-surface-overlay px-2 py-1.5 text-sm text-gray-200 hover:border-gray-500">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
              {initials(currentUser.name)}
            </span>
            <span className="max-w-[140px] truncate">{currentUser.name.split(/\s+/)[0] || currentUser.email}</span>
            <span className="text-xs text-gray-500">▾</span>
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-surface-raised p-2 shadow-2xl shadow-black/40">
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium text-gray-100">{currentUser.name}</p>
              <p className="truncate text-xs text-gray-500">{currentUser.email}</p>
              <p className="mt-1 text-xs text-gray-500">
                {currentUser.technicalMode ? "Technical admin" : "Editor"}
              </p>
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm text-gray-400"
              disabled
            >
              Profile
            </button>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-400"
              disabled
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => void logout().then(() => window.location.assign("/"))}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-200 hover:bg-red-950/40"
            >
              Sign out
            </button>
          </div>
        </details>
      </PageContainer>
    </header>
  );
}
