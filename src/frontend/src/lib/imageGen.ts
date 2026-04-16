// Direct browser image generation using Pollinations.ai (primary) with Reve.app, SiliconFlow, and Pollinations public API fallbacks.
// No backend involved — called directly from the browser.

// Puter.js is loaded via <script> tag in index.html
declare const puter: {
  auth: {
    isSignedIn: () => boolean;
    signIn: () => Promise<void>;
  };
  ai: {
    txt2img: (
      prompt: string,
      testMode: boolean,
      options: { model: string },
    ) => Promise<HTMLImageElement>;
  };
};

const POLLINATIONS_TOKENS = [
  "sk_qlEyWsAbCFClrqnfb7MfFLF5dlqWwVlx",
  "sk_pz8MwIeeewkQnjNwSwTzOGUeAaAYzoZ0",
  "sk_19GmnLiP6HWxCCN7DNk3WDSwgEtACQQz",
  "sk_JOLbAIU15sGGfwJ9zIYpjjCWbhkDMi60",
  "sk_4eQFMADF6yzbVVXyzIw4iVPwv2Dz6Ai4",
  "sk_bdw2oXn9aOT1gnxJI9uLGuEeH28ERwjF",
];

const REVE_API_KEYS = [
  "papi.9615c8b2-9d18-4427-875a-866ea3e46ec3.ENsIshw9bmxYlzJlu66SWEkfpKkn_5u5",
  "papi.cac38fee-e343-4b53-88bc-2ead7bc5fd46.fobcieGaVE0NMac9hAkbQSU5x2gklXli",
  "papi.ccf7517b-3c7f-4cd7-8960-e77d9f8ee8e1.MWhCkkbYwcr4AZtHhhlvmq8H570Bw6M2",
  "papi.920fee20-e4cb-4326-9331-b45008913ce0.NXdY7X7KOB8iILIIJ1f8H6uRHtYcdoNY",
];

const SILICONFLOW_API_KEY =
  "sk-zlmxqvoaglaiwuenvhfxeivlzoeqbbibcygmseysppaqifmz";

// Track which token to try first (alternates each call)
let tokenIndex = 0;
let reveKeyIndex = 0;

/**
 * Try Pollinations.ai with a single token.
 * Returns a blob URL on success, null on failure.
 */
async function tryPollinations(
  prompt: string,
  model: string,
  token: string,
): Promise<string | null> {
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${model}&width=1024&height=1024&nologo=true&token=${token}`;
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try Reve.app with a single API key.
 * Appends "(Realistic)" to the prompt.
 * Returns an image URL or blob URL on success, null on failure.
 */
async function tryReve(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.reve.art/v1/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${prompt} (Realistic)`,
        aspect_ratio: "1:1",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      url?: string;
      data?: { url?: string } | Array<{ url?: string }>;
      images?: Array<{ url?: string }>;
    };
    // Try various response shapes
    const imageUrl =
      data.url ??
      (Array.isArray(data.data)
        ? data.data[0]?.url
        : (data.data as { url?: string } | undefined)?.url) ??
      data.images?.[0]?.url ??
      null;
    if (imageUrl) return imageUrl;
    return null;
  } catch {
    return null;
  }
}

/**
 * Standard image generation using Pollinations.ai (primary) + Reve.app + SiliconFlow + Pollinations public (fallbacks).
 * 'realistic' uses gptimage-large, 'artistic' uses seedream.
 */
async function generateStandard(
  prompt: string,
  imageType: "realistic" | "artistic",
): Promise<string | null> {
  const model = imageType === "realistic" ? "gptimage-large" : "seedream";

  // Determine which token to try first this call, then rotate for the next call
  const firstIdx = tokenIndex % POLLINATIONS_TOKENS.length;
  const secondIdx = (tokenIndex + 1) % POLLINATIONS_TOKENS.length;
  tokenIndex = (tokenIndex + 1) % POLLINATIONS_TOKENS.length;

  // --- PRIMARY: Pollinations.ai — try first token ---
  const result1 = await tryPollinations(
    prompt,
    model,
    POLLINATIONS_TOKENS[firstIdx],
  );
  if (result1 !== null) return result1;

  // --- PRIMARY: Pollinations.ai — try second token on failure ---
  const result2 = await tryPollinations(
    prompt,
    model,
    POLLINATIONS_TOKENS[secondIdx],
  );
  if (result2 !== null) return result2;

  // --- FALLBACK 1: Reve.app — rotate through all 4 keys ---
  for (let i = 0; i < REVE_API_KEYS.length; i++) {
    const keyIdx = (reveKeyIndex + i) % REVE_API_KEYS.length;
    const reveResult = await tryReve(prompt, REVE_API_KEYS[keyIdx]);
    if (reveResult !== null) {
      reveKeyIndex = (keyIdx + 1) % REVE_API_KEYS.length;
      return reveResult;
    }
  }

  // --- FALLBACK 2: SiliconFlow FLUX.1-pro ---
  try {
    const res = await fetch("https://api.siliconflow.cn/v1/image/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/FLUX.1-pro",
        prompt,
        image_size: "1024x1024",
        num_inference_steps: 20,
        num_images: 1,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { images?: { url: string }[] };
      const imageUrl = data.images?.[0]?.url;
      if (imageUrl) return imageUrl;
    }
  } catch {
    // fall through to last fallback
  }

  // --- FALLBACK 3: Pollinations.ai PUBLIC API (flux/FLUX Schnell) — no key, unlimited free ---
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const publicUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&nologo=true&seed=${seed}`;
    const res = await fetch(publicUrl);
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Pro image generation using Puter.js with google/imagen-4.0-fast.
 * Falls back to Standard on any failure or if not signed in.
 */
async function generatePro(
  prompt: string,
  imageType: "realistic" | "artistic",
): Promise<string | null> {
  try {
    if (typeof puter === "undefined" || !puter.auth.isSignedIn()) {
      return generateStandard(prompt, imageType);
    }
    const imgEl = await puter.ai.txt2img(prompt, false, {
      model: "google/imagen-4.0-fast",
    });
    const src = imgEl?.src ?? null;
    if (src) return src;
    return generateStandard(prompt, imageType);
  } catch {
    return generateStandard(prompt, imageType);
  }
}

/**
 * Generates an image from a text prompt.
 * Reads `imageGenMode` from localStorage:
 *   - 'pro' AND puter signed in → Puter.js (google/imagen-4.0-fast), falls back to Standard on failure
 *   - 'standard' (default) → Pollinations.ai primary, Reve.app fallback, SiliconFlow fallback, then Pollinations public API (flux)
 */
export async function generateImage(
  prompt: string,
  imageType: "realistic" | "artistic" = "realistic",
): Promise<string | null> {
  const mode = localStorage.getItem("imageGenMode") ?? "standard";
  if (mode === "pro") {
    return generatePro(prompt, imageType);
  }
  return generateStandard(prompt, imageType);
}
