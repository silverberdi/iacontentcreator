import SectionPanel from "../SectionPanel";
import LoadingSpinner from "../LoadingSpinner";

type ManualPipelineSectionProps = {
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  onRun: () => void;
};

export default function ManualPipelineSection({
  loading,
  error,
  successMessage,
  onRun,
}: ManualPipelineSectionProps) {
  return (
    <SectionPanel
      title="C. Manual Pipeline Actions"
      description="Run the full pipeline once using the active DB profile (empty request body)."
    >
      {error && (
        <p className="mb-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="mb-3 text-sm text-emerald-300" role="status">
          {successMessage}
        </p>
      )}

      <button
        type="button"
        onClick={onRun}
        disabled={loading}
        className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <LoadingSpinner className="size-4" label="Running pipeline…" />
        ) : (
          "Run Full Auto Ingest Pipeline"
        )}
      </button>
    </SectionPanel>
  );
}
