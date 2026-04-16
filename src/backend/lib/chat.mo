import Time "mo:core/Time";
import Types "../types/chat";
import Common "../types/common";

module {
  // Build a new ChatMessage for a user
  public func newUserMessage(
    id : Common.MessageId,
    senderName : Text,
    text : Text,
  ) : Types.ChatMessage {
    {
      id;
      sender = senderName;
      text;
      isUser = true;
      timestamp = Time.now();
    };
  };

  // Build a new ChatMessage for the bot
  public func newBotMessage(
    id : Common.MessageId,
    text : Text,
  ) : Types.ChatMessage {
    {
      id;
      sender = "Crazy Bot";
      text;
      isUser = false;
      timestamp = Time.now();
    };
  };

  // Generate a unique message id given a device id and index
  public func makeMessageId(deviceId : Common.DeviceId, index : Nat) : Common.MessageId {
    deviceId # "-" # debug_show(index);
  };

  // Default settings for a new device
  public func defaultSettings() : Types.DeviceSettings {
    {
      userName = "User";
      fontSize = 18;
      bgColor = "#FFFFFF";
    };
  };
};
