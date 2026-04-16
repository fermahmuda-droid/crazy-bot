// User analytics tracking — stored in localStorage only (no backend).
// Fire-and-forget; never blocks the UI.

import type { UserAnalyticsEntry } from "../types";

const ANALYTICS_KEY = "crazybot_user_analytics";
const SESSION_IP_KEY = "crazybot_session_ip";
const SESSION_LOC_KEY = "crazybot_session_loc";

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/TV|SmartTV|SMART-TV|Tizen|WebOS|HbbTV/i.test(ua)) return "TV";
  if (/iPad|Tablet|tablet/i.test(ua)) return "Tablet";
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile";
  if (window.screen.width > 1024) return "Desktop";
  return "Laptop";
}

interface GeoInfo {
  ip: string;
  country: string;
  city: string;
}

async function getGeoInfo(): Promise<GeoInfo> {
  // Check session cache first
  const cachedIp = sessionStorage.getItem(SESSION_IP_KEY);
  const cachedLoc = sessionStorage.getItem(SESSION_LOC_KEY);
  if (cachedIp && cachedLoc) {
    try {
      const loc = JSON.parse(cachedLoc) as { country: string; city: string };
      return { ip: cachedIp, country: loc.country, city: loc.city };
    } catch {
      // fall through
    }
  }

  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const ipData = (await ipRes.json()) as { ip: string };
    const ip = ipData.ip ?? "unknown";
    sessionStorage.setItem(SESSION_IP_KEY, ip);

    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      const geoData = (await geoRes.json()) as {
        country_name?: string;
        city?: string;
      };
      const country = geoData.country_name ?? "Unknown";
      const city = geoData.city ?? "Unknown";
      sessionStorage.setItem(
        SESSION_LOC_KEY,
        JSON.stringify({ country, city }),
      );
      return { ip, country, city };
    } catch {
      return { ip, country: "Unknown", city: "Unknown" };
    }
  } catch {
    return { ip: "unknown", country: "Unknown", city: "Unknown" };
  }
}

function loadAnalytics(): UserAnalyticsEntry[] {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UserAnalyticsEntry[];
  } catch {
    return [];
  }
}

function saveAnalytics(entries: UserAnalyticsEntry[]): void {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

/**
 * Track a user interaction (chat or image gen).
 * Fire-and-forget — never awaited by callers.
 */
export async function trackUserActivity(isImageGen = false): Promise<void> {
  try {
    const geo = await getGeoInfo();
    const deviceType = detectDeviceType();
    const now = Date.now();

    const entries = loadAnalytics();
    const idx = entries.findIndex((e) => e.ip === geo.ip);
    if (idx >= 0) {
      const entry = entries[idx];
      entries[idx] = {
        ...entry,
        chatCount: isImageGen ? entry.chatCount : entry.chatCount + 1,
        imageCount: isImageGen ? entry.imageCount + 1 : entry.imageCount,
        deviceType,
        country: geo.country,
        city: geo.city,
        lastSeen: now,
      };
    } else {
      entries.push({
        ip: geo.ip,
        chatCount: isImageGen ? 0 : 1,
        imageCount: isImageGen ? 1 : 0,
        deviceType,
        country: geo.country,
        city: geo.city,
        lastSeen: now,
      });
    }
    saveAnalytics(entries);
  } catch {
    // never block the UI
  }
}

export function getAllAnalytics(): UserAnalyticsEntry[] {
  return loadAnalytics();
}
