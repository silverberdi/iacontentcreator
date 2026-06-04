type InfoTooltipProps = {
  text: string;
  label?: string;
};

export default function InfoTooltip({ text, label = "More info" }: InfoTooltipProps) {
  return (
    <button
      type="button"
      className="ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] leading-none text-gray-400 hover:border-gray-500 hover:text-gray-200"
      title={text}
      aria-label={label}
    >
      ?
    </button>
  );
}
