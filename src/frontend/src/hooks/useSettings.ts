import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import { callGetSettings, callSaveSettings } from "../lib/backend";
import type { DeviceSettings, DeviceSettingsInput } from "../types";

const DEFAULT_SETTINGS: DeviceSettings = {
  userName: "User",
  fontSize: BigInt(18),
  bgColor: "",
};

export function useSettings(deviceId: string) {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<DeviceSettings>({
    queryKey: ["settings", deviceId],
    queryFn: async () => {
      if (!actor) return DEFAULT_SETTINGS;
      const result = await callGetSettings(actor, deviceId);
      // Sync userName to localStorage whenever we successfully load from backend
      if (
        result.userName &&
        result.userName.toLowerCase() !== "user" &&
        result.userName.trim() !== ""
      ) {
        localStorage.setItem("crazybot_userName", result.userName);
      }
      return result;
    },
    enabled: !!actor && !isFetching && !!deviceId,
    placeholderData: DEFAULT_SETTINGS,
  });

  const saveMutation = useMutation({
    mutationFn: async (input: DeviceSettingsInput) => {
      if (!actor) throw new Error("Actor not ready");
      await callSaveSettings(actor, deviceId, input);
      return input;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<DeviceSettings>(["settings", deviceId], saved);
      // Always persist userName to localStorage on save (even if "User")
      if (saved.userName) {
        localStorage.setItem("crazybot_userName", saved.userName);
      }
    },
  });

  const rawSettings = settingsQuery.data ?? DEFAULT_SETTINGS;
  const localName = localStorage.getItem("crazybot_userName");
  const isDefaultName = rawSettings.userName.toLowerCase() === "user";
  const resolvedUserName =
    isDefaultName &&
    localName &&
    localName.toLowerCase() !== "user" &&
    localName.trim() !== ""
      ? localName
      : rawSettings.userName;
  const settings: DeviceSettings = {
    ...rawSettings,
    userName: resolvedUserName,
  };
  const fontSize = Number(settings.fontSize);

  function incrementFontSize() {
    const next = Math.min(fontSize + 1, 32);
    const updated: DeviceSettings = { ...settings, fontSize: BigInt(next) };
    queryClient.setQueryData<DeviceSettings>(["settings", deviceId], updated);
    saveMutation.mutate({ ...settings, fontSize: BigInt(next) });
  }

  function decrementFontSize() {
    const next = Math.max(fontSize - 1, 12);
    const updated: DeviceSettings = { ...settings, fontSize: BigInt(next) };
    queryClient.setQueryData<DeviceSettings>(["settings", deviceId], updated);
    saveMutation.mutate({ ...settings, fontSize: BigInt(next) });
  }

  function saveSettings(input: DeviceSettingsInput) {
    // Immediately write to localStorage so it takes effect even before backend responds
    if (input.userName && input.userName.trim() !== "") {
      localStorage.setItem("crazybot_userName", input.userName.trim());
    }
    saveMutation.mutate(input);
  }

  return {
    settings,
    fontSize,
    isLoading: settingsQuery.isLoading,
    isSaving: saveMutation.isPending,
    saveSettings,
    incrementFontSize,
    decrementFontSize,
  };
}
