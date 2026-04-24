// ChatBubble — ChatGPT style layout
// User: gray box (#f0f0f0), right-aligned
// Bot: no box, text directly in UI, justified alignment
// Code blocks: light gray (#f6f8fa), colorful syntax highlighting
// Source links: **~url~** format, shows favicon + domain
import { useState } from "react";
import type { ReplyTo } from "../types";

interface ChatBubbleProps {
  senderName: string;
  text: string;
  isUser: boolean;
  fontSize?: number;
  replyTo?: ReplyTo;
  imageUrl?: string;
  isVideo?: boolean;
  isImageGenerating?: boolean;
  onImageClick?: (url: string) => void;
}

// ── Colorful shimmer while generating ──────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #5f27cd, #00d2d3, #ff6b6b)",
  backgroundSize: "400% 400%",
  animation: "colorShift 3s ease infinite",
  width: "320px",
  height: "320px",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

// ── Code block with copy button ─────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  }

  function highlight(raw: string): string {
    let s = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    s = s.replace(
      /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|finally|new|typeof|instanceof|void|null|undefined|true|false|def|print|and|or|not|in|is|elif|pass|break|continue|yield|lambda|with|as|raise|except|global|nonlocal)\b/g,
      '<span style="color:#0070c1;font-weight:600">$1</span>',
    );
    s = s.replace(
      /(["'`])([^"'`\n]*)\1/g,
      '<span style="color:#008000">$1$2$1</span>',
    );
    s = s.replace(
      /(\/\/[^\n]*)|(#[^\n]*)/g,
      '<span style="color:#6a737d;font-style:italic">$1$2</span>',
    );
    s = s.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#d67c00">$1</span>');
    return s;
  }

  return (
    <div
      style={{
        position: "relative",
        margin: "6px 0",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#f6f8fa",
        border: "1px solid rgba(0,0,0,0.09)",
      }}
    >
      <button
        type="button"
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          padding: "3px 8px",
          borderRadius: 6,
          background: copied ? "#27AE60" : "rgba(0,0,0,0.08)",
          color: copied ? "white" : "#555",
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 4,
          transition: "all 0.2s",
          zIndex: 1,
        }}
        aria-label="Copy code"
        data-ocid="code-copy-btn"
      >
        {copied ? (
          "Copied!"
        ) : (
          <>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="9"
                y="9"
                width="13"
                height="13"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            Copy
          </>
        )}
      </button>
      <pre
        style={{
          margin: 0,
          padding: "12px 16px",
          paddingRight: 60,
          overflowX: "auto",
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: 13,
          lineHeight: 1.6,
          color: "#222",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          background: "transparent",
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax-highlighted code
        dangerouslySetInnerHTML={{ __html: highlight(code) }}
      />
    </div>
  );
}

// ── Source link component ──────────────────────────────────────────────────

interface SourceLink {
  url: string;
  domain: string;
  faviconUrl: string;
}

function extractSourceLinks(text: string): SourceLink[] {
  // Match **~https://...~** pattern
  const pattern = /\*{0,2}~(https?:\/\/[^\s~<>"]+)~\*{0,2}/g;
  const links: SourceLink[] = [];
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: intentional exec loop
  while ((match = pattern.exec(text)) !== null) {
    const url = match[1];
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "");
      links.push({
        url,
        domain,
        faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      });
    } catch {
      // skip invalid URLs
    }
  }
  // Return last 2 unique domains
  const seen = new Set<string>();
  const unique: SourceLink[] = [];
  for (let i = links.length - 1; i >= 0; i--) {
    if (!seen.has(links[i].domain)) {
      seen.add(links[i].domain);
      unique.unshift(links[i]);
    }
    if (unique.length === 2) break;
  }
  return unique;
}

function stripSourceLinks(text: string): string {
  return text.replace(/\*{0,2}~(https?:\/\/[^\s~<>"]+)~\*{0,2}/g, "").trim();
}

function SourceBox({ sources }: { sources: SourceLink[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (sources.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        marginTop: "8px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
      data-ocid="source-box"
    >
      <span
        style={{
          fontSize: "10px",
          color: "#888",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Sources
      </span>
      {sources.map((src, idx) => (
        <div key={src.url} style={{ position: "relative" }}>
          {expandedIdx === idx ? (
            /* Expanded view: favicon + domain name (clickable to navigate) */
            <button
              type="button"
              onClick={() => {
                window.open(src.url, "_blank", "noopener,noreferrer");
                setExpandedIdx(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px 4px 6px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #EBF1FF, #E8E4FF)",
                border: "1px solid rgba(18,112,212,0.2)",
                cursor: "pointer",
                maxWidth: "180px",
                boxShadow: "0 2px 6px rgba(18,112,212,0.12)",
                transition: "all 0.2s",
              }}
              aria-label={`Open ${src.domain}`}
              data-ocid={`source-link-expanded.${idx + 1}`}
            >
              <img
                src={src.faviconUrl}
                alt={src.domain}
                width={16}
                height={16}
                style={{
                  borderRadius: "4px",
                  flexShrink: 0,
                  objectFit: "contain",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  color: "#1270D4",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                }}
              >
                {src.domain}
              </span>
            </button>
          ) : (
            /* Collapsed view: just the small favicon icon */
            <button
              type="button"
              onClick={() => setExpandedIdx(idx)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "rgba(18,112,212,0.08)",
                border: "1px solid rgba(18,112,212,0.16)",
                cursor: "pointer",
                transition: "all 0.2s",
                padding: 0,
              }}
              title={`Source: ${src.domain}`}
              aria-label={`Show source ${src.domain}`}
              data-ocid={`source-icon.${idx + 1}`}
            >
              <img
                src={src.faviconUrl}
                alt={src.domain}
                width={14}
                height={14}
                style={{
                  borderRadius: "3px",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.textContent = "🔗";
                    parent.style.fontSize = "12px";
                  }
                }}
              />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Markdown-like parser ────────────────────────────────────────────────────

function parseMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let keyCounter = 0;

  function nextKey() {
    return `md-${(keyCounter++).toString()}`;
  }

  while (i < text.length) {
    const codeStart = text.indexOf("*#*", i);
    if (codeStart !== -1) {
      const codeEnd = text.indexOf("*#*", codeStart + 3);
      if (codeEnd !== -1) {
        if (codeStart > i) {
          nodes.push(...parseInline(text.slice(i, codeStart), nextKey));
        }
        const code = text.slice(codeStart + 3, codeEnd);
        nodes.push(<CodeBlock key={nextKey()} code={code} />);
        i = codeEnd + 3;
        continue;
      }
    }
    nodes.push(...parseInline(text.slice(i), nextKey));
    break;
  }

  return nodes;
}

function parseInline(text: string, nextKey: () => string): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  // Pattern also handles source links **~url~** to skip them (they're handled separately)
  const pattern =
    /(\*{4})(.*?)\*{4}|(\*{3})(.*?)\*{3}|(\*{2})(.*?)\*{2}|(\*)(.*?)\*|(https?:\/\/[^\s<>"~]+)/gs;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: intentional exec loop
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={nextKey()}>{text.slice(lastIndex, match.index)}</span>,
      );
    }

    if (match[1] !== undefined) {
      nodes.push(
        <span
          key={nextKey()}
          style={{
            display: "block",
            fontWeight: 700,
            fontSize: "1.05em",
            color: "#1270D4",
            marginTop: 6,
            marginBottom: 2,
          }}
        >
          {match[2]}
        </span>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <strong key={nextKey()}>
          <em>{match[4]}</em>
        </strong>,
      );
    } else if (match[5] !== undefined) {
      nodes.push(<strong key={nextKey()}>{match[6]}</strong>);
    } else if (match[7] !== undefined) {
      nodes.push(<em key={nextKey()}>{match[8]}</em>);
    } else if (match[9] !== undefined) {
      nodes.push(
        <a
          key={nextKey()}
          href={match[9]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#1270D4",
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
        >
          {match[9]}
        </a>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={nextKey()}>{text.slice(lastIndex)}</span>);
  }

  return nodes;
}

// ── Sanitize bot text ───────────────────────────────────────────────────────

function sanitizeBotText(text: string): string {
  if (text.startsWith("⚠️") || text.includes("Server Error")) {
    return "Sorry, I am learning. Ask me something else.";
  }
  return text;
}

// ── Main ChatBubble component ───────────────────────────────────────────────

export function ChatBubble({
  senderName: _senderName,
  text,
  isUser,
  fontSize = 18,
  replyTo,
  imageUrl,
  isVideo,
  isImageGenerating,
  onImageClick,
}: ChatBubbleProps) {
  const [imgSrc, setImgSrc] = useState<string>(imageUrl ?? "");
  const [retried, setRetried] = useState(false);
  const rawDisplay = isUser ? text : sanitizeBotText(text);

  // For bot messages, extract source links and strip them from visible text
  const sources = isUser ? [] : extractSourceLinks(rawDisplay);
  const displayText = isUser ? rawDisplay : stripSourceLinks(rawDisplay);

  // Colorful shimmer while generating image/video
  if (isImageGenerating) {
    return (
      <>
        <style>{`
          @keyframes colorShift {
            0%   { background-position: 0% 50%; }
            25%  { background-position: 50% 0%; }
            50%  { background-position: 100% 50%; }
            75%  { background-position: 50% 100%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40%           { opacity: 1;   transform: scale(1.2); }
          }
        `}</style>
        <div style={shimmerStyle}>
          <span
            style={{
              color: "white",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              textShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
          >
            Generating Image...
          </span>
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "white",
                  display: "inline-block",
                  animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Video result
  if (imageUrl && isVideo) {
    return (
      <div
        className="flex flex-col gap-0.5 px-4 py-3 max-w-[72vw] break-words rounded-[20px] rounded-bl-sm"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.5,
          background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)",
          borderLeft: "3px solid #1270D4",
          boxShadow: "0 2px 10px rgba(18,112,212,0.10)",
        }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#1270D4] uppercase tracking-wide flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <polygon points="23 7 16 12 23 17 23 7" fill="#1270D4" />
              <rect
                x="1"
                y="5"
                width="15"
                height="14"
                rx="2"
                stroke="#1270D4"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            Video (silent)
          </span>
          <video
            src={imageUrl}
            autoPlay
            muted
            loop
            controls
            playsInline
            style={{
              maxWidth: "280px",
              maxHeight: "180px",
              borderRadius: "8px",
              display: "block",
              background: "#000",
            }}
            data-ocid="generated-video"
          />
        </div>
      </div>
    );
  }

  // Image result
  if (imageUrl) {
    const currentSrc = imgSrc || imageUrl;
    return (
      <div
        className="flex flex-col gap-0.5 px-4 py-3 max-w-[72vw] break-words rounded-[20px] rounded-bl-sm"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.5,
          background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)",
          borderLeft: "3px solid #1270D4",
          boxShadow: "0 2px 10px rgba(18,112,212,0.10)",
        }}
      >
        <button
          type="button"
          onClick={() => onImageClick?.(currentSrc)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            display: "block",
            maxWidth: "320px",
            width: "100%",
          }}
          aria-label="View image fullscreen"
          data-ocid="generated-image-btn"
        >
          <img
            src={currentSrc}
            alt="Generated"
            style={{
              width: "100%",
              maxWidth: "320px",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: "8px",
              cursor: "pointer",
              display: "block",
            }}
            onError={() => {
              if (!retried) {
                setRetried(true);
                setImgSrc("");
                setTimeout(() => {
                  setImgSrc(imageUrl);
                }, 2000);
              }
            }}
            data-ocid="generated-image"
          />
        </button>
      </div>
    );
  }

  // User text bubble — ChatGPT style: gray box (#f0f0f0), right-aligned, near full width
  if (isUser) {
    return (
      <div
        className="flex flex-col gap-0.5 px-4 py-3 break-words rounded-[18px] rounded-br-[4px]"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.55,
          background: "#f0f0f0",
          color: "#1A1A1A",
          maxWidth: "calc(100% - 16px)",
          marginLeft: "16px",
        }}
      >
        {replyTo && (
          <div
            className="flex gap-2 rounded-xl px-3 py-2 mb-1 mt-0.5"
            style={{
              background: "rgba(0,0,0,0.06)",
              fontSize: `${Math.max(fontSize - 3, 12)}px`,
            }}
          >
            <div className="w-[3px] flex-shrink-0 rounded-full self-stretch bg-[#1270D4]/60" />
            <div className="flex flex-col min-w-0">
              <span
                className="font-bold leading-tight mb-0.5 text-[#1270D4]"
                style={{ fontSize: `${Math.max(fontSize - 4, 11)}px` }}
              >
                {replyTo.sender}
              </span>
              <span className="line-clamp-2 break-words text-[#555]">
                {replyTo.text}
              </span>
            </div>
          </div>
        )}
        <span className="whitespace-pre-wrap">{displayText}</span>
      </div>
    );
  }

  // Bot text — NO box, text directly in UI with justified alignment
  return (
    <div
      className="flex flex-col gap-0.5 break-words min-w-0"
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: 1.65,
        color: "#1A1A1A",
        textAlign: "justify" as const,
        width: "100%",
      }}
    >
      {replyTo && (
        <div
          className="flex gap-2 rounded-xl px-3 py-2 mb-1 mt-0.5 bg-[#F3F4F7]"
          style={{ fontSize: `${Math.max(fontSize - 3, 12)}px` }}
        >
          <div className="w-[3px] flex-shrink-0 rounded-full self-stretch bg-[#1270D4]" />
          <div className="flex flex-col min-w-0">
            <span
              className="font-bold leading-tight mb-0.5 text-[#1270D4]"
              style={{ fontSize: `${Math.max(fontSize - 4, 11)}px` }}
            >
              {replyTo.sender}
            </span>
            <span className="line-clamp-2 break-words text-[#555555]">
              {replyTo.text}
            </span>
          </div>
        </div>
      )}
      <div className="whitespace-pre-wrap">{parseMarkdown(displayText)}</div>
      {/* Source icons — last 2 sources */}
      {sources.length > 0 && <SourceBox sources={sources} />}
    </div>
  );
}
