import { CrazyBotLogo } from "./SplashScreen";

interface InfoScreenProps {
  onContinue: () => void;
}

function getBotName(): string {
  const mode = localStorage.getItem("imageGenMode") ?? "standard";
  return mode === "pro" ? "Crazy Bot 5.6" : "Crazy Bot 5.4";
}

function getBotVersion(): string {
  const mode = localStorage.getItem("imageGenMode") ?? "standard";
  return mode === "pro" ? "5.6" : "5.4";
}

export function InfoScreen({ onContinue }: InfoScreenProps) {
  const botName = getBotName();
  const version = getBotVersion();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, #0a0e1a 0%, #0f1729 50%, #0a1020 100%)",
      }}
      data-ocid="info-screen"
    >
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="flex flex-col gap-6 text-center items-center max-w-sm w-full">
          {/* Logo with animated glow ring */}
          <div
            style={{
              position: "relative",
              width: 104,
              height: 104,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(18,112,212,0.20) 0%, transparent 70%)",
                animation: "infoGlow 3s ease-in-out infinite",
              }}
            />
            <CrazyBotLogo size={96} />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {botName}
            </h1>
            <div
              className="inline-flex items-center gap-1.5 mx-auto px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                background: "rgba(18,112,212,0.18)",
                border: "1px solid rgba(18,112,212,0.35)",
                color: "#60a5fa",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="5" cy="5" r="4" fill="#1270D4" fillOpacity="0.8" />
              </svg>
              Version {version}
            </div>
          </div>

          {/* Description — merged from welcome screen */}
          <p
            className="text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Your intelligent AI assistant. Ask anything — chat, generate images,
            analyze files, and more.
          </p>

          {/* Features row */}
          <div className="flex gap-4 w-full justify-center">
            {[
              { icon: "chat", label: "Smart Chat" },
              { icon: "image", label: "Image Gen" },
              { icon: "file", label: "File Analysis" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 flex-1"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  padding: "10px 6px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {icon === "chat" && (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                      stroke="#1270D4"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {icon === "image" && (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="2"
                      y="3"
                      width="20"
                      height="18"
                      rx="2"
                      stroke="#1270D4"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M2 15l5-5 4 4 3-3 8 8"
                      stroke="#1270D4"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="8" cy="8" r="1.5" fill="#1270D4" />
                  </svg>
                )}
                {icon === "file" && (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
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
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span
                  className="text-xs font-medium"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Creator info */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.8"
                />
              </svg>
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Created by Ishtiyak Mahmud
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.8"
                />
                <line
                  x1="16"
                  y1="2"
                  x2="16"
                  y2="6"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <line
                  x1="8"
                  y1="2"
                  x2="8"
                  y2="6"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <line
                  x1="3"
                  y1="10"
                  x2="21"
                  y2="10"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.8"
                />
              </svg>
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                February 2026
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Start button */}
      <div className="flex justify-center px-8 pb-10">
        <button
          type="button"
          onClick={onContinue}
          className="w-full max-w-sm px-8 py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #1270D4 0%, #0d5ab8 100%)",
            boxShadow: "0 4px 20px rgba(18,112,212,0.4)",
          }}
          data-ocid="info-continue-btn"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Start Chatting
        </button>
      </div>

      <style>{`
        @keyframes infoGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
