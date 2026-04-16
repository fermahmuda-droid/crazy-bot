interface InfoScreenProps {
  onContinue: () => void;
}

export function InfoScreen({ onContinue }: InfoScreenProps) {
  return (
    <div
      className="min-h-screen flex flex-col bg-[#F5F5F2]"
      data-ocid="info-screen"
    >
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-4xl font-bold text-[#1A1A1A]">Crazy Bot 4.0</h1>
          <p className="text-xl text-[#555555]">Version: 4.0</p>
          <p className="text-xl text-[#666666]">Creator: Ishtiyak Mahmud</p>
          <p className="text-xl text-[#777777]">
            Creation Date: 5, February 2026
          </p>
        </div>
      </div>
      <div className="flex justify-end px-8 pb-8">
        <button
          type="button"
          onClick={onContinue}
          className="px-8 py-3 rounded-xl bg-[#1270D4] text-white font-bold text-base hover:bg-[#0e5db8] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1270D4]"
          data-ocid="info-continue-btn"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
