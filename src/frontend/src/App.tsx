import { useEffect, useState } from "react";
import type { Screen } from "./types";

import { AdminScreen } from "./pages/AdminScreen";
import { ChatScreen } from "./pages/ChatScreen";
import { HelpScreen } from "./pages/HelpScreen";
import { InfoScreen } from "./pages/InfoScreen";
import { SettingsScreen } from "./pages/SettingsScreen";
import { SplashScreen } from "./pages/SplashScreen";

const MAINTENANCE_KEY = "crazybot_maintenance_mode";
const BLOCKED_IPS_KEY = "crazybot_blocked_ips";
const ADMIN_UNLOCKED_KEY = "crazybot_admin_unlocked";

async function fetchIp(): Promise<string> {
  const cached = sessionStorage.getItem("crazybot_session_ip");
  if (cached) return cached;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = (await res.json()) as { ip: string };
    const ip = data.ip ?? "";
    if (ip) sessionStorage.setItem("crazybot_session_ip", ip);
    return ip;
  } catch {
    return "";
  }
}

function isMaintenanceOn(): boolean {
  return localStorage.getItem(MAINTENANCE_KEY) === "true";
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

function isAdminUnlocked(): boolean {
  return localStorage.getItem(ADMIN_UNLOCKED_KEY) === "true";
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [userIp, setUserIp] = useState<string>("");
  const [ipReady, setIpReady] = useState(false);
  // Re-render trigger for maintenance/block state changes
  const [stateVersion, setStateVersion] = useState(0);

  useEffect(() => {
    fetchIp().then((ip) => {
      setUserIp(ip);
      setIpReady(true);
    });
  }, []);

  // Expose a way for AdminScreen to trigger a re-check
  // (maintenance toggle updates localStorage directly, so we just force re-render)
  function refreshAppState() {
    setStateVersion((v) => v + 1);
  }

  const navigate = (s: Screen) => setScreen(s);

  // --- Maintenance mode check ---
  const adminUnlocked = isAdminUnlocked();
  const maintenanceOn = isMaintenanceOn();

  // Wait for IP to be ready before checking block
  if (!ipReady) {
    // Show a brief loading state while IP is being fetched
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#1270D4] border-t-transparent animate-spin" />
      </div>
    );
  }

  // --- Block check ---
  const blockedIps = getBlockedIps();
  const isBlocked = userIp && blockedIps.includes(userIp) && !adminUnlocked;

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #CC3333 0%, #991111 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
              <line
                x1="4.93"
                y1="4.93"
                x2="19.07"
                y2="19.07"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
          <p className="text-[#9ca3af] leading-relaxed">
            Your access has been restricted. Contact support for help.
          </p>
        </div>
      </div>
    );
  }

  // --- Maintenance mode check (admin bypasses) ---
  if (maintenanceOn && !adminUnlocked) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #1270D4 0%, #7C3AED 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Under Maintenance</h1>
          <p className="text-[#9ca3af] leading-relaxed">
            App is under maintenance. Please check back later!
          </p>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#1270D4] animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Suppress stateVersion warning — used to trigger re-renders
  void stateVersion;

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {screen === "splash" && <SplashScreen onDone={() => navigate("info")} />}
      {screen === "info" && <InfoScreen onContinue={() => navigate("chat")} />}
      {screen === "chat" && (
        <ChatScreen
          onSettings={() => navigate("settings")}
          onExit={() => navigate("splash")}
        />
      )}
      {screen === "settings" && (
        <SettingsScreen
          onBack={() => navigate("chat")}
          onHelp={() => navigate("help")}
          onAdmin={() => navigate("admin")}
        />
      )}
      {screen === "help" && <HelpScreen onBack={() => navigate("settings")} />}
      {screen === "admin" && (
        <AdminScreen
          onBack={() => navigate("settings")}
          onStateChange={refreshAppState}
        />
      )}
    </div>
  );
}
