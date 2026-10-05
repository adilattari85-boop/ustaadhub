/**
 * Browser half of the AI English Tutor voice practice session.
 *
 * Responsibilities, and nothing else:
 *   - capture the microphone and resample it to 16 kHz mono PCM16
 *   - stream those chunks to the Gemini Live websocket
 *   - queue the 24 kHz PCM16 the model sends back and play it gaplessly
 *   - track a small connection state machine for the UI
 *
 * It holds no secret. The permanent Gemini key never reaches this module; the
 * server hands us a single-use ephemeral token instead (see `liveServer.ts`).
 *
 * Kept as plain functions and a factory rather than a hook so the React
 * component stays presentational and this engine stays testable on its own.
 */

import {
  AI_TUTOR_VOICE_INPUT_RATE,
  AI_TUTOR_VOICE_MODEL,
  AI_TUTOR_VOICE_OUTPUT_RATE,
  type AiTutorLiveTokenResponse,
  type AiTutorVoiceStatus,
} from "./shared";

/**
 * ScriptProcessorNode callback size, in frames.
 *
 * 1024 frames is ~21 ms at 48 kHz and ~23 ms at 44.1 kHz, so one WebSocket
 * message per callback lands inside the 20-40 ms window the Live API expects.
 *
 * The previous 4096 frames (~85-93 ms) *plus* a separate 100 ms accumulation
 * buffer meant the server did not even see the tail of a sentence until roughly
 * 100 ms after the student stopped talking. That is a hard floor on response
 * latency that no VAD tuning can recover, so it goes first.
 */
const CAPTURE_BUFFER_SIZE = 1024;

/** Guard so a silent room cannot spin forever without the UI noticing. */
const SETUP_TIMEOUT_MS = 20_000;

/**
 * The subset of a Live API server frame that this module reads.
 *
 * The SDK does not export a discriminated union for the raw websocket frames
 * (`ai.live` is the Node-only typed wrapper), so the shape is declared here and
 * the frame is parsed defensively at runtime.
 */
type LiveServerFrame = {
  setupComplete?: boolean;
  error?: { message?: string; code?: number };
  /**
   * Voice-activity signal the server already sends for its own automatic
   * activity detection. Read-only: it drives the "you are speaking" hint and
   * never influences capture, VAD or playback.
   */
  voiceActivity?: { voiceActivityType?: string };
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
    turnComplete?: boolean;
    interrupted?: boolean;
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
  };
};

/** One line of the live transcript, oldest first. */
export type VoiceTranscriptLine = {
  id: string;
  role: "student" | "tutor";
  text: string;
};

export type VoiceSessionEvents = {
  onStatus: (status: AiTutorVoiceStatus) => void;
  onTranscript: (lines: VoiceTranscriptLine[]) => void;
  onError: (message: string) => void;
};

export type VoiceSession = {
  /** Ends the session and releases the microphone, socket and audio context. */
  stop: () => void;
};

const FRIENDLY_MIC_ERRORS: Record<string, string> = {
  NotAllowedError:
    "Microphone access was blocked. Please allow microphone permission and try again.",
  PermissionDeniedError:
    "Microphone access was blocked. Please allow microphone permission and try again.",
  NotFoundError:
    "We could not find a microphone on this device.",
  DevicesNotFoundError:
    "We could not find a microphone on this device.",
  NotReadableError:
    "Your microphone is already in use by another app. Please close it and try again.",
  TrackStartError:
    "Your microphone is already in use by another app. Please close it and try again.",
  OverconstrainedError:
    "This microphone does not support the audio we need. Please try another one.",
};

function friendlyMicError(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name)
      : "";

  return (
    FRIENDLY_MIC_ERRORS[name] ??
    "We could not start your microphone. Please check your browser settings and try again."
  );
}

// --- PCM helpers ------------------------------------------------------------

/**
 * Encodes Float32 samples as little-endian PCM16 base64, which is the wire
 * format the Live API expects for `audio/pcm;rate=16000`.
 */
export function encodePcm16Base64(samples: Float32Array): string {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    // Asymmetric scaling matches the usual PCM16 conversion.
    const value = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(i * 2, value, true);
  }

  // Chunked conversion keeps `String.fromCharCode` off the argument-count limit.
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const STEP = 0x8000;
  for (let i = 0; i < bytes.length; i += STEP) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + STEP)) as unknown as number[],
    );
  }

  return btoa(binary);
}

/** Decodes base64 PCM16 bytes back into Float32 samples in [-1, 1]. */
export function decodePcm16Base64(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = Math.floor(bytes.byteLength / 2);
  const samples = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    samples[i] = view.getInt16(i * 2, true) / 0x8000;
  }

  return samples;
}

/**
 * Downsamples interleaved-free mono Float32 audio to the Live API's 16 kHz.
 *
 * Linear interpolation is deliberate: it is cheap enough to run on every audio
 * callback, and for speech it is indistinguishable from a windowed-sinc filter.
 */
export function resampleTo16k(
  samples: Float32Array,
  inputRate: number,
): Float32Array {
  if (inputRate === AI_TUTOR_VOICE_INPUT_RATE) return samples;
  if (inputRate <= 0) return new Float32Array(0);

  const ratio = inputRate / AI_TUTOR_VOICE_INPUT_RATE;
  const length = Math.floor(samples.length / ratio);
  const out = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const index = Math.floor(position);
    const frac = position - index;
    const a = samples[index] ?? 0;
    const b = samples[index + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }

  return out;
}

/**
 * Normalises one WebSocket frame to text.
 *
 * The Live API sends JSON as binary frames. A browser's default `binaryType` is
 * `"blob"`, so frames arrive here as Blobs even though the same frames arrive
 * as `ArrayBuffer` under Node's WebSocket. Handle every shape rather than
 * assuming one of them.
 */
async function decodeFrame(data: unknown): Promise<string> {
  if (typeof data === "string") return data;

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }

  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );
  }

  const blob = data as Blob | null;
  if (blob && typeof blob.arrayBuffer === "function") {
    return new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));
  }

  return "";
}

/**
 * Starts a voice session: microphone -> websocket -> gapless playback.
 *
 * The caller owns the returned handle and must call `stop()` on unmount. Every
 * failure path funnels into `events.onError` with student-safe wording and then
 * tears the session down, so no rejection escapes to the console.
 */
export async function startVoiceSession({
  level,
  mode,
  events,
}: {
  level: string;
  mode: string;
  events: VoiceSessionEvents;
}): Promise<VoiceSession> {
  // level/mode travel to the server, which locks the tutor configuration into
  // the ephemeral token. The browser never assembles a system instruction.

  const { onStatus, onTranscript, onError } = events;

  let status: AiTutorVoiceStatus = "idle";
  let stopped = false;

  const setStatus = (next: AiTutorVoiceStatus) => {
    if (status === next) return;
    status = next;
    onStatus(next);
  };

  // --- teardown bookkeeping ------------------------------------------------
  let socket: WebSocket | null = null;
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let inputNode: AudioNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let playbackGain: GainNode | null = null;
  let setupTimer: ReturnType<typeof setTimeout> | null = null;

  // --- output audio queue --------------------------------------------------
  // Chunks are scheduled back to back on the audio clock, each anchored to the
  // end of the previous one. That removes the gaps and overlaps that naive
  // `start(now)` playback produces.
  let nextChunkTime = 0;
  let speaking = false;
  let speakDrainTimer: ReturnType<typeof setTimeout> | null = null;
  // Every BufferSource that has started but not finished. On barge-in these are
  // stopped explicitly — resetting `nextChunkTime` alone would leave chunks that
  // were already scheduled in the future audible.
  const activeSources = new Set<AudioBufferSourceNode>();

  // --- transcript ----------------------------------------------------------
  let lines: VoiceTranscriptLine[] = [];
  let studentDraft = "";
  let tutorDraft = "";
  // Committed lines are numbered by `lineCounter` (`s1`, `t1`, ...). Drafts are
  // still streaming, so they must not borrow that namespace: while the student
  // spoke the next turn, the live draft reused the id of the line that had just
  // been committed (`s1`), and React reported two children with the same key.
  // Drafts therefore get their own `sd`/`td` ids, handed out once per draft and
  // reused until the draft is committed, so streaming updates a line in place.
  let lineCounter = 0;
  let draftCounter = 0;
  let studentDraftId = "";
  let tutorDraftId = "";

  /** Stable id for a streaming draft; allocated on first use, then reused. */
  const draftId = (role: VoiceTranscriptLine["role"]) => {
    if (role === "student") {
      if (!studentDraftId) studentDraftId = `sd${(draftCounter += 1)}`;
      return studentDraftId;
    }
    if (!tutorDraftId) tutorDraftId = `td${(draftCounter += 1)}`;
    return tutorDraftId;
  };

  const publish = () => {
    const next: VoiceTranscriptLine[] = [];
    if (studentDraft.trim()) {
      next.push({
        id: draftId("student"),
        role: "student",
        text: studentDraft.trim(),
      });
    }
    if (tutorDraft.trim()) {
      next.push({
        id: draftId("tutor"),
        role: "tutor",
        text: tutorDraft.trim(),
      });
    }
    onTranscript([...lines, ...next]);
  };

  /** Commits buffered speech into final transcript lines at a turn boundary. */
  const commitDrafts = () => {
    const additions: VoiceTranscriptLine[] = [];
    lineCounter += 1;
    if (studentDraft.trim()) {
      additions.push({
        id: `s${lineCounter}`,
        role: "student",
        text: studentDraft.trim(),
      });
    }
    if (tutorDraft.trim()) {
      additions.push({
        id: `t${lineCounter}`,
        role: "tutor",
        text: tutorDraft.trim(),
      });
    }
    lines = [...lines, ...additions].slice(-40);
    studentDraft = "";
    tutorDraft = "";
    // Retire the draft ids with the drafts they named, so the next turn starts
    // from a fresh id instead of one an already committed line owns.
    studentDraftId = "";
    tutorDraftId = "";
    publish();
  };

  function teardown() {
    stopped = true;

    if (setupTimer) {
      clearTimeout(setupTimer);
      setupTimer = null;
    }

    if (speakDrainTimer !== null) {
      clearTimeout(speakDrainTimer);
      speakDrainTimer = null;
    }

    try {
      inputNode?.disconnect();
    } catch {
      /* already disconnected */
    }
    try {
      sourceNode?.disconnect();
    } catch {
      /* already disconnected */
    }

    // Releasing every track is what actually turns the microphone light off.
    stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* already stopped */
      }
    });
    stream = null;

    if (socket) {
      // Drop handlers first so `close()` cannot report an error on a normal stop.
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        try {
          socket.close(1000, "client stop");
        } catch {
          /* socket already gone */
        }
      }
      socket = null;
    }

    if (audioContext) {
      void audioContext.close().catch(() => {
        /* already closed */
      });
      audioContext = null;
    }

    nextChunkTime = 0;
    speaking = false;
    if (status !== "error") setStatus("disconnected");
  }

  function fail(message: string) {
    if (stopped) return;
    setStatus("error");
    onError(message);
    teardown();
  }

/** Queues one 24 kHz model chunk for gapless playback. */
  const scheduleChunk = (samples: Float32Array) => {
    if (!audioContext || stopped || samples.length === 0) return;

    // The model speaks 24 kHz PCM and the buffer below is filled with samples at
    // the *device* rate, so both the buffer's length and its declared rate must
    // use `audioContext.sampleRate`. That keeps the resampling loop honest: it
    // indexes the source with `OUTPUT_RATE / sampleRate`, so a frame count based
    // on the input constant (16000) made every chunk 1.5x too long, which played
    // the tutor at half speed and dropped the last 25% of each chunk.
    const frames = Math.floor(
      (samples.length * audioContext.sampleRate) / AI_TUTOR_VOICE_OUTPUT_RATE,
    );
    if (frames <= 0) return;

    const buffer = audioContext.createBuffer(1, frames, audioContext.sampleRate);
    const channel = buffer.getChannelData(0);

    // Resample the model's 24 kHz to the device rate, so playback is correct on
    // both 44.1 kHz and 48 kHz hardware.
    const ratio = AI_TUTOR_VOICE_OUTPUT_RATE / audioContext.sampleRate;
    if (ratio === 1) {
      channel.set(samples.subarray(0, frames));
    } else {
      for (let i = 0; i < frames; i += 1) {
        const position = i * ratio;
        const index = Math.floor(position);
        const frac = position - index;
        const a = samples[index] ?? 0;
        const b = samples[index + 1] ?? a;
        channel[i] = a + (b - a) * frac;
      }
    }

    const node = audioContext.createBufferSource();
    node.buffer = buffer;
    node.connect(playbackGain ?? audioContext.destination);

    const startAt = Math.max(nextChunkTime, audioContext.currentTime + 0.02);
    nextChunkTime = startAt + frames / audioContext.sampleRate;

    if (!speaking) {
      speaking = true;
      setStatus("speaking");
    }

    node.onended = () => {
      activeSources.delete(node);
      node.disconnect();
      // The last scheduled chunk finished. Gemini can be a moment behind the
      // audio clock, so wait a beat and only report "listening" if nothing new
      // arrived. Without this the label flickers between the tutor speaking and
      // waiting on every gap between two chunks.
      if (!speaking) return;
      if (speakDrainTimer !== null) {
        clearTimeout(speakDrainTimer);
        speakDrainTimer = null;
      }
      speakDrainTimer = setTimeout(() => {
        speakDrainTimer = null;
        if (
          speaking &&
          audioContext &&
          nextChunkTime <= audioContext.currentTime + 0.05
        ) {
          speaking = false;
          if (!stopped && socket?.readyState === WebSocket.OPEN) {
            setStatus("listening");
          }
        }
      }, 400);
    };

    activeSources.add(node);
    node.start(startAt);
  };

  /** Immediately clears everything scheduled for playback (barge-in). */
  const flushPlayback = () => {
    for (const source of activeSources) {
      try {
        source.stop();
      } catch {
        // Already stopped or ended — nothing to do.
      }
      source.disconnect();
    }
    activeSources.clear();
    nextChunkTime = 0;
    speaking = false;
  };

  /** Handles one decoded frame from the Live API. */
  const handleMessage = (message: LiveServerFrame) => {
    if (message.setupComplete) {
      if (setupTimer) {
        clearTimeout(setupTimer);
        setupTimer = null;
      }
      setStatus("listening");
      return;
    }

    if (message.error) {
      // Never surface the upstream text: it can name models and parameters.
      console.error("[ai-tutor/voice] Live error:", message.error.message);
      fail("Voice practice stopped unexpectedly. Please start it again.");
      return;
    }

    // The server's own activity signal. Purely cosmetic feedback so the student
    // can see the tutor has picked their voice up; it gates nothing.
    const activity = message.voiceActivity?.voiceActivityType;
    if (activity === "ACTIVITY_START" && !speaking) {
      setStatus("student-speaking");
    } else if (activity === "ACTIVITY_END" && status === "student-speaking") {
      setStatus("listening");
    }

    const content = message.serverContent;
    if (!content) return;

    if (content.interrupted) {
      // The student spoke over the tutor. Stop scheduled audio right now so
      // nothing keeps playing over them, then wait for the model's reply.
      flushPlayback();
      if (!stopped) setStatus("listening");
    }

    const parts = content.modelTurn?.parts ?? [];
    for (const part of parts) {
      const data = part.inlineData?.data;
      if (!data) continue;
      try {
        scheduleChunk(decodePcm16Base64(data));
      } catch (error) {
        console.error("[ai-tutor/voice] Could not decode audio:", error);
      }
    }

    const studentText = content.inputTranscription?.text;
    if (studentText) {
      studentDraft = studentDraft
        ? `${studentDraft}${studentText.startsWith(" ") ? "" : " "}${studentText}`
        : studentText;
      publish();
    }

    const tutorText = content.outputTranscription?.text;
    if (tutorText) {
      tutorDraft = tutorDraft
        ? `${tutorDraft}${tutorText.startsWith(" ") ? "" : " "}${tutorText}`
        : tutorText;
      publish();
    }

    if (content.turnComplete) {
      commitDrafts();
      if (!stopped && socket?.readyState === WebSocket.OPEN && !speaking) {
        setStatus("listening");
      }
    }
  };

// --- browser capability checks ---------------------------------------------
  if (
    typeof window === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    fail(
      "This browser does not support voice practice. Please use the latest Chrome, Edge or Safari.",
    );
    return { stop: teardown };
  }

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextCtor) {
    fail(
      "This browser does not support voice practice. Please use the latest Chrome, Edge or Safari.",
    );
    return { stop: teardown };
  }

  setStatus("connecting");

  // Ask for the microphone before spending a token, so a denied permission
  // fails fast and costs nothing.
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (error) {
    fail(friendlyMicError(error));
    return { stop: teardown };
  }

  if (stopped) return { stop: teardown };

  // --- ephemeral token ------------------------------------------------------
  let credentials: AiTutorLiveTokenResponse | null;
  try {
    const response = await fetch("/api/ai-tutor/live-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, mode }),
    });
    credentials = (await response.json().catch(() => null)) as
      | AiTutorLiveTokenResponse
      | null;
  } catch (error) {
    console.error("[ai-tutor/voice] Token request failed:", error);
    fail("We could not reach the voice service. Please check your connection.");
    return { stop: teardown };
  }

  if (stopped) return { stop: teardown };

  if (!credentials?.success) {
    // The route already returns student-safe copy.
    fail(credentials?.error ?? "Voice practice is not available right now.");
    return { stop: teardown };
  }

// --- audio graph ------------------------------------------------------------
  try {
    audioContext = new AudioContextCtor();
    // Browsers start contexts suspended until a user gesture; the Start button
    // is that gesture, so resuming here avoids silent playback.
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    playbackGain = audioContext.createGain();
    playbackGain.gain.value = 1;
    playbackGain.connect(audioContext.destination);

    sourceNode = audioContext.createMediaStreamSource(stream);

    // A ScriptProcessorNode keeps resampling inside this module. An
    // AudioWorklet would need a separately served processor file; at ~21 ms
    // per callback the main-thread cost is still negligible and the browser
    // support matrix is far better. It is deprecated but not removed.
    const processor = audioContext.createScriptProcessor(
      CAPTURE_BUFFER_SIZE,
      1,
      1,
    );

    // One WebSocket message per callback — no accumulation buffer. Each frame
    // is already the 20-40 ms chunk the Live API wants, so the server sees the
    // tail of a sentence as soon as the student stops speaking.
    //
    // The audio MUST travel in `realtimeInput.audio`. The sibling field
    // `realtimeInput.mediaChunks` is accepted by the constrained
    // (ephemeral-token) Live endpoint but silently dropped: the socket stays
    // open, `setupComplete` still arrives, yet no audio ever reaches the model,
    // so server-side VAD never fires and no `serverContent` is ever produced.
    // That failure mode is invisible from the UI — the session just sits on
    // "Listening" forever.
    processor.onaudioprocess = (event) => {
      if (stopped || !socket || socket.readyState !== WebSocket.OPEN) return;
      if (!audioContext) return;

      const chunk = resampleTo16k(
        event.inputBuffer.getChannelData(0),
        audioContext.sampleRate,
      );
      const data = encodePcm16Base64(chunk);
      if (data.length === 0) return;

      try {
        socket.send(
          JSON.stringify({
            realtimeInput: {
              audio: { mimeType: "audio/pcm;rate=16000", data },
            },
          }),
        );
      } catch (error) {
        console.error("[ai-tutor/voice] Could not send audio:", error);
      }
    };

    sourceNode.connect(processor);
    // A ScriptProcessorNode only runs while connected to the graph, so route it
    // through a muted gain node to keep it alive without affecting playback.
    const sink = audioContext.createGain();
    sink.gain.value = 0;
    processor.connect(sink);
    sink.connect(audioContext.destination);

    inputNode = processor;
  } catch (error) {
    console.error("[ai-tutor/voice] Audio setup failed:", error);
    fail("We could not start the audio system. Please try again.");
    return { stop: teardown };
  }

// --- live websocket ---------------------------------------------------------
  // The Live API sends JSON in binary frames. Asking for ArrayBuffer avoids the
  // Blob allocation the browser would otherwise make on every audio chunk.
  try {
    socket = new WebSocket(credentials.url);
    socket.binaryType = "arraybuffer";
  } catch (error) {
    console.error("[ai-tutor/voice] Could not open the live socket:", error);
    fail("We could not connect to the voice service. Please try again.");
    return { stop: teardown };
  }

  // A socket that never finishes `setupComplete` is almost always an expired or
  // already-used token, so fail fast instead of looking stuck on "Connecting".
  setupTimer = setTimeout(() => {
    if (!stopped && status === "connecting") {
      fail("The voice session took too long to start. Please try again.");
    }
  }, SETUP_TIMEOUT_MS);

  socket.onopen = () => {
    if (stopped) return;
    // The model, AUDIO modality and system instruction are already locked into
    // the ephemeral token, so the browser sends only the model handle here.
    try {
      socket?.send(
        JSON.stringify({ setup: { model: `models/${AI_TUTOR_VOICE_MODEL}` } }),
      );
    } catch (error) {
      console.error("[ai-tutor/voice] Setup frame failed:", error);
      fail("We could not start the voice session. Please try again.");
    }
  };

  socket.onmessage = (event) => {
    if (stopped) return;

    void decodeFrame(event.data)
      .then((text) => {
        if (stopped || !text) return;
        try {
          handleMessage(JSON.parse(text) as LiveServerFrame);
        } catch (error) {
          // A malformed frame is not worth ending a working lesson over.
          console.error("[ai-tutor/voice] Ignored an unreadable frame:", error);
        }
      })
      .catch((error) => {
        console.error("[ai-tutor/voice] Could not read a frame:", error);
      });
  };

  socket.onerror = () => {
    if (stopped) return;
    console.error("[ai-tutor/voice] Live socket error.");
    fail("The voice connection was interrupted. Please try again.");
  };

  socket.onclose = (event) => {
    if (stopped) return;

    if (setupTimer) {
      clearTimeout(setupTimer);
      setupTimer = null;
    }

    // 1000 is our own clean stop; anything else is an unexpected drop.
    if (event.code === 1000) {
      teardown();
      return;
    }

    console.error(`[ai-tutor/voice] Live socket closed: ${event.code}`);
    fail("The voice session ended unexpectedly. Please start it again.");
  };

  return { stop: teardown };
}