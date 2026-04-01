import type { Scene } from "@video-generator/shared";
import { useNavigate } from "react-router-dom";

interface SceneNavigationProps {
  scenes: Scene[];
  currentIndex: number;
  projectId: number;
  onPrev: () => void;
  onNext: () => void;
  activeTab: "images" | "clips" | "comics";
  onTabChange: (tab: "images" | "clips" | "comics") => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  onGenerateAllImages: () => void;
  onGenerateAllClips: () => void;
  actionLoading: string | null;
  projectStatus: string;
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
  projectId,
  onPrev,
  onNext,
  activeTab,
  onTabChange,
  showSettings,
  onToggleSettings,
  onGenerateAllImages,
  onGenerateAllClips,
  actionLoading,
  projectStatus,
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
        <button
          className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center ${
            activeTab === "comics"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => onTabChange("comics")}
        >
          BD
          <Kbd>3</Kbd>
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

      {/* Bulk actions */}
      <button
        onClick={onGenerateAllImages}
        disabled={actionLoading === "generate-all"}
        className="px-3 py-1.5 text-sm border border-green-700 rounded-lg text-green-400 hover:text-white hover:bg-green-600 disabled:opacity-30 transition-colors"
      >
        {actionLoading === "generate-all" ? "Generating..." : "All Images"}
      </button>
      <button
        onClick={onGenerateAllClips}
        disabled={actionLoading === "generate-all-clips"}
        className="px-3 py-1.5 text-sm border border-green-700 rounded-lg text-green-400 hover:text-white hover:bg-green-600 disabled:opacity-30 transition-colors"
      >
        {actionLoading === "generate-all-clips" ? "Generating..." : "All Clips"}
      </button>
      <a
        href={`http://localhost:3002/api/projects/${projectId}/export-images`}
        className="px-3 py-1.5 text-sm border border-cyan-700 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-600 transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export Images
      </a>
      <a
        href={`http://localhost:3002/api/projects/${projectId}/export-clips`}
        className="px-3 py-1.5 text-sm border border-cyan-700 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-600 transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export Clips
      </a>

      {/* Settings toggle */}
      <button
        onClick={onToggleSettings}
        className={`p-1.5 rounded-lg border transition-colors ${
          showSettings
            ? "border-yellow-600 text-yellow-400 bg-yellow-900/30"
            : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
        }`}
        title="Project settings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

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
