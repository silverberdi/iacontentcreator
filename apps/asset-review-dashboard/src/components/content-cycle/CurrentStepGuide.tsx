import type { ContentCycleContext } from "../../types/contentCycle";
import type { ContentCycleData } from "../../hooks/useContentCycleOperations";
import type { ContentCycleActiveStep } from "../../utils/contentCycleWizard";
import { getCurrentStepGuide } from "../../utils/contentCycleGuide";

type CurrentStepGuideProps = {
  activeStep: ContentCycleActiveStep;
  context: ContentCycleContext;
  data: ContentCycleData;
};

function ChecklistItem({
  label,
  done,
  optional,
}: {
  label: string;
  done: boolean;
  optional?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
          done ? "bg-emerald-900/60 text-emerald-300" : "bg-gray-800 text-gray-500"
        }`}
        aria-hidden
      >
        {done ? "✓" : "·"}
      </span>
      <span className={done ? "text-gray-300" : "text-gray-500"}>
        {label}
        {optional && !done ? " (opcional)" : ""}
      </span>
    </li>
  );
}

export default function CurrentStepGuide({
  activeStep,
  context,
  data,
}: CurrentStepGuideProps) {
  const guide = getCurrentStepGuide({ activeStep, context, data });

  return (
    <aside
      className="rounded-lg border border-border bg-surface-raised p-4"
      aria-label="Guía del paso actual"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Guía del paso actual
      </p>

      <section className="mt-4" aria-labelledby="guide-what-to-do">
        <h3 id="guide-what-to-do" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Qué hacer ahora
        </h3>
        <p className="mt-2 text-base font-medium text-gray-100">{guide.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">{guide.description}</p>

        <ul className="mt-4 space-y-2">
          {guide.checklist.map((item) => (
            <ChecklistItem
              key={item.label}
              label={item.label}
              done={item.done}
              optional={item.optional}
            />
          ))}
        </ul>
      </section>

      <section
        className="mt-5 border-t border-border-muted pt-4"
        aria-labelledby="guide-status"
      >
        <h3 id="guide-status" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Estado
        </h3>
        <div
          className={`mt-2 rounded-md border px-3 py-2.5 text-sm ${
            guide.statusDone
              ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-200"
              : "border-border-muted bg-surface text-gray-300"
          }`}
        >
          {guide.statusLabel}
        </div>
      </section>
    </aside>
  );
}
