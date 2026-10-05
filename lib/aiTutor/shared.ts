/**
 * Environment-agnostic contracts for the AI English Tutor.
 *
 * This module is imported by BOTH the server route handler and the browser
 * chat component, so it must stay free of secrets and must never read
 * server-only environment variables. Server-side Gemini access lives in
 * `lib/aiTutor/server.ts` only.
 */

/** Longest student message the chat endpoint accepts, in characters. */
export const AI_TUTOR_MAX_MESSAGE_LENGTH = 2000;

/**
 * Longest accepted conversation reference, in characters. Gemini interaction
 * ids are long base64-ish strings; this is a generous ceiling that still
 * rejects junk before it reaches the upstream API.
 */
export const AI_TUTOR_MAX_INTERACTION_ID_LENGTH = 512;

/**
 * TUTOR MODES
 *
 * A lightweight practice mode, chosen before the learner starts. Kept as a
 * closed union so the route can validate it and the UI can render it from a
 * single source of truth.
 */
export const AI_TUTOR_MODES = [
  "free-conversation",
  "grammar",
  "vocabulary",
  "daily",
] as const;

export type AiTutorMode = (typeof AI_TUTOR_MODES)[number];

export const DEFAULT_AI_TUTOR_MODE: AiTutorMode = "free-conversation";

/** Student-facing labels, so the UI never hardcodes display strings. */
export const AI_TUTOR_MODE_LABELS: Record<AiTutorMode, string> = {
  "free-conversation": "Free Conversation",
  grammar: "Grammar Practice",
  vocabulary: "Vocabulary Practice",
  daily: "Daily Practice",
};

export function isAiTutorMode(value: unknown): value is AiTutorMode {
  return (
    typeof value === "string" &&
    (AI_TUTOR_MODES as readonly string[]).includes(value)
  );
}

/**
 * LEARNER LEVEL
 *
 * Adjusts vocabulary, sentence length and how much Hindi/Urdu support is
 * offered. No placement test in this phase — the learner self-selects.
 */
export const AI_TUTOR_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type AiTutorLevel = (typeof AI_TUTOR_LEVELS)[number];

export const DEFAULT_AI_TUTOR_LEVEL: AiTutorLevel = "beginner";

/** Student-facing labels for the level picker. */
export const AI_TUTOR_LEVEL_LABELS: Record<AiTutorLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function isAiTutorLevel(value: unknown): value is AiTutorLevel {
  return (
    typeof value === "string" &&
    (AI_TUTOR_LEVELS as readonly string[]).includes(value)
  );
}

/**
 * LEARNING PAYLOAD
 *
 * Optional structured learning data attached to a tutor turn. The conversational
 * text always lives in `reply`; these fields are supplementary signals the UI
 * can render as a "learning card" under the bubble.
 *
 * Everything is optional on purpose: a turn with nothing worth reporting (a
 * greeting, a clarifying question) simply omits the payload entirely, and a
 * turn where structured output could not be parsed omits it too. The client
 * must therefore treat every field as nullable and must never depend on one
 * being present.
 *
 * Scores are self-reported practice estimates from a language model, NOT
 * validated language-assessment results — the UI must label them as such.
 */
export type AiTutorVocabularySuggestion = {
  word: string;
  meaning?: string;
  example?: string;
};

export type AiTutorScore = {
  grammar: number;
  vocabulary: number;
  fluency: number;
  overall: number;
};

export type AiTutorLearning = {
  /** Improved version of the learner's sentence, when one is worth giving. */
  correction?: string;
  /** One short, plain sentence explaining the rule behind the correction. */
  explanation?: string;
  /** A concrete task for the learner to do on their next turn. */
  practicePrompt?: string;
  /** Specific, actionable errors. Empty/omitted when nothing matters. */
  detectedMistakes?: string[];
  vocabularySuggestions?: AiTutorVocabularySuggestion[];
  score?: AiTutorScore;
  /** One or two focus areas for the rest of the session, e.g. "Past tense". */
  nextFocus?: string[];
};

/** Body accepted by `POST /api/ai-tutor/chat`. */
export type AiTutorChatRequest = {
  message: string;
  previousInteractionId?: string;
  mode?: AiTutorMode;
  level?: AiTutorLevel;
};

/**
 * Machine-readable failure reasons. The client switches on these, so keep them
 * stable; the human-readable `error` string is what the student actually sees.
 */
export type AiTutorErrorCode =
  | "invalid_request"
  | "missing_message"
  | "message_too_long"
  | "not_configured"
  | "upstream_error"
  | "unexpected_response";

export type AiTutorChatSuccess = {
  success: true;
  reply: string;
  interactionId: string;
  /**
   * Present only when the model returned structured learning data that parsed
   * cleanly. Absent on plain conversational turns and whenever structured
   * output failed to parse — see `lib/aiTutor/server.ts`.
   */
  learning?: AiTutorLearning;
};

export type AiTutorChatFailure = {
  success: false;
  code: AiTutorErrorCode;
  error: string;
};

/* -------------------------------------------------------------------------- */
/* VOICE (real-time speaking practice)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Live API model used for voice practice. Kept here so the client can label the
 * session without importing anything server-only.
 */
export const AI_TUTOR_VOICE_MODEL = "gemini-3.8-live";

/**
 * Input audio format the Live API expects from the browser microphone.
 * Output is `audio/pcm;rate=24000`; see `lib/aiTutor/liveClient.ts`.
 */
export const AI_TUTOR_VOICE_INPUT_RATE = 16000;
export const AI_TUTOR_VOICE_OUTPUT_RATE = 24000;

/** Why a live-token request failed. Mapped onto an HTTP status in the route. */
export type AiTutorVoiceErrorCode =
  | "invalid_request"
  | "not_configured"
  | "upstream_error";

/** Body accepted by `POST /api/ai-tutor/live-token`. */
export type AiTutorLiveTokenRequest = {
  mode?: AiTutorMode;
  level?: AiTutorLevel;
};

export type AiTutorLiveTokenSuccess = {
  success: true;
  /**
   * Short-lived, single-use Gemini ephemeral token. Safe to hand to the
   * browser: it only authorises the locked Live configuration below and
   * expires within minutes. The permanent API key is never included.
   */
  token: string;
  /** Full `wss://` Live endpoint, assembled server-side. */
  url: string;
  model: string;
  /** ISO timestamp after which new sessions are rejected. */
  expiresAt: string;
};

export type AiTutorLiveTokenFailure = {
  success: false;
  code: AiTutorVoiceErrorCode;
  error: string;
};

export type AiTutorLiveTokenResponse =
  | AiTutorLiveTokenSuccess
  | AiTutorLiveTokenFailure;

/** Connection states surfaced to the student in the voice UI. */
export const AI_TUTOR_VOICE_STATUSES = [
  "idle",
  "connecting",
  "listening",
  "student-speaking",
  "speaking",
  "disconnected",
  "error",
] as const;

export type AiTutorVoiceStatus = (typeof AI_TUTOR_VOICE_STATUSES)[number];

// Written as a tutoring session rather than a connection readout: the student
// should feel they are talking to a tutor, not watching a status light.
export const AI_TUTOR_VOICE_STATUS_LABELS: Record<AiTutorVoiceStatus, string> = {
  idle: "Ready when you are",
  connecting: "Connecting to your tutor…",
  listening: "I’m listening…",
  "student-speaking": "I hear you…",
  speaking: "Your tutor is speaking…",
  disconnected: "Session ended",
  error: "Something went wrong",
};
export type AiTutorChatResponse = AiTutorChatSuccess | AiTutorChatFailure;
