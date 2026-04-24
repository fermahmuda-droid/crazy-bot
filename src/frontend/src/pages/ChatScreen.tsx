import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ImageModal } from "../components/ImageModal";
import { MessageRow } from "../components/MessageRow";
import { useChat } from "../hooks/useChat";
import {
  type SavedChat,
  deleteSavedChat,
  loadSavedChats,
} from "../hooks/useChat";
import { useDevice } from "../hooks/useDevice";
import { useSettings } from "../hooks/useSettings";
import type { ChatMessage } from "../types";

const BROADCAST_KEY = "crazybot_broadcast";
const BROADCAST_SEEN_KEY = "crazybot_broadcast_seen";
const NAGA_API_KEY = "ng-Y1R9qp0pZTKhTxyCThAnWWM9bmtZhBga";
const NAGA_BASE_URL = "https://api.naga.ac/v1";

interface BroadcastData {
  message: string;
  id: string;
}

interface ChatScreenProps {
  onSettings: () => void;
  onExit: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ── SVG Icons ──────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Send"
    >
      <title>Send</title>
      <path
        d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Voice chat"
    >
      <title>Voice chat</title>
      <rect
        x="9"
        y="2"
        width="6"
        height="11"
        rx="3"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M5 10a7 7 0 0014 0"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="21"
        x2="12"
        y2="17"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="21"
        x2="16"
        y2="21"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Stop"
    >
      <title>Stop</title>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="white" />
    </svg>
  );
}

function CameraIcon({ color = "#00d4ff" }: { color?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Camera"
    >
      <title>Camera</title>
      <path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="13"
        r="4"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  );
}

function ImageIcon({ color = "#00d4ff" }: { color?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Photo"
    >
      <title>Photo</title>
      <rect
        x="2"
        y="3"
        width="20"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth="1.8"
      />
      <path
        d="M2 15l5-5 4 4 3-3 8 8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.5" fill={color} />
    </svg>
  );
}

function FileIcon({ color = "#00d4ff" }: { color?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="File"
    >
      <title>File</title>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="14,2 14,8 20,8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="8"
        y1="13"
        x2="16"
        y2="13"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="17"
        x2="13"
        y2="17"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AttachIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Attach"
    >
      <title>Attach file</title>
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        stroke={active ? "white" : "#1270D4"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocumentPreviewIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Document"
    >
      <title>Document</title>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        stroke="#1270D4"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="14,2 14,8 20,8"
        stroke="#1270D4"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <line
        x1="8"
        y1="13"
        x2="16"
        y2="13"
        stroke="#1270D4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="17"
        x2="13"
        y2="17"
        stroke="#1270D4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Hamburger / chat history icon (3 horizontal lines)
function HistoryIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      role="img"
      aria-label="Chat history"
    >
      <title>Chat history</title>
      <line
        x1="3"
        y1="5"
        x2="17"
        y2="5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="3"
        y1="10"
        x2="17"
        y2="10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="3"
        y1="15"
        x2="17"
        y2="15"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getBotName(): string {
  const mode = localStorage.getItem("imageGenMode") ?? "standard";
  return mode === "pro" ? "Crazy Bot 5.6" : "Crazy Bot 5.4";
}

// ── Naga AI Voice functions ─────────────────────────────────────────────────

async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice.webm");
  formData.append("model", "whisper-large-v3");

  const res = await fetch(`${NAGA_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${NAGA_API_KEY}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`STT failed: ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

async function textToSpeech(text: string): Promise<Blob> {
  const res = await fetch(`${NAGA_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NAGA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      input: text,
      voice: "alloy",
    }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  return res.blob();
}

// ── Voice animated ball ─────────────────────────────────────────────────────

function VoiceAnimatedBall({
  phase,
}: { phase: "recording" | "processing" | "playing" }) {
  const colors = [
    "#ff6b6b",
    "#feca57",
    "#48dbfb",
    "#ff9ff3",
    "#54a0ff",
    "#5f27cd",
  ];
  const label =
    phase === "recording"
      ? "Listening..."
      : phase === "processing"
        ? "Processing..."
        : "Speaking...";

  return (
    <div
      className="flex flex-col items-center gap-3 py-3"
      data-ocid="voice-ball-ui"
    >
      <div style={{ position: "relative", width: 80, height: 80 }}>
        {colors.map((color, i) => (
          <div
            key={color}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 18 + i * 2,
              height: 18 + i * 2,
              borderRadius: "50%",
              background: color,
              transform: "translate(-50%, -50%)",
              animation: `voiceBall 1.4s ease-in-out ${i * 0.18}s infinite`,
              opacity: 0.85,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="6" height="11" rx="3" fill="white" />
            <path
              d="M5 10a7 7 0 0014 0"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="21"
              x2="12"
              y2="17"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          background: "linear-gradient(90deg, #ff6b6b, #54a0ff, #ff9ff3)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Chat History Sidebar ────────────────────────────────────────────────────

interface ChatHistorySidebarProps {
  open: boolean;
  onClose: () => void;
  onLoadChat: (messages: ChatMessage[]) => void;
}

function ChatHistorySidebar({
  open,
  onClose,
  onLoadChat,
}: ChatHistorySidebarProps) {
  const [chats, setChats] = useState<SavedChat[]>([]);

  useEffect(() => {
    if (open) {
      setChats(loadSavedChats());
    }
  }, [open]);

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteSavedChat(id);
    setChats((prev) => prev.filter((c) => c.id !== id));
  }

  function handleLoad(chat: SavedChat) {
    const msgs: ChatMessage[] = chat.messages.map((m) => ({
      ...m,
      timestamp: BigInt(m.timestamp),
    }));
    onLoadChat(msgs);
    onClose();
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-40 cursor-default border-none"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          aria-label="Close chat history"
          data-ocid="history-overlay"
        />
      )}

      {/* Slide-in panel from left */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col"
        style={{
          width: "min(320px, 88vw)",
          background: "linear-gradient(180deg, #0f1320 0%, #1a1f2e 100%)",
          borderRight: "1px solid rgba(0,200,255,0.12)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.5)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        data-ocid="history-panel"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #1270D4 0%, #0d5ab8 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span className="text-white font-bold text-base tracking-tight">
            Chat History
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close history"
            data-ocid="history-close-btn"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <line
                x1="2"
                y1="2"
                x2="12"
                y2="12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="2"
                x2="2"
                y2="12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-3">
          {chats.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-12 px-6"
              data-ocid="history-empty-state"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="2"
                />
                <path
                  d="M14 16h12M14 20h8"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                No saved chats yet.
                <br />
                Chats save automatically when you leave.
              </p>
            </div>
          ) : (
            chats.map((chat, idx) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => handleLoad(chat)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/8 transition-colors focus-visible:outline-none focus-visible:bg-white/10 group"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                data-ocid={`history-item.${idx + 1}`}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(18,112,212,0.2)",
                    border: "1px solid rgba(18,112,212,0.3)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line
                      x1="3"
                      y1="5"
                      x2="17"
                      y2="5"
                      stroke="#1270D4"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <line
                      x1="3"
                      y1="10"
                      x2="17"
                      y2="10"
                      stroke="#1270D4"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <line
                      x1="3"
                      y1="15"
                      x2="11"
                      y2="15"
                      stroke="#1270D4"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "rgba(255,255,255,0.9)" }}
                  >
                    {chat.title}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {chat.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(chat.id, e)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500/25 transition-colors opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:opacity-100"
                  aria-label={`Delete chat: ${chat.title}`}
                  data-ocid={`history-delete-btn.${idx + 1}`}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line
                      x1="2"
                      y1="2"
                      x2="12"
                      y2="12"
                      stroke="rgba(255,100,100,0.8)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <line
                      x1="12"
                      y1="2"
                      x2="2"
                      y2="12"
                      stroke="rgba(255,100,100,0.8)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes voiceBall {
          0%, 100% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0.9; }
        }
      `}</style>
    </>
  );
}

// ── Main ChatScreen ────────────────────────────────────────────────────────

export function ChatScreen({ onSettings, onExit }: ChatScreenProps) {
  const { deviceId } = useDevice();
  const { settings, fontSize } = useSettings(deviceId);
  const {
    messages: hookMessages,
    isLoading,
    sendMessage,
    isSending,
    error,
  } = useChat(deviceId, settings?.userName ?? "User");

  // Allow overriding messages when loading a saved chat
  const [overrideMessages, setOverrideMessages] = useState<
    ChatMessage[] | null
  >(null);
  const messages = overrideMessages ?? hookMessages;

  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<{
    base64: string;
    mimeType: string;
    name: string;
    isImage: boolean;
    previewUrl?: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Chat mode
  const [chatMode] = useState<"flash" | "omega">(() => {
    try {
      const stored = localStorage.getItem("crazy-bot-chat-mode");
      return stored === "omega" ? "omega" : "flash";
    } catch {
      return "flash";
    }
  });

  // ── Voice chat state (Naga AI STT + TTS) ──────────────────────────────────
  type VoicePhase = "idle" | "recording" | "processing" | "playing";
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Broadcast banner state
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(BROADCAST_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as BroadcastData;
      if (!data.message) return null;
      const seenId = localStorage.getItem(BROADCAST_SEEN_KEY);
      if (seenId === data.id) return null;
      return data.message;
    } catch {
      return null;
    }
  });

  function dismissBroadcast() {
    try {
      const raw = localStorage.getItem(BROADCAST_KEY);
      if (raw) {
        const data = JSON.parse(raw) as BroadcastData;
        localStorage.setItem(BROADCAST_SEEN_KEY, data.id);
      }
    } catch {
      // ignore
    }
    setBroadcastMsg(null);
  }

  const [botName, setBotName] = useState(getBotName);
  useEffect(() => {
    const handler = () => setBotName(getBotName());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const [replyText, setReplyText] = useState<string | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const userName = settings.userName || "User";

  // Close attach menu on outside click
  useEffect(() => {
    if (!showAttachMenu) return;
    function handleOutside(e: MouseEvent) {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showAttachMenu]);

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (replyText !== null) {
      inputRef.current?.focus();
    }
  }, [replyText]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File too large (max 10MB)");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const [header, base64] = result.split(",");
      const mimeType = header.split(":")[1].split(";")[0];
      const isImage = mimeType.startsWith("image/");
      setAttachedFile({
        base64,
        mimeType,
        name: file.name,
        isImage,
        previewUrl: isImage ? result : undefined,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function triggerFileInput(accept: string, capture?: string) {
    setShowAttachMenu(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    if (capture) input.capture = capture;
    input.style.display = "none";
    input.onchange = (e) => {
      handleFileSelect(e as unknown as React.ChangeEvent<HTMLInputElement>);
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
  }

  function handleRemoveFile() {
    setAttachedFile(null);
    setFileError(null);
  }

  function handleSend() {
    const text = inputText.trim();
    if (!text && !attachedFile) return;
    if (isSending) return;

    const messageText =
      text || (attachedFile ? `[File: ${attachedFile.name}]` : "");
    setInputText("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const filePayload = attachedFile
      ? { base64: attachedFile.base64, mimeType: attachedFile.mimeType }
      : undefined;
    sendMessage(
      messageText,
      userName,
      replyText ?? undefined,
      chatMode,
      "realistic",
      filePayload,
    );
    setAttachedFile(null);
    setFileError(null);
    setReplyText(null);
    setOverrideMessages(null); // resume live messages after loading saved
    inputRef.current?.focus();
  }

  function handleKeyDown(_e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter key inserts a new line; only Send button submits.
  }

  // ── Naga AI Voice chat ──────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        for (const t of stream.getTracks()) t.stop();
        void processVoice();
      };

      recorder.start();
      setVoicePhase("recording");
    } catch {
      alert("Microphone permission denied. Please allow microphone access.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function processVoice() {
    setVoicePhase("processing");
    try {
      const mimeType = audioChunksRef.current[0]?.type ?? "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      // STT
      const transcript = await transcribeAudio(audioBlob);
      if (!transcript) {
        setVoicePhase("idle");
        return;
      }

      setInputText(transcript);

      // Send to Groq LLM — wait for response by temporarily monkey-patching
      // We do a direct Groq call here to get the response text for TTS
      const { sendToGroq } = await import("../lib/groq");
      const botResponse = await sendToGroq(transcript, chatMode, userName);

      // Add messages to chat
      sendMessage(
        transcript,
        userName,
        undefined,
        chatMode,
        "realistic",
        undefined,
      );

      // TTS
      setVoicePhase("playing");
      try {
        const audioBlob2 = await textToSpeech(botResponse);
        const url = URL.createObjectURL(audioBlob2);
        const audio = new Audio(url);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setVoicePhase("idle");
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setVoicePhase("idle");
        };
        void audio.play();
      } catch {
        setVoicePhase("idle");
      }
    } catch {
      setVoicePhase("idle");
    }
  }

  function handleMicOrSend() {
    if (inputText.trim() || attachedFile) {
      handleSend();
      return;
    }
    if (voicePhase === "idle") {
      void startRecording();
    } else if (voicePhase === "recording") {
      stopRecording();
    } else if (voicePhase === "playing") {
      audioPlayerRef.current?.pause();
      setVoicePhase("idle");
    }
  }

  const showMicIcon = !inputText.trim() && !attachedFile;
  const isVoiceActive = voicePhase !== "idle";

  function handleLoadSavedChat(msgs: ChatMessage[]) {
    setOverrideMessages(msgs);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        background: "linear-gradient(180deg, #f8faff 0%, #ffffff 100%)",
      }}
      data-ocid="chat-screen"
    >
      {/* Top Bar */}
      <div
        className="flex items-center gap-3 px-4 h-[70px] flex-shrink-0 border-b border-[#E5EAF5]"
        style={{
          background:
            "linear-gradient(135deg, #1270D4 0%, #0d5ab8 60%, #1a44c8 100%)",
          boxShadow: "0 2px 16px rgba(18,112,212,0.18)",
        }}
      >
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ background: "rgba(255,255,255,0.18)" }}
          aria-label="Exit application"
          data-ocid="exit-btn"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            role="img"
            aria-label="Close"
          >
            <title>Close</title>
            <line
              x1="2"
              y1="2"
              x2="12"
              y2="12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="2"
              x2="2"
              y2="12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Chat history button */}
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ background: "rgba(255,255,255,0.18)" }}
          aria-label="Chat history"
          data-ocid="history-btn"
        >
          <HistoryIcon />
        </button>

        <h1 className="flex-1 text-center text-xl font-bold text-white tracking-tight drop-shadow-sm">
          {botName}
        </h1>

        <button
          type="button"
          onClick={onSettings}
          className="w-[44px] h-[44px] flex items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ background: "rgba(255,255,255,0.18)" }}
          aria-label="Open settings"
          data-ocid="settings-btn"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Settings"
          >
            <title>Settings</title>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Broadcast Banner */}
      {broadcastMsg && (
        <div
          className="flex items-start gap-3 px-4 py-3 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #1270D4 0%, #7C3AED 100%)",
          }}
          data-ocid="broadcast-banner"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="flex-shrink-0 mt-0.5"
          >
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="flex-1 text-white text-sm font-medium leading-snug">
            {broadcastMsg}
          </p>
          <button
            type="button"
            onClick={dismissBroadcast}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
            aria-label="Dismiss announcement"
            data-ocid="broadcast-dismiss-btn"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <line
                x1="2"
                y1="2"
                x2="12"
                y2="12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="2"
                x2="2"
                y2="12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
        style={{ backgroundColor: settings.bgColor || "#FFFFFF" }}
        data-ocid="messages-list"
      >
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-end gap-2.5">
                <div
                  className="h-14 rounded-[20px] bg-[#EBEBF2] animate-pulse"
                  style={{ width: `${140 + i * 40}px` }}
                />
              </div>
            ))}
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div
            className="flex-1 flex items-center justify-center text-center"
            data-ocid="empty-state"
          >
            <div className="flex flex-col items-center gap-4 text-[#999999]">
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background:
                    "linear-gradient(135deg, #1270D4 0%, #7C3AED 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 24px rgba(18,112,212,0.25)",
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 56 56"
                  fill="none"
                  role="img"
                  aria-label="Bot"
                >
                  <rect
                    x="7"
                    y="7"
                    width="42"
                    height="42"
                    rx="10"
                    fill="white"
                    fillOpacity="0.2"
                  />
                  <circle
                    cx="20"
                    cy="24"
                    r="3.5"
                    stroke="white"
                    strokeWidth="1.8"
                    fill="none"
                  />
                  <circle
                    cx="36"
                    cy="24"
                    r="3.5"
                    stroke="white"
                    strokeWidth="1.8"
                    fill="none"
                  />
                  <line
                    x1="21"
                    y1="36"
                    x2="35"
                    y2="36"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#333333] text-base">
                  Say hi to {botName}!
                </p>
                <p className="text-sm text-[#888] mt-1">Ask me anything...</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageRow
            key={msg.id}
            senderName={msg.isUser ? userName : botName}
            text={msg.text}
            isUser={msg.isUser}
            fontSize={fontSize}
            replyTo={msg.replyTo}
            onReply={!msg.isUser ? (t) => setReplyText(t) : undefined}
            imageUrl={msg.imageUrl}
            isVideo={msg.isVideo}
            isImageGenerating={msg.isImageGenerating}
            onImageClick={(url) => setModalImageUrl(url)}
          />
        ))}

        {/* Bot typing indicator */}
        {isSending && (
          <div className="flex items-end gap-2.5" data-ocid="typing-indicator">
            <div
              className="px-5 py-4 rounded-[20px] rounded-bl-sm flex gap-1.5 items-center"
              style={{
                background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)",
                borderLeft: "3px solid #1270D4",
                boxShadow: "0 2px 8px rgba(18,112,212,0.10)",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #1270D4, #7C3AED)",
                    animation: `typingBounce 1.2s ease-in-out ${i * 200}ms infinite`,
                    display: "inline-block",
                    boxShadow: "0 0 6px rgba(18,112,212,0.4)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Voice animated ball */}
        {isVoiceActive && (
          <VoiceAnimatedBall
            phase={voicePhase as "recording" | "processing" | "playing"}
          />
        )}

        {/* Error banner */}
        {error && (
          <div
            className="mx-auto px-4 py-2 rounded-xl text-sm text-center flex items-center gap-2"
            style={{ background: "#FEE2E2", color: "#CC3333" }}
            data-ocid="send-error"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="#CC3333" strokeWidth="2" />
              <line
                x1="12"
                y1="8"
                x2="12"
                y2="12"
                stroke="#CC3333"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16" r="1" fill="#CC3333" />
            </svg>
            Message failed to send!
          </div>
        )}
      </div>

      {/* Reply preview bar */}
      {replyText !== null && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F7] border-t border-[#EBEBF2] flex-shrink-0"
          style={{ animation: "slideUpReply 0.2s ease-out" }}
          data-ocid="reply-preview-bar"
        >
          <div className="w-[3px] self-stretch rounded-full bg-[#1270D4] flex-shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-bold text-[#1270D4] leading-tight">
              Replying to {botName}
            </span>
            <span className="text-xs text-[#555555] line-clamp-2 break-words leading-snug mt-0.5">
              {replyText}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyText(null)}
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-[#DDDDE8] transition-colors"
            aria-label="Cancel reply"
            data-ocid="cancel-reply-btn"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              role="img"
              aria-label="Cancel"
            >
              <title>Cancel</title>
              <line
                x1="2"
                y1="2"
                x2="12"
                y2="12"
                stroke="#666"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="2"
                x2="2"
                y2="12"
                stroke="#666"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* File attachment preview */}
      {(attachedFile || fileError) && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F7] border-t border-[#EBEBF2] flex-shrink-0"
          data-ocid="file-preview-bar"
        >
          {fileError ? (
            <span className="text-xs text-[#CC3333] flex-1">{fileError}</span>
          ) : attachedFile ? (
            <>
              {attachedFile.isImage && attachedFile.previewUrl ? (
                <img
                  src={attachedFile.previewUrl}
                  alt="Attached"
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#EBEBF2]"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#EBF1FF] flex items-center justify-center flex-shrink-0">
                  <DocumentPreviewIcon />
                </div>
              )}
              <span className="text-xs text-[#555] flex-1 truncate min-w-0">
                {attachedFile.name}
              </span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-[#DDDDE8] transition-colors"
                aria-label="Remove attached file"
                data-ocid="remove-file-btn"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="none"
                  role="img"
                  aria-label="Remove"
                >
                  <title>Remove</title>
                  <line
                    x1="2"
                    y1="2"
                    x2="12"
                    y2="12"
                    stroke="#666"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <line
                    x1="12"
                    y1="2"
                    x2="2"
                    y2="12"
                    stroke="#666"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Input area */}
      <div
        className="flex items-end gap-2 px-4 py-3 flex-shrink-0 border-t border-[#E5EAF5]"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Attach file button — 3-option popup */}
        <div className="relative flex-shrink-0" ref={attachMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachMenu((v) => !v)}
            disabled={isSending}
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
            style={{
              background:
                attachedFile || showAttachMenu
                  ? "linear-gradient(135deg, #1270D4 0%, #7C3AED 100%)"
                  : "linear-gradient(135deg, #EBF1FF 0%, #E8E4FF 100%)",
              boxShadow:
                attachedFile || showAttachMenu
                  ? "0 0 0 2px rgba(18,112,212,0.3), 0 4px 12px rgba(18,112,212,0.25)"
                  : "none",
            }}
            aria-label="Attach file"
            aria-expanded={showAttachMenu}
            data-ocid="attach-file-btn"
          >
            <AttachIcon active={!!(attachedFile || showAttachMenu)} />
          </button>

          {showAttachMenu && (
            <div
              className="absolute bottom-full mb-2 left-0 rounded-2xl overflow-hidden z-30"
              style={{
                background: "linear-gradient(145deg, #1a1f2e 0%, #0f1320 100%)",
                border: "1px solid rgba(0,200,255,0.18)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,255,0.08)",
                minWidth: "150px",
              }}
              data-ocid="attach-menu"
            >
              <button
                type="button"
                onClick={() => triggerFileInput("image/*", "environment")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
                style={{ color: "#00d4ff" }}
                data-ocid="attach-camera-btn"
              >
                <CameraIcon />
                <span>Camera</span>
              </button>
              <div
                style={{
                  height: "1px",
                  background: "rgba(0,200,255,0.1)",
                  margin: "0 12px",
                }}
              />
              <button
                type="button"
                onClick={() => triggerFileInput("image/*")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
                style={{ color: "#00d4ff" }}
                data-ocid="attach-photo-btn"
              >
                <ImageIcon />
                <span>Photo</span>
              </button>
              <div
                style={{
                  height: "1px",
                  background: "rgba(0,200,255,0.1)",
                  margin: "0 12px",
                }}
              />
              <button
                type="button"
                onClick={() => triggerFileInput("*/*")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
                style={{ color: "#00d4ff" }}
                data-ocid="attach-file-picker-btn"
              >
                <FileIcon />
                <span>File</span>
              </button>
            </div>
          )}
        </div>

        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          enterKeyHint="enter"
          inputMode="text"
          rows={1}
          className="flex-1 px-4 py-2.5 rounded-xl outline-none text-[#1A1A1A] placeholder-[#AAAAAA] resize-none overflow-hidden leading-normal"
          style={{
            fontSize: `${fontSize}px`,
            maxHeight: "120px",
            overflowY: "auto",
            background: "rgba(243,244,247,0.9)",
            border: "1.5px solid rgba(18,112,212,0.12)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(18,112,212,0.4)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(18,112,212,0.10)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(18,112,212,0.12)";
            e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
          }}
          disabled={isSending || isVoiceActive}
          data-ocid="message-input"
          aria-label="Message input"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />

        {/* Send/Mic/Stop button */}
        <button
          type="button"
          onClick={handleMicOrSend}
          disabled={isSending && !isVoiceActive}
          className="flex-shrink-0 w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          style={{
            background: isVoiceActive
              ? voicePhase === "recording"
                ? "linear-gradient(135deg, #ef4444 0%, #cc2222 100%)"
                : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              : "linear-gradient(135deg, #1270D4 0%, #7C3AED 100%)",
            boxShadow: isVoiceActive
              ? voicePhase === "recording"
                ? "0 4px 14px rgba(239,68,68,0.45)"
                : "0 4px 14px rgba(245,158,11,0.45)"
              : "0 4px 14px rgba(18,112,212,0.30)",
          }}
          aria-label={
            isVoiceActive
              ? voicePhase === "recording"
                ? "Stop recording"
                : "Stop voice"
              : showMicIcon
                ? "Start voice chat"
                : "Send message"
          }
          data-ocid="send-btn"
        >
          {isVoiceActive ? (
            <StopIcon />
          ) : showMicIcon ? (
            <MicIcon />
          ) : (
            <SendIcon />
          )}
        </button>
      </div>

      {/* Exit confirm dialog */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          data-ocid="exit-dialog"
        >
          <div className="bg-white rounded-2xl p-6 mx-8 max-w-sm w-full shadow-xl">
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">
              Exit Application
            </h2>
            <p className="text-[#555555] mb-6">
              Are you sure you want to exit?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="flex-1 py-3 rounded-xl bg-[#CC3333] text-white font-bold hover:bg-[#aa2222] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3333]"
                data-ocid="exit-confirm-btn"
              >
                Yes, Exit
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-[#2A8A3E] text-white font-bold hover:bg-[#236d32] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A8A3E]"
                data-ocid="exit-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat history sidebar */}
      <ChatHistorySidebar
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadChat={handleLoadSavedChat}
      />

      <style>{`
        @keyframes slideUpReply {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes voiceBall {
          0%, 100% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0.9; }
        }
      `}</style>

      {/* Image fullscreen modal */}
      {modalImageUrl && (
        <ImageModal
          imageUrl={modalImageUrl}
          onClose={() => setModalImageUrl(null)}
        />
      )}
    </div>
  );
}
