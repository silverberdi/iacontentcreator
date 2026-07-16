import CollapsibleJsonDebug from "./CollapsibleJsonDebug";

type TechnicalJsonDebugProps = {
  showTechnical: boolean;
  payload: unknown;
  label?: string;
  className?: string;
};

export default function TechnicalJsonDebug({
  showTechnical,
  payload,
  label,
  className,
}: TechnicalJsonDebugProps) {
  if (!showTechnical || payload === undefined) return null;
  return <CollapsibleJsonDebug payload={payload} label={label} className={className} />;
}
