import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Char "mo:core/Char";
import Blob "mo:core/Blob";
import Types "../types/chat";
import Common "../types/common";
import ChatLib "../lib/chat";
import GroqLib "../lib/groq";
import IC "ic:aaaaa-aa";

mixin (
  chatHistory : Map.Map<Common.DeviceId, List.List<Types.ChatMessage>>,
  deviceSettings : Map.Map<Common.DeviceId, Types.DeviceSettings>,
  keyIndex : Nat,
) {

  // Transform callback — strips headers and normalises Groq response body for consensus.
  // For Groq responses (body contains "choices"), reconstructs a minimal deterministic JSON
  // with only choices[0].message.content.
  public query func transform(raw : { context : Blob; response : IC.http_request_result }) : async IC.http_request_result {
    let normalizedBody = switch (raw.response.body.decodeUtf8()) {
      case null raw.response.body;
      case (?bodyText) {
        // Only process Groq responses (they contain a "choices" array)
        if (bodyText.contains(#text "\"choices\"")) {
          switch (extractGroqContent(bodyText)) {
            case null raw.response.body; // extraction failed — keep original
            case (?content) {
              // Rebuild minimal deterministic JSON
              let minimal = "{\"choices\":[{\"message\":{\"content\":\"" # jsonEscapeTransform(content) # "\"}}]}";
              minimal.encodeUtf8();
            };
          };
        } else {
          raw.response.body;
        };
      };
    };
    {
      status = raw.response.status;
      body = normalizedBody;
      headers = [];
    };
  };

  // Escapes a content string for safe embedding in the minimal JSON body
  func jsonEscapeTransform(s : Text) : Text {
    var result = s;
    result := result.replace(#char '\\', "\\\\");
    result := result.replace(#char '\u{22}', "\\\u{22}");
    result := result.replace(#char '\n', "\\n");
    result := result.replace(#char '\r', "\\r");
    result := result.replace(#char '\t', "\\t");
    result;
  };

  // Extracts the content string from a Groq JSON response body.
  // Searches for `"content":"` marker and reads until the next unescaped closing quote.
  func extractGroqContent(bodyText : Text) : ?Text {
    let marker = "\"content\":\"";
    // Split on the marker — everything after the first occurrence is the content start
    let parts = bodyText.split(#text marker);
    var count = 0;
    var afterMarker : ?Text = null;
    for (part in parts) {
      if (count == 1) { afterMarker := ?part };
      count += 1;
    };
    switch (afterMarker) {
      case null null;
      case (?rest) {
        // Read chars until we hit an unescaped closing quote
        let chars = rest.toIter();
        var buf = "";
        var escaped = false;
        var done = false;
        label charLoop for (c in chars) {
          if (done) break charLoop;
          if (escaped) {
            switch (c) {
              case 'n'       { buf #= "\n" };
              case 'r'       { buf #= "\r" };
              case 't'       { buf #= "\t" };
              case '\u{22}'  { buf #= "\u{22}" };
              case '\\'      { buf #= "\\" };
              case _         { buf #= Text.fromChar(c) };
            };
            escaped := false;
          } else if (c == '\\') {
            escaped := true;
          } else if (c == '\u{22}') {
            done := true;
          } else {
            buf #= Text.fromChar(c);
          };
        };
        if (buf.size() > 0) ?buf else null;
      };
    };
  };

  // ---- Knowledge base check ----
  // Handles local questions deterministically without any API call.

  // Returns true if the text contains any Bengali Unicode character (U+0980–U+09FF)
  func hasBengali(t : Text) : Bool {
    for (c in t.chars()) {
      let cp = c.toNat32();
      if (cp >= 0x0980 and cp <= 0x09FF) return true;
    };
    false;
  };

  // Returns true if lowercased text contains any word from the list
  func containsAny(text : Text, words : [Text]) : Bool {
    for (w in words.vals()) {
      if (text.contains(#text w)) return true;
    };
    false;
  };

  func knowledgeBaseCheck(msg : Text, userName : Text) : ?Text {
    let lower = msg.toLower();
    let isBengali = hasBengali(msg);

    // User's own name
    if (
      lower.contains(#text "আমার নাম") or
      lower.contains(#text "my name") or
      lower.contains(#text "আমি কে") or
      lower.contains(#text "who am i")
    ) {
      return ?("আপনার নাম " # userName);
    };

    // Bot's name
    if (
      lower.contains(#text "তোমার নাম") or
      lower.contains(#text "your name") or
      lower.contains(#text "তুমি কে") or
      lower.contains(#text "who are you") or
      lower.contains(#text "bot name")
    ) {
      return ?"আমার নাম Crazy Bot।";
    };

    // --- Typo-tolerant word families (substring-contains, not word-boundary) ---
    let developerWords : [Text] = [
      "developer", "developed", "develop",
      "devloper", "develper", "devlper", "develoer", "devlopr", "devleoper", "devlpr", "develooper",
      "devloped", "devleoped", "develped",
      // additional fuzzy variants
      "develo", "dvelop", "dveloper", "develpor", "devloeper", "deveolper",
      "eveloper", "evelopr", "develp", "devper",
    ];
    let creatorWords : [Text] = [
      "creator", "created", "create",
      "criator", "creater", "crator", "cretor", "craetor", "creatir", "creatro",
      "craeted", "creted", "creayed", "creatd",
      // additional fuzzy variants
      "creatr", "creato", "reator", "creaor",
      "cratr", "cretr", "creetor", "creattr",
    ];
    let madeWords : [Text] = [
      "made", "maker",
      "mde", "maed",
      // additional fuzzy variants
      "maked", "mkade", "mkde",
    ];
    let builtWords : [Text] = [
      "built", "builder",
      "bult", "biult", "bulit",
      // additional fuzzy variants
      "bilt", "buid", "buil",
    ];
    let whoWords : [Text] = [
      "who", "whos", "woh", "hwo", "who's",
      // additional fuzzy variants
      "owh",
    ];
    let yourWords : [Text] = [
      "your", "ur", "yor", "yur", "youre",
      // additional fuzzy variants
      "yr",
    ];

    // Creator / developer — language-aware, phrasing-aware
    // A query is a "creator query" if it mentions who/your + one of the action/role words,
    // or uses the Bengali patterns.
    let hasWho = containsAny(lower, whoWords);
    let hasYour = containsAny(lower, yourWords);
    let hasDeveloperWord = containsAny(lower, developerWords);
    let hasCreatorWord = containsAny(lower, creatorWords);
    let hasMadeWord = containsAny(lower, madeWords);
    let hasBuiltWord = containsAny(lower, builtWords);

    let isCreatorQuery =
      (hasWho and (hasDeveloperWord or hasCreatorWord or hasMadeWord or hasBuiltWord)) or
      (hasYour and (hasDeveloperWord or hasCreatorWord or hasMadeWord or hasBuiltWord)) or
      lower.contains(#text "কে বানিয়েছে") or
      lower.contains(#text "কে তৈরি করেছে") or
      lower.contains(#text "কে বানায়েছে") or
      lower.contains(#text "তোমাকে কে") or
      lower.contains(#text "তোমার developer") or
      lower.contains(#text "তোমার creator") or
      lower.contains(#text "developer কে") or
      lower.contains(#text "creator কে") or
      lower.contains(#text "কে develop") or
      lower.contains(#text "কে create") or
      lower.contains(#text "কে বানিয়েছ");

    if (isCreatorQuery) {
      // Phrasing-aware reply
      if (hasDeveloperWord) {
        return ?(if isBengali "Ishtiyak আমার developer" else "Ishtiyak is my developer");
      } else if (hasCreatorWord) {
        return ?(if isBengali "Ishtiyak আমার creator" else "Ishtiyak is my creator");
      } else if (hasMadeWord or lower.contains(#text "বানিয়েছে") or lower.contains(#text "বানায়েছে") or lower.contains(#text "বানিয়েছ")) {
        return ?(if isBengali "Ishtiyak আমাকে বানিয়েছেন" else "Ishtiyak made me");
      } else if (hasBuiltWord or lower.contains(#text "তৈরি")) {
        return ?(if isBengali "Ishtiyak আমাকে তৈরি করেছেন" else "Ishtiyak built me");
      } else {
        return ?(if isBengali "Ishtiyak আমাকে তৈরি করেছেন" else "Ishtiyak created me");
      };
    };

    // Version
    let versionWords : [Text] = [
      "version", "ভার্সন",
      "verson", "versoin", "verison", "versio", "vreson", "versian",
      // additional fuzzy variants
      "vsn", "vrsn", "versn", "versi", "verion", "ersion", "vresion",
      "versin", "vrsion", "vrson",
    ];
    if (containsAny(lower, versionWords)) {
      return ?"Version 4.0";
    };

    // Creation date — "when" variants + existing full phrases + Bengali patterns
    let whenWords : [Text] = [
      "when", "wen", "whn", "whne",
      // additional fuzzy variants
      "whe", "whn", "whne",
    ];
    let creationWords : [Text] = [
      "creation", "cretion", "cration", "creaton",
      // additional fuzzy variants
      "crat",
    ];
    let isDateQuery =
      (containsAny(lower, whenWords) and (hasCreatorWord or hasMadeWord or hasBuiltWord or hasDeveloperWord)) or
      containsAny(lower, creationWords) or
      lower.contains(#text "when were you created") or
      lower.contains(#text "when were you made") or
      lower.contains(#text "when were you built") or
      lower.contains(#text "when were you developed") or
      lower.contains(#text "creation date") or
      lower.contains(#text "date of creation") or
      lower.contains(#text "when was crazy bot created") or
      lower.contains(#text "when did you come") or
      lower.contains(#text "কবে তৈরি") or
      lower.contains(#text "কবে বানানো") or
      lower.contains(#text "কবে বানিয়েছে") or
      lower.contains(#text "তৈরির তারিখ") or
      lower.contains(#text "কবে এসেছ") or
      lower.contains(#text "কবে develop");

    if (isDateQuery) {
      return ?(if isBengali "আমাকে 2025 সালে তৈরি করা হয়েছে।" else "I was created in 2025.");
    };

    // General knowledge entries
    if (lower.contains(#text "python")) {
      return ?"Python is a programming language.";
    };
    if (lower.contains(#text "minecraft")) {
      return ?"Minecraft is a sandbox game created by Mojang.";
    };

    null;
  };

  // ---- Random fallback selector (simple deterministic cycle) ----
  let fallbackMessages : [Text] = [
    "আমি এখনও এটা শিখিনি।",
    "Sorry, I don't have enough info.",
    "I couldn't find a proper answer.",
  ];

  func pickFallback(seed : Nat) : Text {
    fallbackMessages[seed % fallbackMessages.size()];
  };

  // ---- HTTP POST to Groq ----
  func callGroq(userName : Text, userMessage : Text, model : Text) : async Text {
    let body = GroqLib.buildRequestBody(userName, userMessage, model);
    let bodyBlob = body.encodeUtf8();

    var lastError = "unknown error";
    var startIdx = keyIndex % GroqLib.GROQ_API_KEYS.size();

    let numKeys = GroqLib.GROQ_API_KEYS.size();
    var i = 0;
    var result : ?Text = null;

    label keyLoop while (i < numKeys) {
      let idx = (startIdx + i) % numKeys;
      let apiKey = GroqLib.pickKey(idx);

      try {
        let response = await (with cycles = 1_000_000_000) IC.http_request({
          url = GroqLib.GROQ_API_URL;
          max_response_bytes = ?(50_000 : Nat64);
          method = #post;
          headers = [
            { name = "Authorization"; value = "Bearer " # apiKey },
            { name = "Content-Type"; value = "application/json" },
          ];
          body = ?bodyBlob;
          is_replicated = null;
          transform = ?{
            function = transform;
            context = Blob.fromArray([]);
          };
        });

        let responseText = switch (response.body.decodeUtf8()) {
          case (?t) t;
          case null "";
        };

        if (response.status == 200) {
          switch (GroqLib.parseResponse(responseText)) {
            case (?content) {
              if (content.size() > 0) {
                result := ?content;
                i := numKeys; // break
              } else {
                lastError := "Key " # debug_show(idx) # ": empty response";
              };
            };
            case null {
              lastError := "Key " # debug_show(idx) # ": parse failed";
            };
          };
        } else if (response.status == 401 or response.status == 403 or response.status == 429) {
          lastError := "Key " # debug_show(idx) # ": HTTP " # debug_show(response.status);
        } else {
          lastError := "Key " # debug_show(idx) # ": HTTP " # debug_show(response.status);
        };
      } catch (e) {
        lastError := "Key " # debug_show(idx) # ": " # e.message();
      };

      i += 1;
    };

    switch (result) {
      case (?content) content;
      case null "⚠️ Server Error\n\nশেষ error: " # lastError;
    };
  };

  // ---- Core bot response logic ----
  func getBotResponse(userName : Text, userMessage : Text, seed : Nat, model : Text) : async Text {
    // Step 1: knowledge base (local, deterministic — no API call)
    switch (knowledgeBaseCheck(userMessage, userName)) {
      case (?answer) return answer;
      case null {};
    };

    // Step 2: Groq API
    let groqAnswer = await callGroq(userName, userMessage, model);

    // If API fully failed, return the error message
    if (groqAnswer.contains(#text "⚠️")) {
      return groqAnswer;
    };

    // Step 3: If Groq says idk, use a local fallback — no Wikipedia
    if (GroqLib.isIdkResponse(groqAnswer)) {
      return pickFallback(seed);
    };

    // Step 4: return Groq answer
    groqAnswer;
  };

  // ---- Public API ----

  // Send a user message and get a bot response
  public func sendMessage(deviceId : Common.DeviceId, message : Text, chatMode : Text) : async Text {
    // Get or create history list
    let history = switch (chatHistory.get(deviceId)) {
      case (?h) h;
      case null {
        let h = List.empty<Types.ChatMessage>();
        chatHistory.add(deviceId, h);
        h;
      };
    };

    // Get user name from settings
    let settings = switch (deviceSettings.get(deviceId)) {
      case (?s) s;
      case null ChatLib.defaultSettings();
    };

    // Add user message
    let userMsgId = ChatLib.makeMessageId(deviceId, history.size());
    let userMsg = ChatLib.newUserMessage(userMsgId, settings.userName, message);
    history.add(userMsg);

    // Get bot response (use history size as seed for fallback selection)
    let seed = history.size();
    let model = if (chatMode == "omega") GroqLib.GROQ_MODEL_OMEGA else GroqLib.GROQ_MODEL_FLASH;
    let botText = await getBotResponse(settings.userName, message, seed, model);

    // Add bot message
    let botMsgId = ChatLib.makeMessageId(deviceId, history.size());
    let botMsg = ChatLib.newBotMessage(botMsgId, botText);
    history.add(botMsg);

    botText;
  };

  // Return all chat messages for a device
  public query func getHistory(deviceId : Common.DeviceId) : async [Types.ChatMessage] {
    switch (chatHistory.get(deviceId)) {
      case (?history) history.toArray();
      case null [];
    };
  };

  // Clear all chat messages for a device
  public func clearHistory(deviceId : Common.DeviceId) : async () {
    switch (chatHistory.get(deviceId)) {
      case (?history) history.clear();
      case null {};
    };
  };

  // Return settings for a device (returns defaults if not set)
  public query func getSettings(deviceId : Common.DeviceId) : async Types.DeviceSettings {
    switch (deviceSettings.get(deviceId)) {
      case (?s) s;
      case null ChatLib.defaultSettings();
    };
  };

  // Save settings for a device
  public func saveSettings(deviceId : Common.DeviceId, settings : Types.DeviceSettingsInput) : async () {
    let validated : Types.DeviceSettings = {
      userName = if (settings.userName.size() == 0) "User" else settings.userName;
      fontSize = if (settings.fontSize < 12) 12 else if (settings.fontSize > 32) 32 else settings.fontSize;
      bgColor = if (settings.bgColor.size() == 0) "#FFFFFF" else settings.bgColor;
    };
    deviceSettings.add(deviceId, validated);
  };
};
