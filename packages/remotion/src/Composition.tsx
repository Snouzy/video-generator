import {
  AbsoluteFill,
  OffthreadVideo,
  Series,
  useVideoConfig,
} from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import type { VideoFormat } from "@video-generator/shared";

export interface VideoAssemblyProps {
  [key: string]: unknown;
  clips: Array<{
    src: string;
    sceneTitle?: string;
  }>;
  clipDurations: number[]; // seconds per clip, computed by calculateMetadata
  format: VideoFormat;
}

export const calculateMetadata: CalculateMetadataFunction<
  VideoAssemblyProps
> = async ({ props }) => {
  const fps = 30;
  const isPortrait = props.format === "9:16";

  // If no clips, return minimal
  if (props.clips.length === 0) {
    return {
      durationInFrames: 1,
      fps,
      width: isPortrait ? 1080 : 1920,
      height: isPortrait ? 1920 : 1080,
    };
  }

  // Parse each clip to get its duration
  const { parseMedia } = await import("@remotion/media-parser");

  const durations: number[] = [];
  for (const clip of props.clips) {
    try {
      const { slowDurationInSeconds } = await parseMedia({
        src: clip.src,
        fields: { slowDurationInSeconds: true },
      });
      durations.push(slowDurationInSeconds ?? 5);
    } catch {
      durations.push(5); // fallback 5s if parsing fails
    }
  }

  const totalSeconds = durations.reduce((a, b) => a + b, 0);

  return {
    durationInFrames: Math.max(1, Math.ceil(totalSeconds * fps)),
    fps,
    width: isPortrait ? 1080 : 1920,
    height: isPortrait ? 1920 : 1080,
    props: {
      ...props,
      clipDurations: durations,
    },
  };
};

export const VideoAssembly: React.FC<VideoAssemblyProps> = ({
  clips,
  clipDurations,
}) => {
  const { fps } = useVideoConfig();

  if (clips.length === 0) {
    return (
      <AbsoluteFill
        style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}
      >
        <span style={{ color: "#666", fontSize: 24 }}>No clips</span>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {clips.map((clip, i) => {
          const durationSec = clipDurations[i] ?? 5;
          const durationInFrames = Math.max(1, Math.ceil(durationSec * fps));

          return (
            <Series.Sequence key={i} durationInFrames={durationInFrames}>
              <AbsoluteFill>
                <OffthreadVideo
                  src={clip.src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
