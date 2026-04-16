import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createActor } from "../backend";
import { trackUserActivity } from "../lib/analytics";
import { callClearHistory, callGetHistory } from "../lib/backend";
import { detectImageIntent, detectIntent, sendToGroq } from "../lib/groq";
import { generateImage } from "../lib/imageGen";
import type { ChatMessage } from "../types";

const HISTORY_CHAR_BUDGET = 24000;
const LS_KEY_PREFIX = "crazy-bot-history-";

/** Builds the conversation history to send to Groq as alternating user/assistant pairs. */
function buildConversationHistory(
  messages: ChatMessage[],
  chatMode: string,
): { role: "user" | "assistant"; content: string }[] {
  // Only text messages (no image messages)
  const textMessages = messages.filter(
    (m) => !m.imageUrl && !m.isImageGenerating,
  );

  // Pair up consecutive (user, bot) units
  const pairs: { user: string; bot: string }[] = [];
  for (let i = 0; i < textMessages.length - 1; i++) {
    const cur = textMessages[i];
    const next = textMessages[i + 1];
    if (cur.isUser && !next.isUser) {
      pairs.push({ user: cur.text, bot: next.text });
      i++; // skip the bot message we just consumed
    }
  }

  // Take the last N pairs based on model
  const maxUnits = chatMode === "omega" ? 15 : 30;
  const selected = pairs.slice(-maxUnits);

  // Apply character budget — trim oldest first
  let totalChars = 0;
  let startIdx = selected.length;
  for (let i = selected.length - 1; i >= 0; i--) {
    const pairChars = selected[i].user.length + selected[i].bot.length;
    if (totalChars + pairChars > HISTORY_CHAR_BUDGET) break;
    totalChars += pairChars;
    startIdx = i;
  }

  const trimmed = selected.slice(startIdx);

  // Flatten to alternating role pairs
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (const pair of trimmed) {
    history.push({ role: "user", content: pair.user });
    history.push({ role: "assistant", content: pair.bot });
  }
  return history;
}

function loadLocalHistory(deviceId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFIX + deviceId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<
      Omit<ChatMessage, "timestamp"> & { timestamp: string }
    >;
    return parsed.map((m) => ({ ...m, timestamp: BigInt(m.timestamp) }));
  } catch {
    return [];
  }
}

function saveLocalHistory(deviceId: string, messages: ChatMessage[]): void {
  try {
    const serialisable = messages.map((m) => ({
      ...m,
      timestamp: m.timestamp.toString(),
    }));
    localStorage.setItem(
      LS_KEY_PREFIX + deviceId,
      JSON.stringify(serialisable),
    );
  } catch {
    // ignore storage errors
  }
}

export function useChat(deviceId: string, userName = "User") {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();

  // Optimistic local messages — shown immediately after user sends
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(
    [],
  );

  // Holds the locally-accumulated chat (sent via direct Groq calls)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() =>
    loadLocalHistory(deviceId),
  );

  // Track whether the user has started sending messages in this session.
  // Once true, localMessages is the source of truth and historyQuery must not override it.
  const hasLocalActivity = localMessages.length > 0;

  // Try to load history from backend on first mount; fall back to local cache.
  // Disabled once the user has local activity so a background refetch cannot
  // overwrite in-progress image generation state (messages disappear bug).
  const historyQuery = useQuery<ChatMessage[]>({
    queryKey: ["history", deviceId],
    queryFn: async () => {
      if (!actor) return localMessages;
      try {
        const raw = await callGetHistory(actor, deviceId);
        // Post-process: parse reply context embedded in stored user messages
        return raw.map((msg) => {
          if (!msg.isUser && msg.text.startsWith("⚠️")) {
            return {
              ...msg,
              text: "Sorry, I am learning 😅. Ask me something else.",
            };
          }
          if (!msg.isUser) return msg;
          const prefix = "[Replying to bot message: '";
          if (!msg.text.startsWith(prefix)) return msg;
          const afterPrefix = msg.text.slice(prefix.length);
          const quoteEnd = afterPrefix.indexOf("']\n\nUser reply: ");
          if (quoteEnd === -1) return msg;
          const botText = afterPrefix.slice(0, quoteEnd);
          const userText = afterPrefix.slice(
            quoteEnd + "']\n\nUser reply: ".length,
          );
          return {
            ...msg,
            text: userText,
            replyTo: { sender: "Crazy Bot", text: botText },
          };
        });
      } catch {
        // Backend unavailable — return local cache
        return localMessages;
      }
    },
    // Stop querying once the user has local activity; localMessages is then authoritative
    enabled: !!actor && !isFetching && !!deviceId && !hasLocalActivity,
    // Never auto-refetch in the background
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const sendMutation = useMutation({
    mutationFn: async ({
      message,
      chatMode,
      apiText,
      senderName,
      replyToText,
      conversationHistory,
      attachedFile,
    }: {
      message: string;
      chatMode: string;
      apiText: string;
      senderName: string;
      replyToText?: string;
      conversationHistory: { role: "user" | "assistant"; content: string }[];
      attachedFile?: { base64: string; mimeType: string };
    }) => {
      const botText = await sendToGroq(
        apiText,
        chatMode,
        userName,
        conversationHistory,
        attachedFile,
      );

      const now = BigInt(Date.now()) * BigInt(1_000_000);

      const userMsg: ChatMessage = {
        id: `local-user-${Date.now()}`,
        sender: senderName,
        text: message,
        isUser: true,
        timestamp: now,
        ...(replyToText
          ? { replyTo: { sender: "Crazy Bot", text: replyToText } }
          : {}),
      };

      const botMsg: ChatMessage = {
        id: `local-bot-${Date.now() + 1}`,
        sender: "Crazy Bot",
        text: botText,
        isUser: false,
        timestamp: now + BigInt(1),
      };

      return { userMsg, botMsg };
    },
    onSuccess: ({ userMsg, botMsg }) => {
      setOptimisticMessages([]);
      setLocalMessages((prev) => {
        const updated = [...prev, userMsg, botMsg];
        saveLocalHistory(deviceId, updated);
        queryClient.setQueryData<ChatMessage[]>(["history", deviceId], updated);
        return updated;
      });
      // Fire-and-forget analytics tracking
      void trackUserActivity(false);
    },
    onError: () => {
      setOptimisticMessages([]);
    },
  });

  function sendMessage(
    text: string,
    senderName: string,
    replyToText?: string,
    chatMode = "flash",
    imageType: "realistic" | "artistic" = "realistic",
    attachedFile?: { base64: string; mimeType: string },
  ) {
    // Helper: trigger image generation flow
    function triggerImageGen(prompt: string) {
      const now = BigInt(Date.now()) * BigInt(1_000_000);

      const userMsg: ChatMessage = {
        id: `local-user-${Date.now()}`,
        sender: senderName,
        text,
        isUser: true,
        timestamp: now,
      };

      const botMsgId = `local-bot-img-${Date.now() + 1}`;
      const loadingBotMsg: ChatMessage = {
        id: botMsgId,
        sender: "Crazy Bot",
        text: "",
        isUser: false,
        timestamp: now + BigInt(1),
        isImageGenerating: true,
      };

      setLocalMessages((prev) => {
        const updated = [...prev, userMsg, loadingBotMsg];
        saveLocalHistory(deviceId, updated);
        queryClient.setQueryData<ChatMessage[]>(["history", deviceId], updated);
        return updated;
      });

      // Image generation APIs receive only the text prompt — never base64 data
      generateImage(prompt, imageType)
        .then((imageUrl) => {
          setLocalMessages((prev) => {
            const updated = prev.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    isImageGenerating: false,
                    imageUrl: imageUrl ?? undefined,
                  }
                : m,
            );
            saveLocalHistory(deviceId, updated);
            queryClient.setQueryData<ChatMessage[]>(
              ["history", deviceId],
              updated,
            );
            return updated;
          });
          void trackUserActivity(true);
        })
        .catch(() => {
          setLocalMessages((prev) => {
            const updated = prev.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    isImageGenerating: false,
                    text: "Sorry, I couldn't generate the image 😅. Please try again.",
                  }
                : m,
            );
            saveLocalHistory(deviceId, updated);
            queryClient.setQueryData<ChatMessage[]>(
              ["history", deviceId],
              updated,
            );
            return updated;
          });
        });
    }

    // Helper: trigger normal Groq chat flow
    function triggerGroqChat(file?: { base64: string; mimeType: string }) {
      const apiText = replyToText
        ? `[Replying to bot message: '${replyToText}']\n\nUser reply: ${text}`
        : text;

      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`,
        sender: senderName,
        text,
        isUser: true,
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
        ...(replyToText
          ? { replyTo: { sender: "Crazy Bot", text: replyToText } }
          : {}),
      };
      setOptimisticMessages([optimistic]);

      const conversationHistory = buildConversationHistory(
        localMessages,
        chatMode,
      );

      sendMutation.reset();
      sendMutation.mutate({
        message: text,
        chatMode,
        apiText,
        senderName,
        replyToText,
        conversationHistory,
        attachedFile: file,
      });
    }

    // Derive prompt for image generation (strip trigger words from text)
    function getImagePrompt(): string {
      return detectImageIntent(text) ?? text.trim();
    }

    // ---- NEW: Detector-based routing ----
    detectIntent(text)
      .then((tag) => {
        switch (tag) {
          case "imggen":
            // Files (non-image) should NOT go to image gen APIs
            if (attachedFile && !attachedFile.mimeType.startsWith("image/")) {
              triggerGroqChat(attachedFile);
            } else {
              triggerImageGen(getImagePrompt());
            }
            break;

          case "imgana":
            // Image analysis — send to Groq with vision model
            // If no image attached, treat as llm
            triggerGroqChat(attachedFile);
            break;

          case "img2img":
            // Image + prompt → generate a new image (text prompt only to image APIs)
            // If no image attached, treat as imggen
            triggerImageGen(getImagePrompt());
            break;

          case "llm":
            triggerGroqChat(attachedFile);
            break;
        }
      })
      .catch(() => {
        // Detector failed — fall back to existing regex logic
        const imagePrompt = !attachedFile ? detectImageIntent(text) : null;
        if (imagePrompt !== null) {
          triggerImageGen(imagePrompt);
        } else {
          triggerGroqChat(attachedFile);
        }
      });
  }

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (actor) {
        try {
          await callClearHistory(actor, deviceId);
        } catch {
          // ignore if backend unavailable
        }
      }
      // Always clear local cache
      saveLocalHistory(deviceId, []);
      setLocalMessages([]);
    },
    onSuccess: () => {
      queryClient.setQueryData<ChatMessage[]>(["history", deviceId], []);
    },
  });

  // Combined list: persisted history first, then any pending optimistic message.
  // Once the user has local activity, localMessages is the authoritative source —
  // historyQuery data is never used to override it (prevents messages disappearing
  // during async image generation when the query cache is updated by a background fetch).
  const baseMessages = hasLocalActivity
    ? localMessages
    : (historyQuery.data ?? localMessages);
  const messages = [...baseMessages, ...optimisticMessages];

  return {
    messages,
    isLoading: historyQuery.isLoading,
    sendMessage,
    isSending: sendMutation.isPending,
    error: sendMutation.error,
    clearHistory: clearMutation.mutate,
    isClearing: clearMutation.isPending,
  };
}
