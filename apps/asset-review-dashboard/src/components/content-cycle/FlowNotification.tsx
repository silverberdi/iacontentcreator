type FlowNotificationProps = {
  message: string | null;
  onDismiss: () => void;
};

export default function FlowNotification({ message, onDismiss }: FlowNotificationProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-emerald-300/80 hover:text-emerald-100"
        aria-label="Cerrar aviso"
      >
        ✕
      </button>
    </div>
  );
}
