interface HelpScreenProps {
  onBack: () => void;
}

const HOW_TO_STEPS = [
  { num: "1", text: "Chat: type your message and press Send or Enter." },
  { num: "2", text: "Settings: change name and font size." },
  { num: "3", text: "Clear History: removes all stored messages." },
];

const EXAMPLES = [
  "hi / hello",
  "How is the weather?",
  "What is time now?",
  "Tell me a joke",
  "What is Python?",
  "Explain machine learning",
  "Who is Elon Musk?",
  "What is Minecraft?",
];

export function HelpScreen({ onBack }: HelpScreenProps) {
  return (
    <div
      className="flex flex-col h-screen bg-[#F3F4F7]"
      data-ocid="help-screen"
    >
      <div className="flex items-center gap-3 px-4 h-[70px] bg-white border-b border-[#EBEBF2] shadow-sm flex-shrink-0">
        <h1 className="flex-1 text-xl font-bold text-[#1A1A1A]">
          Help & Instructions
        </h1>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#6B2DBF] text-white font-semibold text-sm hover:bg-[#5a20a3] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2DBF]"
          data-ocid="help-back-btn"
        >
          Back to Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">
            Welcome to Crazy Bot 4.0!
          </h2>
          <p className="text-[#555555] text-sm leading-relaxed">
            Crazy Bot 4.0 is an AI-powered chatbot that can answer your
            questions intelligently. It supports Bengali text responses and
            keeps your chat history private per device.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">
            How to use
          </h2>
          <div className="flex flex-col gap-3">
            {HOW_TO_STEPS.map((step) => (
              <div key={step.num} className="flex gap-3 items-start">
                <span className="w-7 h-7 rounded-full bg-[#1270D4] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
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
