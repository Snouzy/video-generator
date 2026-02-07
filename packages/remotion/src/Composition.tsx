import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { VideoFormat } from "@video-generator/shared";

export interface VideoAssemblyProps {
  [key: string]: unknown;
  clips: Array<{
    src: string;
    sceneTitle?: string;
  }>;
  clipDurations: number[]; // seconds per clip, computed by calculateMetadata
  format: VideoFormat;
  audioUrls?: string[]; // audio URLs per clip, can be empty string if no audio
}

const TRANSITION_DURATION_FRAMES = 15; // 0.5s at 30fps

// Cycle through transition types for variety
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTransition(index: number): any {
  const transitions = [fade, slide, wipe];
  return transitions[index % transitions.length]();
}

// Ken Burns: subtle zoom + pan during the clip
const KenBurns: React.FC<{ children: React.ReactNode; seed: number }> = ({
  children,
  seed,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Alternate zoom direction based on seed
  const zoomIn = seed % 2 === 0;
  const startScale = zoomIn ? 1.0 : 1.08;
  const endScale = zoomIn ? 1.08 : 1.0;

  const scale = interpolate(frame, [0, durationInFrames], [startScale, endScale], {
    extrapolateRight: "clamp",
  });

  // Subtle pan based on seed
  const panDirections = [
    { x: [-1, 1], y: [-0.5, 0.5] },
    { x: [1, -1], y: [0.5, -0.5] },
    { x: [0.5, -0.5], y: [-1, 1] },
    { x: [-0.5, 0.5], y: [1, -1] },
  ];
  const pan = panDirections[seed % panDirections.length];

  const panX = interpolate(frame, [0, durationInFrames], pan.x, {
    extrapolateRight: "clamp",
  });
  const panY = interpolate(frame, [0, durationInFrames], pan.y, {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${scale}) translate(${panX}%, ${panY}%)`,
          transformOrigin: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const calculateMetadata: CalculateMetadataFunction<
  VideoAssemblyProps
> = async ({ props }) => {
  const fps = 30;
  const isPortrait = props.format === "9:16";

  if (props.clips.length === 0) {
    return {
      durationInFrames: 1,
      fps,
      width: isPortrait ? 1080 : 1920,
      height: isPortrait ? 1920 : 1080,
    };
  }

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
      durations.push(5);
    }
  }

  const totalSeconds = durations.reduce((a, b) => a + b, 0);
  // Account for transition overlap (each transition saves TRANSITION_DURATION_FRAMES)
  const transitionCount = Math.max(0, props.clips.length - 1);
  const transitionOverlapFrames = transitionCount * TRANSITION_DURATION_FRAMES;
  const totalFrames = Math.max(1, Math.ceil(totalSeconds * fps) - transitionOverlapFrames);

  return {
    durationInFrames: totalFrames,
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
  audioUrls = [],
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

  // Build TransitionSeries children: Sequence, Transition, Sequence, Transition, ...
  const elements: React.ReactNode[] = [];

  clips.forEach((clip, i) => {
    const durationSec = clipDurations[i] ?? 5;
    const durationInFrames = Math.max(1, Math.ceil(durationSec * fps));

    elements.push(
      <TransitionSeries.Sequence key={`clip-${i}`} durationInFrames={durationInFrames}>
        <AbsoluteFill>
          <KenBurns seed={i}>
            <OffthreadVideo
              src={clip.src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </KenBurns>
          {audioUrls[i] && audioUrls[i] !== "" && <Audio src={audioUrls[i]} />}
        </AbsoluteFill>
      </TransitionSeries.Sequence>
    );

    // Add transition after each clip except the last
    if (i < clips.length - 1) {
      elements.push(
        <TransitionSeries.Transition
          key={`transition-${i}`}
          presentation={getTransition(i)}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION_FRAMES })}
        />
      );
    }
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>{elements}</TransitionSeries>
    </AbsoluteFill>
  );
};
