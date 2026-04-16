import { useCallback, useState } from "react";
import { getAllAnalytics } from "../lib/analytics";
import type { UserAnalyticsEntry } from "../types";

const ADMIN_PW_KEY = "crazybot_admin_password";

interface AdminScreenProps {
  onBack: () => void;
}

export function AdminScreen({ onBack }: AdminScreenProps) {
  const [users, setUsers] = useState<UserAnalyticsEntry[]>(() =>
    getAllAnalytics(),
  );
  const [newPassword, setNewPassword] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  const handleRefresh = useCallback(() => {
    setUsers(getAllAnalytics());
  }, []);

  function handleSavePassword() {
    const trimmed = newPassword.trim();
    if (!trimmed) return;
    localStorage.setItem(ADMIN_PW_KEY, trimmed);
    setNewPassword("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3000);
  }

  function isOnline(lastSeen: number): boolean {
    return Date.now() - lastSeen < 5 * 60 * 1000;
  }

  function formatTime(ts: number): string {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  }

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
        <h1 className="text-xl font-bold text-[#1A1A1A]">Admin Panel</h1>
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

      {/* Scroll content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
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
            <div className="flex flex-col gap-3" data-ocid="admin-users-list">
              {users.map((user, idx) => (
                <UserCard
                  key={`${user.ip}-${idx}`}
                  user={user}
                  idx={idx}
                  isOnline={isOnline(user.lastSeen)}
                  lastSeenFormatted={formatTime(user.lastSeen)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-4" aria-hidden="true" />
      </div>
    </div>
  );
}

interface UserCardProps {
  user: UserAnalyticsEntry;
  idx: number;
  isOnline: boolean;
  lastSeenFormatted: string;
}

function UserCard({ user, idx, isOnline, lastSeenFormatted }: UserCardProps) {
  return (
    <div
      className="rounded-xl border border-[#EBEBF2] p-3 flex flex-col gap-1.5 bg-[#FAFBFF]"
      data-ocid={`admin-user-item.${idx + 1}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-mono text-xs text-[#555] bg-[#F3F4F7] px-2 py-0.5 rounded-lg break-all">
          {user.ip}
        </span>
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
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#555]">
        <span>
          💬 Chats: <strong>{user.chatCount}</strong>
        </span>
        <span>
          🖼️ Images: <strong>{user.imageCount}</strong>
        </span>
        <span>📱 {user.deviceType}</span>
        <span>
          📍 {user.city}, {user.country}
        </span>
      </div>
      <div className="text-[10px] text-[#AAAAAA]">
        Last seen: {lastSeenFormatted}
      </div>
    </div>
  );
}
