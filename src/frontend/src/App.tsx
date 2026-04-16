import { useState } from "react";
import type { Screen } from "./types";

import { AdminScreen } from "./pages/AdminScreen";
import { ChatScreen } from "./pages/ChatScreen";
import { HelpScreen } from "./pages/HelpScreen";
import { InfoScreen } from "./pages/InfoScreen";
import { SettingsScreen } from "./pages/SettingsScreen";
import { SplashScreen } from "./pages/SplashScreen";

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");

  const navigate = (s: Screen) => setScreen(s);

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
        <AdminScreen onBack={() => navigate("settings")} />
      )}
    </div>
  );
}
