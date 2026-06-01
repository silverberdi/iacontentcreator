import { isN8nApiKeyConfigured } from "../api/n8nClient";

export default function ApiKeyWarning() {
  if (isN8nApiKeyConfigured()) {
    return null;
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
    >
      VITE_AVATARES_API_KEY is not configured. n8n webhooks may reject requests.
    </div>
  );
}
