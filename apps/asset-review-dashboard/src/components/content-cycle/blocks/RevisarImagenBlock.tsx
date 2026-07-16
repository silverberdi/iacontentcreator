import { useState } from "react";
import { imageUrlForCandidate } from "../../../api/contentCycleApi";
import type { GeneratedCandidate } from "../../../types/contentCycle";
import { formatDate, shortenId } from "../../../utils/format";
import { humanCandidateStatus } from "../../../utils/contentCycleFlow";
import LoadingSpinner from "../../LoadingSpinner";
import SectionPanel from "../../SectionPanel";
import ActionButton from "../ActionButton";

type RevisarImagenBlockProps = {
  candidates: GeneratedCandidate[];
  jobId: string | null;
  showTechnical: boolean;
  loadingList: boolean;
  pendingActionId: string | null;
  operationsEnabled: boolean;
  onLoad: () => void;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
};

function CandidateCard({
  candidate,
  jobId,
  showTechnical,
  pending,
  operationsEnabled,
  onApprove,
  onReject,
}: {
  candidate: GeneratedCandidate;
  jobId: string | null;
  showTechnical: boolean;
  pending: boolean;
  operationsEnabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageUrlForCandidate(candidate);
  const candidateJobId =
    typeof candidate.jobId === "string" ? candidate.jobId : jobId ?? undefined;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="bg-black/30">
        {imageUrl && !imageFailed ? (
          <a href={imageUrl} target="_blank" rel="noreferrer" className="block h-64">
            <img
              src={imageUrl}
              alt="Imagen para revisión"
              onError={() => setImageFailed(true)}
              className="h-64 w-full object-cover"
            />
          </a>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            Imagen no disponible
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm font-medium text-gray-200">
          {humanCandidateStatus(candidate.status)}
        </p>
        <div className="text-xs text-gray-400">
          <p>
            <span className="text-gray-500">Escena: </span>
            {candidate.scene ?? "—"}
          </p>
          <p className="mt-1">
            <span className="text-gray-500">Fecha: </span>
            {candidate.createdAt ? formatDate(candidate.createdAt) : "—"}
          </p>
        </div>

        {showTechnical && (
          <div className="font-mono text-[11px] text-gray-500">
            {candidate.generatedAssetId && (
              <p>generatedAssetId: {shortenId(candidate.generatedAssetId)}</p>
            )}
            {candidate.assetId && <p>assetId: {shortenId(candidate.assetId)}</p>}
            {candidateJobId && <p>jobId: {shortenId(candidateJobId)}</p>}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          <ActionButton
            variant="primary"
            disabled={pending || !operationsEnabled}
            onClick={onApprove}
            className="border-emerald-800/60 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200"
          >
            {pending ? "Aprobando…" : "Aprobar imagen"}
          </ActionButton>
          <ActionButton
            disabled={pending || !operationsEnabled}
            onClick={onReject}
            className="border-red-800/60 bg-red-950/40 px-4 py-2 text-sm text-red-200"
          >
            {pending ? "Rechazando…" : "Rechazar imagen"}
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

export default function RevisarImagenBlock({
  candidates,
  jobId,
  showTechnical,
  loadingList,
  pendingActionId,
  operationsEnabled,
  onLoad,
  onApprove,
  onReject,
}: RevisarImagenBlockProps) {
  const [reviewNotes, setReviewNotes] = useState("Approved from dashboard");

  return (
    <SectionPanel
      title="3. Revisar imagen"
      description="Comprueba la imagen generada antes de crear el borrador de publicación."
    >
      <ActionButton
        variant="primary"
        disabled={loadingList || !operationsEnabled}
        onClick={onLoad}
        className="px-4 py-2 text-sm"
      >
        {loadingList ? "Cargando…" : "Ver imágenes para revisión"}
      </ActionButton>

      <details className="mt-4 max-w-xl rounded-md border border-border-muted bg-surface text-sm">
        <summary className="cursor-pointer select-none px-3 py-2 text-gray-400 hover:text-gray-200">
          Notas de revisión (opcional)
        </summary>
        <div className="border-t border-border-muted px-3 py-3">
          <input
            type="text"
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-gray-100"
          />
        </div>
      </details>

      {loadingList && candidates.length === 0 && (
        <div className="mb-4 mt-4 flex items-center gap-2 text-sm text-gray-400">
          <LoadingSpinner className="size-4" label="Cargando imágenes…" />
          Cargando imágenes…
        </div>
      )}

      {candidates.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.generatedAssetId}
              candidate={candidate}
              jobId={jobId}
              showTechnical={showTechnical}
              pending={pendingActionId === candidate.generatedAssetId}
              operationsEnabled={operationsEnabled}
              onApprove={() => onApprove(candidate.generatedAssetId, reviewNotes)}
              onReject={() => onReject(candidate.generatedAssetId, reviewNotes)}
            />
          ))}
        </div>
      ) : (
        !loadingList && (
          <p className="mt-4 text-sm text-gray-500">
            Registra una imagen generada y pulsa &quot;Ver imágenes para revisión&quot;.
          </p>
        )
      )}
    </SectionPanel>
  );
}
