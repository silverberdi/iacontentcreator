import type {
  CharacterReferenceRecord,
  CharacterSceneDraft,
} from "../../types/characters";

type SceneCanonBoardProps = {
  avatar: string;
  referencesLoading: boolean;
  referenceSaving: boolean;
  visualSceneRows: CharacterSceneDraft[];
  sceneCanonByScene: Map<string, CharacterReferenceRecord>;
  sceneCandidatesByScene: Map<string, CharacterReferenceRecord[]>;
  onRefreshReferences: () => void;
  onPromoteSceneCanon: (reference: CharacterReferenceRecord) => void;
};

export function SceneCanonBoard({
  avatar,
  referencesLoading,
  referenceSaving,
  visualSceneRows,
  sceneCanonByScene,
  sceneCandidatesByScene,
  onRefreshReferences,
  onPromoteSceneCanon,
}: SceneCanonBoardProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Scene canon board
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            This is the visual map used by generation: one shared scene name, but one
            approved visual reference per character when the scene needs identity or mood
            guidance. New scene canon is usually approved from Asset Review.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshReferences}
          disabled={!avatar || referencesLoading}
          className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 disabled:opacity-40"
        >
          {referencesLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {visualSceneRows.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-gray-500">
          No scenes are assigned to this character yet. Add shared scenes from the
          character canon or catalog first.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visualSceneRows.map((scene) => {
            const canon = sceneCanonByScene.get(scene.scene);
            const candidates = sceneCandidatesByScene.get(scene.scene) ?? [];
            return (
              <article
                key={scene.scene}
                className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[120px_1fr] ${
                  canon
                    ? "border-emerald-900/60 bg-emerald-950/10"
                    : "border-border bg-surface-raised"
                }`}
              >
                <div className="aspect-square overflow-hidden rounded-md border border-border bg-black/30">
                  {canon ? (
                    <a href={canon.url} target="_blank" rel="noreferrer">
                      <img
                        src={canon.url}
                        alt={`${scene.displayName} scene canon`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-500">
                      No scene canon yet
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-100">{scene.displayName}</h4>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        canon
                          ? "bg-emerald-950/60 text-emerald-200"
                          : candidates.length
                            ? "bg-amber-950/60 text-amber-200"
                            : "bg-surface-overlay text-gray-400"
                      }`}
                    >
                      {canon
                        ? "Ready"
                        : candidates.length
                          ? `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`
                          : "Missing"}
                    </span>
                  </div>
                  {scene.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                      {scene.description}
                    </p>
                  )}
                  {canon ? (
                    <>
                      <p className="mt-2 break-all font-mono text-xs text-gray-500">
                        {canon.objectPath}
                      </p>
                      {canon.reviewNotes && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                          {canon.reviewNotes}
                        </p>
                      )}
                    </>
                  ) : candidates.length ? (
                    <button
                      type="button"
                      onClick={() => onPromoteSceneCanon(candidates[0])}
                      disabled={referenceSaving}
                      className="mt-3 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Use latest candidate as scene canon
                    </button>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Generate or upload a good image for this character in this scene,
                      then approve it from Asset Review.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
