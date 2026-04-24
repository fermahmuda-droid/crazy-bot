interface HelpScreenProps {
  onBack: () => void;
}

function getBotName(): string {
  const mode = localStorage.getItem("imageGenMode") ?? "standard";
  return mode === "pro" ? "Crazy Bot 5.6" : "Crazy Bot 5.4";
}

const HOW_TO_STEPS = [
  { num: "1", text: "Chat: type your message and press Send." },
  { num: "2", text: "Images: ask me to generate any image you want." },
  {
    num: "3",
    text: "Voice: tap the mic icon when input is empty to use voice chat.",
  },
  {
    num: "4",
    text: "Attach: use (+) to attach photos, camera shots, or files.",
  },
  { num: "5", text: "Settings: change your name, font size, and image mode." },
  { num: "6", text: "Clear History: removes all stored messages." },
];

const EXAMPLES = [
  "hi / hello",
  "How is the weather?",
  "Generate a realistic image of a mountain",
  "Tell me a joke",
  "What is Python?",
  "Explain machine learning",
  "Who is Elon Musk?",
  "What is Minecraft?",
  "Write a Python function to sort a list",
];

export function HelpScreen({ onBack }: HelpScreenProps) {
  const botName = getBotName();

  return (
    <div
      className="flex flex-col h-screen bg-[#F3F4F7]"
      data-ocid="help-screen"
    >
      <div
        className="flex items-center gap-3 px-4 h-[70px] flex-shrink-0 border-b border-[#E5EAF5]"
        style={{
          background: "linear-gradient(135deg, #1270D4 0%, #7C3AED 100%)",
          boxShadow: "0 2px 12px rgba(18,112,212,0.18)",
        }}
      >
        <h1 className="flex-1 text-xl font-bold text-white">
          Help &amp; Instructions
        </h1>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
          data-ocid="help-back-btn"
        >
          Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">
            Welcome to {botName}!
          </h2>
          <p className="text-[#555555] text-sm leading-relaxed">
            {botName} is an AI-powered assistant that can chat, generate images,
            analyze photos, and help with code — all in Bengali or English. Your
            chat history stays private on your device.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">
            How to use
          </h2>
          <div className="flex flex-col gap-3">
            {HOW_TO_STEPS.map((step) => (
              <div key={step.num} className="flex gap-3 items-start">
                <span
                  className="w-7 h-7 rounded-full text-white flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #1270D4, #7C3AED)",
                  }}
                >
                  {step.num}
                </span>
                <p className="text-[#333333] text-sm leading-relaxed pt-0.5">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">
            Formatting tips
          </h2>
          <div className="flex flex-col gap-2 text-sm text-[#444]">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1270D4] flex-shrink-0 mt-2" />
              <span>
                <strong>**bold**</strong> → bold text
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1270D4] flex-shrink-0 mt-2" />
              <span>
                <em>*italic*</em> → italic text
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1270D4] flex-shrink-0 mt-2" />
              <span>
                <strong>
                  <em>***bold+italic***</em>
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1270D4] flex-shrink-0 mt-2" />
              <span>
                <strong>****Topic****</strong> → section heading
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1270D4] flex-shrink-0 mt-2" />
              <span>*#* code *#* → code block with copy button</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">
            Example prompts
          </h2>
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((ex) => (
              <div key={ex} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1270D4] flex-shrink-0" />
                <span className="text-[#444444] text-sm">{ex}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Contact</h2>
          <p className="text-[#555555] text-sm">
            For any issue, contact Ishtiyak Mahmud.
          </p>
        </div>
      </div>
    </div>
  );
}
