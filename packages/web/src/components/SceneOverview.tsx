import type { Scene } from "@video-generator/shared";

interface SceneOverviewProps {
  scenes: Scene[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

function statusBadge(completed: number, total: number, failed: number) {
  if (total === 0) return { label: "0", color: "bg-gray-700 text-gray-400" };
  if (failed > 0) return { label: `${completed}/${total}`, color: "bg-red-900/50 text-red-400" };
  if (completed === total) return { label: `${completed}/${total}`, color: "bg-green-900/50 text-green-400" };
  if (completed > 0) return { label: `${completed}/${total}`, color: "bg-yellow-900/50 text-yellow-400" };
  return { label: `0/${total}`, color: "bg-gray-700 text-gray-400" };
}

export default function SceneOverview({ scenes, currentIndex, onNavigate }: SceneOverviewProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300">All Scenes</h3>
      </div>
      <div className="overflow-y-auto divide-y divide-gray-800/50">
        {scenes.map((scene, index) => {
          const images = scene.images ?? [];
          const clips = scene.clips ?? [];
          const imgCompleted = images.filter((i) => i.status === "completed").length;
          const imgFailed = images.filter((i) => i.status === "failed").length;
          const clipCompleted = clips.filter((c) => c.status === "completed").length;
          const clipFailed = clips.filter((c) => c.status === "failed").length;
          const imgBadge = statusBadge(imgCompleted, images.length, imgFailed);
          const clipBadge = statusBadge(clipCompleted, clips.length, clipFailed);
          const hasSelectedImage = images.some((i) => i.isSelected);
          const hasSelectedClip = clips.some((c) => c.isSelected);
          const isCurrent = index === currentIndex;

          return (
            <button
              key={scene.id}
              onClick={() => onNavigate(index)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors cursor-pointer ${
                isCurrent
                  ? "bg-blue-900/30 border-l-2 border-l-blue-500"
                  : "hover:bg-gray-800/50 border-l-2 border-l-transparent"
              }`}
            >
              {/* Scene number */}
              <span className="text-xs text-gray-500 font-mono w-5 shrink-0">
                {scene.sceneNumber}
              </span>

              {/* Title */}
              <span className="text-sm text-gray-300 truncate flex-1 min-w-0">
                {scene.title}
              </span>

              {/* Status badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Images badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${imgBadge.color}`}>
                  {imgBadge.label} img
                </span>

                {/* Image selected check */}
                {hasSelectedImage && (
                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}

                {/* Clips badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${clipBadge.color}`}>
                  {clipBadge.label} clip
                </span>

                {/* Clip selected check */}
                {hasSelectedClip && (
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
