import Common "common";

module {
  public type ChatMessage = {
    id : Common.MessageId;
    sender : Text;
    text : Text;
    isUser : Bool;
    timestamp : Common.Timestamp;
  };

  public type DeviceSettings = {
    userName : Text;
    fontSize : Nat;
    bgColor : Text;
  };

  public type DeviceSettingsInput = {
    userName : Text;
    fontSize : Nat;
    bgColor : Text;
  };

  // Internal state: per-device chat history
  public type DeviceChatState = {
    messages : [ChatMessage];
  };

  // User analytics record keyed by IP address
  public type UserAnalytics = {
    ip : Text;
    chatCount : Nat;
    imageCount : Nat;
    deviceType : Text;
    country : Text;
    city : Text;
    lastSeen : Int;
  };
};
