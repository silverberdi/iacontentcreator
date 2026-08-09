import { useState } from "react";
import type {
  PublicationAssetSummary,
  PublicationQaResult,
} from "../../types/publications";

export const QUALITY_CRITERIA = [
  { id: "identity", label: "Identity", help: "Same Estefania face and recognizable visual identity." },
  { id: "face", label: "Face", help: "Natural expression, no warped smile, eyes, or skin." },
  { id: "hands", label: "Hands", help: "Hands are natural if visible; no extra or malformed fingers." },
  { id: "feet", label: "Feet", help: "Feet are natural if visible; no malformed toes or awkward distortion." },
  { id: "composition", label: "Composition", help: "Usable crop, clear subject, no distracting body geometry." },
  { id: "brandFit", label: "Brand fit", help: "Matches Estefania's lifestyle, warm, authentic positioning." },
  { id: "publishability", label: "Publishability", help: "Safe to use as a real Instagram candidate." },
] as const;

export const REJECTION_REASONS = [
  { id: "identity-drift", label: "Identity drift" },
  { id: "face-artifact", label: "Face artifact" },
  { id: "hand-artifact", label: "Hand artifact" },
  { id: "foot-artifact", label: "Foot artifact" },
  { id: "bad-composition", label: "Bad composition" },
  { id: "brand-mismatch", label: "Brand mismatch" },
  { id: "not-publishable", label: "Not publishable" },
  { id: "not-canonical-quality", label: "Not canonical quality" },
] as const;

export type QualityCriterionId = (typeof QUALITY_CRITERIA)[number]["id"];

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function assetImageUrl(asset: PublicationAssetSummary | null): string | null {
  if (!asset) return null;
  const directUrl = asset.url || asset.publicUrl || asset.imageUrl;
  if (typeof directUrl === "string" && directUrl.trim()) return directUrl.trim();
  if (!asset.bucket || !asset.objectPath) return null;
  return `/minio/${encodeURIComponent(asset.bucket)}/${String(asset.objectPath)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export function PublicationAssetPreview({ asset }: { asset: PublicationAssetSummary }) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = assetImageUrl(asset);

  if (!url || imageFailed) {
    return (
      <div className="flex aspect-[4/5] min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface p-4 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Image preview unavailable
        </span>
        {asset.objectPath && (
          <p className="mt-2 break-all font-mono text-xs text-gray-400">{asset.objectPath}</p>
        )}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-md border border-border bg-black/40"
    >
      <img
        src={url}
        alt={`Publication asset ${asset.assetId || ""}`}
        onError={() => setImageFailed(true)}
        className="aspect-[4/5] w-full object-cover transition duration-200 group-hover:scale-[1.01] group-hover:brightness-110"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
        Open image
      </span>
    </a>
  );
}

export function humanizeQaText(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function qualityStatusLabel(status: string, defective: boolean): string {
  if (status === "pass") return "Looks safe";
  if (status === "blocked" || defective) return "Blocked by QA";
  if (status === "review_required") return "Check carefully";
  return "Not checked yet";
}

function qualityStatusClass(status: string, defective: boolean): string {
  if (status === "pass") return "border-emerald-800/60 bg-emerald-950/20 text-emerald-200";
  if (status === "blocked" || defective) return "border-red-800/60 bg-red-950/30 text-red-200";
  if (status === "review_required") return "border-amber-800/60 bg-amber-950/20 text-amber-200";
  return "border-border bg-surface-overlay text-gray-300";
}

function scoreLabel(score: number): string {
  if (score >= 0.8) return "Looks good";
  if (score >= 0.6) return "Review";
  return "Needs review";
}

function scoreClass(score: number): string {
  if (score >= 0.8) return "text-emerald-200";
  if (score >= 0.6) return "text-amber-200";
  return "text-red-200";
}

function formatQaScore(value: unknown): string {
  const score = Number(value);
  return Number.isFinite(score) ? `${scoreLabel(score)} · ${Math.round(score * 100)}%` : "Not available";
}

export function QaSummary({
  qa,
  defective,
}: {
  qa: PublicationQaResult | undefined;
  defective: boolean;
}) {
  const scores = readRecord(qa?.scores);
  const flags = Array.isArray(qa?.flags) ? qa.flags : [];
  const defectReasons = Array.isArray(qa?.defectReasons) ? qa.defectReasons : [];
  const status = qa?.status || "not-run";
  const scoreItems: Array<[string, unknown]> = [
    ["hands", scores.hands],
    ["feet", scores.feet],
    ["composition", scores.composition],
    ["publishability", scores.publishability],
  ];

  return (
    <div className={`rounded-lg border px-3 py-3 text-sm ${qualityStatusClass(status, defective)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Quality check</p>
        <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-medium">
          {qualityStatusLabel(status, defective)}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        {scoreItems.map(([label, value]) => (
          <div key={label} className="rounded-md bg-black/15 px-2.5 py-1.5">
            <dt className="uppercase tracking-wide opacity-70">{humanizeQaText(label)}</dt>
            <dd className={`mt-0.5 font-medium ${scoreClass(Number(value))}`}>
              {formatQaScore(value)}
            </dd>
          </div>
        ))}
      </dl>
      {(flags.length > 0 || defectReasons.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {flags.slice(0, 6).map((flag) => (
            <span key={flag} className="rounded-full bg-black/20 px-2.5 py-1">
              {humanizeQaText(flag)}
            </span>
          ))}
          {defectReasons.slice(0, 4).map((reason) => (
            <span key={reason} className="rounded-full bg-black/25 px-2.5 py-1">
              {humanizeQaText(reason)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
