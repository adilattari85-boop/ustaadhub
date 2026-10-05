"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AI_TUTOR_LEVEL_LABELS,
  AI_TUTOR_MODE_LABELS,
  AI_TUTOR_VOICE_STATUS_LABELS,
  type AiTutorLevel,
  type AiTutorMode,
  type AiTutorVoiceStatus,
} from "@/lib/aiTutor/shared";
import {
  startVoiceSession,
  type VoiceSession,
  type VoiceTranscriptLine,
} from "@/lib/aiTutor/liveClient";

/**
 * Real-time voice practice.
 *
 * Deliberately separate from the text chat: voice has its own start/stop
 * lifecycle, its own transcript and no structured learning cards. Learning
 * scores from speech are a later phase — this pass prioritises latency and a
 * stable audio session, so nothing here waits on an extra model call.
 */

// Every status that means a live session is running. `student-speaking` counts:
// it is the normal state between two of the student's sentences, and leaving it
// out would swap the Stop button for a Start button mid-conversation.
const isActive = (status: AiTutorVoiceStatus) =>
  status === "connecting" ||
  status === "listening" ||
  status === "student-speaking" ||
  status === "speaking";

export default function AITutorVoice({
  level,
  mode,
}: {
  level: AiTutorLevel;
  mode: AiTutorMode;
}) {
  const [status, setStatus] = useState<AiTutorVoiceStatus>("idle");
  const [error, setError] = useState("");
  const [lines, setLines] = useState<VoiceTranscriptLine[]>([]);

  const sessionRef = useRef<VoiceSession | null>(null);
  // Guards against a late resolution from a session the student already stopped.
  const runIdRef = useRef(0);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("disconnected");
  }, []);

  // Never leave the microphone open if the page goes away mid-session.
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    setError("");
    setLines([]);

    const session = await startVoiceSession({
      level,
      mode,
      events: {
        onStatus: (next) => {
          if (runIdRef.current === runId) setStatus(next);
        },
        onTranscript: (next) => {
          if (runIdRef.current === runId) setLines(next);
        },
        onError: (message) => {
          if (runIdRef.current === runId) setError(message);
        },
      },
    });

    // The student may have hit Stop while the microphone prompt was open.
    if (runIdRef.current !== runId) {
      session.stop();
      return;
    }

    sessionRef.current = session;
    setStatus("listening");
  }, [level, mode]);

  const active = isActive(status);

  // One visual language for the whole session: a single ring that changes colour
  // and breathes only while there is real activity. Quiet when it is waiting, so
  // the panel never looks like a dashboard of status readouts.
  const liveTone =
    status === "speaking"
      ? {
          dot: "bg-blue-600",
          ring: "bg-blue-400",
          ping: true,
          label: "Your tutor is speaking…",
          hint: "Talk over it any time to jump in.",
        }
      : status === "student-speaking"
        ? {
            dot: "bg-sky-600",
            ring: "bg-sky-400",
            ping: true,
            label: "I hear you…",
            hint: "Keep going — I'm following along.",
          }
        : status === "listening"
          ? {
              dot: "bg-emerald-500",
              ring: "bg-emerald-400",
              ping: false,
              label: "I'm listening…",
              hint: "Speak naturally in English.",
            }
          : status === "connecting"
            ? {
                dot: "bg-amber-500",
                ring: "bg-amber-400",
                ping: true,
                label: "Connecting to your tutor…",
                hint: "One moment.",
              }
            : status === "error"
              ? {
                  dot: "bg-red-500",
                  ring: "bg-red-400",
                  ping: false,
                  label: "Something went wrong",
                  hint: "",
                }
              : {
                  dot: "bg-slate-300",
                  ring: "bg-slate-200",
                  ping: false,
                  label: AI_TUTOR_VOICE_STATUS_LABELS[status],
                  hint: "",
                };

  return (
    <section
      aria-label="Voice practice"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">Voice Practice</h2>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {AI_TUTOR_LEVEL_LABELS[level]} · {AI_TUTOR_MODE_LABELS[mode]}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          Talk to your tutor out loud. It listens, replies in English and gently
          corrects you. Speak whenever you are ready.
        </p>
      </div>

      {/* Status line */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
        <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
          <span className="relative flex h-2.5 w-2.5">
            {liveTone.ping && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${liveTone.ring}`}
              />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${liveTone.dot}`}
            />
          </span>
          <span aria-live="polite">{liveTone.label}</span>
        </span>

        {active && (
          <span className="text-xs text-slate-500">{liveTone.hint}</span>
        )}
      </div>

      {/* Transcript */}
      {lines.length > 0 && (
        <div className="custom-scrollbar max-h-56 space-y-2.5 overflow-y-auto border-y border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-5">
          {lines.map((line) => (
            <div
              key={line.id}
              className={
                line.role === "student" ? "flex justify-end" : "flex justify-start"
              }
            >
              <p
                className={[
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6",
                  line.role === "student"
                    ? "rounded-br-md bg-blue-700 text-white"
                    : "rounded-bl-md border border-slate-200 bg-white text-slate-800",
                ].join(" ")}
              >
                {line.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5"
        >
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        {active ? (
          <button
            type="button"
            onClick={stop}
            className="h-[46px] shrink-0 rounded-xl border border-red-300 bg-white px-6 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Stop Voice Practice
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className="h-[46px] shrink-0 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Start Voice Practice
          </button>
        )}

        {lines.length > 0 && (
          <button
            type="button"
            onClick={() => setLines([])}
            className="h-[46px] shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            Clear transcript
          </button>
        )}

        <p className="text-xs leading-5 text-slate-500">
          Your browser will ask for microphone permission. Nothing is recorded or
          saved.
        </p>
      </div>
    </section>
  );
}