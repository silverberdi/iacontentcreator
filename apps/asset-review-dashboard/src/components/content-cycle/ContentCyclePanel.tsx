import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContentCycleContext } from "../../types/contentCycle";
import { useCatalogOptions } from "../../hooks/useCatalogOptions";
import {
  CONTENT_CYCLE_MISSING_MESSAGE,
  CONTENT_CYCLE_TEST_DATA,
  CONTEXT_CHANGED_MESSAGE,
  EMPTY_CONTENT_CYCLE_CONTEXT,
  isContentCycleContextComplete,
} from "../../utils/contentCycleFlow";
import {
  canNavigateToStep,
  getStepContinueConfig,
  navigationInputFromData,
  STEP_NAV_BLOCKED_MESSAGE,
  type ContentCycleActiveStep,
} from "../../utils/contentCycleWizard";
import {
  hasDerivedCycleState,
  useContentCycleOperations,
} from "../../hooks/useContentCycleOperations";
import CurrentStepGuide from "./CurrentStepGuide";
import FlowHeader from "./FlowHeader";
import FlowNotification from "./FlowNotification";
import FlowStepper from "./FlowStepper";
import NextStepBanner from "./NextStepBanner";
import StepNavigationFooter from "./StepNavigationFooter";
import TechnicalActionsPanel from "./TechnicalActionsPanel";
import GenerarImagenBlock from "./blocks/GenerarImagenBlock";
import PrepararContenidoBlock from "./blocks/PrepararContenidoBlock";
import PrepararPublicacionBlock from "./blocks/PrepararPublicacionBlock";
import PublicacionManualBlock from "./blocks/PublicacionManualBlock";
import RevisarImagenBlock from "./blocks/RevisarImagenBlock";

export default function ContentCyclePanel() {
  const {
    options: catalogOptions,
    loading: catalogOptionsLoading,
    error: catalogOptionsError,
  } = useCatalogOptions();

  const [context, setContext] = useState<ContentCycleContext>({
    ...EMPTY_CONTENT_CYCLE_CONTEXT,
  });
  const [showTechnical, setShowTechnical] = useState(false);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const [pendingDraftId, setPendingDraftId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<ContentCycleActiveStep>("prepare-image");
  const [configExpanded, setConfigExpanded] = useState(true);

  const contextComplete = useMemo(() => isContentCycleContextComplete(context), [context]);

  const ops = useContentCycleOperations(context);
  const { data, promptDisplay, operationError, setOperationError, isLoading, resetDerivedCycleState } =
    ops;

  const navInput = useMemo(() => navigationInputFromData(data), [data]);

  const notify = useCallback((message: string) => {
    setFlowMessage(message);
    setOperationError(null);
  }, [setOperationError]);

  useEffect(() => {
    if (!flowMessage) return;
    const timer = window.setTimeout(() => setFlowMessage(null), 12000);
    return () => window.clearTimeout(timer);
  }, [flowMessage]);

  useEffect(() => {
    if (!data.contentPrepared) {
      setConfigExpanded(true);
    }
  }, [data.contentPrepared]);

  const tryNavigateToStep = useCallback(
    (step: ContentCycleActiveStep) => {
      if (canNavigateToStep(step, navInput)) {
        setActiveStep(step);
        return true;
      }
      setFlowMessage(STEP_NAV_BLOCKED_MESSAGE);
      return false;
    },
    [navInput],
  );

  const handleContextChange = useCallback(
    (next: ContentCycleContext) => {
      const shouldResetDerived =
        context.avatar !== next.avatar ||
        context.scene !== next.scene ||
        context.platform !== next.platform;

      if (shouldResetDerived) {
        const hadDerived = hasDerivedCycleState(data);
        const avatarChanged = context.avatar !== next.avatar;

        resetDerivedCycleState();
        setPendingCandidateId(null);
        setPendingDraftId(null);
        setActiveStep("prepare-image");
        setConfigExpanded(true);

        if (hadDerived) {
          let message = CONTEXT_CHANGED_MESSAGE;
          if (avatarChanged && next.postIntent.trim()) {
            message +=
              " La intención del post se mantuvo; revísala si cambiaste de avatar.";
          }
          setFlowMessage(message);
        } else {
          setFlowMessage(null);
          setOperationError(null);
        }
      }

      setContext(next);
    },
    [
      context.avatar,
      context.platform,
      context.scene,
      data,
      resetDerivedCycleState,
      setOperationError,
    ],
  );

  const handleLoadTestData = () => {
    handleContextChange({ ...CONTENT_CYCLE_TEST_DATA });
  };

  const handlePrepare = async () => {
    const ok = await ops.prepareContentCycle();
    if (ok) {
      notify("Paquete de generación preparado. Continúa con Comfy.");
      setActiveStep("generate-image");
      setConfigExpanded(false);
    }
  };

  const handleMarkComfy = async () => {
    const ok = await ops.markJobSentToComfy();
    if (ok) setActiveStep("generate-image");
  };

  const handleRegister = async () => {
    const ok = await ops.registerGeneratedAsset();
    if (ok) {
      notify("Imagen registrada. Ya puedes revisarla.");
      setActiveStep("review-image");
    }
  };

  const handleApproveImage = async (id: string, notes: string) => {
    setPendingCandidateId(id);
    const ok = await ops.approveGeneratedAsset(id, notes);
    setPendingCandidateId(null);
    if (ok) {
      notify("Imagen aprobada. Ya puedes crear el borrador.");
      setActiveStep("publication-draft");
    }
  };

  const handleRejectImage = async (id: string, notes: string) => {
    setPendingCandidateId(id);
    await ops.rejectGeneratedAsset(id, notes);
    setPendingCandidateId(null);
  };

  const handleCreateDraft = async () => {
    const ok = await ops.createPublicationDraft();
    if (ok) notify("Borrador creado. Revísalo y aprueba cuando esté listo.");
  };

  const handleApproveDraft = async (draftId: string) => {
    setPendingDraftId(draftId);
    const ok = await ops.approvePublicationDraft(draftId);
    setPendingDraftId(null);
    if (ok) {
      notify("Borrador aprobado. Ya puedes preparar la publicación manual.");
      setActiveStep("manual-export");
    }
  };

  const handleManualExport = async (draftId?: string) => {
    const ok = await ops.manualExport(draftId);
    if (ok) {
      notify("Paquete listo para publicación manual.");
      setActiveStep("manual-export");
    }
  };

  const stepContinue = getStepContinueConfig(activeStep, navInput);
  const showContextReminder = !contextComplete && configExpanded;
  const activeError = operationError;

  const guideProps = {
    activeStep,
    context,
    data,
  };

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-20 -mx-4 space-y-2 border-b border-border bg-[#0c0f14] px-4 pb-3 pt-1 shadow-md shadow-black/30 sm:-mx-6 sm:px-6">
        <FlowHeader
          context={context}
          catalogOptions={catalogOptions}
          catalogOptionsLoading={catalogOptionsLoading}
          expanded={configExpanded}
          contentPrepared={data.contentPrepared}
          onContextChange={handleContextChange}
          onEditConfig={() => setConfigExpanded(true)}
          onCollapseConfig={() => setConfigExpanded(false)}
          showTechnical={showTechnical}
          onShowTechnicalChange={setShowTechnical}
          onLoadTestData={handleLoadTestData}
        />

        {catalogOptionsError && (
          <p className="text-xs text-amber-200/90" role="status">
            Catálogos no disponibles ({catalogOptionsError}). Usando listas de respaldo.
          </p>
        )}

        {showContextReminder && (
          <div
            role="status"
            className="rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100"
          >
            {CONTENT_CYCLE_MISSING_MESSAGE}
          </div>
        )}

        <FlowStepper
          stepper={data.stepper}
          activeStep={activeStep}
          canNavigateToStep={(step) => canNavigateToStep(step, navInput)}
          onStepSelect={(step) => tryNavigateToStep(step)}
        />

        <NextStepBanner
          contextComplete={contextComplete}
          contentPrepared={data.contentPrepared}
          comfyMarkedSent={data.comfyMarkedSent}
          imageRegistered={data.imageRegistered}
          approvedGeneratedAssetId={data.approvedGeneratedAssetId}
          approvedDraftId={data.approvedDraftId}
          hasDrafts={data.drafts.length > 0}
          hasExport={data.exportResult !== null}
        />

        <FlowNotification message={flowMessage} onDismiss={() => setFlowMessage(null)} />

        {activeError && activeError !== CONTENT_CYCLE_MISSING_MESSAGE && (
          <div
            role="alert"
            className="rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-200"
          >
            {activeError}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,0.9fr)] xl:items-start">
        <div className="min-w-0">
          {activeStep === "prepare-image" && (
            <PrepararContenidoBlock
              contentPrepared={data.contentPrepared}
              sceneBrief={data.sceneBrief}
              postIntent={context.postIntent}
              positivePrompt={promptDisplay.positivePrompt}
              negativePrompt={promptDisplay.negativePrompt}
              referenceImages={promptDisplay.referenceImages}
              jobId={data.jobId}
              showTechnical={showTechnical}
              loading={isLoading("prepareContent")}
              operationsEnabled={contextComplete}
              onPrepare={() => void handlePrepare()}
            />
          )}

          {activeStep === "generate-image" && (
            <GenerarImagenBlock
              positivePrompt={promptDisplay.positivePrompt}
              negativePrompt={promptDisplay.negativePrompt}
              postIntent={context.postIntent}
              referenceImages={promptDisplay.referenceImages}
              manualAssetId={data.manualAssetId}
              comfyMarkedSent={data.comfyMarkedSent}
              showTechnical={showTechnical}
              loadingComfy={isLoading("markComfySent")}
              loadingRegister={isLoading("registerAsset")}
              operationsEnabled={contextComplete}
              onManualAssetIdChange={ops.setManualAssetId}
              onMarkComfySent={() => void handleMarkComfy()}
              onRegister={() => void handleRegister()}
            />
          )}

          {activeStep === "review-image" && (
            <RevisarImagenBlock
              candidates={data.candidates}
              jobId={data.jobId}
              showTechnical={showTechnical}
              loadingList={isLoading("loadCandidates")}
              pendingActionId={pendingCandidateId}
              operationsEnabled={contextComplete}
              onLoad={() => void ops.loadGeneratedCandidates()}
              onApprove={(id, notes) => void handleApproveImage(id, notes)}
              onReject={(id, notes) => void handleRejectImage(id, notes)}
            />
          )}

          {activeStep === "publication-draft" && (
            <PrepararPublicacionBlock
              hasApprovedImage={Boolean(data.approvedGeneratedAssetId)}
              approvedDraftId={data.approvedDraftId}
              drafts={data.drafts}
              showTechnical={showTechnical}
              loadingCreate={isLoading("createDraft")}
              loadingList={isLoading("loadDrafts")}
              loadingManualExport={isLoading("manualExport")}
              pendingDraftId={pendingDraftId}
              operationsEnabled={contextComplete}
              onCreateDraft={() => void handleCreateDraft()}
              onLoadDrafts={() => void ops.loadPublicationDrafts()}
              onApproveDraft={(id) => void handleApproveDraft(id)}
              onManualExport={(id) => void handleManualExport(id)}
            />
          )}

          {activeStep === "manual-export" && (
            <PublicacionManualBlock
              hasApprovedDraft={Boolean(data.approvedDraftId)}
              exportResult={data.exportResult}
              showTechnical={showTechnical}
              loading={isLoading("manualExport")}
              operationsEnabled={contextComplete}
              onExport={() => void handleManualExport()}
            />
          )}

          <StepNavigationFooter
            continueLabel={stepContinue?.continueLabel}
            onContinue={
              stepContinue
                ? () => tryNavigateToStep(stepContinue.nextStep)
                : undefined
            }
            showFlowComplete={activeStep === "manual-export"}
          />
        </div>

        <div className="min-w-0 xl:min-w-[340px]">
          <CurrentStepGuide {...guideProps} />
        </div>
      </div>

      <TechnicalActionsPanel
        showTechnical={showTechnical}
        operationsEnabled={contextComplete}
        debugLog={data.debugLog}
        isLoading={isLoading}
        onResolveBrief={() => void ops.techResolveBrief()}
        onResolveIdentity={() => void ops.techResolveIdentity()}
        onGeneratePrompt={() => void ops.techGeneratePrompt()}
        onQueueJob={() => void ops.techQueueJob()}
        onRunComfy={() => void ops.techRunComfy()}
      />
    </div>
  );
}
