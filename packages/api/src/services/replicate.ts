import Replicate from "replicate";

let _replicate: Replicate | null = null;
function getClient(): Replicate {
  if (!_replicate) {
    _replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }
  return _replicate;
}

// Model ID mapping: friendly name → Replicate model identifier
const IMAGE_MODEL_MAP: Record<string, string> = {
  "flux-schnell": "black-forest-labs/flux-schnell",
  "flux-dev": "black-forest-labs/flux-dev",
  flux: "black-forest-labs/flux-schnell", // alias for old DB records
  "nano-banana": "google/nano-banana",
  "nano-banana-pro": "google/nano-banana-pro",
};

const ANIMATION_MODEL_MAP: Record<string, string> = {
  "wan-i2v": "wavespeedai/wan-2.1-i2v-480p",
  kling: "kwaivgi/kling-v1.6-pro",
  minimax: "minimax/video-01-live",
};

// Each animation model expects a different input parameter name for the source image
const ANIMATION_IMAGE_PARAM: Record<string, string> = {
  "wavespeedai/wan-2.1-i2v-480p": "image",
  "kwaivgi/kling-v1.6-pro": "start_image",
  "minimax/video-01-live": "first_frame_image",
};

function resolveModelId(model: string): string {
  return IMAGE_MODEL_MAP[model] || ANIMATION_MODEL_MAP[model] || model;
}

// --- Rate-limiting queue ---
// Sends requests one at a time with a delay between each to avoid 429s.

const DELAY_BETWEEN_REQUESTS_MS = 12_000; // 12s between requests (safe for 6/min limit)
let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < DELAY_BETWEEN_REQUESTS_MS) {
    const waitMs = DELAY_BETWEEN_REQUESTS_MS - elapsed;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestTime = Date.now();
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await waitForRateLimit();
      return await fn();
    } catch (error: any) {
      const retryAfter = error?.response?.headers?.get?.("retry-after");
      if (error?.response?.status === 429 && attempt < maxRetries) {
        const waitSec = parseInt(retryAfter || "15", 10);
        console.log(
          `Rate limited, waiting ${waitSec}s before retry (${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, waitSec * 1000)
        );
        lastRequestTime = Date.now();
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function generateImage(
  model: string,
  prompt: string
): Promise<{ predictionId: string; imageUrl?: string }> {
  const modelId = resolveModelId(model);

  return withRetry(async () => {
    const prediction = await getClient().predictions.create({
      model: modelId as `${string}/${string}`,
      input: { prompt },
    });

    const result = await getClient().wait(prediction);

    const output = result.output;
    const imageUrl = Array.isArray(output)
      ? output[0]
      : ((output as string) ?? undefined);

    return {
      predictionId: prediction.id,
      imageUrl: imageUrl || undefined,
    };
  });
}

export async function generateClip(
  model: string,
  imageUrl: string,
  prompt: string
): Promise<{ predictionId: string; clipUrl?: string }> {
  const modelId = resolveModelId(model);

  // Build model-specific input: each animation model uses a different param name for the source image
  const imageParam = ANIMATION_IMAGE_PARAM[modelId] || "image";

  return withRetry(async () => {
    const prediction = await getClient().predictions.create({
      model: modelId as `${string}/${string}`,
      input: {
        [imageParam]: imageUrl,
        prompt,
      },
    });

    const result = await getClient().wait(prediction);

    const output = result.output;
    const clipUrl = Array.isArray(output)
      ? output[0]
      : ((output as string) ?? undefined);

    return {
      predictionId: prediction.id,
      clipUrl: clipUrl || undefined,
    };
  });
}

export async function getPredictionStatus(
  predictionId: string
): Promise<{ status: string; output?: string }> {
  const prediction = await getClient().predictions.get(predictionId);

  const output = prediction.output;
  const outputStr = Array.isArray(output)
    ? output[0]
    : ((output as string) ?? undefined);

  return {
    status: prediction.status,
    output: outputStr,
  };
}
