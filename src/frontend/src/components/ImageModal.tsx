import { useEffect, useState } from "react";

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copied" | "unsupported"
  >("idle");

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.write) {
        setCopyStatus("unsupported");
        setTimeout(() => setCopyStatus("idle"), 2000);
        return;
      }
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const pngBlob =
        blob.type === "image/png"
          ? blob
          : new Blob([blob], { type: "image/png" });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("unsupported");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }

  return (
    /* Outer overlay — close on click */
    <div
      className="fixed inset-0 z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.90)" }}
      data-ocid="image-modal-overlay"
    >
      {/* Invisible full-area close button behind content */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 w-full h-full cursor-default"
        aria-label="Close modal"
        tabIndex={-1}
      />

      {/* Centered content — sits above the close button */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full pointer-events-none">
        {/* Close X button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors pointer-events-auto"
          aria-label="Close image"
          data-ocid="image-modal-close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            role="img"
            aria-label="Close"
          >
            <title>Close</title>
            <line
              x1="2"
              y1="2"
              x2="14"
              y2="14"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="14"
              y1="2"
              x2="2"
              y2="14"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Image */}
        <img
          src={imageUrl}
          alt="Generated"
          style={{
            maxWidth: "100%",
            maxHeight: "80vh",
            objectFit: "contain",
            borderRadius: "12px",
            pointerEvents: "auto",
          }}
          data-ocid="image-modal-img"
        />

        {/* Action buttons */}
        <div
          className="flex gap-3 mt-5 pointer-events-auto"
          data-ocid="image-modal-actions"
        >
          <a
            href={imageUrl}
            download="generated-image.jpg"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#1270D4" }}
            data-ocid="image-modal-download"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{
              backgroundColor: copyStatus === "copied" ? "#2A8A3E" : "#444",
            }}
            data-ocid="image-modal-copy"
          >
            {copyStatus === "copied" ? (
              <>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 7.5l4 4 7-7"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Copied!
              </>
            ) : copyStatus === "unsupported" ? (
              "Not supported"
            ) : (
              <>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="4"
                    y="4"
                    width="8"
                    height="8"
                    rx="1.5"
                    stroke="white"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M3 10H2.5A1.5 1.5 0 0 1 1 8.5v-6A1.5 1.5 0 0 1 2.5 1h6A1.5 1.5 0 0 1 10 2.5V3"
                    stroke="white"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                Copy Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
