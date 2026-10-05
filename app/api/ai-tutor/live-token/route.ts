import { NextResponse } from "next/server";

import {
  DEFAULT_AI_TUTOR_LEVEL,
  DEFAULT_AI_TUTOR_MODE,
  isAiTutorLevel,
  isAiTutorMode,
  type AiTutorLiveTokenResponse,
  type AiTutorVoiceErrorCode,
} from "@/lib/aiTutor/shared";
import { getGeminiApiKey } from "@/lib/aiTutor/server";
import { createLiveToken } from "@/lib/aiTutor/liveServer";

// Issues a short-lived Gemini ephemeral token for one Live voice session.
//
// This endpoint is the only place the browser can reach the Live API, and it
// only ever hands back a single-use, expiring token that is already locked to
// the tutor's model, AUDIO modality and system instruction. The permanent
// GEMINI_API_KEY stays on the server.
//
// Like the chat endpoint it touches no database, session, payment or auth
// feature, and it reads no request identity.

export const runtime = "nodejs";

/** Student-facing copy. Never echoes an upstream message. */
const MESSAGES: Record<AiTutorVoiceErrorCode, string> = {
  invalid_request: "Something went wrong. Please try again.",
  not_configured:
    "Voice practice is not available right now. Please try again later.",
  upstream_error:
    "We could not start voice practice just now. Please try again in a moment.",
};

function jsonResponse(body: AiTutorLiveTokenResponse, status: number) {
  return NextResponse.json(body, { status });
}

function failure(code: AiTutorVoiceErrorCode, status: number) {
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

  // Mode and level choose the locked tutor configuration. They are validated
  // strictly, so the browser can only ever pick from the supported set.
  const mode =
    raw.mode === undefined || raw.mode === null
      ? DEFAULT_AI_TUTOR_MODE
      : raw.mode;
  const level =
    raw.level === undefined || raw.level === null
      ? DEFAULT_AI_TUTOR_LEVEL
      : raw.level;

  if (!isAiTutorMode(mode) || !isAiTutorLevel(level)) {
    return failure("invalid_request", 400);
  }

  if (!getGeminiApiKey()) {
    console.error(
      "[ai-tutor/voice] GEMINI_API_KEY is not configured; voice practice is unavailable.",
    );
    return failure("not_configured", 503);
  }

  try {
    const result = await createLiveToken({ level, mode });

    return jsonResponse({ success: true, ...result }, 200);
  } catch (error) {
    console.error("[ai-tutor/voice] Failed to create a live token:", error);
    return failure("upstream_error", 502);
  }
}