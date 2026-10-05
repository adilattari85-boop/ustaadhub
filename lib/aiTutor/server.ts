import { GoogleGenAI } from "@google/genai";

import {
  DEFAULT_AI_TUTOR_LEVEL,
  DEFAULT_AI_TUTOR_MODE,
  type AiTutorLearning,
  type AiTutorLevel,
  type AiTutorMode,
  type AiTutorVocabularySuggestion,
} from "@/lib/aiTutor/shared";

/**
 * SERVER ONLY — never import this module from a client component.
 *
 * The Gemini API key is read here, from a non-`NEXT_PUBLIC_` environment
 * variable, so Next.js can never inline it into a client bundle. Every Gemini
 * call for the AI English Tutor is made from this module and nothing else.
 */

/**
 * Flash model used for the tutor. `gemini-3.5-flash` is the current stable
 * Flash model: fast and cheap enough for interactive chat, and strong enough
 * for grammar correction.
 */
export const AI_TUTOR_MODEL = "gemini-3.5-flash";

/**
 * Upper bound for a single upstream call, so a slow upstream request can never
 * hold an API route open indefinitely.
 */
const REQUEST_TIMEOUT_MS = 30_000;


const BASE_SYSTEM_INSTRUCTION = `You are the AI English Tutor inside UstaadHub, an online learning platform used mainly by students in India and Pakistan.

WHO YOU ARE
- You are a warm, encouraging, professional English speaking and writing tutor.
- You are an AI assistant. Never claim to be a real, human or live teacher, and never say you can replace one. If a student asks, say plainly that you are an AI tutor.

HOW YOU TEACH
- Encourage the student to keep practising speaking and writing in English, even when they are unsure.
- Correct the mistakes that matter most: grammar, word order, articles, verb forms, tense and spelling. Do not flood the student with corrections.
- Keep every correction short. Show the improved version, then explain the rule in one plain sentence.
- When a sentence is understandable but sounds unnatural, suggest a more natural way to say it.
- Teach useful vocabulary in context, not as long word lists.
- Match your level, vocabulary and sentence length to the student's ability. Start simple with beginners and gradually step up as they improve.
- Write in English by default. Use short paragraphs or a few bullet points, never long walls of text.

HOW YOU CONVERSE
- This is a conversation, not a lecture. Keep replies short, usually 2 to 6 sentences.
- Always end your turn with a question, so the student keeps speaking or writing.
- When the student makes a mistake, correct it politely and encouragingly, then continue the conversation with a question.
- Build on what the student said. Ask about their life, studies, work, interests and goals so you practise English they will actually use.
- Do not lecture, do not write essays, and do not list every error you can find.

HINDI AND URDU SUPPORT
- Beginners often mix Hindi or Urdu into their message to ask what you mean.
- If they do, briefly explain the meaning or grammar in simple Hindi or Urdu, matching the script they used, then bring the conversation straight back to English practice.
- If they write entirely in Hindi or Urdu, reply briefly in that language to explain, then give them one easy English sentence to try and ask them to use it.

ALWAYS
- Be patient and encouraging, and celebrate genuine progress.
- Keep every lesson safe, respectful and age-appropriate.`;

/**
 * LEARNING ENGINE — appended to the base personality above.
 *
 * The base text is never rewritten; this only layers the tutor-mode, learner
 * level and structured-output contract on top of it, so the Phase 1
 * personality and its Hindi/Urdu support remain byte-for-byte intact.
 */
const LEARNING_ENGINE_INSTRUCTION = `THE LEARNING ENGINE
- You are a tutor running a practice session, not a general chatbot. Teach proactively: detect mistakes, explain them, then make the learner practise the fix.
- Only correct meaningful errors: grammar, verb tense, articles, prepositions, word order, spelling, wrong word choice, or phrasing a native speaker would find unnatural. Do not correct harmless stylistic preferences, and never correct more than two or three things in one turn.
- Classify what you notice: a grammar error, a vocabulary issue, unnatural phrasing, or a spelling mistake.
- When a correction matters, ask the learner to rewrite the corrected sentence on their next turn, then praise them when they get it.
- Keep the conversation natural. The visible reply must read like a friendly teacher talking — never like JSON, a template, or a checklist.`;

const MODE_INSTRUCTIONS: Record<AiTutorMode, string> = {
  "free-conversation":
    "PRACTICE MODE: Free Conversation — chat naturally about everyday life, studies, work and interests, quietly fixing the mistakes that matter most.",
  grammar:
    "PRACTICE MODE: Grammar Practice — centre the lesson on tense, articles, prepositions, sentence structure and subject-verb agreement. Give short sentences to rewrite, then vary the difficulty.",
  vocabulary:
    "PRACTICE MODE: Vocabulary Practice — introduce useful words naturally in context, ask the learner to use each new word in their own sentence, and revisit words from earlier turns.",
  daily:
    "PRACTICE MODE: Daily Practice — run a short, well-rounded daily lesson: a quick warm-up, one grammar focus, two or three new words, and a closing question for tomorrow.",
};

const LEVEL_INSTRUCTIONS: Record<AiTutorLevel, string> = {
  beginner:
    "LEARNER LEVEL: Beginner — use very simple English and short sentences, explain rules in one plain sentence, keep new vocabulary to one or two easy words, and freely offer Hindi or Urdu clarification when the learner seems stuck.",
  intermediate:
    "LEARNER LEVEL: Intermediate — write mostly in English, focus on correct grammar and more natural phrasing, and give slightly longer, more detailed explanations without over-simplifying.",
  advanced:
    "LEARNER LEVEL: Advanced — use natural, fluent English with sophisticated vocabulary, push the learner toward idiomatic and professional usage, and offer practice for interviews, business and presentations.",
};

const STRUCTURED_OUTPUT_INSTRUCTION = `RESPONSE FORMAT
- You must return a single JSON object and nothing else — no markdown, no code fences, no commentary.
- Always include "reply": the natural, friendly message shown to the learner. It must read like normal speech.
- Include the other fields ONLY when they genuinely apply this turn. Omit them otherwise:
  - "correction": the corrected version of the learner's sentence, only when they made a real mistake.
  - "explanation": one short plain sentence explaining the rule.
  - "practicePrompt": what the learner should do next, only when there is something to practise.
  - "detectedMistakes": a short list of specific, actionable errors; empty when the writing is fine.
  - "vocabularySuggestions": useful words with a short meaning and an example, mainly in Vocabulary and Daily modes.
  - "score": practice estimates from 0 to 100 for grammar, vocabulary, fluency and overall. Give them only on turns where you actually assessed the learner's writing; omit the field otherwise.
  - "nextFocus": one or two focus areas such as "Past tense", "Articles", "Prepositions", "Vocabulary" or "Sentence formation".
- Scores are rough practice estimates, never validated language-assessment results. Say so plainly if the learner asks about them.`;

/**
 * JSON schema for the structured tutor response.
 *
 * Applied via `response_format` so the model emits a JSON document rather than
 * prose. Every property is optional except `reply`: a turn with nothing to
 * correct simply omits the rest, which keeps natural chat turns cheap and the
 * payload honest. Verified working against `gemini-3.5-flash`.
 */
const TUTOR_RESPONSE_FORMAT = {
  type: "text",
  mime_type: "application/json",
  schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      correction: { type: "string" },
      explanation: { type: "string" },
      practicePrompt: { type: "string" },
      detectedMistakes: { type: "array", items: { type: "string" } },
      vocabularySuggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            word: { type: "string" },
            meaning: { type: "string" },
            example: { type: "string" },
          },
          required: ["word"],
        },
      },
      score: {
        type: "object",
        properties: {
          grammar: { type: "number" },
          vocabulary: { type: "number" },
          fluency: { type: "number" },
          overall: { type: "number" },
        },
      },
      nextFocus: { type: "array", items: { type: "string" } },
    },
    required: ["reply"],
  },
} as const;

/** Assembles the per-request system instruction from the shared base. */
function buildSystemInstruction(mode: AiTutorMode, level: AiTutorLevel): string {
  return [
    BASE_SYSTEM_INSTRUCTION,
    LEARNING_ENGINE_INSTRUCTION,
    MODE_INSTRUCTIONS[mode],
    LEVEL_INSTRUCTIONS[level],
    STRUCTURED_OUTPUT_INSTRUCTION,
  ].join("\n\n");
}

/** Why a tutor call failed. Safe to map onto an HTTP status in the route. */
export type AiTutorFailureReason =
  | "not_configured"
  | "upstream_error"
  | "unexpected_response";

export class AiTutorError extends Error {
  readonly reason: AiTutorFailureReason;
  /** Upstream HTTP status when Gemini returned one, for server-side logging. */
  readonly upstreamStatus: number | null;

  constructor(
    reason: AiTutorFailureReason,
    message: string,
    upstreamStatus: number | null = null,
  ) {
    super(message);
    this.name = "AiTutorError";
    this.reason = reason;
    this.upstreamStatus = upstreamStatus;
  }
}

/**
 * The server-side Gemini credential, or null when it is not configured.
 * Deliberately not `NEXT_PUBLIC_`-prefixed, so it stays out of client bundles.
 */
export function getGeminiApiKey(): string | null {
  const value = process.env.GEMINI_API_KEY;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function createClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new AiTutorError(
      "not_configured",
      "GEMINI_API_KEY is not configured on the server.",
    );
  }

  return new GoogleGenAI({ apiKey });
}

function readUpstreamStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const source = error as { status?: unknown; statusCode?: unknown };
  const status = typeof source.status === "number" ? source.status : source.statusCode;
  return typeof status === "number" ? status : null;
}

/**
 * Gemini rejects an unknown or expired `previous_interaction_id` with a 400.
 * That is recoverable (a stale tab, a conversation that aged out), so we retry
 * once as a brand new conversation instead of failing the student's lesson.
 *
 * Deliberately keyed on the HTTP status and the API's own `invalid_request`
 * reason, never on `error.name`. The SDK subclasses this error as an empty
 * `class BadRequestError extends APIError {}`, so `name` comes from the class
 * identifier and the production bundler minifies it (observed as `"ih"`),
 * which silently disables this fallback at runtime.
 */
function isInvalidPreviousInteraction(error: unknown): boolean {
  if (readUpstreamStatus(error) !== 400) return false;
  if (!error || typeof error !== "object") return false;

  const body = (error as { error?: { error?: { code?: unknown } } }).error;
  const code = body && body.error ? body.error.code : undefined;

  // The API reports bad arguments as `invalid_request`. If the payload shape
  // ever changes, keep matching on 400 so a stale conversation still recovers:
  // retrying with no previous id costs one extra call at worst, while missing
  // it would break the lesson outright.
  return code === undefined || code === "invalid_request";
}

function toAiTutorError(error: unknown): AiTutorError {
  if (error instanceof AiTutorError) return error;

  const message =
    error instanceof Error ? error.message : "Unknown Gemini failure.";

  return new AiTutorError("upstream_error", message, readUpstreamStatus(error));
}



/**
 * Pulls raw model text out of a completed interaction.
 *
 * `output_text` is the SDK's own concatenation of the final model output, so it
 * is the primary source. Walking `steps` is the fallback, and it deliberately
 * skips `thought` steps so internal reasoning never reaches a student.
 */
function extractRawText(interaction: {
  output_text?: string | undefined;
  steps?: ReadonlyArray<{
    type: string;
    content?: ReadonlyArray<{ type: string; text?: string }> | undefined;
  }> | undefined;
}): string {
  const direct =
    typeof interaction.output_text === "string"
      ? interaction.output_text.trim()
      : "";

  if (direct) return direct;

  const chunks: string[] = [];

  for (const step of interaction.steps ?? []) {
    if (step.type !== "model_output") continue;

    for (const part of step.content ?? []) {
      if (part.type === "text" && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join("").trim();
}

export type AiTutorReply = {
  reply: string;
  interactionId: string;
  learning?: AiTutorLearning;
};

/**
 * With structured output the model returns a JSON document instead of prose.
 * This only unwraps it — every field is validated later by
 * `coerceTutorLearning`, so a malformed document degrades to the Phase 1
 * plain-text path instead of failing the request.
 */
function toStructuredReply(raw: string): {
  reply?: string;
  learning?: unknown;
} {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  if (!cleaned.startsWith("{") || !cleaned.endsWith("}")) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const record = parsed as Record<string, unknown>;

  return {
    reply: typeof record.reply === "string" ? record.reply : undefined,
    // The response schema declares `correction`, `score`, `nextFocus` and the
    // rest as siblings of `reply`, NOT inside a nested `learning` object. A
    // nested object is still accepted so either shape works, and
    // `coerceTutorLearning` ignores `reply` itself, so passing the whole
    // document through is safe.
    learning: record.learning ?? record,
  };
}

/** Narrow an unknown value to a trimmed, non-empty string. */
function toText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Coerce an unknown value to a non-empty array of trimmed strings. */
function toArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Clamp an arbitrary numeric-ish value into a 0–100 integer. */
function toScore(value: unknown): number | undefined {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Validates and normalises the model's `learning` object into the shared
 * `AiTutorLearning` contract.
 *
 * The model can emit malformed, mistyped or out-of-range data on any turn, so
 * every field is optional and independently validated. Anything that does not
 * match the contract is silently dropped rather than thrown: a partially
 * useful learning payload is far better than failing the student's turn.
 * Returns `null` when nothing usable remains.
 */
function coerceTutorLearning(value: unknown): AiTutorLearning | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  const learning: AiTutorLearning = {};

  const correction = toText(raw.correction);
  if (correction) learning.correction = correction;

  const explanation = toText(raw.explanation);
  if (explanation) learning.explanation = explanation;

  const practicePrompt = toText(raw.practicePrompt);
  if (practicePrompt) learning.practicePrompt = practicePrompt;

  const detectedMistakes = toArray(raw.detectedMistakes);
  if (detectedMistakes) learning.detectedMistakes = detectedMistakes;

  const nextFocus = toArray(raw.nextFocus);
  if (nextFocus) learning.nextFocus = nextFocus;

  if (raw.vocabularySuggestions && Array.isArray(raw.vocabularySuggestions)) {
    const suggestions: AiTutorVocabularySuggestion[] = [];
    for (const item of raw.vocabularySuggestions) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const word = toText(entry.word);
      if (!word) continue;
      suggestions.push({
        word,
        ...(toText(entry.meaning) ? { meaning: toText(entry.meaning)! } : {}),
        ...(toText(entry.example) ? { example: toText(entry.example)! } : {}),
      });
    }
    if (suggestions.length) learning.vocabularySuggestions = suggestions;
  }

  if (raw.score && typeof raw.score === "object" && !Array.isArray(raw.score)) {
    const s = raw.score as Record<string, unknown>;
    const grammar = toScore(s.grammar);
    const vocabulary = toScore(s.vocabulary);
    const fluency = toScore(s.fluency);
    const overall = toScore(s.overall);

    if (
      grammar !== undefined ||
      vocabulary !== undefined ||
      fluency !== undefined ||
      overall !== undefined
    ) {
      // Fill any missing dimension from the others so the UI always gets a
      // complete 4-number object once a score is present at all.
      const known = [grammar, vocabulary, fluency, overall].filter(
        (n): n is number => n !== undefined,
      );
      const fallback = overall ?? Math.round(known.reduce((a, b) => a + b, 0) / known.length);
      learning.score = {
        grammar: grammar ?? fallback,
        vocabulary: vocabulary ?? fallback,
        fluency: fluency ?? fallback,
        overall: overall ?? fallback,
      };
    }
  }

  return Object.keys(learning).length ? learning : null;
}

/** Normalises one model response into the API contract, degrading safely. */
function resolveTutorOutput(raw: string): {
  reply: string;
  learning?: AiTutorLearning;
} {
  const structured = toStructuredReply(raw);
  const reply = typeof structured.reply === "string" ? structured.reply.trim() : "";

  // Not a JSON document at all, or an empty/missing reply: this is exactly the
  // Phase 1 shape, so the raw text stays the conversational answer.
  if (!reply) {
    return raw.trim() ? { reply: raw.trim() } : { reply: "" };
  }

  const learning = coerceTutorLearning(structured.learning);
  return learning ? { reply, learning } : { reply };
}

/**
 * Sends one student message to Gemini and returns the tutor's answer plus the
 * interaction id the browser echoes back to continue the conversation.
 *
 * Conversation memory lives on Gemini's side via `previous_interaction_id`, so
 * this endpoint stays stateless and nothing is written to a database.
 *
 * `mode` and `level` only alter the system instruction. They are never sent to
 * the model as structured input and never stored, so the same instruction
 * content identifies the same server-side conversation.
 */
export async function createTutorReply({
  message,
  previousInteractionId,
  mode = DEFAULT_AI_TUTOR_MODE,
  level = DEFAULT_AI_TUTOR_LEVEL,
}: {
  message: string;
  previousInteractionId?: string;
  mode?: AiTutorMode;
  level?: AiTutorLevel;
}): Promise<AiTutorReply> {
  const client = createClient();
  const previous = previousInteractionId?.trim() || undefined;
  const systemInstruction = buildSystemInstruction(mode, level);

  const ask = (conversationId?: string) =>
    client.interactions.create(
      {
        model: AI_TUTOR_MODEL,
        system_instruction: systemInstruction,
        input: message,
        // Structured output. If a future model refuses this, `output_text`
        // stays plain prose and `resolveTutorOutput` falls back to it.
        response_format: TUTOR_RESPONSE_FORMAT,
        ...(conversationId ? { previous_interaction_id: conversationId } : {}),
      },
      { timeout_ms: REQUEST_TIMEOUT_MS },
    );

  let interaction: Awaited<ReturnType<typeof ask>>;

  try {
    interaction = await ask(previous);
  } catch (error) {
    if (previous && isInvalidPreviousInteraction(error)) {
      interaction = await ask(undefined);
    } else {
      throw toAiTutorError(error);
    }
  }

  const resolved = resolveTutorOutput(extractRawText(interaction));

  if (!resolved.reply) {
    const failed =
      typeof interaction.status === "string" && interaction.status !== "completed";

    throw new AiTutorError(
      failed ? "upstream_error" : "unexpected_response",
      `The tutor returned no text (status: ${interaction.status}).`,
    );
  }

  if (typeof interaction.id !== "string" || interaction.id.length === 0) {
    throw new AiTutorError(
      "unexpected_response",
      "The tutor response did not include an interaction id.",
    );
  }

  return {
    reply: resolved.reply,
    interactionId: interaction.id,
    ...(resolved.learning ? { learning: resolved.learning } : {}),
  };
}
