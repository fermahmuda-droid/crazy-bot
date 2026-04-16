export interface ReplyTo {
  sender: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isUser: boolean;
  timestamp: bigint;
  replyTo?: ReplyTo;
  imageUrl?: string;
  isImageGenerating?: boolean;
}

export interface DeviceSettings {
  userName: string;
  fontSize: bigint;
  bgColor: string;
}

export interface DeviceSettingsInput {
  userName: string;
  fontSize: bigint;
  bgColor: string;
}

export type Screen = "splash" | "info" | "chat" | "settings" | "help" | "admin";

export interface UserAnalyticsEntry {
  ip: string;
  chatCount: number;
  imageCount: number;
  deviceType: string;
  country: string;
  city: string;
  lastSeen: number;
}
