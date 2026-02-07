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

// --- Fire a prediction (non-blocking) ---
// Creates the prediction on Replicate and returns the prediction ID immediately.
// Does NOT wait for the result.

export async function fireImagePrediction(
  model: string,
  prompt: string,
  aspectRatio: string = "16:9"
): Promise<string> {
  const modelId = resolveModelId(model);
  const prediction = await getClient().predictions.create({
    model: modelId as `${string}/${string}`,
    input: { prompt, aspect_ratio: aspectRatio },
  });
  return prediction.id;
}

export async function fireClipPrediction(
  model: string,
  imageUrl: string,
  prompt: string,
  aspectRatio: string = "16:9"
): Promise<string> {
  const modelId = resolveModelId(model);
  const imageParam = ANIMATION_IMAGE_PARAM[modelId] || "image";
  const prediction = await getClient().predictions.create({
    model: modelId as `${string}/${string}`,
    input: {
      [imageParam]: imageUrl,
      prompt,
      aspect_ratio: aspectRatio,
    },
  });
  return prediction.id;
}

// --- Poll a prediction until it completes ---

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes max

export async function waitForPrediction(
  predictionId: string
): Promise<{ status: string; output?: string }> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const prediction = await getClient().predictions.get(predictionId);

    if (prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled") {
      const output = prediction.output;
      const outputStr = Array.isArray(output)
        ? output[0]
        : ((output as string) ?? undefined);
      return { status: prediction.status, output: outputStr };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return { status: "failed", output: undefined };
}

// --- Legacy sync functions (used by single regenerate endpoints) ---

export async function generateImage(
  model: string,
  prompt: string,
  aspectRatio: string = "16:9"
): Promise<{ predictionId: string; imageUrl?: string }> {
  const predictionId = await fireImagePrediction(model, prompt, aspectRatio);
  const result = await waitForPrediction(predictionId);
  return {
    predictionId,
    imageUrl: result.output || undefined,
  };
}

export async function generateClip(
  model: string,
  imageUrl: string,
  prompt: string,
  aspectRatio: string = "16:9"
): Promise<{ predictionId: string; clipUrl?: string }> {
  const predictionId = await fireClipPrediction(model, imageUrl, prompt, aspectRatio);
  const result = await waitForPrediction(predictionId);
  return {
    predictionId,
    clipUrl: result.output || undefined,
  };
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
