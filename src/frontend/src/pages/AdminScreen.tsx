import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActiveUserCounts,
  getAllAnalytics,
  getSortedModelStats,
} from "../lib/analytics";
import type { UserAnalyticsEntry } from "../types";

const ADMIN_PW_KEY = "crazybot_admin_password";
const MAINTENANCE_KEY = "crazybot_maintenance_mode";
const BLOCKED_IPS_KEY = "crazybot_blocked_ips";
const LS_HISTORY_PREFIX = "crazy-bot-history-";
const BROADCAST_KEY = "crazybot_broadcast";
const IMGGEN_DISABLED_KEY = "crazybot_imggen_disabled";

interface AdminScreenProps {
  onBack: () => void;
  onStateChange?: () => void;
}

type AdminTab = "users" | "broadcast" | "imggen" | "models" | "stats";

interface BroadcastData {
  message: string;
  id: string;
}

function getBlockedIps(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_IPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function setBlockedIps(ips: string[]): void {
  localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(ips));
}

function isMaintenanceOn(): boolean {
  return localStorage.getItem(MAINTENANCE_KEY) === "true";
}

function isImggenDisabled(): boolean {
  return localStorage.getItem(IMGGEN_DISABLED_KEY) === "true";
}

function getActiveBroadcast(): string {
  try {
    const raw = localStorage.getItem(BROADCAST_KEY);
    if (!raw) return "";
    const data = JSON.parse(raw) as BroadcastData;
    return data.message ?? "";
  } catch {
    return "";
  }
}

function computeTotalStats(entries: UserAnalyticsEntry[]) {
  const totalChats = entries.reduce((s, e) => s + e.chatCount, 0);
  const totalImages = entries.reduce((s, e) => s + e.imageCount, 0);
  const mostActive = entries.reduce<UserAnalyticsEntry | null>((best, e) => {
    if (!best) return e;
    return e.chatCount + e.imageCount > best.chatCount + best.imageCount
      ? e
      : best;
  }, null);
  return { totalChats, totalImages, mostActive };
}

export function AdminScreen({ onBack, onStateChange }: AdminScreenProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<UserAnalyticsEntry[]>(() =>
    getAllAnalytics(),
  );
  const [newPassword, setNewPassword] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [maintenance, setMaintenance] = useState<boolean>(() =>
    isMaintenanceOn(),
  );
  const [blockedIps, setBlockedIpsState] = useState<string[]>(() =>
    getBlockedIps(),
  );
  const [toast, setToast] = useState<string | null>(null);

  // Broadcast state
  const [broadcastText, setBroadcastText] = useState("");
  const [activeBroadcast, setActiveBroadcast] = useState<string>(() =>
    getActiveBroadcast(),
  );

  // Image gen toggle
  const [imggenOff, setImggenOff] = useState<boolean>(() => isImggenDisabled());

  // Model stats
  const [modelStats, setModelStats] = useState<
    { model: string; count: number }[]
  >(() => getSortedModelStats());
  const [modelStatsUpdated, setModelStatsUpdated] = useState<string>(() =>
    new Date().toLocaleTimeString(),
  );

  // Active user counts
  const [activeUsers, setActiveUsers] = useState<{
    daily: number;
    weekly: number;
  }>(() => getActiveUserCounts());

  // Total stats (aggregate)
  const [totalStats, setTotalStats] = useState(() =>
    computeTotalStats(getAllAnalytics()),
  );

  // Auto-refresh every 30 seconds
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const refreshAll = useCallback(() => {
    const entries = getAllAnalytics();
    setUsers(entries);
    setBlockedIpsState(getBlockedIps());
    setMaintenance(isMaintenanceOn());
    setImggenOff(isImggenDisabled());
    setActiveBroadcast(getActiveBroadcast());
    const stats = getSortedModelStats();
    setModelStats(stats);
    setModelStatsUpdated(new Date().toLocaleTimeString());
    setActiveUsers(getActiveUserCounts());
    setTotalStats(computeTotalStats(entries));
  }, []);

  const handleRefresh = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      refreshAll();
    }, 30000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [refreshAll]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSavePassword() {
    const trimmed = newPassword.trim();
    if (!trimmed) return;
    localStorage.setItem(ADMIN_PW_KEY, trimmed);
    setNewPassword("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3000);
  }

  function handleToggleMaintenance() {
    const next = !maintenance;
    localStorage.setItem(MAINTENANCE_KEY, next ? "true" : "false");
    setMaintenance(next);
    onStateChange?.();
    showToast(next ? "Maintenance mode ON" : "Maintenance mode OFF");
  }

  function handleBlock(ip: string) {
    const current = getBlockedIps();
    if (!current.includes(ip)) {
      const updated = [...current, ip];
      setBlockedIps(updated);
      setBlockedIpsState(updated);
      onStateChange?.();
      showToast(`${ip} blocked`);
    }
  }

  function handleUnblock(ip: string) {
    const current = getBlockedIps();
    const updated = current.filter((b) => b !== ip);
    setBlockedIps(updated);
    setBlockedIpsState(updated);
    onStateChange?.();
    showToast(`${ip} unblocked`);
  }

  function handleDeleteHistory(user: UserAnalyticsEntry) {
    const did = user.deviceId;
    if (!did) {
      showToast("No device data available");
      return;
    }
    localStorage.removeItem(LS_HISTORY_PREFIX + did);
    showToast("Chat history deleted");
  }

  function handleBroadcast() {
    const msg = broadcastText.trim();
    if (!msg) return;
    const data: BroadcastData = { message: msg, id: String(Date.now()) };
    localStorage.setItem(BROADCAST_KEY, JSON.stringify(data));
    setActiveBroadcast(msg);
    setBroadcastText("");
    showToast("Broadcast sent!");
  }

  function handleClearBroadcast() {
    localStorage.removeItem(BROADCAST_KEY);
    setActiveBroadcast("");
    showToast("Broadcast cleared");
  }

  function handleToggleImggen() {
    const next = !imggenOff;
    if (next) {
      localStorage.setItem(IMGGEN_DISABLED_KEY, "true");
    } else {
      localStorage.removeItem(IMGGEN_DISABLED_KEY);
    }
    setImggenOff(next);
    showToast(next ? "Image generation DISABLED" : "Image generation ENABLED");
  }

  function isOnline(lastSeen: number): boolean {
    return Date.now() - lastSeen < 5 * 60 * 1000;
  }

  function formatTime(ts: number): string {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "users", label: "Users" },
    { id: "broadcast", label: "Broadcast" },
    { id: "imggen", label: "ImgGen" },
    { id: "models", label: "Models" },
    { id: "stats", label: "Stats" },
  ];

  // Max count for relative bar width in model stats
  const maxModelCount = modelStats[0]?.count ?? 1;

  return (
    <div
      className="flex flex-col h-screen bg-[#F3F4F7]"
      data-ocid="admin-screen"
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-[70px] bg-white border-b border-[#EBEBF2] shadow-sm flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-[#1270D4] text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#EBF1FF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          aria-label="Go back"
          data-ocid="admin-back-btn"
        >
          ‹
        </button>
        <h1 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <polygon
              points="13,2 3,14 12,14 11,22 21,10 12,10"
              stroke="#1270D4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          Neural Command
        </h1>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleRefresh}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#EBF1FF] text-[#1270D4] hover:bg-[#d0e3f8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          aria-label="Refresh data"
          data-ocid="admin-refresh-btn"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            role="img"
            aria-label="Refresh"
          >
            <title>Refresh</title>
            <path
              d="M4 10a6 6 0 1 1 1.5 4"
              stroke="#1270D4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 14V10H8"
              stroke="#1270D4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#1A1A2E] text-white text-sm rounded-xl shadow-lg border border-[#333] pointer-events-none">
          {toast}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex bg-white border-b border-[#EBEBF2] flex-shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 py-3 text-xs font-bold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] ${
              activeTab === tab.id
                ? "text-[#1270D4] border-b-2 border-[#1270D4]"
                : "text-[#888] hover:text-[#555]"
            }`}
            data-ocid={`admin-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scroll content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <>
            {/* Maintenance Mode */}
            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              Maintenance Mode
            </p>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm"
              data-ocid="admin-maintenance-section"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-[#1A1A1A]">
                    Maintenance Mode
                  </span>
                  <span className="text-xs text-[#888]">
                    {maintenance
                      ? "ON — users see maintenance screen"
                      : "OFF — app is live for all users"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMaintenance}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] flex-shrink-0 ${
                    maintenance ? "bg-[#F59E0B]" : "bg-[#D1D5DB]"
                  }`}
                  role="switch"
                  aria-checked={maintenance}
                  data-ocid="maintenance-toggle"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${maintenance ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
              {maintenance && (
                <div className="mt-3 px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#92400E] text-xs font-medium">
                  Maintenance mode is active. Only you (admin) can use the app.
                </div>
              )}
            </div>

            {/* Change Password */}
            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              Change Password
            </p>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3"
              data-ocid="admin-change-pw-section"
            >
              <label className="text-sm text-[#555555]" htmlFor="new-pw-input">
                New Admin Password
              </label>
              <input
                id="new-pw-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F3F4F7] border-none outline-none text-[#1A1A1A] focus:ring-2 focus:ring-[#1270D4] text-base"
                placeholder="Enter new password"
                data-ocid="new-pw-input"
              />
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={!newPassword.trim()}
                className="w-full py-3 rounded-xl bg-[#1270D4] text-white font-bold text-sm hover:bg-[#0e5db8] transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
                data-ocid="save-pw-btn"
              >
                {pwSaved ? "✓ Password Saved" : "Save Password"}
              </button>
            </div>

            {/* Users Status */}
            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              Users Status
            </p>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3"
              data-ocid="admin-users-section"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1A1A1A]">
                  Total Users:{" "}
                  <span className="text-[#1270D4]">{users.length}</span>
                </span>
              </div>
              {users.length === 0 ? (
                <div
                  className="text-center text-[#888888] text-sm py-8"
                  data-ocid="admin-users-empty-state"
                >
                  No user data yet.
                </div>
              ) : (
                <div
                  className="flex flex-col gap-3"
                  data-ocid="admin-users-list"
                >
                  {users.map((user, idx) => (
                    <UserCard
                      key={`${user.ip}-${idx}`}
                      user={user}
                      idx={idx}
                      isOnline={isOnline(user.lastSeen)}
                      lastSeenFormatted={formatTime(user.lastSeen)}
                      isBlocked={blockedIps.includes(user.ip)}
                      onBlock={handleBlock}
                      onUnblock={handleUnblock}
                      onDeleteHistory={handleDeleteHistory}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── BROADCAST TAB ── */}
        {activeTab === "broadcast" && (
          <>
            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              Active Announcement
            </p>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3"
              data-ocid="admin-broadcast-active"
            >
              {activeBroadcast ? (
                <>
                  <div className="px-4 py-3 rounded-xl bg-[#EBF1FF] border border-[#C7DBFA] text-[#1270D4] text-sm leading-snug">
                    {activeBroadcast}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearBroadcast}
                    className="w-full py-2.5 rounded-xl bg-[#FEE2E2] text-[#CC3333] font-bold text-sm hover:bg-[#FECACA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3333]"
                    data-ocid="clear-broadcast-btn"
                  >
                    Clear Broadcast
                  </button>
                </>
              ) : (
                <div
                  className="text-center text-[#888] text-sm py-4"
                  data-ocid="broadcast-empty-state"
                >
                  No active broadcast.
                </div>
              )}
            </div>

            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              Send New Announcement
            </p>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3"
              data-ocid="admin-broadcast-section"
            >
              <label className="text-sm text-[#555]" htmlFor="broadcast-input">
                Announcement message (shown to all users at top of chat)
              </label>
              <textarea
                id="broadcast-input"
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-[#F3F4F7] border-none outline-none text-[#1A1A1A] resize-none focus:ring-2 focus:ring-[#1270D4] text-sm"
                placeholder="Type your announcement here..."
                data-ocid="broadcast-input"
              />
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={!broadcastText.trim()}
                className="w-full py-3 rounded-xl bg-[#1270D4] text-white font-bold text-sm hover:bg-[#0e5db8] transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
                data-ocid="broadcast-send-btn"
              >
                Broadcast to All Users
              </button>
              <p className="text-[11px] text-[#AAAAAA] text-center">
                Note: Broadcasts are stored on this device. Users see it when
                they open the app.
              </p>
            </div>
          </>
        )}

        {/* ── IMAGE GEN TAB ── */}
        {activeTab === "imggen" && (
          <>
            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              Image Generation Control
            </p>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm"
              data-ocid="admin-imggen-section"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-[#1A1A1A]">
                    Image Generation
                  </span>
                  <span className="text-xs text-[#888]">
                    {imggenOff
                      ? "DISABLED — users get a friendly unavailable message"
                      : "ENABLED — image, img2img & video generation work normally"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleImggen}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] flex-shrink-0 ${
                    imggenOff ? "bg-[#CC3333]" : "bg-[#1270D4]"
                  }`}
                  role="switch"
                  aria-checked={!imggenOff}
                  data-ocid="imggen-toggle"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${imggenOff ? "translate-x-1" : "translate-x-6"}`}
                  />
                </button>
              </div>
              <div
                className={`mt-4 px-3 py-2 rounded-xl text-xs font-medium ${imggenOff ? "bg-[#FEE2E2] text-[#CC3333]" : "bg-[#EAFAF1] text-[#27AE60]"}`}
              >
                {imggenOff
                  ? "⚠ Image generation is currently disabled for all users."
                  : "✓ Image generation is active."}
              </div>
            </div>

            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              What this controls
            </p>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
              {[
                "Text-to-image generation",
                "Image-to-image (img2img)",
                "Video generation (tex2vid)",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-xs text-[#555]"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${imggenOff ? "bg-[#CC3333]" : "bg-[#27AE60]"}`}
                  />
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MODEL STATS TAB ── */}
        {activeTab === "models" && (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-[#888888] tracking-wider uppercase">
                Model Usage
              </p>
              <span className="text-[10px] text-[#AAAAAA]">
                Updated: {modelStatsUpdated}
              </span>
            </div>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3"
              data-ocid="admin-model-stats-section"
            >
              {modelStats.length === 0 ? (
                <div
                  className="text-center text-[#888] text-sm py-8"
                  data-ocid="model-stats-empty-state"
                >
                  No model usage data yet. Generate some images first.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {modelStats.map((item, idx) => (
                    <div
                      key={item.model}
                      className="flex flex-col gap-1"
                      data-ocid={`model-stat-item.${idx + 1}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#333] truncate min-w-0">
                          {item.model}
                        </span>
                        <span className="text-xs font-bold text-[#1270D4] flex-shrink-0">
                          {item.count}×
                        </span>
                      </div>
                      <div className="h-2 bg-[#F3F4F7] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((item.count / maxModelCount) * 100)}%`,
                            background:
                              "linear-gradient(90deg, #1270D4, #7C3AED)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── STATS TAB ── */}
        {activeTab === "stats" && (
          <>
            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              Active Users
            </p>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm grid grid-cols-2 gap-3"
              data-ocid="admin-active-users-section"
            >
              <StatCard
                label="Daily Active"
                value={activeUsers.daily}
                icon="day"
              />
              <StatCard
                label="Weekly Active"
                value={activeUsers.weekly}
                icon="week"
              />
              <StatCard
                label="Total Users Ever"
                value={users.length}
                icon="total"
                colSpan
              />
            </div>

            <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
              Total Usage
            </p>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3"
              data-ocid="admin-total-stats-section"
            >
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Total Chats"
                  value={totalStats.totalChats}
                  icon="chat"
                />
                <StatCard
                  label="Total Images"
                  value={totalStats.totalImages}
                  icon="img"
                />
              </div>

              {totalStats.mostActive && (
                <div className="mt-1 px-3 py-3 rounded-xl bg-[#F3F4F7] flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">
                    Most Active User
                  </span>
                  <span className="text-xs font-mono text-[#1270D4] break-all">
                    {totalStats.mostActive.ip}
                  </span>
                  <span className="text-xs text-[#555]">
                    {totalStats.mostActive.chatCount} chats ·{" "}
                    {totalStats.mostActive.imageCount} images
                  </span>
                </div>
              )}

              <p className="text-[10px] text-[#AAAAAA] text-center">
                Auto-refreshes every 30 seconds
              </p>
            </div>
          </>
        )}

        <div className="h-4" aria-hidden="true" />
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  colSpan?: boolean;
}

function StatCard({ label, value, icon, colSpan }: StatCardProps) {
  const iconMap: Record<string, string> = {
    day: "#1270D4",
    week: "#7C3AED",
    total: "#27AE60",
    chat: "#F59E0B",
    img: "#EC4899",
  };
  const color = iconMap[icon] ?? "#1270D4";

  return (
    <div
      className={`rounded-xl p-3 flex flex-col gap-1 ${colSpan ? "col-span-2" : ""}`}
      style={{ background: `${color}10`, border: `1px solid ${color}20` }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {label}
      </span>
      <span className="text-2xl font-black" style={{ color }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

interface UserCardProps {
  user: UserAnalyticsEntry;
  idx: number;
  isOnline: boolean;
  lastSeenFormatted: string;
  isBlocked: boolean;
  onBlock: (ip: string) => void;
  onUnblock: (ip: string) => void;
  onDeleteHistory: (user: UserAnalyticsEntry) => void;
}

function UserCard({
  user,
  idx,
  isOnline,
  lastSeenFormatted,
  isBlocked,
  onBlock,
  onUnblock,
  onDeleteHistory,
}: UserCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-2 ${
        isBlocked
          ? "border-[#FCA5A5] bg-[#FFF5F5]"
          : "border-[#EBEBF2] bg-[#FAFBFF]"
      }`}
      data-ocid={`admin-user-item.${idx + 1}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-mono text-xs text-[#555] bg-[#F3F4F7] px-2 py-0.5 rounded-lg break-all">
          {user.ip}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isBlocked && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CC3333]"
              data-ocid={`admin-user-blocked-badge.${idx + 1}`}
            >
              BLOCKED
            </span>
          )}
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isOnline
                ? "bg-[#EAFAF1] text-[#27AE60]"
                : "bg-[#F3F4F7] text-[#888888]"
            }`}
            data-ocid={`admin-user-status.${idx + 1}`}
          >
            {isOnline ? "● Online" : "○ Offline"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#555]">
        <span>
          Chats: <strong>{user.chatCount}</strong>
        </span>
        <span>
          Images: <strong>{user.imageCount}</strong>
        </span>
        <span>{user.deviceType}</span>
        <span>
          {user.city}, {user.country}
        </span>
      </div>

      <div className="text-[10px] text-[#AAAAAA]">
        Last seen: {lastSeenFormatted}
        {user.deviceId && (
          <span className="ml-2 font-mono opacity-70">
            ID: {user.deviceId.slice(0, 8)}…
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-1">
        {isBlocked ? (
          <button
            type="button"
            onClick={() => onUnblock(user.ip)}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-[#EAFAF1] text-[#27AE60] hover:bg-[#D5F5E3] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27AE60]"
            data-ocid={`admin-unblock-btn.${idx + 1}`}
          >
            Unblock
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onBlock(user.ip)}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-[#FEE2E2] text-[#CC3333] hover:bg-[#FECACA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3333]"
            data-ocid={`admin-block-btn.${idx + 1}`}
          >
            Block
          </button>
        )}
        <button
          type="button"
          onClick={() => onDeleteHistory(user)}
          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-[#F3F4F7] text-[#555] hover:bg-[#E5E7EB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#888]"
          data-ocid={`admin-delete-history-btn.${idx + 1}`}
        >
          Delete History
        </button>
      </div>
    </div>
  );
}
