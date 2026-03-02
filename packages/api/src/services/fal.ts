import { fal } from "@fal-ai/client";
import { promises as fs } from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

fal.config({ credentials: process.env.FAL_KEY });

// ---------------------------------------------------------------------------
// Model ID mappings
// ---------------------------------------------------------------------------

const IMAGE_MODEL_IDS: Record<string, string> = {
  "flux-schnell": "fal-ai/flux/schnell",
  "flux-dev": "fal-ai/flux/dev",
  flux: "fal-ai/flux/schnell",
  "nano-banana": "fal-ai/nano-banana",
  "nano-banana-pro": "fal-ai/nano-banana-pro", // 0.15$ per image
  "nano-banana-2": "fal-ai/nano-banana-2",
  "gemini-flash": "fal-ai/gemini-3.1-flash-image-preview",
};

const CLIP_MODEL_IDS: Record<string, string> = {
  "wan-i2v": "fal-ai/wan-i2v",
  "kling-v1.6": "fal-ai/kling-video/v1.6/pro/image-to-video",
  minimax: "fal-ai/minimax/video-01/image-to-video",
  "kling-v2.6-pro": "fal-ai/kling-video/v2.6/pro/image-to-video",
  "kling-o3-pro": "fal-ai/kling-video/o3/pro/image-to-video",
  "veo3.1": "fal-ai/veo3.1/image-to-video", // For every second of video you generate you will be charged $0.20 without audio or $0.40 with audio for 720p or 1080p. At 4k, you will be charged $0.40 per second without audio, or $0.60 with. For example, a 5 second video at 1080p with audio on will cost $2.00.
};

const FORMAT_TO_IMAGE_SIZE: Record<string, string> = {
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
  "1:1": "square_hd",
};

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function downloadToLocal(
  remoteUrl: string,
  subDir: "images" | "clips",
  filename: string
): Promise<string> {
  const dir = path.join(PUBLIC_DIR, subDir);
  await ensureDir(dir);

  const ext = remoteUrl.split("?")[0].split(".").pop() || (subDir === "images" ? "webp" : "mp4");
  const localFilename = `${filename}.${ext}`;
  const localPath = path.join(dir, localFilename);

  const response = await fetch(remoteUrl);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(localPath, buffer);

  return `/${subDir}/${localFilename}`;
}

// ---------------------------------------------------------------------------
// Upload local file to fal.ai CDN (returns a public URL)
// ---------------------------------------------------------------------------

export async function uploadToFal(localPath: string): Promise<string> {
  const absolutePath = localPath.startsWith("/")
    ? path.join(PUBLIC_DIR, localPath.slice(1))
    : path.resolve(localPath);
  const fileBuffer = await fs.readFile(absolutePath);
  const ext = path.extname(absolutePath).slice(1);
  const mimeTypes: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
    mp3: "audio/mpeg", wav: "audio/wav", mp4: "video/mp4",
  };
  const blob = new Blob([fileBuffer], { type: mimeTypes[ext] || "application/octet-stream" });
  const url = await fal.storage.upload(new File([blob], path.basename(absolutePath), { type: blob.type }));
  return url;
}

// ---------------------------------------------------------------------------
// Image generation (blocking — fal.subscribe waits for result)
// ---------------------------------------------------------------------------

export async function generateImage(
  model: string,
  prompt: string,
  aspectRatio: string = "16:9"
): Promise<{ requestId: string; imageUrl?: string }> {
  const modelId = IMAGE_MODEL_IDS[model];
  if (!modelId) throw new Error(`Unknown image model: ${model}`);

  let input: Record<string, unknown>;

  if (model === "nano-banana" || model === "nano-banana-pro") {
    input = {
      prompt,
      aspect_ratio: aspectRatio,
      num_images: 1,
      output_format: "png",
    };
    if (model === "nano-banana-pro") {
      (input as any).resolution = "2K";
    }
  } else if (model === "nano-banana-2") {
    input = {
      prompt,
      aspect_ratio: aspectRatio,
      num_images: 1,
      output_format: "png",
    };
  } else if (model === "gemini-flash") {
    input = {
      prompt,
      aspect_ratio: aspectRatio,
      num_images: 1,
      output_format: "png",
    };
  } else {
    input = {
      prompt,
      image_size: FORMAT_TO_IMAGE_SIZE[aspectRatio] ?? "landscape_16_9",
      num_images: 1,
      output_format: "png",
    };
  }

  const result = await fal.subscribe(modelId, { input });
  const data = result.data as { images?: { url: string }[] };

  return {
    requestId: result.requestId,
    imageUrl: data.images?.[0]?.url,
  };
}

// ---------------------------------------------------------------------------
// Clip / video generation (blocking — fal.subscribe waits for result)
// ---------------------------------------------------------------------------

export interface ClipGenerationOptions {
  duration?: number;
  generateAudio?: boolean;
  aspectRatio?: string;
}

// Default clip params per model
const CLIP_DEFAULTS: Record<string, { duration: number; generateAudio: boolean }> = {
  "wan-i2v":        { duration: 5,  generateAudio: false },
  "kling-v1.6":     { duration: 5,  generateAudio: false },
  "kling-v2.6-pro": { duration: 5,  generateAudio: false },
  "kling-o3-pro":   { duration: 5,  generateAudio: false },
  minimax:          { duration: 5,  generateAudio: false },
  "veo3.1":         { duration: 4,  generateAudio: true },
};

export async function generateClip(
  model: string,
  imageUrl: string,
  prompt: string,
  aspectRatio: string = "16:9",
  options?: ClipGenerationOptions
): Promise<{ requestId: string; clipUrl?: string }> {
  const modelId = CLIP_MODEL_IDS[model];
  if (!modelId) throw new Error(`Unknown clip model: ${model}`);

  const defaults = CLIP_DEFAULTS[model] ?? { duration: 5, generateAudio: false };
  const duration = options?.duration ?? defaults.duration;
  const generateAudio = options?.generateAudio ?? defaults.generateAudio;
  const ar = options?.aspectRatio ?? aspectRatio;

  // Upload local images to fal.ai CDN — fal can't access localhost
  const resolvedImageUrl = imageUrl.startsWith("http") ? imageUrl : await uploadToFal(imageUrl);

  let input: Record<string, unknown>;

  if (model === "wan-i2v") {
    input = {
      image_url: resolvedImageUrl,
      prompt,
      aspect_ratio: ar,
      resolution: "480p",
    };
  } else if (model === "kling-v1.6") {
    input = {
      image_url: resolvedImageUrl,
      prompt,
      aspect_ratio: ar,
    };
  } else if (model === "kling-v2.6-pro") {
    input = {
      start_image_url: resolvedImageUrl,
      prompt,
      duration: String(duration),
      generate_audio: generateAudio,
    };
  } else if (model === "kling-o3-pro") {
    input = {
      image_url: resolvedImageUrl,
      prompt,
      aspect_ratio: ar,
      duration: String(duration),
      generate_audio: generateAudio,
    };
  } else if (model === "veo3.1") {
    const veoAspect = ["16:9", "9:16"].includes(ar) ? ar : "auto";
    input = {
      image_url: resolvedImageUrl,
      prompt,
      aspect_ratio: veoAspect,
      duration: `${duration}s`,
      generate_audio: generateAudio,
    };
  } else {
    // minimax — no aspect_ratio support
    input = {
      image_url: resolvedImageUrl,
      prompt,
    };
  }

  const result = await fal.subscribe(modelId, { input });
  const data = result.data as { video?: { url: string } };

  return {
    requestId: result.requestId,
    clipUrl: data.video?.url,
  };
}
