import type { Dispatch, SetStateAction } from "react";
import {
  CANON_TABS,
  type CanonTabId,
} from "../../domain/characterOnboardingModel";
import { readinessBarClass } from "../../domain/characterCanonReadiness";
import type { CharacterCanonRecord } from "../../types/characters";

type CanonTopicProgress = {
  key: string;
  label: string;
  score: number;
  sectionCount: number;
  status: string;
};

type ObjectiveReadiness = {
  label: string;
  description: string;
  score: number;
  weakCriteria: {
    key: string;
    label: string;
    score: number;
    missingHint: string;
  }[];
};

type CanonWorkspaceShellProps = {
  canonTab: CanonTabId;
  setCanonTab: Dispatch<SetStateAction<CanonTabId>>;
  approvedCanon: CharacterCanonRecord | null;
  reviewCanon: CharacterCanonRecord | null;
  deepCanonMessage: {
    type: "success" | "error";
    text: string;
  } | null;
  canonReadinessScore: number;
  objectiveReadiness: ObjectiveReadiness;
  canonTopicProgress: CanonTopicProgress[];
  missingCanonTopics: CanonTopicProgress[];
};

export function CanonWorkspaceShell({
  canonTab,
  setCanonTab,
  approvedCanon,
  reviewCanon,
  deepCanonMessage,
  canonReadinessScore,
  objectiveReadiness,
  canonTopicProgress,
  missingCanonTopics,
}: CanonWorkspaceShellProps) {
  return (
    <>
      <div className="rounded-md border border-blue-900/70 bg-blue-950/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-100">
              Deep character canon
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-blue-100/70">
              This is the source of truth for personality, boundaries, visual DNA, and
              generation context. It is stored in the database as JSON plus a readable
              Markdown rendering, not as loose files.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              approvedCanon
                ? "bg-emerald-950/70 text-emerald-200"
                : reviewCanon
                  ? "bg-blue-950/70 text-blue-200"
                  : "bg-amber-950/70 text-amber-200"
            }`}
          >
            {approvedCanon
              ? `Approved v${approvedCanon.canonVersion}`
              : reviewCanon
                ? `Imported ${reviewCanon.status} v${reviewCanon.canonVersion}`
                : "No approved canon"}
          </span>
        </div>
      </div>

      {deepCanonMessage && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            deepCanonMessage.type === "success"
              ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
              : "border-red-800/60 bg-red-950/40 text-red-200"
          }`}
          role="status"
        >
          {deepCanonMessage.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-surface p-2">
        {CANON_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCanonTab(tab.id)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              canonTab === tab.id
                ? "bg-accent text-white"
                : "bg-surface-overlay text-gray-300 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {canonTab === "overview" && (
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Canon readiness
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                Separate the base character completeness from the operational objective.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-surface-raised p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Character completeness
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Identity, psychology, appearance, voice, limits, scenes, and content.
                  </p>
                </div>
                <span className="text-2xl font-semibold text-gray-100">
                  {canonReadinessScore}%
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className={`h-full rounded-full ${readinessBarClass(canonReadinessScore)}`}
                  style={{ width: `${canonReadinessScore}%` }}
                />
              </div>
            </div>
            <div className="rounded-md border border-border bg-surface-raised p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {objectiveReadiness.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {objectiveReadiness.description}
                  </p>
                </div>
                <span className="text-2xl font-semibold text-gray-100">
                  {objectiveReadiness.score}%
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className={`h-full rounded-full ${readinessBarClass(objectiveReadiness.score)}`}
                  style={{ width: `${objectiveReadiness.score}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {canonTopicProgress.map((topic) => (
              <div
                key={topic.key}
                className="rounded-md border border-border bg-surface-raised px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {topic.label}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      topic.status === "healthy"
                        ? "bg-emerald-950/70 text-emerald-200"
                        : topic.status === "thin"
                          ? "bg-amber-950/70 text-amber-200"
                          : "bg-red-950/70 text-red-200"
                    }`}
                  >
                    {topic.status}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${topic.score}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {topic.sectionCount} section{topic.sectionCount === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
          {missingCanonTopics.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
              Character needs more detail:{" "}
              {missingCanonTopics.map((topic) => topic.label).join(", ")}.
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
              Coverage looks strong. Review the content, then approve only if the character
              feels production-ready.
            </div>
          )}
          <div className="mt-4 rounded-md border border-border bg-surface-raised p-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Objective-specific gaps
            </h5>
            {objectiveReadiness.weakCriteria.length > 0 ? (
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {objectiveReadiness.weakCriteria.map((criterion) => (
                  <div
                    key={criterion.key}
                    className="rounded-md border border-amber-900/40 bg-amber-950/10 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-amber-100">
                        {criterion.label}
                      </span>
                      <span className="text-xs text-amber-200">{criterion.score}%</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-amber-100/75">
                      {criterion.missingHint}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-emerald-200">
                Objective-specific coverage looks strong for this character type.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
