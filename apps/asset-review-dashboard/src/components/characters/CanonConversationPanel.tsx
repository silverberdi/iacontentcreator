import type { Dispatch, SetStateAction } from "react";
import { topicLabel } from "../../domain/characterCanonReadiness";
import type { CharacterCanonSection } from "../../types/characters";

type CanonTopicProgress = {
  key: string;
  label: string;
  score: number;
  status: string;
};

type CanonGuide = {
  prompt: string;
  examples: string[];
};

type CanonConversationPanelProps = {
  hasAnyCanon: boolean;
  missingCanonTopics: CanonTopicProgress[];
  canonTopicProgress: CanonTopicProgress[];
  canonActiveTopic: string;
  setCanonActiveTopic: Dispatch<SetStateAction<string>>;
  activeCanonGuide: CanonGuide;
  activeTopicEvidence: CharacterCanonSection[];
  canonAssistantMessage: string;
  canonSuggestedQuestions: string[];
  canonTopicAnswer: string;
  setCanonTopicAnswer: Dispatch<SetStateAction<string>>;
  canonChatLoading: boolean;
  onApplyGuidedAnswer: () => void;
};

export function CanonConversationPanel({
  hasAnyCanon,
  missingCanonTopics,
  canonTopicProgress,
  canonActiveTopic,
  setCanonActiveTopic,
  activeCanonGuide,
  activeTopicEvidence,
  canonAssistantMessage,
  canonSuggestedQuestions,
  canonTopicAnswer,
  setCanonTopicAnswer,
  canonChatLoading,
  onApplyGuidedAnswer,
}: CanonConversationPanelProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            {hasAnyCanon ? "Guided canon conversation" : "Start character conversation"}
          </h4>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            {hasAnyCanon
              ? "Pick a topic, review what is already captured, and add only the missing nuance. Your answer is saved first, then AI analysis enriches it when available."
              : "No canon exists yet. Start with a natural description and the system will create the first proposed canon section."}
          </p>
          <p className="mt-2 max-w-3xl text-sm text-blue-100/80">
            {hasAnyCanon
              ? "Start here: choose a topic on the left, read the captured context, then answer only what should be refined, corrected, or expanded."
              : "Start here: answer who this character is, what they should make people feel, and what kind of relationship they should create."}
          </p>
        </div>
        {hasAnyCanon && missingCanonTopics[0] ? (
          <button
            type="button"
            onClick={() => setCanonActiveTopic(missingCanonTopics[0].key)}
            className="rounded-md border border-amber-900/70 bg-amber-950/30 px-3 py-2 text-sm text-amber-100 hover:text-white"
          >
            Work on {missingCanonTopics[0].label}
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="grid gap-2">
          {canonTopicProgress.map((topic) => (
            <button
              key={topic.key}
              type="button"
              onClick={() => setCanonActiveTopic(topic.key)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                canonActiveTopic === topic.key
                  ? "border-accent bg-accent/10 text-white"
                  : "border-border bg-surface-raised text-gray-300 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{topic.label}</span>
                <span className="text-xs text-gray-500">{topic.score}%</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{topic.status}</p>
            </button>
          ))}
        </div>
        <div className="rounded-md border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-gray-200">
            {hasAnyCanon ? topicLabel(canonActiveTopic) : "Foundation"}
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {activeCanonGuide.prompt}
          </p>
          {activeTopicEvidence.length > 0 ? (
            <div className="mt-3 rounded-md border border-emerald-900/50 bg-emerald-950/15 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                Already captured from onboarding
              </p>
              <div className="mt-2 space-y-2">
                {activeTopicEvidence.map((section) => (
                  <div key={section.key} className="text-sm leading-6 text-emerald-50/80">
                    <span className="font-semibold text-emerald-100">{section.label}: </span>
                    <span>{section.summary}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-emerald-100/60">
                Add only what is missing, contradictory, or too generic. No need to repeat this.
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-amber-900/50 bg-amber-950/15 px-4 py-3 text-sm text-amber-100">
              Nothing has been captured for this topic yet. Use this answer to create the first useful detail.
            </div>
          )}
          {canonAssistantMessage ? (
            <div className="mt-3 rounded-md border border-blue-900/60 bg-blue-950/20 px-4 py-3 text-sm leading-6 text-blue-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                DeepSeek
              </p>
              <p className="mt-1">{canonAssistantMessage}</p>
            </div>
          ) : null}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {canonSuggestedQuestions.length ? "Suggested next questions from DeepSeek" : "Starter questions"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(canonSuggestedQuestions.length ? canonSuggestedQuestions : activeCanonGuide.examples).map((example) => (
              <button
                key={example}
                type="button"
                onClick={() =>
                  setCanonTopicAnswer((prev) =>
                    [prev.trim(), `- ${example}: `].filter(Boolean).join("\n"),
                  )
                }
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-gray-300 hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-sm text-gray-400">
            Your answer
            <textarea
              value={canonTopicAnswer}
              onChange={(event) => setCanonTopicAnswer(event.target.value)}
              className="mt-1 min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
              placeholder="Answer naturally. You can be messy; this becomes reviewable canon draft, not final publication copy."
            />
            {canonTopicAnswer.trim().length > 4500 ? (
              <p className="mt-2 rounded-md border border-blue-900/60 bg-blue-950/20 px-3 py-2 text-xs leading-5 text-blue-100/80">
                Long answer detected. The full text will be kept locally in the canon
                proposal, while DeepSeek receives a compacted version with key excerpts
                to avoid request/proxy failures.
              </p>
            ) : null}
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApplyGuidedAnswer}
              disabled={canonChatLoading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {canonChatLoading
                ? "Asking DeepSeek..."
                : hasAnyCanon
                  ? "Ask DeepSeek and update"
                  : "Start with DeepSeek"}
            </button>
            <button
              type="button"
              onClick={() => setCanonTopicAnswer("")}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              Clear answer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
