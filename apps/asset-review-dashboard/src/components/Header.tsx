import { getAssetTypeLabel, getAvatarLabel, getSceneLabel } from "../data/catalogs";

type HeaderProps = {
  avatar: string;
  scene: string;
  assetType: string;
};

export default function Header({ avatar, scene, assetType }: HeaderProps) {
  return (
    <header className="border-b border-border bg-surface-raised px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Avatares AI — Asset Review Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Review, promote, and reject generated avatar assets
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-gray-300">
            {getAvatarLabel(avatar)}
          </span>
          <span className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-gray-300">
            {getSceneLabel(scene)}
          </span>
          <span className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-gray-300">
            {getAssetTypeLabel(assetType)}
          </span>
        </div>
      </div>
    </header>
  );
}
