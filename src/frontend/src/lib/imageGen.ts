// Direct browser image generation using Pollinations.ai (primary) with Cloudflare Workers AI,
// Reve.app, SiliconFlow, Naga AI DALL-E 3, and Pollinations public API fallbacks for text-to-image.
// img2img uses ImgFilter (Naga AI Gemini 2.5 Flash) → DALL-E 3 (primary), then AI Horde and Pollinations fallbacks.
// No backend involved — called directly from the browser.

import { recordModelUsage } from "./analytics";
import { generateDallE3 } from "./groq";

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

const CF_ACCOUNT_ID = "d6d439d8462c8d5b0a1b6954d53b89d4";
const CF_API_TOKEN = "Cfat_3lGHqcY9MTu9PM6pm3kLYIueBWzqRL72Xd8rMFjqce3d864c";
const CF_FLUX2_DEV_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-2-dev`;

// Track which token to try first (alternates each call)
let tokenIndex = 0;
let reveKeyIndex = 0;

// Prompt enhancement suffix for Reve.app — auto-appended before API call
const REVE_PROMPT_ENHANCEMENT =
  ", highly detailed, photorealistic, cinematic lighting, sharp focus, 8k resolution, professional photography, balanced composition";

/**
 * Uploads a base64 image to a free public image host and returns a public HTTPS URL.
 * Tries 7 servers in rotation; returns the first successful public URL.
 * Used by both img2img and imgana flows so Groq/Pollinations can fetch the image.
 *
 * Server chain:
 *   1. freeimage.host
 *   2. imgbb.com
 *   3. litterbox.catbox.moe  (24h temp)
 *   4. files.catbox.moe      (permanent)
 *   5. 0x0.st                (permanent)
 *   6. tmpfiles.org          (60 days)
 *   7. bashupload.com        (3 days)
 */
export async function uploadImageToPublicServer(
  base64Data: string,
  mimeType: string,
): Promise<string> {
  // Normalise: strip optional data-URL prefix to get raw base64
  const rawBase64 = base64Data.includes(",")
    ? base64Data.split(",")[1]
    : base64Data;

  // Derive a sensible file extension from mimeType
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
  };
  const ext = extMap[mimeType] ?? ".jpg";

  /** Convert raw base64 string to a Blob (browser-native, no Node.js). */
  function base64ToBlob(b64: string, mime: string): Blob {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  /** Wraps a fetch call with an 8-second AbortController timeout. */
  async function fetchWithTimeout(
    input: RequestInfo,
    init: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(tid);
    }
  }

  // ── Server 1: freeimage.host ────────────────────────────────────────────
  console.log("[uploadImage] Trying freeimage.host…");
  try {
    const fd = new FormData();
    fd.append("action", "upload");
    fd.append("key", "6d207e02198a847aa98d0a2a901485a5");
    fd.append("source", rawBase64);
    fd.append("format", "json");

    const res = await fetchWithTimeout("https://freeimage.host/api/1/upload", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const data = (await res.json()) as {
        image?: { url?: string; display_url?: string };
      };
      const url = data?.image?.display_url ?? data?.image?.url;
      if (url?.startsWith("https://")) {
        console.log("[uploadImage] freeimage.host succeeded:", url);
        return url;
      }
    }
  } catch (e) {
    console.warn("[uploadImage] freeimage.host failed:", e);
  }

  // ── Server 2: imgbb.com ─────────────────────────────────────────────────
  console.log("[uploadImage] Trying imgbb.com…");
  try {
    const fd = new FormData();
    fd.append("key", "6d8e8b3a9c5b4f2a1e7d3c0b8a9e6f4d");
    fd.append("image", rawBase64);

    const res = await fetchWithTimeout("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const data = (await res.json()) as {
        data?: { url?: string; display_url?: string };
      };
      const url = data?.data?.display_url ?? data?.data?.url;
      if (url?.startsWith("https://")) {
        console.log("[uploadImage] imgbb.com succeeded:", url);
        return url;
      }
    }
  } catch (e) {
    console.warn("[uploadImage] imgbb.com failed:", e);
  }

  // Convert base64 to Blob — needed for the remaining servers
  const blob = base64ToBlob(rawBase64, mimeType || "image/jpeg");
  const filename = `upload${ext}`;

  // ── Server 3: litterbox.catbox.moe (24 h) ──────────────────────────────
  console.log("[uploadImage] Trying litterbox.catbox.moe…");
  try {
    const fd = new FormData();
    fd.append("reqtype", "fileupload");
    fd.append("time", "24h");
    fd.append("fileToUpload", blob, filename);

    const res = await fetchWithTimeout(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      { method: "POST", body: fd },
    );
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith("https://")) {
        console.log("[uploadImage] litterbox.catbox.moe succeeded:", text);
        return text;
      }
    }
  } catch (e) {
    console.warn("[uploadImage] litterbox.catbox.moe failed:", e);
  }

  // ── Server 4: files.catbox.moe (permanent) ─────────────────────────────
  console.log("[uploadImage] Trying files.catbox.moe…");
  try {
    const fd = new FormData();
    fd.append("reqtype", "fileupload");
    fd.append("userhash", "");
    fd.append("fileToUpload", blob, filename);

    const res = await fetchWithTimeout("https://catbox.moe/user/api.php", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith("https://")) {
        console.log("[uploadImage] files.catbox.moe succeeded:", text);
        return text;
      }
    }
  } catch (e) {
    console.warn("[uploadImage] files.catbox.moe failed:", e);
  }

  // ── Server 5: 0x0.st (permanent) ───────────────────────────────────────
  console.log("[uploadImage] Trying 0x0.st…");
  try {
    const fd = new FormData();
    fd.append("file", blob, filename);

    const res = await fetchWithTimeout("https://0x0.st", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith("https://")) {
        console.log("[uploadImage] 0x0.st succeeded:", text);
        return text;
      }
    }
  } catch (e) {
    console.warn("[uploadImage] 0x0.st failed:", e);
  }

  // ── Server 6: tmpfiles.org (60 days) ───────────────────────────────────
  console.log("[uploadImage] Trying tmpfiles.org…");
  try {
    const fd = new FormData();
    fd.append("file", blob, filename);

    const res = await fetchWithTimeout("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const data = (await res.json()) as { data?: { url?: string } };
      let url = data?.data?.url ?? "";
      // tmpfiles returns a viewer URL — replace with direct-download path
      url = url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
      if (url.startsWith("https://")) {
        console.log("[uploadImage] tmpfiles.org succeeded:", url);
        return url;
      }
    }
  } catch (e) {
    console.warn("[uploadImage] tmpfiles.org failed:", e);
  }

  // ── Server 7: bashupload.com (3 days) ──────────────────────────────────
  console.log("[uploadImage] Trying bashupload.com…");
  try {
    const fd = new FormData();
    fd.append("file", blob, filename);

    const res = await fetchWithTimeout("https://bashupload.com", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const text = await res.text();
      // Response contains a line like: wget https://bashupload.com/xxxxx/file.jpg
      const match = text.match(/https:\/\/\S+/);
      if (match) {
        console.log("[uploadImage] bashupload.com succeeded:", match[0]);
        return match[0];
      }
    }
  } catch (e) {
    console.warn("[uploadImage] bashupload.com failed:", e);
  }

  throw new Error("Image upload failed: all public servers unavailable");
}

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
 * Try Cloudflare Workers AI FLUX.2 [dev] text-to-image.
 * Uses multipart FormData — NOT JSON.
 * Returns a data:image/png;base64,... URL on success, null on failure.
 */
async function tryCloudflareTextToImage(
  prompt: string,
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("prompt", prompt);

    const res = await fetch(CF_FLUX2_DEV_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
      // Do NOT set Content-Type — browser sets it with boundary automatically
      body: formData,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { image?: string } };
    const b64 = data?.result?.image;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

/**
 * Try Reve.app text-to-image with a single API key.
 * Appends prompt enhancement for realism/quality.
 * Uses test_time_scaling=5 for maximum quality.
 * Returns an image URL or blob URL on success, null on failure.
 */
async function tryReve(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const enhancedPrompt = `${prompt}${REVE_PROMPT_ENHANCEMENT}`;
    const res = await fetch("https://api.reve.art/v1/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        aspect_ratio: "1:1",
        test_time_scaling: 5,
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
 * Standard image generation.
 *
 * Fallback chain:
 * 1. Naga AI DALL-E 3 (text-to-image, high quality)
 * 2. Pollinations.ai account API (gptimage-large) — multiple keys
 * 3. Cloudflare Workers AI FLUX.2 [dev]
 * 4. Reve.app
 * 5. SiliconFlow FLUX.1-pro
 * 6. Pollinations.ai public API (flux-schnell, no key, unlimited free)
 */
async function generateStandard(prompt: string): Promise<string | null> {
  // --- PRIMARY: Naga AI DALL-E 3 ---
  try {
    const dallE3Result = await generateDallE3(prompt);
    if (dallE3Result) {
      recordModelUsage("DALL-E 3 (Naga AI)");
      return dallE3Result;
    }
  } catch {
    // fall through to next
  }

  // --- FALLBACK 1: Pollinations.ai account API (gptimage-large) ---
  const model = "gptimage-large";
  const firstIdx = tokenIndex % POLLINATIONS_TOKENS.length;
  const secondIdx = (tokenIndex + 1) % POLLINATIONS_TOKENS.length;
  tokenIndex = (tokenIndex + 1) % POLLINATIONS_TOKENS.length;

  const result1 = await tryPollinations(
    prompt,
    model,
    POLLINATIONS_TOKENS[firstIdx],
  );
  if (result1 !== null) {
    recordModelUsage("Pollinations gptimage-large");
    return result1;
  }

  const result2 = await tryPollinations(
    prompt,
    model,
    POLLINATIONS_TOKENS[secondIdx],
  );
  if (result2 !== null) {
    recordModelUsage("Pollinations gptimage-large");
    return result2;
  }

  // --- FALLBACK 2: Cloudflare Workers AI FLUX.2 [dev] ---
  const cfResult = await tryCloudflareTextToImage(prompt);
  if (cfResult !== null) {
    recordModelUsage("Cloudflare FLUX.2 dev");
    return cfResult;
  }

  // --- FALLBACK 3: Reve.app — rotate through all 4 keys ---
  for (let i = 0; i < REVE_API_KEYS.length; i++) {
    const keyIdx = (reveKeyIndex + i) % REVE_API_KEYS.length;
    const reveResult = await tryReve(prompt, REVE_API_KEYS[keyIdx]);
    if (reveResult !== null) {
      reveKeyIndex = (keyIdx + 1) % REVE_API_KEYS.length;
      recordModelUsage("Reve.app");
      return reveResult;
    }
  }

  // --- FALLBACK 4: SiliconFlow FLUX.1-pro ---
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
      if (imageUrl) {
        recordModelUsage("SiliconFlow FLUX.1-pro");
        return imageUrl;
      }
    }
  } catch {
    // fall through to last fallback
  }

  // --- FALLBACK 5: Pollinations.ai PUBLIC API (flux-schnell) — no key, unlimited free ---
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const publicUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux-schnell&width=1024&height=1024&nologo=true&seed=${seed}`;
    const res = await fetch(publicUrl);
    if (res.ok) {
      const blob = await res.blob();
      recordModelUsage("Pollinations FLUX.1-schnell (public)");
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Pro image generation using Puter.js with google/imagen-4.0-fast.
 * Falls back through Naga AI DALL-E 3 then Pollinations public on failure.
 */
async function generatePro(prompt: string): Promise<string | null> {
  // Try Puter.js first (sign-in required)
  try {
    if (typeof puter !== "undefined" && puter.auth.isSignedIn()) {
      const imgEl = await puter.ai.txt2img(prompt, false, {
        model: "google/imagen-4.0-fast",
      });
      const src = imgEl?.src ?? null;
      if (src) {
        recordModelUsage("Puter.js Imagen 4 (Pro)");
        return src;
      }
    }
  } catch {
    // fall through to Naga AI
  }

  // Fallback 1: Naga AI DALL-E 3
  try {
    const dallE3Result = await generateDallE3(prompt);
    if (dallE3Result) {
      recordModelUsage("DALL-E 3 (Naga AI)");
      return dallE3Result;
    }
  } catch {
    // fall through
  }

  // Fallback 2: Pollinations public flux-schnell
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const publicUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux-schnell&width=1024&height=1024&nologo=true&seed=${seed}`;
    const res = await fetch(publicUrl);
    if (res.ok) {
      const blob = await res.blob();
      recordModelUsage("Pollinations FLUX.1-schnell (public)");
      return URL.createObjectURL(blob);
    }
  } catch {
    // fall through to standard chain
  }

  // Final fallback: full standard chain
  return generateStandard(prompt);
}

/**
 * Generates an image from a text prompt.
 * Reads `imageGenMode` from localStorage:
 *   - 'pro' → Puter.js (google/imagen-4.0-fast) → Naga AI DALL-E 3 → Pollinations public flux-schnell → Standard chain
 *   - 'standard' (default) → Naga AI DALL-E 3 → Pollinations account → Cloudflare → Reve → SiliconFlow → Pollinations public flux-schnell
 */
export async function generateImage(
  prompt: string,
  _imageType: "realistic" | "artistic" = "realistic",
): Promise<string | null> {
  const mode = localStorage.getItem("imageGenMode") ?? "standard";
  if (mode === "pro") {
    return generatePro(prompt);
  }
  return generateStandard(prompt);
}

/**
 * Generates a video from a text prompt using Pollinations.ai public API (ltx-2 model).
 * Returns a blob URL for the video on success, null on failure.
 * Note: ltx-2 generates silent video only (no audio).
 */
export async function generateVideo(prompt: string): Promise<string | null> {
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://video.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=ltx-2&seed=${seed}&width=512&height=288&duration=3`;
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        return URL.createObjectURL(blob);
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── AI Horde constants ─────────────────────────────────────────────────────
const HORDE_API_KEY = "yQIvamG4a2jJxoePgceyxA";
const HORDE_IMG2IMG_MODELS = [
  "Flux.1-Dev",
  "flux_1_dev",
  "FLUX.1-dev",
  "Flux Diffusion",
  "SDXL 1.0",
  "stable_diffusion",
];

/**
 * Polls AI Horde until the job is done or the timeout is reached.
 * Returns the final image URL/base64 string on success, null on failure.
 */
async function pollHordeJob(
  jobId: string,
  maxWaitMs = 120000,
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const checkRes = await fetch(
        `https://stablehorde.net/api/v2/generate/check/${jobId}`,
        { headers: { apikey: HORDE_API_KEY } },
      );
      if (!checkRes.ok) continue;
      const checkData = (await checkRes.json()) as {
        done?: boolean;
        faulted?: boolean;
        wait_time?: number;
      };
      if (checkData.faulted) return null;
      if (!checkData.done) continue;

      // Job done — fetch final result
      const statusRes = await fetch(
        `https://stablehorde.net/api/v2/generate/status/${jobId}`,
        { headers: { apikey: HORDE_API_KEY } },
      );
      if (!statusRes.ok) return null;
      const statusData = (await statusRes.json()) as {
        generations?: Array<{ img: string; r2?: boolean }>;
        faulted?: boolean;
      };
      if (statusData.faulted) return null;
      const gen = statusData.generations?.[0];
      if (!gen?.img) return null;
      // r2==true means img is a downloadable URL; otherwise it may be base64
      if (gen.r2 || gen.img.startsWith("http")) {
        // Download and convert to object URL so we can display it
        const imgRes = await fetch(gen.img);
        if (!imgRes.ok) return gen.img; // return the URL directly as last resort
        const blob = await imgRes.blob();
        return URL.createObjectURL(blob);
      }
      // Raw base64 — wrap as data URL
      return `data:image/webp;base64,${gen.img}`;
    } catch {
      // transient error — keep polling
    }
  }
  return null; // timed out
}

/**
 * Submits an img2img job to AI Horde using raw base64.
 * Tries each model in HORDE_IMG2IMG_MODELS until one is accepted.
 * Returns the generated image URL on success, null if all models fail.
 */
async function tryHordeImg2Img(
  prompt: string,
  rawBase64: string,
): Promise<string | null> {
  for (const model of HORDE_IMG2IMG_MODELS) {
    try {
      const seed = String(Math.floor(Math.random() * 2 ** 31));
      const body = {
        prompt,
        params: {
          sampler_name: "k_euler",
          cfg_scale: 7.5,
          denoising_strength: 0.75,
          seed,
          height: 1024,
          width: 1024,
          steps: 30,
          n: 1,
        },
        source_image: rawBase64,
        source_processing: "img2img",
        models: [model],
        r2: true,
        nsfw: false,
        censor_nsfw: true,
        slow_workers: true,
      };

      const submitRes = await fetch(
        "https://stablehorde.net/api/v2/generate/async",
        {
          method: "POST",
          headers: {
            apikey: HORDE_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!submitRes.ok) {
        const errText = await submitRes.text().catch(() => "");
        console.warn(
          `[Horde] Model "${model}" rejected (${submitRes.status}): ${errText}`,
        );
        continue;
      }

      const submitData = (await submitRes.json()) as {
        id?: string;
        message?: string;
      };
      if (!submitData.id) {
        console.warn(`[Horde] No job ID returned for model "${model}"`);
        continue;
      }

      console.log(
        `[Horde] Job submitted with model "${model}", id=${submitData.id}`,
      );
      const result = await pollHordeJob(submitData.id);
      if (result !== null) {
        console.log(`[Horde] img2img succeeded with model "${model}"`);
        recordModelUsage(`AI Horde ${model}`);
        return result;
      }
      console.warn(`[Horde] Model "${model}" polling timed out or faulted`);
    } catch (e) {
      console.warn(`[Horde] Model "${model}" threw:`, e);
    }
  }
  return null;
}

/**
 * Generates an image from an input image + text prompt (img2img).
 *
 * Flow:
 *   STEP 1 — AI Horde via Base64 (PRIMARY, highest quality):
 *     Sends raw base64 directly to AI Horde FLUX.1-Dev img2img.
 *     Falls back through HORDE_IMG2IMG_MODELS list if a model is unavailable.
 *
 *   STEP 2 — Get public URL (in parallel / after step 1 prep):
 *     If Horde fails, upload image to a public server to obtain an HTTPS URL.
 *     (Horde itself doesn't benefit from the URL — this is purely for Pollinations.)
 *
 *   STEP 3 — Pollinations FLUX.1-schnell via URL (DEFAULT FALLBACK):
 *     Uses publicImageUrl from the caller or from the upload in STEP 2.
 *     Falls through to standard text-to-image if no URL is available.
 *
 * @param prompt         The transformation/style prompt
 * @param base64         Raw base64 string (with or without data-URL prefix)
 * @param mimeType       MIME type of the source image (e.g. "image/jpeg")
 * @param publicImageUrl Optional pre-uploaded public HTTPS URL for the image
 */
export async function generateImg2Img(
  prompt: string,
  base64: string,
  mimeType: string,
  publicImageUrl?: string,
): Promise<string | null> {
  // Normalise base64 — strip data-URL prefix if present
  const rawBase64 = base64.includes(",") ? base64.split(",")[1] : base64;

  // ── STEP 1: AI Horde via Base64 ────────────────────────────────────────
  console.log("[img2img] Trying AI Horde with base64…");
  const hordeResult = await tryHordeImg2Img(prompt, rawBase64);
  if (hordeResult !== null) {
    console.log("[img2img] AI Horde succeeded ✓");
    return hordeResult;
  }
  console.warn("[img2img] AI Horde failed — trying Pollinations fallback");

  // ── STEP 2: Obtain public URL for Pollinations (if not already provided) ─
  let resolvedUrl = publicImageUrl ?? null;
  if (!resolvedUrl) {
    try {
      resolvedUrl = await uploadImageToPublicServer(rawBase64, mimeType);
      console.log("[img2img] Public upload succeeded:", resolvedUrl);
    } catch {
      console.warn("[img2img] Public upload failed — will use data URL");
    }
  }

  // ── STEP 3: Pollinations FLUX.1-schnell via URL ─────────────────────────
  const imageUrlForPollinations =
    resolvedUrl ?? `data:${mimeType};base64,${rawBase64}`;

  try {
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt);
    const encodedImageUrl = encodeURIComponent(imageUrlForPollinations);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux-schnell&image_url=${encodedImageUrl}&nologo=true&enhance=false&seed=${seed}&width=1024&height=1024`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(pollinationsUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        console.log("[img2img] Pollinations FLUX.1-schnell succeeded ✓");
        recordModelUsage("Pollinations FLUX.1-schnell (img2img)");
        return URL.createObjectURL(blob);
      }
    }
  } catch {
    console.warn("[img2img] Pollinations FLUX.1-schnell failed");
  }

  // ── FINAL FALLBACK: standard text-to-image with the prompt ──────────────
  console.warn(
    "[img2img] All img2img methods failed — falling back to text-to-image",
  );
  return generateStandard(prompt);
}
