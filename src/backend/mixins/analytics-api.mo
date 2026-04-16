import Map "mo:core/Map";
import Time "mo:core/Time";
import Types "../types/chat";

mixin (
  userAnalytics : Map.Map<Text, Types.UserAnalytics>,
) {

  // Track or update analytics for a user identified by IP address.
  // Increments imageCount if isImageGen is true, chatCount otherwise.
  // Updates deviceType, country, city when non-empty values are provided.
  public func trackUser(ip : Text, deviceType : Text, country : Text, city : Text, isImageGen : Bool) : async () {
    let now = Time.now();
    let existing = userAnalytics.get(ip);
    let updated : Types.UserAnalytics = switch (existing) {
      case null {
        {
          ip;
          chatCount = if (isImageGen) 0 else 1;
          imageCount = if (isImageGen) 1 else 0;
          deviceType = if (deviceType.size() > 0) deviceType else "None";
          country = if (country.size() > 0) country else "";
          city = if (city.size() > 0) city else "";
          lastSeen = now;
        };
      };
      case (?prev) {
        {
          ip = prev.ip;
          chatCount = if (isImageGen) prev.chatCount else prev.chatCount + 1;
          imageCount = if (isImageGen) prev.imageCount + 1 else prev.imageCount;
          deviceType = if (deviceType.size() > 0) deviceType else prev.deviceType;
          country = if (country.size() > 0) country else prev.country;
          city = if (city.size() > 0) city else prev.city;
          lastSeen = now;
        };
      };
    };
    userAnalytics.add(ip, updated);
  };

  // Return all user analytics entries as an array.
  public query func getAllUserAnalytics() : async [Types.UserAnalytics] {
    userAnalytics.values().toArray();
  };
};
