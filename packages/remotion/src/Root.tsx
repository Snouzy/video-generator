import { Composition } from "remotion";
import { VideoAssembly, calculateMetadata } from "./Composition";
import type { VideoAssemblyProps } from "./Composition";

export const Root: React.FC = () => {
  return (
    <Composition
      id="VideoAssembly"
      component={VideoAssembly}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        clips: [],
        clipDurations: [],
        format: "16:9" as const,
      } satisfies VideoAssemblyProps}
      calculateMetadata={calculateMetadata}
    />
  );
};
