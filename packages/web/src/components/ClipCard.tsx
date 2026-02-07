import type { GeneratedClip } from "@video-generator/shared";

interface ClipCardProps {
  clip: GeneratedClip;
  index: number;
  sceneLabel: string;
  onSelect: (id: number) => void;
  isSelected: boolean;
}

export default function ClipCard({
  clip,
  index,
  sceneLabel,
  onSelect,
  isSelected,
}: ClipCardProps) {
  if (clip.status === "processing" || clip.status === "pending") {
    return (
      <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-800 aspect-[4/3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Generating clip...</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
          <span className="text-xs text-gray-300">
            ({index + 1}) {clip.model}
          </span>
          <span className="text-xs text-gray-500">{sceneLabel}</span>
        </div>
      </div>
    );
  }

  if (clip.status === "failed") {
    return (
      <div className="relative rounded-lg overflow-hidden border border-red-700/50 bg-gray-800 aspect-[4/3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-red-400">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-sm">Clip generation failed</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
          <span className="text-xs text-gray-300">
            ({index + 1}) {clip.model}
          </span>
          <span className="text-xs text-gray-500">{sceneLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all group ${
        isSelected
          ? "border-green-500 shadow-lg shadow-green-500/20"
          : "border-gray-700 hover:border-gray-500"
      }`}
      onClick={() => onSelect(clip.id)}
    >
      <div className="aspect-[4/3] bg-gray-800">
        {clip.clipUrl ? (
          <video
            src={clip.clipUrl}
            className="w-full h-full object-cover"
            controls
            muted
            loop
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No clip
          </div>
        )}
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
        <span className="text-xs text-gray-200 font-medium">
          ({index + 1}) {clip.model}
        </span>
        <span className="text-xs text-gray-400">{sceneLabel}</span>
      </div>
    </div>
  );
}
