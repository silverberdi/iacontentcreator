import { useState } from "react";
import { formatHashtags, imageUrlForDraft } from "../../../api/contentCycleApi";
import type { PublicationDraft } from "../../../types/contentCycle";
import { formatDate, shortenId } from "../../../utils/format";
import { humanDraftStatus } from "../../../utils/contentCycleFlow";
import LoadingSpinner from "../../LoadingSpinner";
import SectionPanel from "../../SectionPanel";
import ActionButton from "../ActionButton";

type PrepararPublicacionBlockProps = {
  hasApprovedImage: boolean;
  approvedDraftId: string;
  drafts: PublicationDraft[];
  showTechnical: boolean;
  loadingCreate: boolean;
  loadingList: boolean;
  loadingManualExport: boolean;
  pendingDraftId: string | null;
  operationsEnabled: boolean;
  onCreateDraft: () => void;
  onLoadDrafts: () => void;
  onApproveDraft: (draftId: string) => void;
  onManualExport: (draftId: string) => void;
};

function isDraftApproved(draft: PublicationDraft, approvedDraftId: string): boolean {
  if (approvedDraftId && draft.draftId === approvedDraftId) return true;
  const normalized = (draft.status ?? "").toLowerCase();
  return normalized.includes("approve");
}

function DraftCard({
  draft,
  approvedDraftId,
  showTechnical,
  pending,
  loadingManualExport,
  operationsEnabled,
  onApprove,
  onManualExport,
}: {
  draft: PublicationDraft;
  approvedDraftId: string;
  showTechnical: boolean;
  pending: boolean;
  loadingManualExport: boolean;
  operationsEnabled: boolean;
  onApprove: () => void;
  onManualExport: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageUrlForDraft(draft);
  const approved = isDraftApproved(draft, approvedDraftId);
  const draftAssetId =
    typeof draft.assetId === "string" ? draft.assetId : undefined;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="bg-black/30">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt="Borrador"
            onError={() => setImageFailed(true)}
            className="h-48 w-full object-cover"
          />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">
            Sin preview
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 text-sm">
        <p className="font-medium text-gray-200">{humanDraftStatus(draft.status)}</p>
        <div>
          <p className="text-xs text-gray-500">Caption</p>
          <p className="mt-1 whitespace-pre-wrap text-gray-100">{draft.caption ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Hashtags</p>
          <p className="mt-1 text-gray-100">{formatHashtags(draft.hashtags) || "—"}</p>
        </div>
        <p className="text-xs text-gray-400">
          Fecha: {draft.createdAt ? formatDate(draft.createdAt) : "—"}
        </p>

        {showTechnical && (
          <div className="font-mono text-[11px] text-gray-500">
            <p>draftId: {shortenId(draft.draftId)}</p>
            {draftAssetId && <p>assetId: {shortenId(draftAssetId)}</p>}
            {draft.generatedAssetId && (
              <p>generatedAssetId: {shortenId(draft.generatedAssetId)}</p>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          <ActionButton
            disabled={pending || approved || !operationsEnabled}
            onClick={onApprove}
            className="border-emerald-800/60 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200"
          >
            {pending ? "Aprobando…" : approved ? "Borrador aprobado" : "Aprobar borrador"}
          </ActionButton>
          <ActionButton
            variant="primary"
            disabled={!approved || loadingManualExport || !operationsEnabled}
            onClick={onManualExport}
            className="px-4 py-2 text-sm"
          >
            {loadingManualExport ? "Preparando…" : "Preparar publicación manual"}
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

export default function PrepararPublicacionBlock({
  hasApprovedImage,
  approvedDraftId,
  drafts,
  showTechnical,
  loadingCreate,
  loadingList,
  loadingManualExport,
  pendingDraftId,
  operationsEnabled,
  onCreateDraft,
  onLoadDrafts,
  onApproveDraft,
  onManualExport,
}: PrepararPublicacionBlockProps) {
  return (
    <SectionPanel
      title="4. Preparar publicación"
      description="Genera y revisa el borrador con caption y hashtags para la plataforma."
    >
      <div className="flex flex-wrap gap-2">
        <ActionButton
          variant="primary"
          disabled={loadingCreate || !hasApprovedImage || !operationsEnabled}
          onClick={onCreateDraft}
          className="px-4 py-2 text-sm"
        >
          {loadingCreate ? "Creando…" : "Crear borrador de publicación"}
        </ActionButton>
        <ActionButton
          disabled={loadingList || !operationsEnabled}
          onClick={onLoadDrafts}
          className="px-4 py-2 text-sm"
        >
          {loadingList ? "Cargando…" : "Ver borradores"}
        </ActionButton>
      </div>

      {!hasApprovedImage && (
        <p className="mt-4 text-sm text-amber-200/90">
          Aprueba una imagen en el paso anterior para poder crear el borrador.
        </p>
      )}

      {loadingList && drafts.length === 0 && (
        <div className="mb-4 mt-4 flex items-center gap-2 text-sm text-gray-400">
          <LoadingSpinner className="size-4" label="Cargando borradores…" />
          Cargando borradores…
        </div>
      )}

      {drafts.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.draftId}
              draft={draft}
              approvedDraftId={approvedDraftId}
              showTechnical={showTechnical}
              pending={pendingDraftId === draft.draftId}
              loadingManualExport={loadingManualExport}
              operationsEnabled={operationsEnabled}
              onApprove={() => onApproveDraft(draft.draftId)}
              onManualExport={() => onManualExport(draft.draftId)}
            />
          ))}
        </div>
      ) : (
        !loadingList && (
          <p className="mt-4 text-sm text-gray-500">
            Crea un borrador a partir de la imagen aprobada o carga los existentes.
          </p>
        )
      )}
    </SectionPanel>
  );
}
