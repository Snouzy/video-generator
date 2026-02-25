import { useState } from "react";
import type { Scene, StyleTemplateValue } from "@video-generator/shared";
import { getTagColor } from "./ImageCard";
import { mediaUrl } from "../api/client";
import StyleTemplateSelector from "./StyleTemplateSelector";

interface SceneDetailProps {
  scene: Scene;
  onSetStyleOverride: (style: StyleTemplateValue) => void;
  onSaveStyleOverride: () => void;
  onRegeneratePrompt: () => void;
  onClearStyleOverride: () => void;
  styleLoading?: boolean;
}

export default function SceneDetail({
  scene,
  onSetStyleOverride,
  onSaveStyleOverride,
  onRegeneratePrompt,
  onClearStyleOverride,
  styleLoading = false,
}: SceneDetailProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);
  const [showStyleOverride, setShowStyleOverride] = useState(false);

  const prompt = scene.imagePrompt || "";
  const truncatedPrompt =
    prompt.length > 150 ? prompt.slice(0, 150) + "..." : prompt;

  return (
    <div className="px-6 py-4 border-b border-gray-800">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-semibold text-white">{scene.title}</h2>
        <div className="flex gap-2">
          {scene.tags.map((tag, i) => (
            <span
              key={tag}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(i)}`}
            >
              {tag}
            </span>
          ))}
        </div>
        {scene.styleOverride && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-900/50 text-purple-300 border border-purple-700/50">
            Custom style
          </span>
        )}
      </div>

      {prompt && (
        <p className="text-sm text-gray-400 leading-relaxed">
          &quot;{showFullPrompt ? prompt : truncatedPrompt}&quot;
          {prompt.length > 150 && (
            <button
              className="ml-2 text-blue-400 hover:text-blue-300 text-sm"
              onClick={() => setShowFullPrompt(!showFullPrompt)}
            >
              {showFullPrompt ? "Show less" : "Show more"}
            </button>
          )}
        </p>
      )}

      {scene.narrativeText && (
        <div className="mt-2">
          <button
            className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
            onClick={() => setShowNarrative(!showNarrative)}
          >
            <svg
              className={`w-3 h-3 transition-transform ${showNarrative ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            Narrative text
          </button>
          {showNarrative && (
            <p className="mt-1 text-sm text-gray-500 leading-relaxed pl-4 border-l-2 border-gray-700">
              {scene.narrativeText}
            </p>
          )}
        </div>
      )}

      {/* Scene style override */}
      <div className="mt-2">
        <button
          className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
          onClick={() => setShowStyleOverride(!showStyleOverride)}
        >
          <svg
            className={`w-3 h-3 transition-transform ${showStyleOverride ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          Scene style override
          {scene.styleOverride && (
            <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
          )}
        </button>
        {showStyleOverride && (
          <div className="mt-2 pl-4 border-l-2 border-gray-700">
            <StyleTemplateSelector
              value={scene.styleOverride ?? null}
              onChange={onSetStyleOverride}
              onSave={onSaveStyleOverride}
              onSaveAndRegenerate={onRegeneratePrompt}
              loading={styleLoading}
              showClearButton={!!scene.styleOverride}
              onClear={onClearStyleOverride}
              compact
            />
          </div>
        )}
      </div>

      {scene.audioUrl && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-gray-500">Narration</span>
          <audio
            controls
            src={mediaUrl(scene.audioUrl)}
            className="h-8"
            style={{ filter: "invert(1) hue-rotate(180deg)", opacity: 0.7 }}
          />
        </div>
      )}
    </div>
  );
}
