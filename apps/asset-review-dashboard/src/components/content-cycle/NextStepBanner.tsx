import { getNextStepMessage, type NextStepInput } from "../../utils/contentCycleFlow";

type NextStepBannerProps = NextStepInput;

export default function NextStepBanner(props: NextStepBannerProps) {
  const message = getNextStepMessage(props);

  return (
    <div
      role="status"
      className="rounded-md border border-blue-800/40 bg-blue-950/25 px-3 py-1.5 text-xs leading-snug text-blue-100"
    >
      {message}
    </div>
  );
}
