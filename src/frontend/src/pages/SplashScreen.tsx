import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [opacity, setOpacity] = useState(0);

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
      className="min-h-screen flex items-center justify-center bg-[#F5F5F2]"
      style={{ opacity, transition: "opacity 0.6s ease" }}
      data-ocid="splash-screen"
    >
      <div className="flex flex-col items-center gap-4">
        <svg
          width="80"
          height="80"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Crazy Bot"
        >
          <title>Crazy Bot</title>
          <rect width="56" height="56" rx="14" fill="#292D38" />
          <rect x="7" y="7" width="42" height="42" rx="10" fill="#EBF1FF" />
          <line
            x1="28"
            y1="7"
            x2="28"
            y2="1"
            stroke="#292D38"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle
            cx="28"
            cy="0"
            r="3"
            stroke="#1270D4"
            strokeWidth="1.5"
            fill="none"
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
            stroke="#333333"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
          Welcome to be Crazy
        </h1>
      </div>
    </div>
  );
}
