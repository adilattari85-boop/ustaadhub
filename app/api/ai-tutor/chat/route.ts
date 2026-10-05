import { NextResponse } from "next/server";

import {
  AI_TUTOR_MAX_INTERACTION_ID_LENGTH,
  AI_TUTOR_MAX_MESSAGE_LENGTH,
  DEFAULT_AI_TUTOR_LEVEL,
  DEFAULT_AI_TUTOR_MODE,
  isAiTutorLevel,
  isAiTutorMode,
  type AiTutorChatResponse,
  type AiTutorErrorCode,
} from "@/lib/aiTutor/shared";
import {
  AiTutorError,
  createTutorReply,
  getGeminiApiKey,
} from "@/lib/aiTutor/server";

// AI English Tutor chat endpoint.
//
// Isolated by design: it touches no database, no session and no payment
// feature, and it reads no request identity. The Gemini credential is read
// only inside `lib/aiTutor/server.ts`, so nothing secret is ever serialized
// into a response or shipped to the browser.
//
// Conversation memory is held by Gemini through `previous_interaction_id`;
// the browser echoes the id it received last turn and we keep no server state.

export const runtime = "nodejs";

/** Student-facing copy. Deliberately never echoes an upstream error message. */
const MESSAGES: Record<AiTutorErrorCode, string> = {
  invalid_request: "Something went wrong with that message. Please try again.",
  missing_message: "Please type a message for the tutor.",
  message_too_long: `Please keep your message under ${AI_TUTOR_MAX_MESSAGE_LENGTH} characters.`,
  not_configured:
    "The AI English Tutor is not available right now. Please try again later.",
  upstream_error:
    "The tutor could not reply just now. Please try again in a moment.",
  unexpected_response:
    "The tutor sent an unexpected reply. Please start a new conversation.",
};

function jsonResponse(body: AiTutorChatResponse, status: number) {
  return NextResponse.json(body, { status });
}

function failure(code: AiTutorErrorCode, status: number) {
  return jsonResponse({ success: false, code, error: MESSAGES[code] }, status);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return failure("invalid_request", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return failure("invalid_request", 400);
  }

  const raw = body as Record<string, unknown>;
  const message = typeof raw.message === "string" ? raw.message.trim() : "";

  if (!message) {
    return failure("missing_message", 400);
  }

  if (message.length > AI_TUTOR_MAX_MESSAGE_LENGTH) {
    return failure("message_too_long", 413);
  }

  const previousInteractionId =
    typeof raw.previousInteractionId === "string"
      ? raw.previousInteractionId.trim()
      : "";

  if (previousInteractionId.length > AI_TUTOR_MAX_INTERACTION_ID_LENGTH) {
    return failure("invalid_request", 400);
  }

  // Tutor mode and learner level are optional. Anything else is rejected as
  // malformed rather than silently coerced, so the model only ever sees a
  // level/mode it was actually configured to handle.
  const mode = raw.mode === undefined || raw.mode === null
    ? DEFAULT_AI_TUTOR_MODE
    : raw.mode;
  const level = raw.level === undefined || raw.level === null
    ? DEFAULT_AI_TUTOR_LEVEL
    : raw.level;

  if (!isAiTutorMode(mode) || !isAiTutorLevel(level)) {
    return failure("invalid_request", 400);
  }

  // Fail fast and clearly when the server is missing its credential, instead
  // of surfacing an opaque upstream error to the student.
  if (!getGeminiApiKey()) {
    console.error(
      "[ai-tutor] GEMINI_API_KEY is not configured; the tutor is unavailable.",
    );
    return failure("not_configured", 503);
  }

  try {
    const { reply, interactionId, learning } = await createTutorReply({
      message,
      previousInteractionId: previousInteractionId || undefined,
      mode,
      level,
    });

    // `learning` is omitted entirely when the model produced nothing worth
    // reporting, keeping the Phase 1 success shape byte-compatible.
    return jsonResponse(
      {
        success: true,
        reply,
        interactionId,
        ...(learning ? { learning } : {}),
      },
      200,
    );
  } catch (error) {
    if (error instanceof AiTutorError) {
      console.error(
        `[ai-tutor] Tutor reply failed (${error.reason}${
          error.upstreamStatus ? `, upstream ${error.upstreamStatus}` : ""
        }):`,
        error.message,
      );

      if (error.reason === "not_configured") {
        return failure("not_configured", 503);
      }

      // Gemini rate limiting is transient; tell the student to retry rather
      // than reporting a server error.
      if (error.upstreamStatus === 429) {
        return failure("upstream_error", 503);
      }

      return failure(
        error.reason === "unexpected_response"
          ? "unexpected_response"
          : "upstream_error",
        502,
      );
    }

    console.error("[ai-tutor] Unexpected tutor failure:", error);
    return failure("upstream_error", 502);
  }
}
