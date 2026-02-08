import type { Scene } from "@video-generator/shared";
import { useNavigate } from "react-router-dom";

interface SceneNavigationProps {
  scenes: Scene[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  activeTab: "images" | "clips";
  onTabChange: (tab: "images" | "clips") => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-mono font-medium rounded border border-gray-600 bg-gray-800 text-gray-400">
      {children}
    </kbd>
  );
}

export default function SceneNavigation({
  scenes,
  currentIndex,
  onPrev,
  onNext,
  activeTab,
  onTabChange,
}: SceneNavigationProps) {
  const navigate = useNavigate();
  const total = scenes.length;
  const scenesWithSelectedImage = scenes.filter(
    (s) => s.selectedImageId !== null
  ).length;
  const progress = total > 0 ? (scenesWithSelectedImage / total) * 100 : 0;

  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-800 bg-slate-900/80">
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back
      </button>

      {/* Tabs */}
      <div className="flex border border-gray-700 rounded-lg overflow-hidden">
        <button
          className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center ${
            activeTab === "images"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => onTabChange("images")}
        >
          Images
          <Kbd>1</Kbd>
        </button>
        <button
          className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center ${
            activeTab === "clips"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => onTabChange("clips")}
        >
          Clips
          <Kbd>2</Kbd>
        </button>
      </div>

      {/* Scene counter */}
      <span className="text-sm text-gray-300">
        Scene {currentIndex + 1}/{total}
      </span>

      {/* Progress bar */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs text-gray-500">
          {scenesWithSelectedImage}/{total}
        </span>
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
      </div>

      {/* Prev / Next */}
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="px-3 py-1.5 text-sm border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <Kbd>&larr;</Kbd>
          <span className="ml-1.5">Prev</span>
        </button>
        <button
          onClick={onNext}
          disabled={currentIndex === total - 1}
          className="px-3 py-1.5 text-sm border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <span className="mr-1.5">Next</span>
          <Kbd>&rarr;</Kbd>
        </button>
      </div>
    </div>
  );
}
