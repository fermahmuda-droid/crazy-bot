import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ImageModal } from "../components/ImageModal";
import { MessageRow } from "../components/MessageRow";
import { useChat } from "../hooks/useChat";
import { useDevice } from "../hooks/useDevice";
import { useSettings } from "../hooks/useSettings";
import { detectImageIntent } from "../lib/groq";

interface ChatScreenProps {
  onSettings: () => void;
  onExit: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function BotIconSvg() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Bot"
    >
      <title>Bot</title>
      <rect width="56" height="56" rx="14" fill="#292D38" />
      <rect x="7" y="7" width="42" height="42" rx="10" fill="#EBF1FF" />
      <circle
        cx="20"
        cy="24"
        r="3.5"
        stroke="#1270D4"
        strokeWidth="1.8"
        fill="none"
      />
      <circle
        cx="36"
        cy="24"
        r="3.5"
        stroke="#1270D4"
        strokeWidth="1.8"
        fill="none"
      />
      <line
        x1="21"
        y1="36"
        x2="35"
        y2="36"
        stroke="#333"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChatScreen({ onSettings, onExit }: ChatScreenProps) {
  const { deviceId } = useDevice();
  const { settings, fontSize } = useSettings(deviceId);
  const { messages, isLoading, sendMessage, isSending, error } = useChat(
    deviceId,
    settings?.userName ?? "User",
  );
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<{
    base64: string;
    mimeType: string;
    name: string;
    isImage: boolean;
    previewUrl?: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Chat mode state — persisted in localStorage
  const [chatMode, setChatMode] = useState<"flash" | "omega">(() => {
    try {
      const stored = localStorage.getItem("crazy-bot-chat-mode");
      return stored === "omega" ? "omega" : "flash";
    } catch {
      return "flash";
    }
  });

  const [showModeDropdown, setShowModeDropdown] = useState(false);

  // Image type state — persisted in localStorage
  const [imageType, setImageType] = useState<"realistic" | "artistic">(() => {
    try {
      const stored = localStorage.getItem("imageType");
      return stored === "artistic" ? "artistic" : "realistic";
    } catch {
      return "realistic";
    }
  });

  function selectImageType(type: "realistic" | "artistic") {
    setImageType(type);
    try {
      localStorage.setItem("imageType", type);
    } catch {
      // ignore storage errors
    }
  }

  // Detect if current input is an image request (for showing Image Type selector)
  const isImageRequest =
    !attachedFile &&
    inputText.trim().length > 0 &&
    detectImageIntent(inputText) !== null;

  function selectMode(mode: "flash" | "omega") {
    setChatMode(mode);
    setShowModeDropdown(false);
    try {
      localStorage.setItem("crazy-bot-chat-mode", mode);
    } catch {
      // ignore storage errors
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!showModeDropdown) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-mode-dropdown]")) {
        setShowModeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showModeDropdown]);

  // Reply state
  const [replyText, setReplyText] = useState<string | null>(null);

  // Image modal state
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const userName = settings.userName || "User";

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus input when reply is triggered
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
      // result is a data URL: "data:mimeType;base64,base64data"
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
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const filePayload = attachedFile
      ? { base64: attachedFile.base64, mimeType: attachedFile.mimeType }
      : undefined;

    sendMessage(
      messageText,
      userName,
      replyText ?? undefined,
      chatMode,
      imageType,
      filePayload,
    );
    setAttachedFile(null);
    setFileError(null);
    setReplyText(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(_e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter key (with or without Shift) always inserts a new line.
    // The only way to send is via the on-screen Send button.
  }

  return (
    <div
      className="flex flex-col bg-white"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
      data-ocid="chat-screen"
    >
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 h-[70px] bg-white border-b border-[#EBEBF2] shadow-sm flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="w-9 h-9 rounded-full bg-[#CC3333] flex items-center justify-center hover:bg-[#aa2222] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3333]"
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

        <h1 className="flex-1 text-center text-xl font-bold text-[#1A1A1A]">
          Crazy Bot 4.0
        </h1>

        <button
          type="button"
          onClick={onSettings}
          className="w-[54px] h-[54px] flex items-center justify-center rounded-xl hover:bg-[#F0F0F0] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          aria-label="Open settings"
          data-ocid="settings-btn"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1270D4"
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
                <div className="w-14 h-14 rounded-xl bg-[#EBEBF2] animate-pulse" />
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
            <div className="flex flex-col items-center gap-3 text-[#999999]">
              <svg
                width="48"
                height="48"
                viewBox="0 0 56 56"
                fill="none"
                role="img"
                aria-label="Empty chat"
              >
                <title>Empty chat</title>
                <rect width="56" height="56" rx="14" fill="#EBEBF2" />
                <rect
                  x="7"
                  y="7"
                  width="42"
                  height="42"
                  rx="10"
                  fill="#D8E4F8"
                />
                <circle
                  cx="20"
                  cy="24"
                  r="3.5"
                  stroke="#1270D4"
                  strokeWidth="1.8"
                  fill="none"
                />
                <circle
                  cx="36"
                  cy="24"
                  r="3.5"
                  stroke="#1270D4"
                  strokeWidth="1.8"
                  fill="none"
                />
                <line
                  x1="21"
                  y1="36"
                  x2="35"
                  y2="36"
                  stroke="#555"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <p className="font-medium text-[#555555]">Say hi to Crazy Bot!</p>
              <p className="text-sm">Ask me anything...</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageRow
            key={msg.id}
            senderName={msg.isUser ? userName : "Crazy Bot"}
            text={msg.text}
            isUser={msg.isUser}
            fontSize={fontSize}
            replyTo={msg.replyTo}
            onReply={!msg.isUser ? (t) => setReplyText(t) : undefined}
            imageUrl={msg.imageUrl}
            isImageGenerating={msg.isImageGenerating}
            onImageClick={(url) => setModalImageUrl(url)}
          />
        ))}

        {/* Bot typing indicator — shown while backend is processing */}
        {isSending && (
          <div className="flex items-end gap-2.5" data-ocid="typing-indicator">
            <div className="w-14 h-14 flex-shrink-0">
              <BotIconSvg />
            </div>
            <div className="px-5 py-4 bg-[#EBEBF2] rounded-[20px] rounded-bl-sm flex gap-1.5 items-center">
              <span
                className="w-2 h-2 rounded-full bg-[#888] animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-[#888] animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-[#888] animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            className="mx-auto px-4 py-2 rounded-xl bg-[#FEE2E2] text-[#CC3333] text-sm text-center"
            data-ocid="send-error"
          >
            Message failed to send !
          </div>
        )}
      </div>

      {/* Reply preview bar */}
      {replyText !== null && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F7] border-t border-[#EBEBF2] flex-shrink-0"
          style={{
            animation: "slideUpReply 0.2s ease-out",
          }}
          data-ocid="reply-preview-bar"
        >
          <div className="w-[3px] self-stretch rounded-full bg-[#1270D4] flex-shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-bold text-[#1270D4] leading-tight">
              Replying to Crazy Bot
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
                  <span className="text-lg">📄</span>
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

      {/* Mode toggle row — above input bar */}
      <div className="px-4 pt-2 pb-0 bg-white border-t border-[#EBEBF2] flex-shrink-0">
        {/* Image Type selector — only shown when input is an image request */}
        {isImageRequest && (
          <div
            className="flex items-center gap-1.5 mb-1.5"
            data-ocid="image-type-selector"
          >
            <span className="text-[10px] text-[#888] font-medium">
              Image Type:
            </span>
            <button
              type="button"
              onClick={() => selectImageType("realistic")}
              className={`flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] ${
                imageType === "realistic"
                  ? "bg-[#1270D4] text-white"
                  : "bg-[#F0F1F5] text-[#555] hover:bg-[#E0E4EE]"
              }`}
              aria-pressed={imageType === "realistic"}
              data-ocid="image-type-realistic"
            >
              📷 Realistic
            </button>
            <button
              type="button"
              onClick={() => selectImageType("artistic")}
              className={`flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
                imageType === "artistic"
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#F0F1F5] text-[#555] hover:bg-[#E0E4EE]"
              }`}
              aria-pressed={imageType === "artistic"}
              data-ocid="image-type-artistic"
            >
              🎨 Artistic
            </button>
          </div>
        )}
        <div className="relative inline-block" data-mode-dropdown>
          <button
            type="button"
            onClick={() => setShowModeDropdown((v) => !v)}
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
              chatMode === "flash"
                ? "bg-[#E8F3FF] text-[#1270D4] hover:bg-[#D0E8FF] focus-visible:ring-[#1270D4]"
                : "bg-[#F0EAFF] text-[#7C3AED] hover:bg-[#E5D8FF] focus-visible:ring-[#7C3AED]"
            }`}
            aria-label={`Switch mode — currently ${chatMode === "flash" ? "FlashX" : "OmegaX"}`}
            aria-expanded={showModeDropdown}
            data-ocid="mode-toggle-btn"
          >
            <span>{chatMode === "flash" ? "⚡ FlashX" : "🔮 OmegaX"}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M2 3.5l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>

          {showModeDropdown && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg border border-[#E5E7EB] min-w-[120px] z-20 overflow-hidden">
              <button
                type="button"
                onClick={() => selectMode("flash")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#1A1A1A] hover:bg-[#F3F4F7] transition-colors"
              >
                <span>⚡ FlashX</span>
                {chatMode === "flash" && (
                  <span className="text-[#1270D4] font-bold">✓</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => selectMode("omega")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#1A1A1A] hover:bg-[#F3F4F7] transition-colors"
              >
                <span>🔮 OmegaX</span>
                {chatMode === "omega" && (
                  <span className="text-[#7C3AED] font-bold">✓</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 py-2 bg-white flex-shrink-0">
        {/* (+) file attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="flex-shrink-0 w-[44px] h-[44px] rounded-full bg-[#F3F4F7] flex items-center justify-center hover:bg-[#E0E4EE] transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          aria-label="Attach file"
          data-ocid="attach-file-btn"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#555555"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Attach"
          >
            <title>Attach file</title>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={handleFileSelect}
          className="sr-only"
          tabIndex={-1}
        />

        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          enterKeyHint="enter"
          inputMode="text"
          rows={1}
          className="flex-1 px-4 py-2 rounded-xl bg-[#F3F4F7] border-none outline-none text-[#1A1A1A] placeholder-[#AAAAAA] focus:ring-2 focus:ring-[#1270D4] resize-none overflow-hidden leading-normal"
          style={{
            fontSize: `${fontSize}px`,
            maxHeight: "120px",
            overflowY: "auto",
          }}
          disabled={isSending}
          data-ocid="message-input"
          aria-label="Message input"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || (!inputText.trim() && !attachedFile)}
          className="flex-shrink-0 w-[44px] h-[44px] rounded-full bg-[#1270D4] flex items-center justify-center hover:bg-[#0e5db8] transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          aria-label="Send message"
          data-ocid="send-btn"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            role="img"
            aria-label="Send"
          >
            <title>Send</title>
            <path
              d="M4 11h13M12 5l6 6-6 6"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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

      {/* Keyframe for reply bar slide-up */}
      <style>{`
        @keyframes slideUpReply {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
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
