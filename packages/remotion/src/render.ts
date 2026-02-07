import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { VideoFormat } from "@video-generator/shared";

export interface RenderInput {
  clips: Array<{
    src: string;
    sceneTitle?: string;
  }>;
  format: VideoFormat;
  outputPath: string;
  onProgress?: (progress: number) => void;
}

export async function renderVideo(input: RenderInput): Promise<string> {
  const { clips, format, outputPath, onProgress } = input;

  // Entry point is the source file (not compiled) — Remotion bundles it with webpack
  const entryPoint = path.resolve(__dirname, "..", "src", "index.ts");

  console.log(`[Remotion] Bundling project from ${entryPoint}...`);
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });
  console.log(`[Remotion] Bundle ready at ${bundleLocation}`);

  const inputProps = {
    clips,
    clipDurations: [] as number[],
    format,
  };

  console.log(`[Remotion] Selecting composition with ${clips.length} clips...`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "VideoAssembly",
    inputProps,
  });
  console.log(
    `[Remotion] Composition: ${composition.width}x${composition.height}, ${composition.durationInFrames} frames @ ${composition.fps}fps`
  );

  console.log(`[Remotion] Rendering to ${outputPath}...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      if (onProgress) onProgress(progress);
      if (Math.round(progress * 100) % 10 === 0) {
        console.log(`[Remotion] Progress: ${Math.round(progress * 100)}%`);
      }
    },
  });

  console.log(`[Remotion] Done: ${outputPath}`);
  return outputPath;
}
