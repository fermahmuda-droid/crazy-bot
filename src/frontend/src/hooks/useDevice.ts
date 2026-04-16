import { useMemo } from "react";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to unsigned hex string
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function useDevice(): { deviceId: string } {
  const deviceId = useMemo(() => {
    const raw = [
      navigator.userAgent,
      String(window.screen.width),
      String(window.screen.height),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join("|");
    return `dev_${simpleHash(raw)}`;
  }, []);

  return { deviceId };
}
