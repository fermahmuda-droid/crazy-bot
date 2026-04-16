import Map "mo:core/Map";
import List "mo:core/List";
import Types "types/chat";
import Common "types/common";
import ChatApiMixin "mixins/chat-api";
import AnalyticsApiMixin "mixins/analytics-api";



actor {
  // Per-device chat history: DeviceId → list of messages
  let chatHistory = Map.empty<Common.DeviceId, List.List<Types.ChatMessage>>();

  // Per-device settings: DeviceId → DeviceSettings
  let deviceSettings = Map.empty<Common.DeviceId, Types.DeviceSettings>();

  // Current Groq API key rotation index
  let keyIndex : Nat = 0;

  // User analytics: IP → UserAnalytics
  let userAnalytics = Map.empty<Text, Types.UserAnalytics>();

  include ChatApiMixin(chatHistory, deviceSettings, keyIndex);
  include AnalyticsApiMixin(userAnalytics);
};
