import { useActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { ChatMessage, DeviceSettings, DeviceSettingsInput } from "../types";

type ActorType = ReturnType<typeof useActor<ReturnType<typeof createActor>>>["actor"];

export async function callSendMessage(
  actor: ActorType,
  deviceId: string,
  message: string,
  chatMode: string
): Promise<string> {
  if (!actor) throw new Error("Actor not ready");
  return actor.sendMessage(deviceId, message, chatMode);
}

export async function callGetHistory(
  actor: ActorType,
  deviceId: string
): Promise<ChatMessage[]> {
  if (!actor) throw new Error("Actor not ready");
  const result = await actor.getHistory(deviceId);
  return result as ChatMessage[];
}

export async function callClearHistory(
  actor: ActorType,
  deviceId: string
): Promise<void> {
  if (!actor) throw new Error("Actor not ready");
  return actor.clearHistory(deviceId);
}

export async function callGetSettings(
  actor: ActorType,
  deviceId: string
): Promise<DeviceSettings> {
  if (!actor) throw new Error("Actor not ready");
  const result = await actor.getSettings(deviceId);
  return result as DeviceSettings;
}

export async function callSaveSettings(
  actor: ActorType,
  deviceId: string,
  settings: DeviceSettingsInput
): Promise<void> {
  if (!actor) throw new Error("Actor not ready");
  return actor.saveSettings(deviceId, settings);
}
