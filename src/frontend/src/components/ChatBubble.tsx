import type { ReplyTo } from "../types";

interface ChatBubbleProps {
  senderName: string;
  text: string;
  isUser: boolean;
  fontSize?: number;
  replyTo?: ReplyTo;
  imageUrl?: string;
  isImageGenerating?: boolean;
  onImageClick?: (url: string) => void;
}

const FALLBACK_BOT_MSG = "Sorry, I am learning 😅. Ask me something else.";

function sanitizeBotText(text: string): string {
  if (text.startsWith("⚠️") || text.includes("Server Error")) {
    return FALLBACK_BOT_MSG;
  }
  return text;
}

const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)",
  backgroundSize: "400% 400%",
  animation: "imgShimmer 2s ease infinite",
  width: "200px",
  height: "200px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export function ChatBubble({
  senderName,
  text,
  isUser,
  fontSize = 18,
  replyTo,
  imageUrl,
  isImageGenerating,
  onImageClick,
}: ChatBubbleProps) {
  const displayText = isUser ? text : sanitizeBotText(text);

  // Image generating loading state
  if (isImageGenerating) {
    return (
      <div
        className="flex flex-col gap-0.5 px-4 py-3 max-w-[72vw] break-words bg-[#EBEBF2] text-[#1A1A1A] rounded-[20px] rounded-bl-sm"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
      >
        <span className="font-bold text-sm opacity-80 leading-tight">
          {senderName}
        </span>
        <>
          <style>{`
            @keyframes imgShimmer {
              0%   { background-position: 0% 50%; }
              50%  { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
          `}</style>
          <div style={shimmerStyle}>
            <span
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              Generating image...
            </span>
          </div>
        </>
      </div>
    );
  }

  // Image result
  if (imageUrl) {
    return (
      <div
        className="flex flex-col gap-0.5 px-4 py-3 max-w-[72vw] break-words bg-[#EBEBF2] text-[#1A1A1A] rounded-[20px] rounded-bl-sm"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
      >
        <span className="font-bold text-sm opacity-80 leading-tight">
          {senderName}
        </span>
        <button
          type="button"
          onClick={() => onImageClick?.(imageUrl)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            display: "block",
          }}
          aria-label="View image fullscreen"
          data-ocid="generated-image-btn"
        >
          <img
            src={imageUrl}
            alt="Generated"
            style={{
              maxWidth: "256px",
              maxHeight: "256px",
              objectFit: "contain",
              borderRadius: "8px",
              cursor: "pointer",
              display: "block",
            }}
            data-ocid="generated-image"
          />
        </button>
      </div>
    );
  }

  // Normal text bubble
  return (
    <div
      className={`
        flex flex-col gap-0.5 px-4 py-3 max-w-[72vw] break-words
        ${
          isUser
            ? "bg-[#1270D4] text-white rounded-[20px] rounded-br-sm"
            : "bg-[#EBEBF2] text-[#1A1A1A] rounded-[20px] rounded-bl-sm"
        }
      `}
      style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
    >
      <span className="font-bold text-sm opacity-80 leading-tight">
        {senderName}
      </span>

      {/* Quoted reply box */}
      {replyTo && (
        <div
          className={`
            flex gap-2 rounded-xl px-3 py-2 mb-1 mt-0.5
            ${isUser ? "bg-[#0d5ab8]" : "bg-[#D4D4DE]"}
          `}
          style={{ fontSize: `${Math.max(fontSize - 3, 12)}px` }}
        >
          <div
            className={`w-[3px] flex-shrink-0 rounded-full self-stretch ${isUser ? "bg-white/60" : "bg-[#1270D4]"}`}
          />
          <div className="flex flex-col min-w-0">
            <span
              className={`font-bold leading-tight mb-0.5 ${isUser ? "text-white/90" : "text-[#1270D4]"}`}
              style={{ fontSize: `${Math.max(fontSize - 4, 11)}px` }}
            >
              {replyTo.sender}
            </span>
            <span
              className={`line-clamp-2 break-words ${isUser ? "text-white/75" : "text-[#555555]"}`}
            >
              {replyTo.text}
            </span>
          </div>
        </div>
      )}

      <span className="whitespace-pre-wrap">{displayText}</span>
    </div>
  );
}
