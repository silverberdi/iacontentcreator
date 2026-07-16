type ComfyPromptDetailsProps = {
  summaryLabel: string;
  positivePrompt: string;
  negativePrompt: string;
  referenceImages: string[];
};

export default function ComfyPromptDetails({
  summaryLabel,
  positivePrompt,
  negativePrompt,
  referenceImages,
}: ComfyPromptDetailsProps) {
  if (!positivePrompt && !negativePrompt && referenceImages.length === 0) {
    return null;
  }

  return (
    <details className="rounded-md border border-border-muted bg-surface text-sm">
      <summary className="cursor-pointer select-none px-3 py-2 text-gray-300 hover:text-white">
        {summaryLabel}
      </summary>
      <div className="space-y-3 border-t border-border-muted px-3 py-3">
        {positivePrompt && (
          <div>
            <p className="text-xs text-gray-500">Prompt positivo</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">{positivePrompt}</p>
          </div>
        )}
        {negativePrompt && (
          <div>
            <p className="text-xs text-gray-500">Prompt negativo</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">{negativePrompt}</p>
          </div>
        )}
        {referenceImages.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-gray-500">Imágenes de referencia</p>
            <div className="flex flex-wrap gap-2">
              {referenceImages.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-md border border-border-muted"
                >
                  <img src={url} alt="Referencia" className="h-20 w-20 object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
