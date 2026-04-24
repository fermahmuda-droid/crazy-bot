import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

function getBotName(): string {
  const mode = localStorage.getItem("imageGenMode") ?? "standard";
  return mode === "pro" ? "Crazy Bot 5.6" : "Crazy Bot 5.4";
}

// Modern AI-inspired logo — Claude/Gemini/Grok style
// Colors: white + black + blue (#1270D4), minimal accent
export function CrazyBotLogo({ size = 88 }: { size?: number }) {
  const s = size;
  const c = s / 2;
  const outer = s * 0.34;
  const inner = s * 0.22;
  const core = s * 0.09;
  const dot = s * 0.04;
  const dotLg = s * 0.055;
  const strokeMain = s * 0.047;
  const strokeMid = s * 0.031;
  const strokeSm = s * 0.019;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      role="img"
      aria-label="Crazy Bot Logo"
    >
      <title>Crazy Bot</title>
      {/* Outer ring subtle */}
      <circle
        cx={c}
        cy={c}
        r={outer}
        stroke="#1270D4"
        strokeWidth={strokeSm}
        strokeOpacity="0.35"
      />
      {/* Inner ring */}
      <circle
        cx={c}
        cy={c}
        r={inner}
        stroke="#1270D4"
        strokeWidth={strokeSm}
        strokeOpacity="0.55"
      />
      {/* Arc 1 — bold blue top-right */}
      <path
        d={`M ${c} ${c - outer} A ${outer} ${outer} 0 0 1 ${c + outer} ${c}`}
        stroke="#1270D4"
        strokeWidth={strokeMain}
        strokeLinecap="round"
      />
      {/* Arc 2 — white right-bottom */}
      <path
        d={`M ${c + outer} ${c} A ${outer} ${outer} 0 0 1 ${c} ${c + outer}`}
        stroke="white"
        strokeWidth={strokeMid}
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      {/* Arc 3 — blue bottom-left */}
      <path
        d={`M ${c} ${c + outer} A ${outer} ${outer} 0 0 1 ${c - outer} ${c}`}
        stroke="#1270D4"
        strokeWidth={strokeMid}
        strokeLinecap="round"
        strokeOpacity="0.65"
      />
      {/* Arc 4 — white left-top */}
      <path
        d={`M ${c - outer} ${c} A ${outer} ${outer} 0 0 1 ${c} ${c - outer}`}
        stroke="white"
        strokeWidth={strokeSm}
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      {/* Accent dot top (blue) */}
      <circle cx={c} cy={c - outer} r={dotLg} fill="#1270D4" />
      {/* Accent dot right (white) */}
      <circle cx={c + outer} cy={c} r={dotLg} fill="white" />
      {/* Accent dot bottom */}
      <circle cx={c} cy={c + outer} r={dot} fill="#1270D4" fillOpacity="0.7" />
      {/* Center core white */}
      <circle cx={c} cy={c} r={core * 1.5} fill="white" />
      {/* Center blue dot */}
      <circle cx={c} cy={c} r={core} fill="#1270D4" />
    </svg>
  );
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [opacity, setOpacity] = useState(0);
  const botName = getBotName();

  useEffect(() => {
    const fadeIn = setTimeout(() => setOpacity(1), 100);
    const nav = setTimeout(() => onDone(), 3000);
    return () => {
      clearTimeout(fadeIn);
      clearTimeout(nav);
    };
  }, [onDone]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        opacity,
        transition: "opacity 0.6s ease",
        background:
          "linear-gradient(135deg, #0a0e1a 0%, #0f1729 50%, #0a1020 100%)",
      }}
      data-ocid="splash-screen"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo with glow */}
        <div
          style={{
            position: "relative",
            width: 96,
            height: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -16,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(18,112,212,0.22) 0%, transparent 70%)",
              animation: "glowPulse 2.4s ease-in-out infinite",
            }}
          />
          <CrazyBotLogo size={88} />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {botName}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            AI Assistant
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: i === 0 ? "#1270D4" : i === 1 ? "white" : "#1270D4",
                opacity: i === 1 ? 0.5 : 0.9,
                animation: `splashBounce 1.4s ease-in-out ${i * 200}ms infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splashBounce {
          0%, 80%, 100% { transform: scale(0.75); opacity: 0.4; }
          40% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
