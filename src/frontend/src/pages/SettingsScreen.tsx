import { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useDevice } from "../hooks/useDevice";
import { useSettings } from "../hooks/useSettings";
import type { DeviceSettingsInput } from "../types";

// Puter.js is loaded via <script> tag in index.html
declare const puter: {
  auth: { isSignedIn: () => boolean; signIn: () => Promise<void> };
};

function isPuterAvailable() {
  return typeof puter !== "undefined";
}

function isPuterSignedIn() {
  try {
    return isPuterAvailable() && puter.auth.isSignedIn();
  } catch {
    return false;
  }
}

const ADMIN_PW_KEY = "crazybot_admin_password";
const DEFAULT_ADMIN_PASSWORD = "ims02";

function getAdminPassword(): string {
  return localStorage.getItem(ADMIN_PW_KEY) ?? DEFAULT_ADMIN_PASSWORD;
}

interface SettingsScreenProps {
  onBack: () => void;
  onHelp: () => void;
  onAdmin: () => void;
}

export function SettingsScreen({
  onBack,
  onHelp,
  onAdmin,
}: SettingsScreenProps) {
  const { deviceId } = useDevice();
  const {
    settings,
    fontSize,
    isSaving,
    saveSettings,
    incrementFontSize,
    decrementFontSize,
  } = useSettings(deviceId);
  const { clearHistory, isClearing } = useChat(deviceId);
  const [userName, setUserName] = useState(settings.userName || "User");
  const [bgColor, setBgColor] = useState(settings.bgColor ?? "#FFFFFF");
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [imageGenMode, setImageGenMode] = useState<"standard" | "pro">(
    () =>
      (localStorage.getItem("imageGenMode") as "standard" | "pro") ??
      "standard",
  );
  const [puterSignedIn, setPuterSignedIn] = useState(() => isPuterSignedIn());
  const [puterSigningIn, setPuterSigningIn] = useState(false);

  // Admin password dialog state
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");
  const [adminPwError, setAdminPwError] = useState("");
  const adminPwInputRef = useRef<HTMLInputElement>(null);

  const bgPresets = [
    { hex: "#FFFFFF", label: "White" },
    { hex: "#EBF5FB", label: "Light Blue" },
    { hex: "#EAFAF1", label: "Light Green" },
    { hex: "#F4ECF7", label: "Lavender" },
    { hex: "#FEF9E7", label: "Cream" },
    { hex: "#F2F3F4", label: "Light Gray" },
  ];

  useEffect(() => {
    setUserName(settings.userName || "User");
    setBgColor(settings.bgColor ?? "#FFFFFF");
  }, [settings.userName, settings.bgColor]);

  // Focus password input when dialog opens
  useEffect(() => {
    if (showAdminDialog) {
      const t = setTimeout(() => adminPwInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [showAdminDialog]);

  function handleSave() {
    const input: DeviceSettingsInput = {
      userName: userName.trim() || "User",
      fontSize: BigInt(fontSize),
      bgColor: bgColor,
    };
    saveSettings(input);
    onBack();
  }

  function handleClearConfirm() {
    clearHistory(undefined, {
      onSuccess: () => {
        setShowConfirm(false);
        setCleared(true);
        setTimeout(() => setCleared(false), 3000);
      },
      onError: () => {
        setShowConfirm(false);
      },
    });
  }

  function handleImageGenModeChange(mode: "standard" | "pro") {
    setImageGenMode(mode);
    localStorage.setItem("imageGenMode", mode);
    if (mode === "pro") {
      setPuterSignedIn(isPuterSignedIn());
    }
  }

  async function handlePuterSignIn() {
    if (!isPuterAvailable()) return;
    setPuterSigningIn(true);
    try {
      await puter.auth.signIn();
      setPuterSignedIn(isPuterSignedIn());
    } catch {
      // sign-in cancelled or failed — silently ignore
    } finally {
      setPuterSigningIn(false);
    }
  }

  function handleAdminOpen() {
    setAdminPwInput("");
    setAdminPwError("");
    setShowAdminDialog(true);
  }

  function handleAdminSubmit() {
    if (adminPwInput === getAdminPassword()) {
      setShowAdminDialog(false);
      setAdminPwInput("");
      setAdminPwError("");
      onAdmin();
    } else {
      setAdminPwError("Incorrect password");
    }
  }

  return (
    <div
      className="flex flex-col h-screen bg-[#F3F4F7]"
      data-ocid="settings-screen"
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-[70px] bg-white border-b border-[#EBEBF2] shadow-sm flex-shrink-0">
        <button
          type="button"
          onClick={handleSave}
          className="text-[#1270D4] text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#EBF1FF] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          aria-label="Go back"
          data-ocid="settings-back-btn"
        >
          ‹
        </button>
        <h1 className="text-xl font-bold text-[#1A1A1A]">Settings</h1>
      </div>

      {/* Scroll content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
          Profile
        </p>
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <label className="text-sm text-[#555555]" htmlFor="user-name-input">
            Your Name
          </label>
          <input
            id="user-name-input"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#F3F4F7] border-none outline-none text-[#1A1A1A] focus:ring-2 focus:ring-[#1270D4] text-base"
            placeholder="Enter your name"
            data-ocid="user-name-input"
          />
        </div>

        <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
          Appearance
        </p>
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex-1 text-[#333333] text-base">Font Size</span>
            <button
              type="button"
              onClick={decrementFontSize}
              className="w-10 h-10 rounded-xl bg-[#EBF1FF] text-[#1270D4] font-bold text-xl flex items-center justify-center hover:bg-[#d0e3f8] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
              aria-label="Decrease font size"
              data-ocid="font-minus-btn"
            >
              −
            </button>
            <span
              className="w-10 text-center font-bold text-[#1A1A1A]"
              data-ocid="font-size-value"
            >
              {fontSize}
            </span>
            <button
              type="button"
              onClick={incrementFontSize}
              className="w-10 h-10 rounded-xl bg-[#EBF1FF] text-[#1270D4] font-bold text-xl flex items-center justify-center hover:bg-[#d0e3f8] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
              aria-label="Increase font size"
              data-ocid="font-plus-btn"
            >
              +
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-[#555555]">Chat Background</span>
            <div className="flex gap-3 flex-wrap" data-ocid="bg-color-picker">
              {bgPresets.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  aria-label={preset.label}
                  data-ocid={`bg-swatch-${preset.hex.replace("#", "")}`}
                  onClick={() => setBgColor(preset.hex)}
                  className="w-10 h-10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] transition-smooth"
                  style={{
                    backgroundColor: preset.hex,
                    border:
                      bgColor === preset.hex
                        ? "3px solid #1270D4"
                        : "2px solid #DDDDDD",
                    boxShadow:
                      bgColor === preset.hex
                        ? "0 0 0 2px #fff, 0 0 0 4px #1270D4"
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
          Image Generation
        </p>
        <div
          className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3"
          data-ocid="image-gen-mode-section"
        >
          <span className="text-sm text-[#555555]">Generation Mode</span>
          <div className="flex gap-2">
            {(["standard", "pro"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleImageGenModeChange(mode)}
                data-ocid={`image-gen-mode-${mode}`}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
                style={{
                  background: imageGenMode === mode ? "#1270D4" : "#F3F4F7",
                  color: imageGenMode === mode ? "#FFFFFF" : "#555555",
                  border:
                    imageGenMode === mode ? "none" : "1.5px solid #E0E0E0",
                }}
              >
                {mode === "standard" ? "Standard" : "Pro"}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#888888] leading-relaxed">
            {imageGenMode === "standard"
              ? "Uses Pollinations.ai for image generation (default)."
              : "Uses Puter.js (Imagen 4 Fast) for high-quality images. Requires sign-in."}
          </p>
          {imageGenMode === "pro" && (
            <div className="mt-1" data-ocid="puter-signin-section">
              {puterSignedIn ? (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EAFAF1]"
                  data-ocid="puter-signed-in-status"
                >
                  <span className="text-[#27AE60] font-bold text-base">✓</span>
                  <span className="text-[#27AE60] text-sm font-semibold">
                    Puter: Signed in
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePuterSignIn}
                  disabled={puterSigningIn || !isPuterAvailable()}
                  data-ocid="puter-signin-btn"
                  className="w-full py-3 rounded-xl bg-[#EBF1FF] text-[#1270D4] font-semibold text-sm hover:bg-[#d0e3f8] transition-smooth disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] flex items-center justify-center gap-2"
                >
                  {puterSigningIn ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-[#1270D4] border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in to Puter"
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
          Support
        </p>
        <div
          className="bg-white rounded-2xl shadow-sm"
          style={{ overflow: "visible" }}
        >
          <button
            type="button"
            onClick={onHelp}
            className="w-full flex items-center justify-between px-5 py-4 text-[#1A1A1A] text-base hover:bg-[#F3F4F7] border-b border-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] rounded-t-2xl"
            data-ocid="help-btn"
          >
            <span>Help &amp; Instructions</span>
            <span className="text-[#BBBBBB]">›</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isClearing}
            className="w-full flex items-center justify-between px-5 py-4 text-[#CC3333] text-base hover:bg-[#FFF0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3333] disabled:opacity-60 rounded-b-2xl"
            data-ocid="clear-history-btn"
          >
            <span className="flex items-center gap-2">
              {isClearing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-[#CC3333] border-t-transparent rounded-full animate-spin" />
                  Clearing...
                </>
              ) : cleared ? (
                <>
                  <span className="text-[#27AE60] font-bold">✓</span>
                  <span className="text-[#27AE60]">History Cleared</span>
                </>
              ) : (
                "Clear Chat History"
              )}
            </span>
            {!isClearing && !cleared && (
              <span className="text-[#DDBBBB]">›</span>
            )}
          </button>
        </div>

        {/* ADMIN section */}
        <p className="text-xs font-bold text-[#888888] tracking-wider uppercase px-1">
          Admin
        </p>
        <div className="bg-white rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={handleAdminOpen}
            className="w-full flex items-center justify-between px-5 py-4 text-[#1A1A1A] text-base hover:bg-[#F3F4F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] rounded-2xl"
            data-ocid="admin-btn"
          >
            <span className="font-semibold">ADMIN</span>
            <span className="text-[#BBBBBB]">›</span>
          </button>
        </div>

        {/* spacer so Save button doesn't cover last item on short screens */}
        <div className="h-2" aria-hidden="true" />
      </div>

      {/* Save button */}
      <div className="px-4 pb-6 pt-3 bg-[#F3F4F7] flex-shrink-0">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 rounded-2xl bg-[#1270D4] text-white font-bold text-base hover:bg-[#0e5db8] transition-smooth disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          data-ocid="save-settings-btn"
        >
          {isSaving ? "Saving..." : "SAVE SETTINGS"}
        </button>
      </div>

      {/* Confirmation Dialog Overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          data-ocid="clear-history-dialog"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="px-6 pt-6 pb-3 flex flex-col gap-2">
              <div className="w-12 h-12 rounded-full bg-[#FFF0F0] flex items-center justify-center mb-1 mx-auto">
                <span className="text-2xl" aria-hidden="true">
                  🗑️
                </span>
              </div>
              <h2
                id="confirm-dialog-title"
                className="text-center text-[#1A1A1A] text-lg font-bold"
              >
                Clear Chat History
              </h2>
              <p
                id="confirm-dialog-desc"
                className="text-center text-[#666666] text-sm leading-relaxed"
              >
                Are you sure you want to clear all chat history? This cannot be
                undone.
              </p>
            </div>
            <div className="flex border-t border-[#F0F0F0] mt-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isClearing}
                className="flex-1 py-4 text-[#1270D4] font-semibold text-base hover:bg-[#F3F4F7] transition-smooth border-r border-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4] disabled:opacity-50"
                data-ocid="confirm-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearConfirm}
                disabled={isClearing}
                className="flex-1 py-4 text-[#CC3333] font-bold text-base hover:bg-[#FFF0F0] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3333] disabled:opacity-60 flex items-center justify-center gap-2"
                data-ocid="confirm-clear-btn"
              >
                {isClearing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-[#CC3333] border-t-transparent rounded-full animate-spin" />
                    Clearing...
                  </>
                ) : (
                  "Yes, Clear"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Dialog */}
      {showAdminDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          data-ocid="admin-password-dialog"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-dialog-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="px-6 pt-6 pb-3 flex flex-col gap-3">
              <div className="w-12 h-12 rounded-full bg-[#EBF1FF] flex items-center justify-center mb-1 mx-auto">
                <span className="text-2xl" aria-hidden="true">
                  🔐
                </span>
              </div>
              <h2
                id="admin-dialog-title"
                className="text-center text-[#1A1A1A] text-lg font-bold"
              >
                Admin Access
              </h2>
              <input
                ref={adminPwInputRef}
                type="password"
                value={adminPwInput}
                onChange={(e) => {
                  setAdminPwInput(e.target.value);
                  setAdminPwError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdminSubmit();
                  if (e.key === "Escape") setShowAdminDialog(false);
                }}
                className="w-full px-4 py-3 rounded-xl bg-[#F3F4F7] border-none outline-none text-[#1A1A1A] focus:ring-2 focus:ring-[#1270D4] text-base"
                placeholder="Enter password"
                data-ocid="admin-pw-input"
              />
              {adminPwError && (
                <p
                  className="text-[#CC3333] text-sm text-center font-medium"
                  data-ocid="admin-pw-error"
                >
                  {adminPwError}
                </p>
              )}
            </div>
            <div className="flex border-t border-[#F0F0F0] mt-3">
              <button
                type="button"
                onClick={() => setShowAdminDialog(false)}
                className="flex-1 py-4 text-[#1270D4] font-semibold text-base hover:bg-[#F3F4F7] transition-smooth border-r border-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
                data-ocid="admin-dialog-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminSubmit}
                className="flex-1 py-4 text-[#1270D4] font-bold text-base hover:bg-[#EBF1FF] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
                data-ocid="admin-dialog-submit-btn"
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
