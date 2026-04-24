// User analytics tracking — stored in localStorage only (no backend).
// Fire-and-forget; never blocks the UI.

import type { UserAnalyticsEntry } from "../types";

const ANALYTICS_KEY = "crazybot_user_analytics";
const SESSION_IP_KEY = "crazybot_session_ip";
const SESSION_LOC_KEY = "crazybot_session_loc";
export const USER_ACTIVITY_KEY = "crazybot_user_activity";
export const MODEL_STATS_KEY = "crazybot_model_stats";

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
 * @param isImageGen - true if this is an image generation event
 * @param deviceId - optional device ID to associate with the analytics entry
 */
export async function trackUserActivity(
  isImageGen = false,
  deviceId?: string,
): Promise<void> {
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
        // Update deviceId if provided (keep existing if not)
        deviceId: deviceId ?? entry.deviceId,
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
        deviceId,
      });
    }
    saveAnalytics(entries);

    // Also record in user activity log for DAU/WAU tracking
    if (deviceId) {
      recordUserActivityEvent(deviceId);
    }
  } catch {
    // never block the UI
  }
}

export function getAllAnalytics(): UserAnalyticsEntry[] {
  return loadAnalytics();
}

/**
 * Get the current session IP (from sessionStorage cache or fetch).
 * Returns empty string if not yet fetched.
 */
export function getCachedIp(): string {
  return sessionStorage.getItem(SESSION_IP_KEY) ?? "";
}

// ── Daily / Weekly Active User tracking ────────────────────────────────────

interface ActivityEvent {
  deviceId: string;
  ts: number;
}

function loadActivityEvents(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(USER_ACTIVITY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityEvent[];
  } catch {
    return [];
  }
}

function saveActivityEvents(events: ActivityEvent[]): void {
  try {
    localStorage.setItem(USER_ACTIVITY_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

/** Record a single activity event for this device (fire-and-forget). */
export function recordUserActivityEvent(deviceId: string): void {
  try {
    const events = loadActivityEvents();
    // Prune events older than 8 days to keep storage lean
    const cutoff = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const pruned = events.filter((e) => e.ts > cutoff);
    pruned.push({ deviceId, ts: Date.now() });
    saveActivityEvents(pruned);
  } catch {
    // ignore
  }
}

/** Returns { daily, weekly } unique device counts. */
export function getActiveUserCounts(): { daily: number; weekly: number } {
  const events = loadActivityEvents();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;

  const dailyIds = new Set<string>();
  const weeklyIds = new Set<string>();
  for (const ev of events) {
    if (now - ev.ts < dayMs) dailyIds.add(ev.deviceId);
    if (now - ev.ts < weekMs) weeklyIds.add(ev.deviceId);
  }
  return { daily: dailyIds.size, weekly: weeklyIds.size };
}

// ── Model usage stats ──────────────────────────────────────────────────────

export type ModelStats = Record<string, number>;

export function loadModelStats(): ModelStats {
  try {
    const raw = localStorage.getItem(MODEL_STATS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ModelStats;
  } catch {
    return {};
  }
}

/** Increment the usage counter for a given model name. */
export function recordModelUsage(modelName: string): void {
  try {
    const stats = loadModelStats();
    stats[modelName] = (stats[modelName] ?? 0) + 1;
    localStorage.setItem(MODEL_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/** Return stats sorted by usage descending. */
export function getSortedModelStats(): { model: string; count: number }[] {
  const stats = loadModelStats();
  return Object.entries(stats)
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count);
}
