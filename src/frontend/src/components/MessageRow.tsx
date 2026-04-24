import { useRef, useState } from "react";
import type { ReplyTo } from "../types";
import { ChatBubble } from "./ChatBubble";

interface MessageRowProps {
  senderName: string;
  text: string;
  isUser: boolean;
  fontSize?: number;
  replyTo?: ReplyTo;
  onReply?: (text: string) => void;
  imageUrl?: string;
  isVideo?: boolean;
  isImageGenerating?: boolean;
  onImageClick?: (url: string) => void;
}

const SWIPE_THRESHOLD = 60;

export function MessageRow({
  senderName,
  text,
  isUser,
  fontSize = 18,
  replyTo,
  onReply,
  imageUrl,
  isVideo,
  isImageGenerating,
  onImageClick,
}: MessageRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const startXRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const swipeable = !isUser && !!onReply;

  function startSwipe(clientX: number) {
    if (!swipeable) return;
    startXRef.current = clientX;
    isDraggingRef.current = true;
    setTriggered(false);
  }

  function moveSwipe(clientX: number) {
    if (!swipeable || !isDraggingRef.current || startXRef.current === null)
      return;
    const delta = clientX - startXRef.current;
    if (delta > 0) {
      const clamped = Math.min(delta, SWIPE_THRESHOLD + 20);
      setTranslateX(clamped);
      if (clamped >= SWIPE_THRESHOLD && !triggered) setTriggered(true);
    }
  }

  function endSwipe() {
    if (!swipeable || !isDraggingRef.current) return;
    isDraggingRef.current = false;
    startXRef.current = null;
    setTranslateX(0);
    if (triggered) {
      setTriggered(false);
      onReply(text);
    }
  }

  // USER message row — right-aligned, nearly full width, small left margin
  if (isUser) {
    return (
      <div
        className="flex items-end justify-end w-full"
        data-ocid="message-row-user"
      >
        {/* No avatar — removed */}
        <div style={{ maxWidth: "calc(100% - 12px)", minWidth: 0 }}>
          <ChatBubble
            senderName={senderName}
            text={text}
            isUser
            fontSize={fontSize}
            replyTo={replyTo}
          />
        </div>
      </div>
    );
  }

  // BOT message row — left-aligned, full width, no box constraints
  return (
    <div
      className="flex items-start justify-start w-full relative"
      data-ocid="message-row-bot"
    >
      {/* No avatar — removed */}
      <div
        className="relative select-none min-w-0 flex-1"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDraggingRef.current
            ? "none"
            : "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onTouchStart={(e) => startSwipe(e.touches[0].clientX)}
        onTouchMove={(e) => moveSwipe(e.touches[0].clientX)}
        onTouchEnd={endSwipe}
        onMouseDown={(e) => startSwipe(e.clientX)}
        onMouseMove={(e) => moveSwipe(e.clientX)}
        onMouseUp={endSwipe}
        onMouseLeave={endSwipe}
      >
        <ChatBubble
          senderName={senderName}
          text={text}
          isUser={false}
          fontSize={fontSize}
          replyTo={replyTo}
          imageUrl={imageUrl}
          isVideo={isVideo}
          isImageGenerating={isImageGenerating}
          onImageClick={onImageClick}
        />

        {/* Reply swipe indicator */}
        {swipeable && translateX > 10 && (
          <div
            className="absolute -right-9 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-[#EBEBF2]"
            style={{ opacity: Math.min(translateX / SWIPE_THRESHOLD, 1) }}
            aria-hidden="true"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              role="img"
              aria-label="Reply"
            >
              <title>Reply</title>
              <path
                d="M7 3L3 7L7 11M3 7H10C11.6569 7 13 8.34315 13 10V13"
                stroke="#1270D4"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
