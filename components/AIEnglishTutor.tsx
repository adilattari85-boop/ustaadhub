"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import AITutorVoice from "@/components/AITutorVoice";
import {
  AI_TUTOR_LEVEL_LABELS,
  AI_TUTOR_LEVELS,
  AI_TUTOR_MAX_MESSAGE_LENGTH,
  AI_TUTOR_MODE_LABELS,
  AI_TUTOR_MODES,
  DEFAULT_AI_TUTOR_LEVEL,
  DEFAULT_AI_TUTOR_MODE,
  type AiTutorChatResponse,
  type AiTutorLearning,
  type AiTutorLevel,
  type AiTutorMode,
} from "@/lib/aiTutor/shared";

// Browser half of the AI English Tutor.
//
// It only ever calls POST /api/ai-tutor/chat: the Gemini key is never present
// in this bundle, and conversation memory is carried by the interaction id
// that the route hands back, so the tutor can be reused on any page.
//
// Learning state (mode, level, session counts) lives in this component only —
// nothing is persisted. See `lib/aiTutor/shared.ts` for the contract.

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  learning?: AiTutorLearning;
};

type Phase = "setup" | "chat";

const ENDPOINT = "/api/ai-tutor/chat";

function PracticeEstimate({ score }: { score: NonNullable<AiTutorLearning["score"]> }) {
  const bars: Array<{ label: string; value: number }> = [
    { label: "Grammar", value: score.grammar },
    { label: "Vocabulary", value: score.vocabulary },
    { label: "Fluency", value: score.fluency },
  ];

  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
      <p className="text-xs font-semibold text-blue-900">
        Practice estimate · {score.overall}/100
      </p>
      <div className="mt-2 space-y-1.5">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-slate-600">{bar.label}</span>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuenow={bar.value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${bar.label} practice estimate`}
            >
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.min(100, Math.max(0, bar.value))}%` }}
              />
            </div>
            <span className="w-7 shrink-0 text-right text-xs font-medium text-slate-600">
              {bar.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearningCard({ learning }: { learning: AiTutorLearning }) {
  const hasCorrection =
    Boolean(learning.correction?.trim()) ||
    (learning.detectedMistakes?.length ?? 0) > 0;
  const hasVocab = (learning.vocabularySuggestions?.length ?? 0) > 0;
  const hasPrompt = Boolean(learning.practicePrompt?.trim());
  const hasFocus = (learning.nextFocus?.length ?? 0) > 0;

  if (!hasCorrection && !hasVocab && !hasPrompt && !hasFocus && !learning.score) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2.5 text-sm leading-6">
      {hasCorrection && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Correction
          </p>
          {learning.correction?.trim() && (
            <p className="mt-1 font-medium text-slate-900">
              “{learning.correction.trim()}”
            </p>
          )}
          {learning.explanation?.trim() && (
            <p className="mt-1 text-slate-700">{learning.explanation.trim()}</p>
          )}
          {(learning.detectedMistakes?.length ?? 0) > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
              {learning.detectedMistakes!.map((mistake, index) => (
                <li key={`${index}-${mistake.slice(0, 24)}`}>{mistake}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasPrompt && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Your turn ·{" "}
          </span>
          {learning.practicePrompt!.trim()}
        </p>
      )}

      {hasVocab && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            New words
          </p>
          <ul className="mt-1 space-y-1">
            {learning.vocabularySuggestions!.map((item, index) => (
              <li key={`${index}-${item.word}`} className="text-slate-800">
                <span className="font-semibold text-slate-900">{item.word}</span>
                {item.meaning?.trim() && (
                  <span className="text-slate-700"> — {item.meaning.trim()}</span>
                )}
                {item.example?.trim() && (
                  <span className="block text-slate-600">
                    e.g. “{item.example.trim()}”
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {learning.score && <PracticeEstimate score={learning.score} />}

      {hasFocus && (
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Next focus: </span>
          {learning.nextFocus!.join(" · ")}
        </p>
      )}
    </div>
  );
}


const LEVEL_DESCRIPTIONS: Record<AiTutorLevel, string> = {
  beginner:
    "Simple English, short corrections, with a little Hindi help when it helps.",
  intermediate: "Mostly English, with grammar and natural phrasing work.",
  advanced: "Natural fluency, plus interview and professional practice.",
};

const MODE_DESCRIPTIONS: Record<AiTutorMode, string> = {
  "free-conversation":
    "Chat about everyday life while the tutor quietly fixes mistakes.",
  grammar: "Short drills on tense, articles and sentence structure.",
  vocabulary: "Learn useful words and use each one in your own sentence.",
  daily: "A short all-round lesson: warm-up, grammar, words and review.",
};

function greetingFor(mode: AiTutorMode, level: AiTutorLevel): ChatMessage {
  const levelHint =
    level === "beginner"
      ? "I'll keep my English simple, and you can ask me in Hindi or Urdu any time."
      : level === "intermediate"
        ? "We'll practise mostly in English, with clear grammar help."
        : "Expect natural, fluent English — good training for interviews and work.";

  const modeInvite: Record<AiTutorMode, string> = {
    "free-conversation":
      "Tell me about your day, your studies or your work, and I'll help you say it better.",
    grammar:
      "Write any sentence and I'll help you fix it — then you'll write the corrected version yourself.",
    vocabulary:
      "Tell me what you did today, and I'll teach you useful new words to say it better.",
    daily:
      "Let's do today's short lesson. First, a quick warm-up — tell me one thing you did yesterday.",
  };

  return {
    id: "greeting",
    role: "assistant",
    content: `Assalam-o-alaikum! I am your personal English practice partner. ${modeInvite[mode]} ${levelHint}`,
  };
}

type TutorPanelProps = {
  level: AiTutorLevel;
  setLevel: (next: AiTutorLevel) => void;
  mode: AiTutorMode;
  setMode: (next: AiTutorMode) => void;
};

/**
 * The text tutor from Phase 1 / Phase 2A, unchanged apart from taking its
 * level and mode from the shared owner below.
 */
function TutorPanel({ level, setLevel, mode, setMode }: TutorPanelProps) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [interactionId, setInteractionId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Guards against a slow reply landing after "Start New Conversation".
  const requestIdRef = useRef(0);

  // Keep the newest message in view. No easing, no animation.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, isSending, phase]);

  // Lightweight per-session progress, derived from structured turn data only.
  // Nothing persists — leaving the page resets it.
  const sessionStats = useMemo(() => {
    let corrections = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    const focusCounts = new Map<string, number>();

    for (const item of messages) {
      const learning = item.learning;
      if (!learning) continue;
      if (
        learning.correction ||
        (learning.detectedMistakes && learning.detectedMistakes.length > 0)
      ) {
        corrections += 1;
      }
      if (learning.score) {
        scoreSum += learning.score.overall;
        scoreCount += 1;
      }
      for (const focus of learning.nextFocus ?? []) {
        focusCounts.set(focus, (focusCounts.get(focus) ?? 0) + 1);
      }
    }

    return {
      turns: messages.filter((item) => item.role === "user").length,
      corrections,
      averageScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      focus: [...focusCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([focus]) => focus),
    };
  }, [messages]);

  const startLesson = useCallback(() => {
    requestIdRef.current += 1;
    setMessages([greetingFor(mode, level)]);
    setInteractionId("");
    setDraft("");
    setError("");
    setIsSending(false);
    setPhase("chat");
  }, [mode, level]);

  const startNewConversation = useCallback(() => {
    requestIdRef.current += 1;
    setMessages([greetingFor(mode, level)]);
    setInteractionId("");
    setDraft("");
    setError("");
    setIsSending(false);
    inputRef.current?.focus();
  }, [mode, level]);

  const backToSetup = useCallback(() => {
    requestIdRef.current += 1;
    setPhase("setup");
    setMessages([]);
    setInteractionId("");
    setDraft("");
    setError("");
    setIsSending(false);
  }, []);

  const sendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = draft.trim();
      if (!trimmed || isSending) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const previous = interactionId;

      setDraft("");
      setError("");
      setIsSending(true);
      setMessages((current) => [
        ...current,
        { id: `user-${requestId}`, role: "user", content: trimmed },
      ]);

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            message: trimmed,
            mode,
            level,
            ...(previous ? { previousInteractionId: previous } : {}),
          }),
        });

        const data = (await response
          .json()
          .catch(() => null)) as AiTutorChatResponse | null;

        if (requestId !== requestIdRef.current) return;

        if (!data) {
          throw new Error("The tutor sent a reply we could not read.");
        }

        if (!data.success) {
          throw new Error(data.error);
        }

        setInteractionId(data.interactionId);
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${requestId}`,
            role: "assistant",
            content: data.reply,
            learning: data.learning,
          },
        ]);
      } catch (sendError) {
        if (requestId !== requestIdRef.current) return;

        setError(
          sendError instanceof Error
            ? sendError.message
            : "Something went wrong. Please try again.",
        );
        // Put the message back so the student does not lose what they wrote.
        setDraft((current) => (current ? current : trimmed));
      } finally {
        if (requestId === requestIdRef.current) {
          setIsSending(false);
        }
      }
    },
    [draft, interactionId, isSending, level, mode],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const canSend = draft.trim().length > 0 && !isSending;
  const canRestart =
    !isSending && (messages.length > 1 || Boolean(interactionId));

  // --- Setup screen -------------------------------------------------------
  // Mode and level are chosen before the first message so the tutor opens in
  // the right register instead of adapting mid-conversation.
  if (phase === "setup") {
    return (
      <section
        aria-label="Set up your English practice"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold text-slate-900">
            Your personal English practice partner
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Choose your level and a practice style. You can switch later, and
            nothing you write here is saved.
          </p>
        </div>

        <div className="space-y-6 px-4 py-5 sm:px-5">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">
              Your level
            </legend>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {AI_TUTOR_LEVELS.map((option) => {
                const selected = option === level;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLevel(option)}
                    aria-pressed={selected}
                    className={[
                      "rounded-xl border px-3 py-2.5 text-left transition",
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-semibold">
                      {AI_TUTOR_LEVEL_LABELS[option]}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {LEVEL_DESCRIPTIONS[option]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">
              Practice mode
            </legend>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AI_TUTOR_MODES.map((option) => {
                const selected = option === mode;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    aria-pressed={selected}
                    className={[
                      "rounded-xl border px-3 py-2.5 text-left transition",
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-semibold">
                      {AI_TUTOR_MODE_LABELS[option]}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {MODE_DESCRIPTIONS[option]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs leading-5 text-slate-500">
            {AI_TUTOR_LEVEL_LABELS[level]} · {AI_TUTOR_MODE_LABELS[mode]}
          </p>
          <button
            type="button"
            onClick={startLesson}
            className="h-[46px] shrink-0 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Start practising
          </button>
        </div>
      </section>
    );
  }

  // --- Chat screen --------------------------------------------------------
  return (
    <section
      aria-label="AI English Tutor chat"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            AI English Tutor
          </p>
          <p className="truncate text-xs text-slate-500">
            {AI_TUTOR_LEVEL_LABELS[level]} · {AI_TUTOR_MODE_LABELS[mode]}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={backToSetup}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 sm:px-4"
          >
            Change
          </button>

          <button
            type="button"
            onClick={startNewConversation}
            disabled={!canRestart}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
          >
            Start New
          </button>
        </div>
      </div>

      <div
        ref={logRef}
        aria-live="polite"
        aria-busy={isSending}
        className="custom-scrollbar h-[55vh] min-h-[320px] space-y-4 overflow-y-auto px-4 py-5 sm:h-[60vh] sm:px-5"
      >
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={isUser ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={[
                  "max-w-[85%] break-words rounded-2xl sm:max-w-[75%]",
                  isUser
                    ? "rounded-br-md bg-blue-700 px-4 py-3 text-[15px] leading-7 text-white"
                    : "rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] leading-7 text-slate-800",
                ].join(" ")}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {!isUser && message.learning && (
                  <LearningCard learning={message.learning} />
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex justify-start">
            <p className="rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Tutor is typing…
            </p>
          </div>
        )}
      </div>

      {/* Lightweight, session-only progress. Nothing is persisted. */}
      {sessionStats.turns > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:px-5">
          <span>
            <span className="font-medium text-slate-700">
              {sessionStats.turns}
            </span>{" "}
            {sessionStats.turns === 1 ? "turn" : "turns"}
          </span>
          {sessionStats.corrections > 0 && (
            <span>
              <span className="font-medium text-slate-700">
                {sessionStats.corrections}
              </span>{" "}
              {sessionStats.corrections === 1 ? "correction" : "corrections"}
            </span>
          )}
          {sessionStats.averageScore !== null && (
            <span>
              Practice estimate{" "}
              <span className="font-medium text-slate-700">
                {sessionStats.averageScore}/100
              </span>
            </span>
          )}
          {sessionStats.focus.length > 0 && (
            <span className="text-slate-500">
              Next focus: {sessionStats.focus.join(", ")}
            </span>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={sendMessage}
        className="border-t border-slate-200 bg-white p-4 sm:p-5"
      >
        <label htmlFor="ai-tutor-message" className="sr-only">
          Message the AI English tutor
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            id="ai-tutor-message"
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={AI_TUTOR_MAX_MESSAGE_LENGTH}
            disabled={isSending}
            placeholder="Write in English… e.g. Yesterday I go to the market with my friend."
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-[15px] leading-6 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
          />

          <button
            type="submit"
            disabled={!canSend}
            className="h-[50px] shrink-0 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Press Enter to send · Shift + Enter for a new line
        </p>
      </form>
    </section>
  );
}

/**
 * Owner of the learner's level and mode.
 *
 * Both practice styles read the same selection, so switching from text to
 * voice keeps the learner where they were. Voice never mutates text state, and
 * text keeps working exactly as before with no voice session running.
 */
export default function AIEnglishTutor() {
  const [mode, setMode] = useState<AiTutorMode>(DEFAULT_AI_TUTOR_MODE);
  const [level, setLevel] = useState<AiTutorLevel>(DEFAULT_AI_TUTOR_LEVEL);

  return (
    <div className="space-y-6">
      <TutorPanel
        level={level}
        setLevel={setLevel}
        mode={mode}
        setMode={setMode}
      />

      <AITutorVoice level={level} mode={mode} />
    </div>
  );
}
